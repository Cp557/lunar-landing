"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { COLORS } from "../lib/colors";
import { horizonAt } from "../lib/format";
import type { Scenario } from "../lib/types";

const COMPASS: [number, string][] = [
  [0, "N"],
  [90, "E"],
  [180, "S"],
  [270, "W"],
];

/**
 * Bird's-eye sky map: north up, east right (like the south-pole map). The rim is low in the sky
 * and the center is high, so the Sun's circle around the polar sky shows as a ring.
 * Only heights between `bottom` and `top` are shown, stretched to fill the circle.
 */
export function SkyDome({ scenario, index }: { scenario: Scenario; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(360);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setSize(Math.min(el.clientWidth, 420)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const s = scenario.series;
  const R = size / 2 - 22;
  const c = size / 2;
  const horizon = scenario.horizon.elevation_deg;
  const visibleEl = s.sun_el
    .filter((el, i) => el > horizonAt(scenario, s.sun_az[i]))
    .concat(s.earth_el.filter((el, i) => el > horizonAt(scenario, s.earth_az[i])));
  const top = Math.min(90, Math.ceil(Math.max(10, ...horizon, ...visibleEl) + 2));
  const bottom = Math.max(-12, Math.floor(Math.min(-4, ...horizon) - 1));

  const point = (az: number, el: number): [number, number] => {
    const r = (R * (top - Math.min(top, el))) / (top - bottom);
    const a = (az * Math.PI) / 180;
    return [c + r * Math.sin(a), c - r * Math.cos(a)];
  };

  // Static layer (terrain + paths) is memoized so moving the time only redraws the two markers.
  const staticLayer = useMemo(() => {
    const ring = scenario.horizon.azimuth_deg.map((az, i) => point(az, scenario.horizon.elevation_deg[i]).join(",")).join(" L ");
    const outer = `M ${c} ${c - R - 4} A ${R + 4} ${R + 4} 0 1 1 ${c - 0.01} ${c - R - 4} Z`;
    const path = (az: number[], el: number[], color: string) =>
      az.map((a, i) => {
        if (el[i] < bottom) return null;
        const [x, y] = point(a, el[i]);
        const visible = el[i] > horizonAt(scenario, a);
        return <circle key={i} cx={x} cy={y} r={visible ? 1.4 : 1} fill={visible ? color : COLORS.muted} opacity={visible ? 1 : 0.35} />;
      });
    return (
      <g>
        <circle cx={c} cy={c} r={R + 4} fill="#05070d" />
        {/* terrain: everything between the rim and the skyline */}
        <path d={`${outer} M ${ring} Z`} fill={COLORS.terrain} fillRule="evenodd" opacity={0.85} />
        <circle cx={c} cy={c} r={(R * top) / (top - bottom)} fill="none" stroke={COLORS.muted} strokeDasharray="3 3" opacity={0.5} />
        {path(s.sun_az, s.sun_el, COLORS.sun)}
        {path(s.earth_az, s.earth_el, COLORS.earth)}
        {COMPASS.map(([az, label]) => {
          const a = (az * Math.PI) / 180;
          return (
            <text key={label} x={c + (R + 14) * Math.sin(a)} y={c - (R + 14) * Math.cos(a) + 4} textAnchor="middle" fill={COLORS.text} fontSize={12} fontWeight={600}>
              {label}
            </text>
          );
        })}
      </g>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- point() depends only on these values
  }, [scenario, size, top, bottom]);

  const markers = [
    { name: "Sun", az: s.sun_az[index], el: s.sun_el[index], color: COLORS.sun },
    { name: "Earth", az: s.earth_az[index], el: s.earth_el[index], color: COLORS.earth },
  ].filter((b) => b.el >= bottom);

  return (
    <div ref={ref} className="grid justify-items-center gap-2">
      <svg width={size} height={size} role="img" aria-label="Round sky map: rim is the horizon, center is overhead, with the Sun's and Earth's paths">
        {staticLayer}
        {markers.map((b) => {
          const [x, y] = point(b.az, b.el);
          const visible = b.el > horizonAt(scenario, b.az);
          return (
            <g key={b.name}>
              <circle cx={x} cy={y} r={7} fill={visible ? b.color : COLORS.track} stroke={b.color} strokeWidth={2} />
              <text x={x} y={y - 12} textAnchor="middle" fill={COLORS.text} fontSize={12} fontWeight={600}>
                {b.name}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="text-xs text-muted-foreground">
        Bird&apos;s-eye sky map, north up and east right. Rim = {bottom}° (low), center = {top}° (high), heights stretched;
        dashed circle = level (0°); gray = terrain skyline.
      </p>
    </div>
  );
}
