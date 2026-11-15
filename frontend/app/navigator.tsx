"use client";

import { useCallback, useEffect, useState } from "react";

import { CompareTable } from "./components/compare";
import { LandingWindowsPanel } from "./components/landing-windows";
import { Results } from "./components/results";
import { CUSTOM, type FormState, ScenarioForm, toQuery } from "./components/scenario-form";
import { MissionView } from "./components/mission-view";
import { SouthPoleMap } from "./components/south-pole-map";
import { fetchScenario, fetchSites } from "./lib/api";
import type { Scenario, ScenarioQuery, Site } from "./lib/types";

const DEFAULT_FORM: FormState = { siteId: "", lat: "-89.5", lon: "0", start: "2026-12-01T00:00", days: "14" };
const MAX_COMPARE = 3;

const toInputValue = (unixSeconds: number) => new Date(unixSeconds * 1000).toISOString().slice(0, 16);

/** Shareable URL query for a form: ?site=…|lat=…&lon=…&start=…&days=… */
function urlFor(f: FormState): string {
  const p = new URLSearchParams(f.siteId === CUSTOM ? { lat: f.lat, lon: f.lon } : { site: f.siteId });
  p.set("start", f.start);
  p.set("days", f.days);
  return `?${p}`;
}

/** Form from the page URL, falling back to `defaults` for anything missing. */
function formFromUrl(defaults: FormState): FormState {
  const p = new URLSearchParams(window.location.search);
  const [site, lat, lon] = [p.get("site"), p.get("lat"), p.get("lon")];
  return {
    siteId: site ?? (lat && lon ? CUSTOM : defaults.siteId),
    lat: lat ?? defaults.lat,
    lon: lon ?? defaults.lon,
    start: p.get("start") ?? defaults.start,
    days: p.get("days") ?? defaults.days,
  };
}

/** The query that reproduces a computed scenario (same site, start and length). */
function queryFor(s: Scenario): ScenarioQuery {
  const where = s.site.id ? { site: s.site.id } : { lat: s.site.lat, lon: s.site.lon };
  return { ...where, start: new Date(s.start * 1000).toISOString(), days: Math.round((s.end - s.start) / 86400) };
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
      window.history.replaceState(null, "", urlFor(f));
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
        const initial = formFromUrl({ ...DEFAULT_FORM, siteId: first ? first.id : CUSTOM });
        setForm(initial);
        evaluate(initial);
      })
      .catch((e: Error) => setError(e.message));
  }, [evaluate]);

  /** Change part of the form and evaluate right away (map clicks, best-date picks). */
  const run = useCallback(
    (patch: Partial<FormState>) => {
      const next = { ...form, ...patch };
      setForm(next);
      evaluate(next);
    },
    [form, evaluate],
  );
  const pickDate = useCallback((start: number) => run({ start: toInputValue(start) }), [run]);

  const inCompare = scenario !== null && compare.includes(scenario);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <aside className="space-y-3">
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
        <SouthPoleMap
          sites={sites.filter((s) => s.group === "south_pole")}
          current={scenario ? scenario.site : null}
          onPickSite={(id) => run({ siteId: id })}
          onPickPoint={(lat, lon) => run({ siteId: CUSTOM, lat: lat.toFixed(4), lon: lon.toFixed(4) })}
        />
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
            <MissionView key={`${scenario.site.lat},${scenario.site.lon},${scenario.start},${scenario.end}`} scenario={scenario} />
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
