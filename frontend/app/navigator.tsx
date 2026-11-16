"use client";

import { Add01Icon, Alert02Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { CompareTable } from "./components/compare";
import { LandingWindowsPanel } from "./components/landing-windows";
import { Answer, Details } from "./components/results";
import { CUSTOM, type FormState, ScenarioForm, toQuery } from "./components/scenario-form";
import { MissionPlayer, useMissionClock } from "./components/mission-player";
import { MissionTimeline, MissionViews } from "./components/mission-view";
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
  // One mission time (sample index) for the whole page: the map's shadows and every view follow it.
  const clock = useMissionClock(scenario ? scenario.series.t.length - 1 : 0);
  const { index, reset: resetClock } = clock;

  const evaluate = useCallback(async (f: FormState) => {
    setBusy(true);
    setError(null);
    try {
      setScenario(await fetchScenario(toQuery(f)));
      resetClock();
      window.history.replaceState(null, "", urlFor(f));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [resetClock]);

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
  const pickDate = useCallback(
    (start: number) => {
      run({ start: toInputValue(start) });
      // The best-dates list is far down the page: bring the answer it changes into view.
      document.getElementById("answer")?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [run],
  );

  const inCompare = scenario !== null && compare.includes(scenario);

  const dim = `transition-opacity ${busy ? "opacity-60" : ""}`;

  return (
    <div className="space-y-4">
      {/*
        Hero: the big map on the left (its column is as wide as the map square, --map-size), the form and
        the answer on the right. Below lg it stacks as form, map, answer.
      */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,calc(var(--map-size)+2rem))_minmax(340px,1fr)] lg:grid-rows-[auto_1fr]">
        <div className="min-w-0 space-y-3 lg:col-start-2">
          <ScenarioForm sites={sites} form={form} onChange={setForm} onSubmit={() => evaluate(form)} busy={busy} />
          {scenario && (
            <Button
              variant="outline"
              className="w-full"
              disabled={inCompare || compare.length >= MAX_COMPARE}
              onClick={() => setCompare([...compare, scenario])}
            >
              <HugeiconsIcon icon={inCompare ? Tick02Icon : Add01Icon} strokeWidth={2} data-icon="inline-start" />
              {inCompare ? "Added to comparison" : compare.length >= MAX_COMPARE ? "Comparison full (3)" : "Add to comparison"}
            </Button>
          )}
        </div>
        <div className="min-w-0 lg:col-start-1 lg:row-[1/span_2]">
          <SouthPoleMap
            sites={sites.filter((s) => s.group === "south_pole")}
            current={scenario ? scenario.site : null}
            subsolar={scenario ? { lat: scenario.series.subsolar_lat[index], lon: scenario.series.subsolar_lon[index] } : null}
            onPickSite={(id) => run({ siteId: id })}
            onPickPoint={(lat, lon) => run({ siteId: CUSTOM, lat: lat.toFixed(4), lon: lon.toFixed(4) })}
          >
            {scenario && <MissionPlayer scenario={scenario} clock={clock} />}
          </SouthPoleMap>
        </div>
        <div className="min-w-0 space-y-3 lg:col-start-2">
          {error && (
            <Alert variant="destructive">
              <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
              <AlertTitle>Couldn&apos;t evaluate this landing</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!scenario && !error && <p className="text-muted-foreground">Loading…</p>}
          {scenario && (
            <div id="answer" className={`scroll-mt-4 ${dim}`}>
              <Answer scenario={scenario} />
            </div>
          )}
        </div>
      </div>
      {compare.length > 0 && <CompareTable scenarios={compare} onRemove={(i) => setCompare(compare.filter((_, j) => j !== i))} />}
      {scenario && (
        <div className={`space-y-4 ${dim}`}>
          <MissionTimeline scenario={scenario} />
          <Details scenario={scenario} />
          <MissionViews scenario={scenario} clock={clock} />
          <LandingWindowsPanel
            key={`${scenario.site.lat},${scenario.site.lon},${scenario.end - scenario.start}`}
            query={queryFor(scenario)}
            onPick={pickDate}
          />
        </div>
      )}
    </div>
  );
}
