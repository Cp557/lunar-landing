import type { Interval, Scenario } from "./types";

/** "45 min", "5 h 20 min", "9 d 4 h". */
export function formatDuration(hours: number): string {
  const minutes = Math.round(hours * 60);
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 48 * 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }
  const totalHours = Math.round(hours);
  const d = Math.floor(totalHours / 24);
  const h = totalHours % 24;
  return h ? `${d} d ${h} h` : `${d} d`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(value >= 99.5 || value < 1 ? 0 : 1)}%`;
}

export function formatUtc(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

export function formatLatLon(lat: number, lon: number): string {
  const ns = lat < 0 ? "S" : "N";
  const ew = lon < 0 ? "W" : "E";
  return `${Math.abs(lat).toFixed(3)}°${ns}, ${Math.abs(lon).toFixed(3)}°${ew}`;
}

/** Spans where both lists of intervals overlap. */
export function intersect(a: Interval[], b: Interval[]): Interval[] {
  const out: Interval[] = [];
  for (const [a0, a1] of a)
    for (const [b0, b1] of b) {
      const start = Math.max(a0, b0);
      const end = Math.min(a1, b1);
      if (end > start) out.push([start, end]);
    }
  return out;
}

/** Terrain horizon elevation at an azimuth (linear interpolation, wraps at 360). */
export function horizonAt(s: Scenario, azimuth: number): number {
  const { azimuth_deg: az, elevation_deg: el } = s.horizon;
  const step = az[1] - az[0];
  const x = (((azimuth % 360) + 360) % 360) / step;
  const i = Math.floor(x) % el.length;
  const f = x - Math.floor(x);
  return el[i] * (1 - f) + el[(i + 1) % el.length] * f;
}
