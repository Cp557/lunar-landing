"use client";

import * as Plot from "@observablehq/plot";
import { useCallback } from "react";

import { COLORS } from "../lib/colors";
import { formatPercent, horizonAt, intersect } from "../lib/format";
import type { Interval, Scenario } from "../lib/types";
import { type PlotElement, PlotFigure, overlayLayer, svg } from "./plot-figure";

// Both charts share these so their time axes line up exactly.
const MARGIN = { left: 128, right: 52 };
const DAY = 86400;

const days = (s: Scenario, t: number) => (t - s.start) / DAY;
const xAxis = (s: Scenario) => ({ domain: [0, days(s, s.end)], label: "Days after landing", labelAnchor: "center" as const });

/** Vertical cursor line at mission time `time` (unix seconds), drawn on top without rebuilding. */
function cursor(scenario: Scenario, time: number) {
  return (plot: PlotElement) => {
    const g = overlayLayer(plot);
    const x = plot.scale("x");
    const y = plot.scale("y");
    if (!x || !y?.range) return;
    const cx = x.apply(days(scenario, time));
    const [y0, y1] = [Math.min(...y.range), Math.max(...y.range)];
    g.append(svg("line", { x1: cx, x2: cx, y1: y0, y2: y1, stroke: COLORS.text, "stroke-width": 1.5 }));
  };
}

/** When the site has sunlight, Earth contact, and both. */
export function TimelineChart({ scenario, time }: { scenario: Scenario; time: number }) {
  const render = useCallback(
    (width: number) => {
      const { sun, earth } = scenario.intervals;
      const m = scenario.metrics;
      const rows = [
        { name: `Sunlight ${formatPercent(m.sun.visible_percent)}`, spans: sun, color: COLORS.sun },
        { name: `Earth contact ${formatPercent(m.earth.visible_percent)}`, spans: earth, color: COLORS.earth },
        { name: `Both ${formatPercent(m.both_percent)}`, spans: intersect(sun, earth), color: COLORS.both },
      ];
      const bars = rows.flatMap((r) =>
        r.spans.map(([a, b]: Interval) => ({ row: r.name, x1: days(scenario, a), x2: days(scenario, b), color: r.color })),
      );
      const end = days(scenario, scenario.end);
      return Plot.plot({
        width,
        height: 112,
        marginTop: 4,
        marginLeft: MARGIN.left,
        marginRight: MARGIN.right,
        style: { background: "transparent", color: COLORS.muted, fontSize: "12px", fontFamily: COLORS.font },
        x: { ...xAxis(scenario), axis: null },
        y: { domain: rows.map((r) => r.name), label: null, tickSize: 0 },
        marks: [
          Plot.barX(rows, { x1: 0, x2: end, y: "name", fill: COLORS.track, rx: 4 }),
          Plot.barX(bars, { x1: "x1", x2: "x2", y: "row", fill: "color", insetTop: 3, insetBottom: 3, rx: 3 }),
        ],
      }) as PlotElement;
    },
    [scenario],
  );
  const overlay = useCallback((plot: PlotElement) => cursor(scenario, time)(plot), [scenario, time]);
  return (
    <PlotFigure
      render={render}
      overlay={overlay}
      label="Timeline bars showing when the site has sunlight, Earth contact, and both"
    />
  );
}

/** How far above (or below) the terrain horizon the Sun and Earth are; above the line = visible. */
export function ElevationChart({ scenario, time }: { scenario: Scenario; time: number }) {
  const render = useCallback(
    (width: number) => {
      const s = scenario.series;
      const points = s.t.flatMap((t, i) => [
        { day: days(scenario, t), margin: s.sun_el[i] - horizonAt(scenario, s.sun_az[i]), body: "Sun" },
        { day: days(scenario, t), margin: s.earth_el[i] - horizonAt(scenario, s.earth_az[i]), body: "Earth" },
      ]);
      const margins = points.map((p) => p.margin);
      const lo = Math.max(-15, Math.floor(Math.min(-2, ...margins)));
      const hi = Math.min(90, Math.ceil(Math.max(2, ...margins)));
      return Plot.plot({
        width,
        height: 200,
        marginLeft: MARGIN.left,
        marginRight: MARGIN.right,
        style: { background: "transparent", color: COLORS.muted, fontSize: "12px", fontFamily: COLORS.font },
        x: xAxis(scenario),
        y: { domain: [lo, hi], grid: true, label: "Above the horizon (°)", clamp: true },
        color: { domain: ["Sun", "Earth"], range: [COLORS.sun, COLORS.earth] },
        marks: [
          // Below the terrain horizon = hidden.
          Plot.rectY([0], { x1: 0, x2: days(scenario, scenario.end), y1: lo, y2: 0, fill: COLORS.track, fillOpacity: 0.6 }),
          Plot.text(["hidden behind terrain"], { frameAnchor: "bottom-left", dx: 6, dy: -4, fill: COLORS.muted, fontSize: 11 }),
          Plot.ruleY([0], { stroke: COLORS.text, strokeOpacity: 0.8 }),
          Plot.line(points, { x: "day", y: "margin", z: "body", stroke: "body", strokeWidth: 1.75 }),
        ],
      }) as PlotElement;
    },
    [scenario],
  );
  const overlay = useCallback((plot: PlotElement) => cursor(scenario, time)(plot), [scenario, time]);
  return (
    <PlotFigure
      render={render}
      overlay={overlay}
      label="Line chart of how far the Sun and Earth are above the terrain horizon over the mission"
    />
  );
}
