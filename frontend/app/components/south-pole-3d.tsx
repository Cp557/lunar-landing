"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { HALF_EXTENT_M, HEIGHTS_SIZE, R_M, toMap, unitVector } from "../lib/polar";
import { SHADOW_GLSL } from "./shadow-layer";

const EXAGGERATION = 5; // relief is stretched 5× so the low polar terrain reads in 3D (lighting and shadows use true heights)
const SEGMENTS = 423; // 424 × 424 vertices: every other heights cell; the shading uses every cell

// Scene frame: x = map right (toward 90°E), y = map up (toward 0°E, Earth), z = up at the south pole.
// The map square spans x, y in [-1, 1]; heights are in units of the map's half-width.
const toLocal = ([x, y, z]: [number, number, number]) => new THREE.Vector3(y, x, -z);

const VERTEX = `
uniform highp sampler2D heights;
uniform float halfExtent;
uniform float exaggeration;
varying vec2 vMapUv;
void main() {
  vMapUv = vec2(uv.x, 1.0 - uv.y);  // image-style uv: (0, 0) = top-left, like the 2D map
  float h = texture(heights, vMapUv).r;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xy, h / halfExtent * exaggeration, 1.0);
}`;

// Gray regolith lit by the Sun at the slider time: slopes facing the Sun are bright, terrain the
// ray-march finds in shadow (same test as the 2D map) gets only a faint blue-gray ambient.
const FRAGMENT = `
${SHADOW_GLSL}
uniform vec3 sunLocal;
uniform float exaggeration;
uniform float texel;
varying vec2 vMapUv;
// Bilinear height (float textures can't be filtered everywhere), so slopes shade smoothly instead of
// as flat 720 m blocks.
float heightAt(vec2 uv) {
  vec2 p = uv / texel - 0.5;
  vec2 f = fract(p);
  vec2 c = (floor(p) + 0.5) * texel;
  float a = texture(heights, c).r;
  float b = texture(heights, c + vec2(texel, 0.0)).r;
  float d = texture(heights, c + vec2(0.0, texel)).r;
  float e = texture(heights, c + vec2(texel, texel)).r;
  return mix(mix(a, b, f.x), mix(d, e, f.x), f.y);
}
void main() {
  float cell = 2.0 * halfExtent * texel;
  float hx = heightAt(vMapUv + vec2(texel, 0.0)) - heightAt(vMapUv - vec2(texel, 0.0));
  float hy = heightAt(vMapUv - vec2(0.0, texel)) - heightAt(vMapUv + vec2(0.0, texel));
  vec3 n = normalize(vec3(-hx, -hy, 2.0 * cell / exaggeration));
  float lit = inShadow(vMapUv) ? 0.0 : 1.0;
  float sun = max(dot(n, sunLocal), 0.0);
  vec3 c = vec3(0.64, 0.64, 0.67) * (0.13 + lit * (0.2 + 1.3 * sun)) + vec3(0.0, 0.015, 0.05) * (1.0 - lit);
  gl_FragColor = vec4(c, 1.0);
}`;

/** Soft round sprite texture (a glow, or a disc with a soft edge). */
function glowTexture(inner: string, outer: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(0.25, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function stars(): THREE.Points {
  const positions = new Float32Array(900 * 3);
  for (let i = 0; i < 900; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(30);
    positions.set([v.x, v.y, v.z], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xffffff, size: 1.3, sizeAttenuation: false, transparent: true, opacity: 0.7 }));
}

type World = {
  render: () => void;
  material: THREE.ShaderMaterial;
  sun: THREE.Sprite;
  earth: THREE.Sprite;
  pin: THREE.Group;
  heights: Int16Array;
  controls: OrbitControls;
  camera: THREE.PerspectiveCamera;
};

/** Map-square position of a site (scene units, with its exaggerated height), or null if off the map. */
function sitePosition(site: { lat: number; lon: number }, heights: Int16Array): THREE.Vector3 | null {
  const p = toMap(site.lat, site.lon);
  if (!p) return null;
  const col = Math.min(HEIGHTS_SIZE - 1, Math.floor(p[0] * HEIGHTS_SIZE));
  const row = Math.min(HEIGHTS_SIZE - 1, Math.floor(p[1] * HEIGHTS_SIZE));
  const h = heights[row * HEIGHTS_SIZE + col];
  return new THREE.Vector3(p[0] * 2 - 1, 1 - p[1] * 2, (h / HALF_EXTENT_M) * EXAGGERATION);
}

/**
 * 3D south pole (80°S to the pole) from the same LOLA heights as the map's shadow layer, lit by the
 * Sun at the slider time with the same ray-marched shadows. Glow = the Sun's direction, blue dot =
 * Earth's, white pin = this site. Drag to orbit, scroll to zoom.
 */
export default function SouthPole3D({
  site,
  subsolar,
  subearth,
}: {
  site: { lat: number; lon: number };
  subsolar: { lat: number; lon: number };
  subearth: { lat: number; lon: number };
}) {
  const host = useRef<HTMLDivElement>(null);
  const world = useRef<World | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | string>("loading");

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cancelled = false;
    let dispose = () => {};
    fetch("/south-pole-heights.bin")
      .then((r) => r.arrayBuffer())
      .then((buffer) => {
        if (cancelled) return;
        const heights = new Int16Array(buffer);
        let renderer: THREE.WebGLRenderer;
        try {
          renderer = new THREE.WebGLRenderer({ antialias: true });
        } catch {
          setStatus("The 3D view needs a browser with WebGL2.");
          return;
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // the shadow ray-march runs per pixel
        renderer.setSize(el.clientWidth, el.clientHeight);
        el.append(renderer.domElement);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color("#02040a");
        scene.add(stars());

        const texture = new THREE.DataTexture(Float32Array.from(heights), HEIGHTS_SIZE, HEIGHTS_SIZE, THREE.RedFormat, THREE.FloatType);
        texture.minFilter = texture.magFilter = THREE.NearestFilter;
        texture.needsUpdate = true;
        const material = new THREE.ShaderMaterial({
          vertexShader: VERTEX,
          fragmentShader: FRAGMENT,
          uniforms: {
            heights: { value: texture },
            sunDir: { value: new THREE.Vector3() },
            sunLocal: { value: new THREE.Vector3() },
            halfExtent: { value: HALF_EXTENT_M },
            R: { value: R_M },
            exaggeration: { value: EXAGGERATION },
            texel: { value: 1 / HEIGHTS_SIZE },
          },
        });
        const geometry = new THREE.PlaneGeometry(2, 2, SEGMENTS, SEGMENTS);
        scene.add(new THREE.Mesh(geometry, material));

        const sunTexture = glowTexture("rgba(255,244,214,1)", "rgba(245,181,68,0)");
        const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTexture, blending: THREE.AdditiveBlending, depthWrite: false }));
        sun.scale.setScalar(0.5);
        const earthTexture = glowTexture("rgba(143,211,255,1)", "rgba(78,168,245,0)");
        const earth = new THREE.Sprite(new THREE.SpriteMaterial({ map: earthTexture, depthWrite: false }));
        earth.scale.setScalar(0.16);
        scene.add(sun, earth);

        const pin = new THREE.Group();
        const pinMaterial = new THREE.MeshBasicMaterial({ color: "#ffffff" });
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.12, 8), pinMaterial);
        stem.rotation.x = Math.PI / 2;
        stem.position.z = 0.06;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.014, 16, 12), pinMaterial);
        head.position.z = 0.12;
        pin.add(stem, head);
        scene.add(pin);

        const camera = new THREE.PerspectiveCamera(40, el.clientWidth / el.clientHeight, 0.01, 100);
        camera.up.set(0, 0, 1);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enablePan = false;
        controls.minDistance = 0.25;
        controls.maxDistance = 4;
        controls.maxPolarAngle = (80 * Math.PI) / 180; // stay above the horizon
        const render = () => renderer.render(scene, camera);
        controls.addEventListener("change", render);

        const resize = new ResizeObserver(() => {
          camera.aspect = el.clientWidth / el.clientHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(el.clientWidth, el.clientHeight);
          render();
        });
        resize.observe(el);

        world.current = { render, material, sun, earth, pin, heights, controls, camera };
        setStatus("ready");
        dispose = () => {
          resize.disconnect();
          controls.dispose();
          geometry.dispose();
          material.dispose();
          texture.dispose();
          sunTexture.dispose();
          earthTexture.dispose();
          renderer.dispose();
          el.replaceChildren();
          world.current = null;
        };
      })
      .catch((e: Error) => setStatus(e.message));
    return () => {
      cancelled = true;
      dispose();
    };
  }, []);

  // Aim the camera at the site (or the pole if the site is off the map) whenever the site changes.
  useEffect(() => {
    const w = world.current;
    if (!w || status !== "ready") return;
    const here = sitePosition(site, w.heights);
    w.pin.visible = here !== null;
    if (here) w.pin.position.copy(here);
    const target = here ?? new THREE.Vector3(0, 0, 0);
    w.controls.target.copy(target);
    w.camera.position.copy(target).add(new THREE.Vector3(0, here ? -1.05 : -1.6, here ? 0.7 : 1.1));
    w.controls.update();
    w.render();
  }, [status, site]);

  // Light, shadows and the Sun/Earth markers follow the mission time. Markers sit 3 map half-widths
  // from the pole in each body's direction, and hide while the body is below the horizon.
  useEffect(() => {
    const w = world.current;
    if (!w || status !== "ready") return;
    const sunDir = unitVector(subsolar.lat, subsolar.lon);
    const sunLocal = toLocal(sunDir);
    const earthLocal = toLocal(unitVector(subearth.lat, subearth.lon));
    w.material.uniforms.sunDir.value.set(...sunDir);
    w.material.uniforms.sunLocal.value.copy(sunLocal);
    w.sun.position.copy(sunLocal).multiplyScalar(3);
    w.sun.visible = sunLocal.z > -0.01;
    w.earth.position.copy(earthLocal).multiplyScalar(3);
    w.earth.visible = earthLocal.z > 0;
    w.render();
  }, [status, subsolar.lat, subsolar.lon, subearth.lat, subearth.lon]);

  const inArea = toMap(site.lat, site.lon) !== null;
  return (
    <div className="relative size-full overflow-hidden rounded-3xl bg-[#02040a]">
      <div ref={host} className="size-full cursor-grab active:cursor-grabbing" />
      {status !== "ready" && (
        <p className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
          {status === "loading" ? "Loading 3D terrain…" : status}
        </p>
      )}
      {status === "ready" && !inArea && (
        <p className="absolute inset-x-0 bottom-2 text-center text-xs text-muted-foreground">
          This site is outside the 3D area (80°S to the pole).
        </p>
      )}
    </div>
  );
}
