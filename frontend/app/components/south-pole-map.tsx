"use client";

import { ContrastIcon, EarthIcon, MountainIcon, Sun03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { formatLatLon } from "../lib/format";
import { fromMap, toMap } from "../lib/polar";
import { ShadowLayer } from "./shadow-layer";
import type { Site } from "../lib/types";

const KIND_COLOR: Record<string, string> = {
  reference: "var(--sun)",
  candidate: "var(--earth)",
  landed: "var(--both)",
  planned: "var(--chart-5)",
};

const LEGEND: [string, string][] = [
  ["reference", "illumination peak"],
  ["candidate", "Artemis III region"],
  ["landed", "landed"],
  ["planned", "planned"],
];

const tag = "absolute rounded-full bg-background/75 px-1.5 text-[10px] text-foreground";

// Precomputed by backend/scripts/build_heatmap.py over the same square as the relief map.
type Heatmap = { grid: number; period: string; scale_max: { sun: number; earth: number }; sun: number[]; earth: number[] };
type Layer = "terrain" | "sun" | "earth" | "shadows";
const LAYERS: { id: Layer; label: string; icon: typeof Sun03Icon; image?: string; gradient?: string }[] = [
  { id: "terrain", label: "Terrain", icon: MountainIcon },
  { id: "sun", label: "Sunlight", icon: Sun03Icon, image: "/sunlight-map.png", gradient: "linear-gradient(to right, #0b1d3a, #ffd27a)" },
  { id: "earth", label: "Earth contact", icon: EarthIcon, image: "/earth-map.png", gradient: "linear-gradient(to right, #0b1d3a, #8fd3ff)" },
  { id: "shadows", label: "Shadows", icon: ContrastIcon },
];

type MapProps = {
  children?: React.ReactNode; // shown right under the map (the mission player)
  sites: Site[];
  current: { lat: number; lon: number } | null;
  subsolar: { lat: number; lon: number } | null;
  onPickSite: (id: string) => void;
  onPickPoint: (lat: number, lon: number) => void;
};

/**
 * The south-pole map card: layer switch, hover readout, the map square (as large as fits on the
 * first screen, `--map-size` in globals.css) and its legends.
 */
export function SouthPoleMap({ children, sites, current, subsolar, onPickSite, onPickPoint }: MapProps) {
  const [hover, setHover] = useState<{ lat: number; lon: number; fx: number; fy: number } | null>(null);
  const [layer, setLayer] = useState<Layer>("shadows"); // live shadows first: press play under the map to watch them move
  const [heat, setHeat] = useState<Heatmap | null>(null);

  useEffect(() => {
    if (layer === "terrain" || layer === "shadows" || heat) return;
    fetch("/heatmap.json")
      .then((r) => r.json())
      .then(setHeat)
      .catch(() => setHeat(null));
  }, [layer, heat]);

  const fraction = (e: React.MouseEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const fx = (e.clientX - box.left) / box.width;
    const fy = (e.clientY - box.top) / box.height;
    return { ...fromMap(fx, fy), fx, fy };
  };
  const heatValue =
    hover && heat && (layer === "sun" || layer === "earth")
      ? heat[layer][Math.min(heat.grid - 1, Math.floor(hover.fy * heat.grid)) * heat.grid + Math.min(heat.grid - 1, Math.floor(hover.fx * heat.grid))]
      : null;
  const markers = sites.flatMap((s) => {
    const p = toMap(s.lat, s.lon);
    return p ? [{ site: s, p }] : [];
  });
  const here = current ? toMap(current.lat, current.lon) : null;
  const image = LAYERS.find((l) => l.id === layer)!.image;

  return (
    <Card size="sm">
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>South pole map</CardTitle>
        {/* Same segmented control as the sky-view tabs, so it reads as a switch. */}
        <Tabs value={layer} onValueChange={(v) => setLayer(v as Layer)} className="max-w-full">
          <TabsList aria-label="Map layer" className="max-w-full overflow-x-auto">
            {LAYERS.map((l) => (
              <TabsTrigger key={l.id} value={l.id} className="px-2 text-xs sm:px-3 sm:text-sm">
                <HugeiconsIcon icon={l.icon} strokeWidth={2} className="max-sm:hidden" />
                {l.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="grid gap-2">
        <span className="truncate text-xs text-muted-foreground tabular-nums">
          {hover ? formatLatLon(hover.lat, hover.lon) : "80°S–90°S · hover for coordinates"}
          {heatValue !== null && ` · ${heatValue}%`}
        </span>
        <div
          className="relative mx-auto aspect-square w-full max-w-(--map-size) cursor-crosshair overflow-hidden rounded-3xl"
          onClick={(e) => {
            const { lat, lon } = fraction(e);
            onPickPoint(lat, lon);
          }}
          onMouseMove={(e) => setHover(fraction(e))}
          onMouseLeave={() => setHover(null)}
        >
          <Image
            src="/south-pole-map.png"
            alt="Shaded relief of the lunar south pole from LOLA elevation data"
            fill
            // Served as-is: /_next/image optimization isn't available under Vercel Services.
            unoptimized
            className="pointer-events-none select-none"
            priority
          />
          {image && <Image src={image} alt={`${layer === "sun" ? "Sunlight" : "Earth contact"} map`} fill unoptimized className="pointer-events-none select-none" />}
          {layer === "shadows" && subsolar && <ShadowLayer subsolarLat={subsolar.lat} subsolarLon={subsolar.lon} />}
          {/* In the corner: IM-1's dot (80.1°S, 1.4°E) sits at the top-center edge. */}
          <span className={`${tag} top-1.5 left-1.5`}>↑ 0° · toward Earth</span>
          <span className={`${tag} top-1/2 right-1.5 -translate-y-1/2`}>90°E</span>
          <span className={`${tag} bottom-1.5 left-1/2 -translate-x-1/2`}>180°</span>
          <span className={`${tag} top-1/2 left-1.5 -translate-y-1/2`}>90°W</span>
          {markers.map(({ site, p }) => (
            <button
              key={site.id}
              type="button"
              title={site.name}
              aria-label={`Select ${site.name}`}
              onClick={(e) => {
                e.stopPropagation();
                onPickSite(site.id);
              }}
              className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background transition-transform hover:scale-150 sm:size-4"
              style={{ left: `${p[0] * 100}%`, top: `${p[1] * 100}%`, background: KIND_COLOR[site.kind] ?? "white" }}
            />
          ))}
          {here && (
            <span
              aria-hidden
              className="pointer-events-none absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white sm:size-8"
              style={{ left: `${here[0] * 100}%`, top: `${here[1] * 100}%` }}
            />
          )}
        </div>
        {children}
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {LEGEND.map(([kind, label]) => (
            <li key={kind} className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full" style={{ background: KIND_COLOR[kind] }} />
              {label}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">Click a dot for a curated site, or anywhere for that point (120–240 m terrain).</p>
        {/* Every layer's note sits in the same grid cell, so switching layers never changes the card's height. */}
        <div className="grid text-xs text-muted-foreground *:col-start-1 *:row-start-1">
          {LAYERS.map((l) => (
            <div key={l.id} className={l.id === layer ? "" : "invisible"} aria-hidden={l.id !== layer}>
              <LayerNote layer={l} heat={heat} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** What a map layer shows: a color scale for the heat maps, a short note otherwise. */
function LayerNote({ layer, heat }: { layer: (typeof LAYERS)[number]; heat: Heatmap | null }) {
  if (layer.id === "terrain")
    return <p>Shaded relief from NASA LOLA laser-altimeter elevation data, 80°S to the pole.</p>;
  if (layer.id === "shadows")
    return <p>Terrain shadows at the time on the slider above; press play to watch them sweep around the pole as the Sun circles. Approximate (720 m terrain).</p>;
  const max = heat?.scale_max[layer.id as "sun" | "earth"];
  return (
    <div className="grid gap-1">
      <div className="h-2 rounded-full" style={{ background: layer.gradient }} />
      <div className="flex justify-between">
        <span>0%</span>
        <span>{max === undefined ? "" : `${max}%${max < 100 ? "+" : ""}`}</span>
      </div>
      <p>
        Share of {heat?.period ?? "2026–2030"} with {layer.id === "sun" ? "sunlight" : "Earth contact"}, at the center of each ~4 km
        cell (240 m terrain, approximate). Narrow ridges can be much brighter than their cell — click a spot for its exact value.
      </p>
    </div>
  );
}
