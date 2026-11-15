"use client";

import * as Plot from "@observablehq/plot";
import { useCallback } from "react";

import { COLORS } from "../lib/colors";
import { horizonAt, intersect } from "../lib/format";
import type { Interval, Scenario } from "../lib/types";
import { PlotFigure } from "./plot-figure";

const ROWS = ["Sunlight", "Earth contact", "Both"];

function bars(row: string, spans: Interval[], color: string) {
  return spans.map(([a, b]) => ({ row, x1: new Date(a * 1000), x2: new Date(b * 1000), color }));
}

/** Vertical line at the scrubber time (unix seconds), if any. */
function cursor(time: number | undefined) {
  return time === undefined ? [] : [Plot.ruleX([new Date(time * 1000)], { stroke: COLORS.text, strokeWidth: 1.5 })];
}

/** When the Sun and Earth are above the terrain horizon over the mission. */
export function TimelineChart({ scenario, time }: { scenario: Scenario; time?: number }) {
  const render = useCallback(
    (width: number) => {
      const { sun, earth } = scenario.intervals;
      const data = [
        ...bars("Sunlight", sun, COLORS.sun),
        ...bars("Earth contact", earth, COLORS.earth),
        ...bars("Both", intersect(sun, earth), COLORS.both),
      ];
      return Plot.plot({
        width,
        height: 150,
        marginLeft: 100,
        style: { background: "transparent", color: COLORS.muted, fontSize: "12px", fontFamily: COLORS.font },
        x: { domain: [new Date(scenario.start * 1000), new Date(scenario.end * 1000)], type: "utc", label: null },
        y: { domain: ROWS, label: null },
        marks: [
          Plot.barX(ROWS, { x1: new Date(scenario.start * 1000), x2: new Date(scenario.end * 1000), y: (d: string) => d, fill: COLORS.track }),
          Plot.barX(data, { x1: "x1", x2: "x2", y: "row", fill: "color", insetTop: 4, insetBottom: 4 }),
          ...cursor(time),
        ],
      });
    },
    [scenario, time],
  );
  return <PlotFigure render={render} label="Timeline bars showing when the site is sunlit, has Earth in view, and both" />;
}

/** Elevation of the Sun and Earth above the local terrain horizon over time. */
export function MarginChart({ scenario, time }: { scenario: Scenario; time?: number }) {
  const render = useCallback(
    (width: number) => {
      const s = scenario.series;
      const points = s.t.flatMap((t, i) => [
        { t: new Date(t * 1000), margin: s.sun_el[i] - horizonAt(scenario, s.sun_az[i]), body: "Sun" },
        { t: new Date(t * 1000), margin: s.earth_el[i] - horizonAt(scenario, s.earth_az[i]), body: "Earth" },
      ]);
      const margins = points.map((p) => p.margin);
      const lo = Math.max(-15, Math.min(-2, ...margins));
      const hi = Math.min(90, Math.max(2, ...margins));
      return Plot.plot({
        width,
        height: 200,
        marginLeft: 44,
        style: { background: "transparent", color: COLORS.muted, fontSize: "12px", fontFamily: COLORS.font },
        x: { type: "utc", label: null },
        y: { domain: [lo, hi], grid: true, label: "Above terrain horizon (°)", clamp: true },
        color: { domain: ["Sun", "Earth"], range: [COLORS.sun, COLORS.earth], legend: true },
        marks: [
          Plot.ruleY([0], { stroke: COLORS.text, strokeOpacity: 0.7 }),
          Plot.line(points, { x: "t", y: "margin", stroke: "body", strokeWidth: 1.5 }),
          ...cursor(time),
        ],
      });
    },
    [scenario, time],
  );
  return <PlotFigure render={render} label="Line chart of the Sun and Earth elevation above the terrain horizon over the mission" />;
}
