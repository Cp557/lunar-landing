"use client";

import * as Plot from "@observablehq/plot";
import { useCallback } from "react";

import { COLORS } from "../lib/colors";
import { formatDuration, formatPercent, intersect } from "../lib/format";
import type { Interval, Scenario } from "../lib/types";
import { type PlotElement, PlotFigure } from "./plot-figure";

const MARGIN = { left: 128, right: 16 };
const DAY = 86400;
const PX_PER_CHAR = 6.6; // 12 px Outfit, for deciding whether a label fits inside its stretch

/** The parts of [start, end] not covered by `spans` (sorted, non-overlapping, inside it). */
function gaps(spans: Interval[], start: number, end: number): Interval[] {
  const out: Interval[] = [];
  let cursor = start;
  for (const [a, b] of spans) {
    if (a > cursor) out.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (end > cursor) out.push([cursor, end]);
  return out;
}

/**
 * The whole mission at a glance: when the lander has sunlight, Earth contact, or both. Every
 * stretch wide enough to hold a label says how long it lasts; gaps say "dark" or "no contact".
 */
export function TimelineChart({ scenario }: { scenario: Scenario }) {
  const render = useCallback(
    (width: number) => {
      const { start, end, intervals } = scenario;
      const m = scenario.metrics;
      const rows = [
        { name: `Sunlight ${formatPercent(m.sun.visible_percent)}`, spans: intervals.sun, color: COLORS.sun, gap: "dark" },
        { name: `Earth contact ${formatPercent(m.earth.visible_percent)}`, spans: intervals.earth, color: COLORS.earth, gap: "no contact" },
        { name: `Both ${formatPercent(m.both_percent)}`, spans: intersect(intervals.sun, intervals.earth), color: COLORS.both, gap: "" },
      ];
      const total = (end - start) / DAY;
      const pxPerDay = (width - MARGIN.left - MARGIN.right) / total;
      const day = (t: number) => (t - start) / DAY;
      const fits = ([a, b]: Interval, text: string) => (b - a) / DAY * pxPerDay >= text.length * PX_PER_CHAR + 14;

      const bars = rows.flatMap((r) => r.spans.map(([a, b]) => ({ row: r.name, x1: day(a), x2: day(b), color: r.color })));
      const labels = rows.flatMap((r) => [
        ...r.spans.map((s) => ({ row: r.name, span: s, text: formatDuration((s[1] - s[0]) / 3600), fill: "#0b1222" })),
        ...(r.gap ? gaps(r.spans, start, end).map((s) => ({ row: r.name, span: s, text: `${formatDuration((s[1] - s[0]) / 3600)} ${r.gap}`, fill: COLORS.muted })) : []),
      ]).filter((l) => fits(l.span, l.text));

      return Plot.plot({
        width,
        height: 3 * 42 + 44,
        marginTop: 4,
        marginBottom: 40,
        marginLeft: MARGIN.left,
        marginRight: MARGIN.right,
        style: { background: "transparent", color: COLORS.muted, fontSize: "12px", fontFamily: COLORS.font },
        x: { domain: [0, total], label: "Days after landing →", labelAnchor: "center", labelOffset: 34 },
        y: { domain: rows.map((r) => r.name), label: null, tickSize: 0, padding: 0.16 },
        marks: [
          Plot.barX(rows, { x1: 0, x2: total, y: "name", fill: COLORS.track, rx: 6 }),
          Plot.barX(bars, { x1: "x1", x2: "x2", y: "row", fill: "color", rx: 4 }),
          Plot.text(labels, {
            x: (l) => day((l.span[0] + l.span[1]) / 2),
            y: "row",
            text: "text",
            fill: "fill",
            fontSize: 12,
            fontWeight: 600,
          }),
        ],
      }) as PlotElement;
    },
    [scenario],
  );
  return (
    <PlotFigure
      render={render}
      label="Timeline of the mission showing when the lander has sunlight, Earth contact, and both, with how long each stretch lasts"
    />
  );
}
