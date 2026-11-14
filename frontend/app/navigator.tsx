"use client";

import { useCallback, useEffect, useState } from "react";

import { CompareTable } from "./components/compare";
import { LandingWindowsPanel } from "./components/landing-windows";
import { Results } from "./components/results";
import { CUSTOM, type FormState, ScenarioForm, toQuery } from "./components/scenario-form";
import { SkyChart } from "./components/sky-chart";
import { MarginChart, TimelineChart } from "./components/timeline-chart";
import { fetchScenario, fetchSites } from "./lib/api";
import type { Scenario, ScenarioQuery, Site } from "./lib/types";

const DEFAULT_FORM: FormState = { siteId: "", lat: "-89.5", lon: "0", start: "2026-12-01T00:00", days: "14" };
const MAX_COMPARE = 3;

const toInputValue = (unixSeconds: number) => new Date(unixSeconds * 1000).toISOString().slice(0, 16);

/** The query that reproduces a computed scenario (same site, start and length). */
function queryFor(s: Scenario): ScenarioQuery {
  const where = s.site.id ? { site: s.site.id } : { lat: s.site.lat, lon: s.site.lon };
  return { ...where, start: new Date(s.start * 1000).toISOString(), days: Math.round((s.end - s.start) / 86400) };
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-panel p-4">
      <h2 className="font-semibold">{title}</h2>
      <p className="mb-2 text-sm text-muted">{subtitle}</p>
      {children}
    </section>
  );
}

export function Navigator() {
  const [sites, setSites] = useState<Site[]>([]);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [compare, setCompare] = useState<Scenario[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const evaluate = useCallback(async (f: FormState) => {
    setBusy(true);
    setError(null);
    try {
      setScenario(await fetchScenario(toQuery(f)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    fetchSites()
      .then((list) => {
        setSites(list);
        const first = list.find((s) => s.group === "south_pole") ?? list[0];
        const initial = { ...DEFAULT_FORM, siteId: first ? first.id : CUSTOM };
        setForm(initial);
        evaluate(initial);
      })
      .catch((e: Error) => setError(e.message));
  }, [evaluate]);

  const pickDate = useCallback(
    (start: number) => {
      const next = { ...form, start: toInputValue(start) };
      setForm(next);
      evaluate(next);
    },
    [form, evaluate],
  );

  const inCompare = scenario !== null && compare.includes(scenario);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
        <ScenarioForm sites={sites} form={form} onChange={setForm} onSubmit={() => evaluate(form)} busy={busy} />
        {scenario && (
          <button
            type="button"
            disabled={inCompare || compare.length >= MAX_COMPARE}
            onClick={() => setCompare([...compare, scenario])}
            className="w-full rounded-md border border-line px-4 py-2 text-sm hover:bg-panel disabled:opacity-50"
          >
            {inCompare ? "Added to comparison" : compare.length >= MAX_COMPARE ? "Comparison full (3)" : "Add to comparison"}
          </button>
        )}
      </aside>
      <div className="min-w-0 space-y-4">
        {error && (
          <p role="alert" className="rounded-lg border border-red-400/50 bg-red-950/40 px-4 py-3 text-sm">
            {error}
          </p>
        )}
        {!scenario && !error && <p className="text-muted">Loading…</p>}
        {compare.length > 0 && <CompareTable scenarios={compare} onRemove={(i) => setCompare(compare.filter((_, j) => j !== i))} />}
        {scenario && (
          <div className={`space-y-4 transition-opacity ${busy ? "opacity-60" : ""}`}>
            <Results scenario={scenario} />
            <Card
              title="Sky from the landing site"
              subtitle="Gray area is the terrain horizon. Orange and blue trace the Sun and Earth over the mission while visible; gray dots are where they are hidden behind terrain."
            >
              <SkyChart scenario={scenario} />
            </Card>
            <Card title="Timeline" subtitle="When the Sun and Earth are above the local horizon, and by how much.">
              <TimelineChart scenario={scenario} />
              <MarginChart scenario={scenario} />
            </Card>
            <LandingWindowsPanel
              key={`${scenario.site.lat},${scenario.site.lon}`}
              query={queryFor(scenario)}
              onPick={pickDate}
            />
          </div>
        )}
      </div>
    </div>
  );
}
