import { formatDuration, formatLatLon, formatPercent, formatUtc } from "../lib/format";
import type { BodyMetrics, Scenario } from "../lib/types";

function headline(m: BodyMetrics, names: { up: string; down: string; rises: string; sets: string }): string {
  if (m.up_at_start)
    return m.hours_until_change === null
      ? `${names.up} for the whole mission`
      : `${names.up} — ${names.sets} in ${formatDuration(m.hours_until_change)}`;
  return m.hours_until_change === null
    ? `${names.down} for the whole mission`
    : `${names.down} — ${names.rises} in ${formatDuration(m.hours_until_change)}`;
}

function Headline({ label, text, up, color }: { label: string; text: string; up: boolean; color: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="flex items-center gap-2 text-sm text-muted">
        <span className="inline-block h-3 w-3 rounded-full" style={{ background: up ? color : "transparent", border: `2px solid ${color}` }} />
        {label}
      </div>
      <p className="mt-1 text-xl font-semibold leading-snug">{text}</p>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel px-3 py-2">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </div>
  );
}

/** The answer to "how long will we have sunlight and contact with Earth?" for one scenario. */
export function Results({ scenario }: { scenario: Scenario }) {
  const { sun, earth, both_percent, sun_elevation_at_start_deg, solar_w_m2 } = scenario.metrics;
  const days = (scenario.end - scenario.start) / 86400;
  return (
    <section className="space-y-3">
      <p className="text-sm text-muted">
        {scenario.site.name} ({formatLatLon(scenario.site.lat, scenario.site.lon)}) · landing {formatUtc(scenario.start)} ·{" "}
        {formatDuration(days * 24)} mission
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Headline
          label="Sunlight"
          up={sun.up_at_start}
          color="var(--sun)"
          text={headline(sun, { up: "Sun is up", down: "Sun is down", rises: "sunrise", sets: "sunset" })}
        />
        <Headline
          label="Contact with Earth"
          up={earth.up_at_start}
          color="var(--earth)"
          text={headline(earth, { up: "Earth in view", down: "Earth hidden", rises: "Earthrise", sets: "Earthset" })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Sunlit" value={formatPercent(sun.visible_percent)} hint={formatDuration(sun.visible_hours)} />
        <Stat label="Longest dark" value={formatDuration(sun.longest_hidden_hours)} />
        <Stat label="Earth in view" value={formatPercent(earth.visible_percent)} hint={formatDuration(earth.visible_hours)} />
        <Stat label="Longest blackout" value={formatDuration(earth.longest_hidden_hours)} />
        <Stat label="Sun + Earth" value={formatPercent(both_percent)} />
        <Stat
          label="Sun at landing"
          value={`${sun_elevation_at_start_deg.toFixed(2)}°`}
          hint={`${sun.disk_percent_at_start.toFixed(0)}% of disk visible`}
        />
        <Stat
          label="Sunlight on vertical panel"
          value={`${Math.round(solar_w_m2.vertical_avg)} W/m²`}
          hint="mission average, panel turned to face the Sun"
        />
        <Stat
          label="Sunlight on flat panel"
          value={`${Math.round(solar_w_m2.horizontal_avg)} W/m²`}
          hint="mission average, panel lying flat"
        />
      </div>
      <p className="text-xs text-muted">
        Terrain: {scenario.site.terrain} · site elevation {scenario.site_height_m.toFixed(0)} m vs 1737.4 km sphere · lander
        height {scenario.lander_height_m} m. &ldquo;Longest&rdquo; gaps are within this mission window.
      </p>
    </section>
  );
}
