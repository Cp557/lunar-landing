"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type { Site } from "../lib/types";
import { starfield } from "./starfield";

const KIND_COLOR: Record<string, string> = { reference: "#f5b544", candidate: "#4ea8f5", landed: "#7bd389", planned: "#c4b5fd" };

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
  selected: THREE.Mesh;
  earth: THREE.Mesh;
};

// Earth sits 5 Moon radii out (really ~220) with radius 0.3, so it looks a few times bigger than from
// the real Moon; only its direction and its phase are real.
const EARTH_DISTANCE = 5;
const EARTH_RADIUS = 0.3;

/**
 * 3D Moon (NASA SVS CGI Moon Kit: 4k LRO color map and LOLA relief) lit by the Sun at the selected
 * time, so the day/night line is real and craters cast shadows along it. Earth hangs in its real
 * direction (sub-Earth point), lit by the same Sun, so it shows its phase. Dots are curated sites;
 * the white dot is the current site. Drag to rotate, scroll to zoom.
 */
export default function MoonGlobe({
  sites,
  site,
  subsolar,
  subearth,
  active,
}: {
  active: boolean; // only render while the tab is visible (it stays mounted when hidden)
  sites: Site[];
  site: { lat: number; lon: number };
  subsolar: { lat: number; lon: number };
  subearth: { lat: number; lon: number };
}) {
  const host = useRef<HTMLDivElement>(null);
  const world = useRef<Scene | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.append(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, el.clientWidth / el.clientHeight, 0.1, 100);
    // South-pole sites: look at the pole from the side, so Earth (over the near side) is in frame on wide screens.
    camera.position.copy(site.lat < -60 ? toScene(-60, 90, 6.2) : toScene(-55, site.lon, 3.6));
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
    controls.maxDistance = 7;
    controls.addEventListener("change", () => renderer.render(scene, camera));

    const resize = new ResizeObserver(() => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
      renderer.render(scene, camera);
    });
    resize.observe(el);

    world.current = { renderer, scene, camera, light, selected, earth };
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
    if (!w || !active) return;
    w.light.position.copy(toScene(subsolar.lat, subsolar.lon, 10));
    w.selected.position.copy(toScene(site.lat, site.lon, 1.004));
    w.earth.position.copy(toScene(subearth.lat, subearth.lon, EARTH_DISTANCE));
    w.renderer.render(w.scene, w.camera);
  }, [active, site.lat, site.lon, subsolar.lat, subsolar.lon, subearth.lat, subearth.lon]);

  return (
    <div ref={host} className="size-full cursor-grab overflow-hidden rounded-3xl bg-[#02040a] active:cursor-grabbing" />
  );
}
