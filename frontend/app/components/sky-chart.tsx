"use client";

import * as Plot from "@observablehq/plot";
import { useCallback } from "react";

import { COLORS } from "../lib/colors";
import { horizonAt } from "../lib/format";
import type { Scenario } from "../lib/types";
import { type PlotElement, PlotFigure, overlayLayer, svg } from "./plot-figure";

const COMPASS: Record<number, string> = { 0: "N", 45: "NE", 90: "E", 135: "SE", 180: "S", 225: "SW", 270: "W", 315: "NW", 360: "N" };

type Point = { az: number; el: number; visible: boolean };

function track(s: Scenario, az: number[], el: number[]): Point[] {
  return az.map((a, i) => ({ az: a, el: el[i], visible: el[i] > horizonAt(s, a) }));
}

/** Vertical range that shows the terrain and every visible stretch of the Sun's and Earth's paths. */
function yDomain(s: Scenario): [number, number] {
  const horizon = s.horizon.elevation_deg;
  const visible = [...track(s, s.series.sun_az, s.series.sun_el), ...track(s, s.series.earth_az, s.series.earth_el)]
    .filter((p) => p.visible)
    .map((p) => p.el);
  const top = Math.min(90, Math.ceil(Math.max(10, ...horizon, ...visible) + 2));
  const bottom = Math.max(-12, Math.floor(Math.min(-4, ...horizon) - 1));
  return [bottom, top];
}

/** 360° panorama of the sky: terrain horizon plus the Sun's and Earth's paths; markers show the selected time. */
export function SkyChart({ scenario, index }: { scenario: Scenario; index: number }) {
  const render = useCallback(
    (width: number) => {
      const s = scenario.series;
      const horizon = scenario.horizon.azimuth_deg.map((az, i) => ({ az, el: scenario.horizon.elevation_deg[i] }));
      horizon.push({ az: 360, el: horizon[0].el });
      const [yMin, yMax] = yDomain(scenario);
      const inView = (p: Point) => p.el >= yMin && p.el <= yMax;
      const sun = track(scenario, s.sun_az, s.sun_el).filter(inView);
      const earth = track(scenario, s.earth_az, s.earth_el).filter(inView);

      return Plot.plot({
        width,
        height: Math.max(260, Math.min(360, width * 0.4)),
        marginLeft: 44,
        marginRight: 16,
        style: { background: "transparent", color: COLORS.muted, fontSize: "12px", fontFamily: COLORS.font },
        x: { domain: [0, 360], ticks: Object.keys(COMPASS).map(Number), tickFormat: (d: number) => COMPASS[d], label: null },
        y: { domain: [yMin, yMax], grid: true, label: "Height in the sky (°)" },
        marks: [
          Plot.areaY(horizon, { x: "az", y1: yMin, y2: "el", fill: COLORS.terrain, fillOpacity: 0.7, curve: "step" }),
          Plot.line(horizon, { x: "az", y: "el", stroke: COLORS.muted, strokeWidth: 1, curve: "step" }),
          Plot.ruleY([0], { stroke: COLORS.muted, strokeDasharray: "3,3", strokeOpacity: 0.5 }),
          Plot.dot([...sun, ...earth].filter((p) => !p.visible), { x: "az", y: "el", r: 1, fill: COLORS.muted, fillOpacity: 0.35 }),
          Plot.dot(sun.filter((p) => p.visible), { x: "az", y: "el", r: 1.4, fill: COLORS.sun }),
          Plot.dot(earth.filter((p) => p.visible), { x: "az", y: "el", r: 1.4, fill: COLORS.earth }),
        ],
      }) as PlotElement;
    },
    [scenario],
  );

  const overlay = useCallback(
    (plot: PlotElement) => {
      const g = overlayLayer(plot);
      const x = plot.scale("x");
      const y = plot.scale("y");
      if (!x || !y) return;
      const [yMin, yMax] = y.domain as [number, number];
      const s = scenario.series;
      const bodies = [
        { name: "Sun", az: s.sun_az[index], el: s.sun_el[index], color: COLORS.sun },
        { name: "Earth", az: s.earth_az[index], el: s.earth_el[index], color: COLORS.earth },
      ];
      for (const b of bodies) {
        if (b.el < yMin || b.el > yMax) continue;
        const visible = b.el > horizonAt(scenario, b.az);
        const cx = x.apply(b.az);
        const cy = y.apply(b.el);
        g.append(svg("circle", { cx, cy, r: 7, fill: visible ? b.color : COLORS.track, stroke: b.color, "stroke-width": 2 }));
        g.append(
          svg("text", { x: cx, y: cy - 13, "text-anchor": "middle", fill: COLORS.text, "font-weight": 600, "font-size": 12 }, b.name),
        );
      }
    },
    [scenario, index],
  );

  return (
    <PlotFigure
      render={render}
      overlay={overlay}
      label="Panorama of the terrain horizon with the paths of the Sun and Earth during the mission"
    />
  );
}
