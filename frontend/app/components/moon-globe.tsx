"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type { Site } from "../lib/types";

const HEIGHT = 360;
const KIND_COLOR: Record<string, string> = { reference: "#f5b544", candidate: "#4ea8f5", landed: "#7bd389", planned: "#c4b5fd" };

/** Moon-fixed lat/lon (degrees) -> three.js position on a unit sphere (matches SphereGeometry's texture mapping). */
function toScene(lat: number, lon: number, radius = 1): THREE.Vector3 {
  const a = (lat * Math.PI) / 180;
  const b = (lon * Math.PI) / 180;
  return new THREE.Vector3(Math.cos(a) * Math.cos(b), Math.sin(a), -Math.cos(a) * Math.sin(b)).multiplyScalar(radius);
}

type Scene = { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; light: THREE.DirectionalLight; selected: THREE.Mesh };

/**
 * 3D Moon (NASA SVS CGI Moon Kit texture) lit by the Sun at the selected time, so the day/night
 * line is real. Dots are curated sites; the white dot is the current site. Drag to rotate.
 */
export default function MoonGlobe({
  sites,
  site,
  subsolar,
}: {
  sites: Site[];
  site: { lat: number; lon: number };
  subsolar: { lat: number; lon: number };
}) {
  const host = useRef<HTMLDivElement>(null);
  const world = useRef<Scene | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, HEIGHT);
    el.append(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, el.clientWidth / HEIGHT, 0.1, 100);
    camera.position.copy(toScene(-55, site.lon, 3.6));
    const texture = new THREE.TextureLoader().load("/moon-texture.jpg", () => renderer.render(scene, camera));
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), new THREE.MeshStandardMaterial({ map: texture, roughness: 1 })));
    scene.add(new THREE.AmbientLight(0xffffff, 0.06)); // faint earthshine so the night side isn't pure black
    const light = new THREE.DirectionalLight(0xffffff, 3);
    scene.add(light);

    for (const s of sites) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), new THREE.MeshBasicMaterial({ color: KIND_COLOR[s.kind] ?? "#ffffff" }));
      dot.position.copy(toScene(s.lat, s.lon, 1.003));
      scene.add(dot);
    }
    const selected = new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 12), new THREE.MeshBasicMaterial({ color: "#ffffff" }));
    scene.add(selected);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 1.6;
    controls.maxDistance = 6;
    controls.addEventListener("change", () => renderer.render(scene, camera));

    const resize = new ResizeObserver(() => {
      camera.aspect = el.clientWidth / HEIGHT;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, HEIGHT);
      renderer.render(scene, camera);
    });
    resize.observe(el);

    world.current = { renderer, scene, camera, light, selected };
    return () => {
      resize.disconnect();
      controls.dispose();
      renderer.dispose();
      el.replaceChildren();
      world.current = null;
    };
    // The scene is built once per mount; site/time changes are applied by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sites]);

  useEffect(() => {
    const w = world.current;
    if (!w) return;
    w.light.position.copy(toScene(subsolar.lat, subsolar.lon, 10));
    w.selected.position.copy(toScene(site.lat, site.lon, 1.004));
    w.renderer.render(w.scene, w.camera);
  }, [site.lat, site.lon, subsolar.lat, subsolar.lon]);

  return (
    <div className="grid gap-2">
      <div ref={host} className="w-full cursor-grab overflow-hidden rounded-3xl bg-[#02040a] active:cursor-grabbing" style={{ height: HEIGHT }} />
      <p className="text-xs text-muted-foreground">
        Lit by the Sun at the time on the slider, so the day/night line is real. White dot = this site. Drag to rotate,
        scroll to zoom. Texture: NASA&apos;s Scientific Visualization Studio (CGI Moon Kit, LRO data).
      </p>
    </div>
  );
}
