"use client";

import * as Plot from "@observablehq/plot";
import { useCallback, useMemo } from "react";

import { COLORS } from "../lib/colors";
import { horizonAt } from "../lib/format";
import type { Scenario } from "../lib/types";
import { type PlotElement, PlotFigure, overlayLayer, svg } from "./plot-figure";

const COMPASS: [number, string][] = [
  [0, "N"],
  [90, "E"],
  [180, "S"],
  [270, "W"],
];

type Point = { x: number; el: number; run: number };

/**
 * Where the panorama starts: the middle of the widest stretch of directions with nothing visible in it,
 * so the Sun's and Earth's visible paths don't split across the two edges.
 */
function leftEdge(visibleAz: number[]): number {
  const az = [...new Set(visibleAz.map((a) => ((a % 360) + 360) % 360))].sort((a, b) => a - b);
  let widest = 0;
  let left = 0;
  az.forEach((a, i) => {
    const gap = (i + 1 < az.length ? az[i + 1] : az[0] + 360) - a;
    if (gap > widest) {
      widest = gap;
      left = (a + gap / 2) % 360;
    }
  });
  return left;
}

/** The visible stretches of a path; each unbroken stretch gets its own `run` (split behind hills and at the edges). */
function visibleRuns(s: Scenario, az: number[], el: number[], toX: (az: number) => number): Point[] {
  const points: Point[] = [];
  let run = 0;
  let last = NaN;
  for (let i = 0; i < az.length; i++) {
    if (el[i] <= horizonAt(s, az[i])) {
      last = NaN;
      continue;
    }
    const x = toX(az[i]);
    if (Number.isNaN(last) || Math.abs(x - last) > 180) run++;
    points.push({ x, el: el[i], run });
    last = x;
  }
  return points;
}

/** Everything the chart draws for one scenario. The vertical range is fixed per scenario, so Play never rescales it. */
function skyLayout(s: Scenario) {
  const { sun_az, sun_el, earth_az, earth_el } = s.series;
  const visibleAz = [...sun_az.filter((a, i) => sun_el[i] > horizonAt(s, a)), ...earth_az.filter((a, i) => earth_el[i] > horizonAt(s, a))];
  const left = leftEdge(visibleAz);
  const toX = (az: number) => (((az - left) % 360) + 360) % 360;
  const sun = visibleRuns(s, sun_az, sun_el, toX);
  const earth = visibleRuns(s, earth_az, earth_el, toX);

  const hills = s.horizon.elevation_deg;
  const yMin = Math.max(-12, Math.min(...hills) - 1);
  const highest = Math.max(...hills, ...sun.map((p) => p.el), ...earth.map((p) => p.el));
  const yMax = Math.min(90, Math.max(highest + 1, yMin + 6));

  const edge = horizonAt(s, left);
  const terrain = [
    { x: 0, el: edge },
    ...s.horizon.azimuth_deg.map((az, i) => ({ x: toX(az), el: hills[i] })).sort((a, b) => a.x - b.x),
    { x: 360, el: edge },
  ];
  const compass = new Map(COMPASS.map(([az, name]) => [toX(az), name]));
  return { toX, sun, earth, terrain, compass, yMin, yMax };
}

/**
 * The view all the way around the lander: the hills on the horizon and the stretches of the Sun's and
 * Earth's paths that are above them (hidden stretches are not drawn). Markers show the slider time.
 * No height axis: the readouts above the chart give the heights.
 */
export function SkyChart({ scenario, index }: { scenario: Scenario; index: number }) {
  const layout = useMemo(() => skyLayout(scenario), [scenario]);

  const render = useCallback(
    (width: number) => {
      const { sun, earth, terrain, compass, yMin, yMax } = layout;
      return Plot.plot({
        width,
        height: Math.max(240, Math.min(320, width * 0.36)),
        marginTop: 24,
        marginLeft: 12,
        marginRight: 12,
        style: { background: "transparent", color: COLORS.muted, fontSize: "12px", fontFamily: COLORS.font },
        x: { domain: [0, 360], ticks: [...compass.keys()], tickFormat: (d: number) => compass.get(d), tickSize: 0, label: null },
        y: { domain: [yMin, yMax], axis: null },
        marks: [
          Plot.areaY(terrain, { x: "x", y1: yMin, y2: "el", fill: COLORS.terrain, fillOpacity: 0.8, curve: "step" }),
          Plot.line(sun, { x: "x", y: "el", z: "run", stroke: COLORS.sun, strokeWidth: 3, strokeLinecap: "round" }),
          Plot.line(earth, { x: "x", y: "el", z: "run", stroke: COLORS.earth, strokeWidth: 3, strokeLinecap: "round" }),
        ],
      }) as PlotElement;
    },
    [layout],
  );

  const overlay = useCallback(
    (plot: PlotElement) => {
      const g = overlayLayer(plot);
      const x = plot.scale("x");
      const y = plot.scale("y");
      if (!x || !y) return;
      const { toX, yMin, yMax } = layout;
      const s = scenario.series;
      const bodies = [
        { name: "Sun", az: s.sun_az[index], el: s.sun_el[index], color: COLORS.sun },
        { name: "Earth", az: s.earth_az[index], el: s.earth_el[index], color: COLORS.earth },
      ];
      for (const b of bodies) {
        const visible = b.el > horizonAt(scenario, b.az);
        const cx = x.apply(toX(b.az));
        const cy = y.apply(Math.min(yMax, Math.max(yMin, b.el))); // far behind the hills: on the bottom edge
        g.append(svg("circle", { cx, cy, r: 7, fill: visible ? b.color : COLORS.track, stroke: b.color, "stroke-width": 2 }));
        g.append(
          svg(
            "text",
            {
              x: cx,
              y: cy - 13,
              "text-anchor": "middle",
              fill: COLORS.text,
              "font-weight": 600,
              "font-size": 12,
              style: "paint-order: stroke; stroke: var(--card); stroke-width: 4px; stroke-linejoin: round",
            },
            b.name,
          ),
        );
      }
    },
    [layout, scenario, index],
  );

  return (
    <PlotFigure
      render={render}
      overlay={overlay}
      label="The hills around the lander with the visible parts of the Sun's and Earth's paths during the mission"
    />
  );
}
