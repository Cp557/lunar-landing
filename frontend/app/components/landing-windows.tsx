"use client";

import { Calendar03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as Plot from "@observablehq/plot";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { fetchLandingWindows } from "../lib/api";
import { COLORS } from "../lib/colors";
import { formatDuration, formatUtc } from "../lib/format";
import type { LandingWindow, LandingWindows, ScenarioQuery } from "../lib/types";
import { type PlotElement, PlotFigure } from "./plot-figure";

const DAY_MS = 86_400_000;

/**
 * Best landing dates for the current site: metrics for every landing day over the next year. It scans as
 * soon as it mounts (the page remounts it for each site and mission length, not for each date, so
 * picking a date keeps the list); Rescan repeats it from the current landing date.
 */
export function LandingWindowsPanel({ query, onPick }: { query: ScenarioQuery; onPick: (start: number) => void }) {
  const [data, setData] = useState<LandingWindows | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mountQuery] = useState(query);

  const load = useCallback(
    (q: ScenarioQuery) =>
      fetchLandingWindows(q)
        .then((d) => {
          setData(d);
          setError(null);
        })
        .catch((e: Error) => setError(e.message))
        .finally(() => setBusy(false)),
    [],
  );
  useEffect(() => {
    load(mountQuery);
  }, [load, mountQuery]);
  const scan = () => {
    setBusy(true);
    load(query);
  };

  const render = useCallback(
    (width: number) => {
      const rows = (data?.windows ?? []).map((w) => ({ ...w, date: new Date(w.start * 1000) }));
      const plot = Plot.plot({
        width,
        height: 240,
        marginLeft: 44,
        marginRight: 16,
        style: { background: "transparent", color: COLORS.muted, fontSize: "12px", fontFamily: COLORS.font },
        x: { type: "utc", label: "Landing date" },
        y: { domain: [0, 100], grid: true, label: "% of the mission" },
        marks: [
          // Main message: time with Sun and Earth together. Lines give the two parts.
          Plot.rectY(rows, { x1: "date", x2: (d) => new Date(d.date.getTime() + DAY_MS), y: "both_percent", fill: COLORS.both, fillOpacity: 0.55 }),
          Plot.line(rows, { x: "date", y: "sun_percent", stroke: COLORS.sun, strokeWidth: 1.25 }),
          Plot.line(rows, { x: "date", y: "earth_percent", stroke: COLORS.earth, strokeWidth: 1.25 }),
          Plot.ruleX(rows, Plot.pointerX({ x: "date", stroke: COLORS.text })),
          Plot.tip(
            rows,
            Plot.pointerX({
              x: "date",
              y: "both_percent",
              fill: "var(--popover)", // dark box: the tip's text is the chart's muted color
              title: (d) =>
                `${d.date.toISOString().slice(0, 10)}\nBoth: ${d.both_percent}%\nSunlight: ${d.sun_percent}%\nEarth contact: ${d.earth_percent}%\nClick to load`,
            }),
          ),
        ],
      }) as PlotElement;
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
            {busy ? "Scanning…" : "Rescan"}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3">
        {!data && !error && <p className="text-sm text-muted-foreground">Scanning the next 12 months…</p>}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {data && (
          <>
            <PlotFigure
              render={render}
              label="Chart of percent of the mission with sunlight, Earth contact, and both, for each landing date over the next year"
            />
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: COLORS.both, opacity: 0.7 }} /> Sun and
                Earth together
              </li>
              <li className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4" style={{ background: COLORS.sun }} /> Sunlight
              </li>
              <li className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4" style={{ background: COLORS.earth }} /> Earth contact
              </li>
            </ul>
            <div>
              <h3 className="text-sm font-medium">Top 5 landing dates (most time with Sun and Earth together)</h3>
              <ol className="mt-1 grid gap-1 text-sm sm:grid-cols-2">
                {best.map((w: LandingWindow) => (
                  <li key={w.start}>
                    <Button variant="ghost" className="h-auto w-full justify-start py-1.5 text-left whitespace-normal" onClick={() => onPick(w.start)}>
                      <span>
                        <span className="font-medium">{formatUtc(w.start).slice(0, 10)}</span>
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          · both {w.both_percent}% · sunlight {w.sun_percent}% · longest darkness {formatDuration(w.longest_dark_hours)}
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
    </Card>
  );
}
