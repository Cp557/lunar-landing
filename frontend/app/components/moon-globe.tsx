"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { starfield } from "./starfield";

/** Moon-fixed lat/lon (degrees) -> three.js position on a unit sphere (matches SphereGeometry's texture mapping). */
function toScene(lat: number, lon: number, radius = 1): THREE.Vector3 {
  const a = (lat * Math.PI) / 180;
  const b = (lon * Math.PI) / 180;
  return new THREE.Vector3(Math.cos(a) * Math.cos(b), Math.sin(a), -Math.cos(a) * Math.sin(b)).multiplyScalar(radius);
}

type Scene = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  light: THREE.DirectionalLight;
  controls: OrbitControls;
  selected: THREE.Mesh;
  earth: THREE.Mesh;
};

// Earth sits 5 Moon radii out (really ~220) with radius 0.3, so it looks a few times bigger than from
// the real Moon; only its direction and its phase are real.
const EARTH_DISTANCE = 5;
const EARTH_RADIUS = 0.3;

/** Camera looking straight at the site (latitude capped at ±75° so the view never sits exactly over a pole). */
const cameraFor = (lat: number, lon: number) => toScene(Math.max(-75, Math.min(75, lat)), lon, 3.6);

/**
 * 3D Moon (NASA SVS CGI Moon Kit: 4k LRO color map and LOLA relief) lit by the Sun at the selected
 * time, so the day/night line is real and craters cast shadows along it. Earth hangs in its real
 * direction (sub-Earth point), lit by the same Sun, so it shows its phase. The view is centered on the
 * site (white dot) and re-centers when the site changes. Drag to rotate, scroll to zoom.
 */
export default function MoonGlobe({
  site,
  subsolar,
  subearth,
  active,
}: {
  active: boolean; // only render while the tab is visible (it stays mounted when hidden)
  site: { lat: number; lon: number };
  subsolar: { lat: number; lon: number };
  subearth: { lat: number; lon: number };
}) {
  const host = useRef<HTMLDivElement>(null);
  const world = useRef<Scene | null>(null);
  const centeredOn = useRef(""); // the site the camera last centered on

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.append(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, el.clientWidth / el.clientHeight, 0.1, 100);
    const loader = new THREE.TextureLoader();
    const texture = loader.load("/moon-texture.jpg", () => renderer.render(scene, camera));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const relief = loader.load("/moon-relief.jpg", () => renderer.render(scene, camera));
    scene.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(1, 192, 128),
        new THREE.MeshStandardMaterial({ map: texture, bumpMap: relief, bumpScale: 3, roughness: 1 }),
      ),
    );
    scene.add(starfield());
    const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS, 48, 32), new THREE.MeshStandardMaterial({ color: "#4ea8f5", roughness: 0.6 }));
    scene.add(earth);
    scene.add(new THREE.AmbientLight(0xffffff, 0.06)); // faint earthshine so the night side isn't pure black
    const light = new THREE.DirectionalLight(0xffffff, 3);
    scene.add(light);

    const selected = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), new THREE.MeshBasicMaterial({ color: "#ffffff" }));
    scene.add(selected);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 1.6;
    controls.maxDistance = 7;
    controls.addEventListener("change", () => renderer.render(scene, camera));

    const resize = new ResizeObserver(() => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
      renderer.render(scene, camera);
    });
    resize.observe(el);

    world.current = { renderer, scene, camera, controls, light, selected, earth };
    return () => {
      resize.disconnect();
      controls.dispose();
      renderer.dispose();
      el.replaceChildren();
      world.current = null;
      centeredOn.current = "";
    };
  }, []); // the scene is built once per mount; site and time changes are applied below

  useEffect(() => {
    const w = world.current;
    if (!w || !active) return;
    const key = `${site.lat},${site.lon}`;
    if (centeredOn.current !== key) {
      centeredOn.current = key;
      w.camera.position.copy(cameraFor(site.lat, site.lon));
      w.controls.update();
    }
    w.light.position.copy(toScene(subsolar.lat, subsolar.lon, 10));
    w.selected.position.copy(toScene(site.lat, site.lon, 1.004));
    w.earth.position.copy(toScene(subearth.lat, subearth.lon, EARTH_DISTANCE));
    w.renderer.render(w.scene, w.camera);
  }, [active, site.lat, site.lon, subsolar.lat, subsolar.lon, subearth.lat, subearth.lon]);

  return (
    <div ref={host} className="size-full cursor-grab overflow-hidden rounded-3xl bg-[#02040a] active:cursor-grabbing" />
  );
}
