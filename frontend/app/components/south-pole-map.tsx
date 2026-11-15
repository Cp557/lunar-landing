"use client";

import Image from "next/image";
import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { formatLatLon } from "../lib/format";
import type { Site } from "../lib/types";

// Must match backend/scripts/build_basemap.py: polar stereographic, centered on the pole,
// image up = 0° E (toward Earth), half-width in meters.
const HALF_EXTENT_M = 305_280;
const R_M = 1_737_400;
const DEG = Math.PI / 180;

/** Map position (0..1 fractions from the top-left) of a southern latitude/longitude, or null if off the map. */
function toMap(lat: number, lon: number): [number, number] | null {
  if (lat >= 0) return null;
  const r = 2 * R_M * Math.tan(((90 + lat) * DEG) / 2);
  const fx = 0.5 + (r * Math.sin(lon * DEG)) / (2 * HALF_EXTENT_M);
  const fy = 0.5 - (r * Math.cos(lon * DEG)) / (2 * HALF_EXTENT_M);
  return fx >= 0 && fx <= 1 && fy >= 0 && fy <= 1 ? [fx, fy] : null;
}

function fromMap(fx: number, fy: number): { lat: number; lon: number } {
  const x = (fx - 0.5) * 2 * HALF_EXTENT_M;
  const y = (0.5 - fy) * 2 * HALF_EXTENT_M;
  const lat = -90 + (2 * Math.atan(Math.hypot(x, y) / (2 * R_M))) / DEG;
  return { lat, lon: Math.atan2(x, y) / DEG };
}

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

export function SouthPoleMap({
  sites,
  current,
  onPickSite,
  onPickPoint,
}: {
  sites: Site[];
  current: { lat: number; lon: number } | null;
  onPickSite: (id: string) => void;
  onPickPoint: (lat: number, lon: number) => void;
}) {
  const [hover, setHover] = useState<{ lat: number; lon: number } | null>(null);
  const fraction = (e: React.MouseEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    return fromMap((e.clientX - box.left) / box.width, (e.clientY - box.top) / box.height);
  };
  const markers = sites.flatMap((s) => {
    const p = toMap(s.lat, s.lon);
    return p ? [{ site: s, p }] : [];
  });
  const here = current ? toMap(current.lat, current.lon) : null;

  return (
    <Card size="sm">
      <CardHeader className="flex items-baseline justify-between gap-2">
        <CardTitle>South pole map</CardTitle>
        <span className="text-xs text-muted-foreground tabular-nums">{hover ? formatLatLon(hover.lat, hover.lon) : "80°S–90°S"}</span>
      </CardHeader>
      <CardContent className="grid gap-2">
        <div
          className="relative aspect-square w-full cursor-crosshair overflow-hidden rounded-3xl"
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
          <span className={`${tag} top-1.5 left-1/2 -translate-x-1/2`}>0° · toward Earth ↑</span>
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
              className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background transition-transform hover:scale-150"
              style={{ left: `${p[0] * 100}%`, top: `${p[1] * 100}%`, background: KIND_COLOR[site.kind] ?? "white" }}
            />
          ))}
          {here && (
            <span
              aria-hidden
              className="pointer-events-none absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
              style={{ left: `${here[0] * 100}%`, top: `${here[1] * 100}%` }}
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground">Click a dot for a curated site, or anywhere for that point (240 m terrain).</p>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {LEGEND.map(([kind, label]) => (
            <li key={kind} className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full" style={{ background: KIND_COLOR[kind] }} />
              {label}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
