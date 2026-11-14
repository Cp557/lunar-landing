import type { LandingWindows, Scenario, ScenarioQuery, Site } from "./types";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body?.detail;
    const message = typeof detail === "string" ? detail : detail?.[0]?.msg;
    throw new Error(message ?? `Request failed (${res.status})`);
  }
  return res.json();
}

function params(q: ScenarioQuery): URLSearchParams {
  const p = new URLSearchParams({ start: q.start, days: String(q.days) });
  if (q.site) p.set("site", q.site);
  else {
    p.set("lat", String(q.lat));
    p.set("lon", String(q.lon));
  }
  return p;
}

export function fetchSites(): Promise<Site[]> {
  return fetchJson("/api/sites");
}

export function fetchScenario(q: ScenarioQuery): Promise<Scenario> {
  return fetchJson(`/api/scenario?${params(q)}`);
}

/** Metrics for landing on each of the next `count` days (mission length capped at 60 days). */
export function fetchLandingWindows(q: ScenarioQuery, count = 365): Promise<LandingWindows> {
  const p = params({ ...q, days: Math.min(q.days, 60) });
  p.set("count", String(count));
  return fetchJson(`/api/landing-windows?${p}`);
}
