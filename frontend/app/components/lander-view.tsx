"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

import { COLORS } from "../lib/colors";
import { horizonAt } from "../lib/format";
import type { Scenario } from "../lib/types";

const FOV_DEG = 120;
const HEIGHT = 300;
const COMPASS: [number, string][] = [
  [0, "N"],
  [45, "NE"],
  [90, "E"],
  [135, "SE"],
  [180, "S"],
  [225, "SW"],
  [270, "W"],
  [315, "NW"],
];
// Fixed pseudo-random stars (x, y as fractions of the view, radius px).
const STARS = Array.from({ length: 90 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return { x: r(1), y: r(2) * 0.8, size: 0.4 + r(3) * 1.1, alpha: 0.3 + r(4) * 0.6 };
});

/** Signed difference a - b in degrees, wrapped to [-180, 180). */
const wrap = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

type Look = "sun" | "earth" | "free";

/** SVG path of Earth's lit part, bright limb toward +x, for illuminated fraction k (0 new … 1 full). */
function litPath(r: number, k: number): string {
  const rx = Math.abs(1 - 2 * k) * r;
  const sweep = k >= 0.5 ? 1 : 0; // terminator bulges away from (k>=0.5) or toward (k<0.5) the Sun
  return `M 0 ${-r} A ${r} ${r} 0 0 1 0 ${r} A ${rx} ${r} 0 0 ${sweep} 0 ${-r} Z`;
}

/**
 * First-person view from the lander: the real terrain skyline, a black sky with stars, and the Sun
 * and Earth (with its phase) at the selected time. Heights are stretched and the Sun and Earth are
 * drawn larger than life so they are visible; positions are exact.
 */
export function LanderView({ scenario, index }: { scenario: Scenario; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [look, setLook] = useState<Look>("sun");
  const [freeAz, setFreeAz] = useState(0);
  const drag = useRef<{ x: number; az: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const s = scenario.series;
  const sun = { az: s.sun_az[index], el: s.sun_el[index] };
  const earth = { az: s.earth_az[index], el: s.earth_el[index], lit: s.earth_lit[index] };
  const center = look === "sun" ? sun.az : look === "earth" ? earth.az : freeAz;

  // Vertical stretch: fit the skyline and the visible Sun/Earth into the view.
  const pxPerDeg = width / FOV_DEG;
  const horizon = scenario.horizon.elevation_deg;
  const top = Math.max(8, ...horizon, sun.el, earth.el) + 2;
  const bottom = Math.min(-4, ...horizon) - 1;
  const stretch = Math.min(20, Math.max(1, (HEIGHT * 0.85) / ((top - bottom) * pxPerDeg)));
  const x = (az: number) => width / 2 + wrap(az - center) * pxPerDeg;
  const y = (el: number) => HEIGHT - (el - bottom) * pxPerDeg * stretch;
  const inView = (az: number) => Math.abs(wrap(az - center)) <= FOV_DEG / 2 + 5;

  const skyline: string[] = [];
  for (let d = -FOV_DEG / 2 - 1; d <= FOV_DEG / 2 + 1; d += 0.5) {
    const az = center + d;
    skyline.push(`${(width / 2 + d * pxPerDeg).toFixed(1)},${y(horizonAt(scenario, az)).toFixed(1)}`);
  }
  const ground = `M 0 ${HEIGHT} L ${skyline.join(" L ")} L ${width} ${HEIGHT} Z`;

  const sunVisible = sun.el > horizonAt(scenario, sun.az);
  const earthVisible = earth.el > horizonAt(scenario, earth.az);
  const sunR = Math.max(11, 0.27 * pxPerDeg);
  const earthR = Math.max(16, 0.95 * pxPerDeg);
  // Earth's bright limb faces the Sun's direction on screen.
  const toSun = Math.atan2(-(sun.el - earth.el) * pxPerDeg * stretch, wrap(sun.az - earth.az) * pxPerDeg);

  return (
    <div className="grid gap-2">
      <div
        ref={ref}
        className="relative w-full cursor-grab touch-none overflow-hidden rounded-3xl select-none active:cursor-grabbing"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, az: center };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setLook("free");
          setFreeAz(drag.current.az - (e.clientX - drag.current.x) / pxPerDeg);
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
      >
        <svg width={width} height={HEIGHT} role="img" aria-label="First-person view from the lander showing the terrain skyline, the Sun and Earth">
          <defs>
            <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#02040a" />
              <stop offset="1" stopColor="#0b1222" />
            </linearGradient>
            <linearGradient id="ground" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={sunVisible ? "#8d93a0" : "#3a404c"} />
              <stop offset="1" stopColor={sunVisible ? "#3d424d" : "#14171d"} />
            </linearGradient>
            <radialGradient id="sunGlow">
              <stop offset="0" stopColor="#fff7e0" />
              <stop offset="0.35" stopColor={COLORS.sun} />
              <stop offset="1" stopColor={COLORS.sun} stopOpacity="0" />
            </radialGradient>
            <radialGradient id="earthLit" cx="0.35" cy="0.35">
              <stop offset="0" stopColor="#bfe3ff" />
              <stop offset="1" stopColor={COLORS.earth} />
            </radialGradient>
          </defs>
          <rect width={width} height={HEIGHT} fill="url(#sky)" />
          {STARS.map((st, i) => (
            <circle key={i} cx={st.x * width} cy={st.y * HEIGHT} r={st.size} fill="white" opacity={st.alpha} />
          ))}
          {inView(sun.az) && (
            <g transform={`translate(${x(sun.az)} ${y(sun.el)})`}>
              <circle r={sunR * 2.6} fill="url(#sunGlow)" opacity={0.55} />
              <circle r={sunR} fill="#fff4d6" />
            </g>
          )}
          {inView(earth.az) && (
            <g transform={`translate(${x(earth.az)} ${y(earth.el)})`}>
              <circle r={earthR} fill="#1b2a44" />
              <path d={litPath(earthR, earth.lit)} fill="url(#earthLit)" transform={`rotate(${(toSun * 180) / Math.PI})`} />
            </g>
          )}
          <path d={ground} fill="url(#ground)" stroke={sunVisible ? "#c9ced8" : "#59606d"} strokeWidth={1} />
          {inView(sun.az) && !sunVisible && (
            <circle cx={x(sun.az)} cy={y(sun.el)} r={sunR} fill="none" stroke={COLORS.sun} strokeDasharray="3 3" opacity={0.8} />
          )}
          {inView(earth.az) && !earthVisible && (
            <circle cx={x(earth.az)} cy={y(earth.el)} r={earthR} fill="none" stroke={COLORS.earth} strokeDasharray="3 3" opacity={0.8} />
          )}
          {inView(sun.az) && (
            <text x={x(sun.az)} y={y(sun.el) - sunR - 8} textAnchor="middle" fill={COLORS.text} fontSize={12} fontWeight={600}>
              {sunVisible ? "Sun" : "Sun (behind terrain)"}
            </text>
          )}
          {inView(earth.az) && (
            <text x={x(earth.az)} y={y(earth.el) - earthR - 8} textAnchor="middle" fill={COLORS.text} fontSize={12} fontWeight={600}>
              {earthVisible ? `Earth · ${Math.round(earth.lit * 100)}% lit` : "Earth (behind terrain)"}
            </text>
          )}
          {COMPASS.filter(([az]) => inView(az)).map(([az, label]) => (
            <text key={label} x={x(az)} y={HEIGHT - 8} textAnchor="middle" fill="white" opacity={0.8} fontSize={12} fontWeight={600}>
              {label}
            </text>
          ))}
        </svg>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Button variant={look === "sun" ? "secondary" : "ghost"} size="xs" onClick={() => setLook("sun")}>
          Face the Sun
        </Button>
        <Button variant={look === "earth" ? "secondary" : "ghost"} size="xs" onClick={() => setLook("earth")}>
          Face Earth
        </Button>
        <span>Drag to look around · {FOV_DEG}° wide · heights stretched ×{stretch.toFixed(1)} · Sun and Earth drawn larger than life</span>
      </div>
    </div>
  );
}
