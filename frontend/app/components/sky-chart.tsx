"use client";

import * as Plot from "@observablehq/plot";
import { useCallback } from "react";

import { COLORS } from "../lib/colors";
import { horizonAt } from "../lib/format";
import type { Scenario } from "../lib/types";
import { PlotFigure } from "./plot-figure";

const COMPASS: Record<number, string> = { 0: "N", 90: "E", 180: "S", 270: "W", 360: "N" };

type Point = { az: number; el: number; visible: boolean };

function track(s: Scenario, az: number[], el: number[]): Point[] {
  return az.map((a, i) => ({ az: a, el: el[i], visible: el[i] > horizonAt(s, a) }));
}

/** Panorama of the site's sky: terrain silhouette, the Sun and Earth paths, and markers at sample `index`. */
export function SkyChart({ scenario, index = 0 }: { scenario: Scenario; index?: number }) {
  const render = useCallback(
    (width: number) => {
      const s = scenario.series;
      const horizon = scenario.horizon.azimuth_deg.map((az, i) => ({ az, el: scenario.horizon.elevation_deg[i] }));
      horizon.push({ az: 360, el: horizon[0].el });
      const sun = track(scenario, s.sun_az, s.sun_el);
      const earth = track(scenario, s.earth_az, s.earth_el);

      const visibleEl = [...sun, ...earth].filter((p) => p.visible).map((p) => p.el);
      const top = Math.max(10, ...horizon.map((p) => p.el), ...visibleEl) + 2;
      const yMax = Math.min(90, Math.ceil(top));
      const yMin = Math.max(-12, Math.floor(Math.min(-4, ...horizon.map((p) => p.el)) - 1));
      const inView = (p: Point) => p.el >= yMin && p.el <= yMax;
      const suffix = index === 0 ? " at landing" : "";
      const current = [
        { ...sun[index], label: `Sun${suffix}`, color: COLORS.sun },
        { ...earth[index], label: `Earth${suffix}`, color: COLORS.earth },
      ].filter(inView);

      return Plot.plot({
        width,
        height: Math.max(260, Math.min(380, width * 0.42)),
        marginLeft: 44,
        style: { background: "transparent", color: COLORS.muted, fontSize: "12px" },
        x: {
          domain: [0, 360],
          ticks: [0, 45, 90, 135, 180, 225, 270, 315, 360],
          tickFormat: (d: number) => COMPASS[d] ?? `${d}°`,
          label: "Azimuth",
        },
        y: { domain: [yMin, yMax], grid: true, label: "Elevation (°)" },
        marks: [
          Plot.areaY(horizon, { x: "az", y1: yMin, y2: "el", fill: COLORS.terrain, fillOpacity: 0.55, curve: "step" }),
          Plot.line(horizon, { x: "az", y: "el", stroke: COLORS.muted, strokeWidth: 1, curve: "step" }),
          Plot.ruleY([0], { stroke: COLORS.muted, strokeDasharray: "3,3", strokeOpacity: 0.6 }),
          // Hidden stretches (behind terrain) are drawn gray so they don't read as visible.
          Plot.dot([...sun, ...earth].filter((p) => inView(p) && !p.visible), {
            x: "az",
            y: "el",
            r: 1,
            fill: COLORS.muted,
            fillOpacity: 0.35,
          }),
          Plot.dot(sun.filter((p) => inView(p) && p.visible), { x: "az", y: "el", r: 1.4, fill: COLORS.sun }),
          Plot.dot(earth.filter((p) => inView(p) && p.visible), { x: "az", y: "el", r: 1.4, fill: COLORS.earth }),
          // Current-time markers: filled when visible, hollow when hidden behind terrain.
          Plot.dot(current, {
            x: "az",
            y: "el",
            r: 6,
            fill: (d: Point & { color: string }) => (d.visible ? d.color : "#0b1d3a"),
            stroke: "color",
            strokeWidth: 2,
          }),
          Plot.text(current, {
            x: "az",
            y: "el",
            text: "label",
            dy: -12,
            fill: COLORS.text,
            fontWeight: 600,
          }),
        ],
      });
    },
    [scenario, index],
  );

  return <PlotFigure render={render} label="Panorama of the terrain horizon with the paths of the Sun and Earth during the mission" />;
}
