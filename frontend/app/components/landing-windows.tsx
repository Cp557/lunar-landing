"use client";

import * as Plot from "@observablehq/plot";
import { useCallback, useState } from "react";

import { fetchLandingWindows } from "../lib/api";
import { COLORS } from "../lib/colors";
import { formatDuration, formatUtc } from "../lib/format";
import type { LandingWindow, LandingWindows, ScenarioQuery } from "../lib/types";
import { PlotFigure } from "./plot-figure";

const SERIES = [
  { key: "sun_percent", label: "Sunlit", color: COLORS.sun },
  { key: "earth_percent", label: "Earth in view", color: COLORS.earth },
  { key: "both_percent", label: "Both", color: COLORS.both },
] as const;

/** Best landing dates for the current site: metrics for every landing day over the next year. */
export function LandingWindowsPanel({ query, onPick }: { query: ScenarioQuery; onPick: (start: number) => void }) {
  const [data, setData] = useState<LandingWindows | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = async () => {
    setBusy(true);
    setError(null);
    try {
      setData(await fetchLandingWindows(query));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const render = useCallback(
    (width: number) => {
      const rows = (data?.windows ?? []).flatMap((w) =>
        SERIES.map((s) => ({ date: new Date(w.start * 1000), value: w[s.key], series: s.label, start: w.start })),
      );
      const plot = Plot.plot({
        width,
        height: 240,
        marginLeft: 44,
        style: { background: "transparent", color: COLORS.muted, fontSize: "12px" },
        x: { type: "utc", label: "Landing date" },
        y: { domain: [0, 100], grid: true, label: "% of mission" },
        color: { domain: SERIES.map((s) => s.label), range: SERIES.map((s) => s.color), legend: true },
        marks: [
          Plot.line(rows, { x: "date", y: "value", stroke: "series", strokeWidth: 1.5 }),
          Plot.ruleX(rows, Plot.pointerX({ x: "date", stroke: COLORS.muted })),
          Plot.tip(rows, Plot.pointerX({ x: "date", y: "value", title: (d) => `${d.series}: ${d.value}%` })),
        ],
      });
      plot.addEventListener("click", () => {
        const picked = (plot as unknown as { value?: { start: number } }).value;
        if (picked) onPick(picked.start);
      });
      return plot;
    },
    [data, onPick],
  );

  const best = [...(data?.windows ?? [])]
    .sort((a, b) => b.both_percent - a.both_percent || b.sun_percent - a.sun_percent)
    .slice(0, 5);

  return (
    <section className="rounded-xl border border-line bg-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Best landing dates</h2>
          <p className="text-sm text-muted">
            Same site and mission length, landing on each day of the next year (hourly resolution). Click the chart or a
            date to load it.
          </p>
        </div>
        <button
          type="button"
          onClick={scan}
          disabled={busy}
          className="rounded-md border border-earth px-3 py-1.5 text-sm font-semibold text-earth hover:bg-earth/10 disabled:opacity-50"
        >
          {busy ? "Scanning…" : data ? "Rescan" : "Scan next 12 months"}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
      {data && (
        <>
          <PlotFigure render={render} />
          <h3 className="mt-3 text-sm font-semibold">Top dates by time with both Sun and Earth</h3>
          <ol className="mt-1 grid gap-1 text-sm sm:grid-cols-2">
            {best.map((w: LandingWindow) => (
              <li key={w.start}>
                <button type="button" onClick={() => onPick(w.start)} className="w-full rounded-md px-2 py-1 text-left hover:bg-night">
                  <span className="font-medium">{formatUtc(w.start).slice(0, 10)}</span>
                  <span className="text-muted">
                    {" "}
                    · both {w.both_percent}% · sunlit {w.sun_percent}% · longest dark {formatDuration(w.longest_dark_hours)}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
