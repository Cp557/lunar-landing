"use client";

import { Calendar03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as Plot from "@observablehq/plot";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
        style: { background: "transparent", color: COLORS.muted, fontSize: "12px", fontFamily: COLORS.font },
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
    <Card>
      <CardHeader>
        <CardTitle>Best landing dates</CardTitle>
        <CardDescription>
          Same site and mission length, landing on each day of the next year (hourly resolution). Click the chart or a date
          to load it.
        </CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" onClick={scan} disabled={busy}>
            <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} data-icon="inline-start" />
            {busy ? "Scanning…" : data ? "Rescan" : "Scan next 12 months"}
          </Button>
        </CardAction>
      </CardHeader>
      {(error || data) && (
        <CardContent className="grid gap-3">
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {data && (
            <>
              <PlotFigure
                render={render}
                label="Chart of percent of mission sunlit, with Earth in view, and both, for each landing date over the next year"
              />
              <div>
                <h3 className="text-sm font-medium">Top dates by time with both Sun and Earth</h3>
                <ol className="mt-1 grid gap-1 text-sm sm:grid-cols-2">
                  {best.map((w: LandingWindow) => (
                    <li key={w.start}>
                      <Button variant="ghost" className="h-auto w-full justify-start py-1.5 text-left whitespace-normal" onClick={() => onPick(w.start)}>
                        <span>
                          <span className="font-medium">{formatUtc(w.start).slice(0, 10)}</span>
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            · both {w.both_percent}% · sunlit {w.sun_percent}% · longest dark {formatDuration(w.longest_dark_hours)}
                          </span>
                        </span>
                      </Button>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
