"use client";

import type { ScenarioQuery, Site } from "../lib/types";

export type FormState = {
  siteId: string; // a curated id, or CUSTOM
  lat: string;
  lon: string;
  start: string; // "YYYY-MM-DDTHH:mm", interpreted as UTC
  days: string;
};

export const CUSTOM = "custom";

const GROUPS: [Site["group"], string][] = [
  ["south_pole", "South pole"],
  ["historical", "Near side (historical)"],
  ["far_side", "Far side"],
];

export function toQuery(f: FormState): ScenarioQuery {
  const base = { start: `${f.start}:00Z`, days: Number(f.days) };
  return f.siteId === CUSTOM ? { ...base, lat: Number(f.lat), lon: Number(f.lon) } : { ...base, site: f.siteId };
}

const input =
  "w-full rounded-md border border-line bg-night px-3 py-2 text-foreground focus:border-earth focus:outline-none";

export function ScenarioForm({
  sites,
  form,
  onChange,
  onSubmit,
  busy,
}: {
  sites: Site[];
  form: FormState;
  onChange: (f: FormState) => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  const set = (patch: Partial<FormState>) => onChange({ ...form, ...patch });
  const site = sites.find((s) => s.id === form.siteId);

  return (
    <form
      className="space-y-3 rounded-xl border border-line bg-panel p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label className="block text-sm">
        <span className="text-muted">Landing site</span>
        <select className={input} value={form.siteId} onChange={(e) => set({ siteId: e.target.value })}>
          {GROUPS.map(([group, label]) => (
            <optgroup key={group} label={label}>
              {sites
                .filter((s) => s.group === group)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </optgroup>
          ))}
          <option value={CUSTOM}>Custom coordinates…</option>
        </select>
      </label>
      {site && (
        <p className="text-xs text-muted">
          {site.note}{" "}
          <a className="underline" href={site.source_url} target="_blank" rel="noreferrer">
            Source
          </a>
        </p>
      )}
      {form.siteId === CUSTOM && (
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm">
            <span className="text-muted">Latitude (°, south −)</span>
            <input className={input} type="number" step="any" min={-90} max={90} required value={form.lat} onChange={(e) => set({ lat: e.target.value })} />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Longitude (°, east +)</span>
            <input className={input} type="number" step="any" min={-180} max={360} required value={form.lon} onChange={(e) => set({ lon: e.target.value })} />
          </label>
          <p className="col-span-2 text-xs text-muted">Real terrain between 75°S and 90°S (240 m, approximate); smooth Moon elsewhere.</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm">
          <span className="text-muted">Landing (UTC)</span>
          <input
            className={input}
            type="datetime-local"
            min="2026-01-01T00:00"
            max="2030-12-31T00:00"
            required
            value={form.start}
            onChange={(e) => set({ start: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Mission length (days)</span>
          <input className={input} type="number" min={1} max={365} step={1} required value={form.days} onChange={(e) => set({ days: e.target.value })} />
        </label>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-earth px-4 py-2 font-semibold text-night transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Calculating…" : "Evaluate landing"}
      </button>
    </form>
  );
}
