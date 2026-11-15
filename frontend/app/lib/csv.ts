import { horizonAt } from "./format";
import type { Scenario } from "./types";

/** Scenario timeline as CSV (one row per sample, UTC). */
export function scenarioCsv(s: Scenario): string {
  const header = [
    "time_utc",
    "hours_after_landing",
    "sun_azimuth_deg",
    "sun_elevation_deg",
    "terrain_horizon_at_sun_deg",
    "sunlight",
    "sun_disk_visible_pct",
    "earth_azimuth_deg",
    "earth_elevation_deg",
    "terrain_horizon_at_earth_deg",
    "earth_contact",
    "earth_lit_pct",
  ];
  const r = s.series;
  const rows = r.t.map((t, i) => {
    const sunHorizon = horizonAt(s, r.sun_az[i]);
    const earthHorizon = horizonAt(s, r.earth_az[i]);
    return [
      new Date(t * 1000).toISOString(),
      ((t - s.start) / 3600).toFixed(2),
      r.sun_az[i],
      r.sun_el[i],
      sunHorizon.toFixed(3),
      r.sun_el[i] > sunHorizon ? 1 : 0,
      (r.sun_disk[i] * 100).toFixed(1),
      r.earth_az[i],
      r.earth_el[i],
      earthHorizon.toFixed(3),
      r.earth_el[i] > earthHorizon ? 1 : 0,
      (r.earth_lit[i] * 100).toFixed(1),
    ].join(",");
  });
  return [header.join(","), ...rows].join("\n");
}

export function downloadCsv(s: Scenario): void {
  const name = (s.site.id ?? `${s.site.lat.toFixed(3)}_${s.site.lon.toFixed(3)}`).replace(/[^\w.-]/g, "_");
  const date = new Date(s.start * 1000).toISOString().slice(0, 10);
  const url = URL.createObjectURL(new Blob([scenarioCsv(s)], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `lunar-landing_${name}_${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
