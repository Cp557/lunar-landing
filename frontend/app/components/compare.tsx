import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { formatDuration, formatPercent, formatUtc } from "../lib/format";
import type { Scenario } from "../lib/types";

type Row = {
  label: string;
  score: (s: Scenario) => number; // used to highlight the best scenario
  text: (s: Scenario) => string;
  higherIsBetter: boolean;
};

const missionHours = (s: Scenario) => (s.end - s.start) / 3600;

/** Hours of sunlight from touchdown until the first sunset (0 if dark at landing). */
const sunlightAtLanding = (s: Scenario) =>
  s.metrics.sun.up_at_start ? (s.metrics.sun.hours_until_change ?? missionHours(s)) : 0;

const ROWS: Row[] = [
  {
    label: "Sunlight from landing",
    score: sunlightAtLanding,
    text: (s) =>
      !s.metrics.sun.up_at_start
        ? "dark at landing"
        : s.metrics.sun.hours_until_change === null
          ? "whole mission"
          : formatDuration(s.metrics.sun.hours_until_change),
    higherIsBetter: true,
  },
  { label: "Sunlight", score: (s) => s.metrics.sun.visible_percent, text: (s) => formatPercent(s.metrics.sun.visible_percent), higherIsBetter: true },
  { label: "Longest darkness", score: (s) => s.metrics.sun.longest_hidden_hours, text: (s) => formatDuration(s.metrics.sun.longest_hidden_hours), higherIsBetter: false },
  { label: "Earth contact", score: (s) => s.metrics.earth.visible_percent, text: (s) => formatPercent(s.metrics.earth.visible_percent), higherIsBetter: true },
  { label: "Longest blackout", score: (s) => s.metrics.earth.longest_hidden_hours, text: (s) => formatDuration(s.metrics.earth.longest_hidden_hours), higherIsBetter: false },
  { label: "Both at once", score: (s) => s.metrics.both_percent, text: (s) => formatPercent(s.metrics.both_percent), higherIsBetter: true },
];

/** Side-by-side metrics for saved scenarios; the best value in each row is highlighted. */
export function CompareTable({ scenarios, onRemove }: { scenarios: Scenario[]; onRemove: (i: number) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparison</CardTitle>
        <CardDescription>Saved scenarios side by side. Green marks the best value in each row.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="align-top">Scenario</TableHead>
              {scenarios.map((s, i) => (
                <TableHead key={i} className="h-auto py-2 align-top whitespace-normal">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-foreground">{s.site.name}</div>
                      <div className="text-xs font-normal">
                        {formatUtc(s.start)} · {formatDuration(missionHours(s))}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon-xs" aria-label={`Remove ${s.site.name}`} onClick={() => onRemove(i)}>
                      <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
                    </Button>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROWS.map((row) => {
              const scores = scenarios.map(row.score);
              const best = row.higherIsBetter ? Math.max(...scores) : Math.min(...scores);
              return (
                <TableRow key={row.label}>
                  <TableCell className="text-muted-foreground">{row.label}</TableCell>
                  {scenarios.map((s, i) => (
                    <TableCell
                      key={i}
                      className={`tabular-nums ${scenarios.length > 1 && scores[i] === best ? "font-semibold text-both" : ""}`}
                    >
                      {row.text(s)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
