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
  { label: "Sunlit", score: (s) => s.metrics.sun.visible_percent, text: (s) => formatPercent(s.metrics.sun.visible_percent), higherIsBetter: true },
  { label: "Longest dark", score: (s) => s.metrics.sun.longest_hidden_hours, text: (s) => formatDuration(s.metrics.sun.longest_hidden_hours), higherIsBetter: false },
  { label: "Earth in view", score: (s) => s.metrics.earth.visible_percent, text: (s) => formatPercent(s.metrics.earth.visible_percent), higherIsBetter: true },
  { label: "Longest blackout", score: (s) => s.metrics.earth.longest_hidden_hours, text: (s) => formatDuration(s.metrics.earth.longest_hidden_hours), higherIsBetter: false },
  { label: "Sun + Earth", score: (s) => s.metrics.both_percent, text: (s) => formatPercent(s.metrics.both_percent), higherIsBetter: true },
];

/** Side-by-side metrics for saved scenarios; the best value in each row is highlighted. */
export function CompareTable({ scenarios, onRemove }: { scenarios: Scenario[]; onRemove: (i: number) => void }) {
  return (
    <section className="rounded-xl border border-line bg-panel p-4">
      <h2 className="font-semibold">Comparison</h2>
      <p className="mb-2 text-sm text-muted">Saved scenarios side by side. Green marks the best value in each row.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="text-left align-top">
              <th className="py-2 pr-3 font-normal text-muted">Scenario</th>
              {scenarios.map((s, i) => (
                <th key={i} className="py-2 pr-3">
                  <div className="font-semibold">{s.site.name}</div>
                  <div className="font-normal text-muted">
                    {formatUtc(s.start)} · {formatDuration(missionHours(s))}
                  </div>
                  <button type="button" className="text-xs text-muted underline" onClick={() => onRemove(i)}>
                    Remove
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const scores = scenarios.map(row.score);
              const best = row.higherIsBetter ? Math.max(...scores) : Math.min(...scores);
              return (
                <tr key={row.label} className="border-t border-line">
                  <td className="py-2 pr-3 text-muted">{row.label}</td>
                  {scenarios.map((s, i) => (
                    <td
                      key={i}
                      className={`py-2 pr-3 tabular-nums ${scenarios.length > 1 && scores[i] === best ? "font-semibold text-both" : ""}`}
                    >
                      {row.text(s)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
