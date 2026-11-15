"use client";

import { Rocket01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

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

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <Label htmlFor={id} className="text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

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
    <Card size="sm">
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <Field id="site" label="Landing site">
            <Select value={form.siteId || undefined} onValueChange={(siteId) => set({ siteId })}>
              <SelectTrigger id="site" className="w-full min-w-0">
                {/* !block + truncate: long names end in "…" instead of widening the form */}
                <SelectValue placeholder="Choose a site" className="!block truncate" />
              </SelectTrigger>
              <SelectContent>
                {GROUPS.map(([group, label]) => (
                  <SelectGroup key={group}>
                    <SelectLabel>{label}</SelectLabel>
                    {sites
                      .filter((s) => s.group === group)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                ))}
                <SelectGroup>
                  <SelectLabel>Other</SelectLabel>
                  <SelectItem value={CUSTOM}>Custom coordinates…</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          {site && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {site.note}{" "}
              <a className="underline underline-offset-2 hover:text-foreground" href={site.source_url} target="_blank" rel="noreferrer">
                Source
              </a>
            </p>
          )}
          {form.siteId === CUSTOM && (
            <div className="grid grid-cols-2 gap-3">
              <Field id="lat" label="Latitude (°, south −)">
                <Input id="lat" type="number" step="any" min={-90} max={90} required value={form.lat} onChange={(e) => set({ lat: e.target.value })} />
              </Field>
              <Field id="lon" label="Longitude (°, east +)">
                <Input id="lon" type="number" step="any" min={-180} max={360} required value={form.lon} onChange={(e) => set({ lon: e.target.value })} />
              </Field>
              <p className="col-span-2 text-xs text-muted-foreground">
                Real terrain from 75°S to the pole (120 m near the pole, 240 m farther out; approximate); smooth Moon elsewhere.
              </p>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Field id="start" label="Landing (UTC)">
              <Input
                id="start"
                type="datetime-local"
                min="2026-01-01T00:00"
                max="2030-12-31T00:00"
                required
                value={form.start}
                onChange={(e) => set({ start: e.target.value })}
              />
            </Field>
            <Field id="days" label="Mission length (days)">
              <Input id="days" type="number" min={1} max={365} step={1} required value={form.days} onChange={(e) => set({ days: e.target.value })} />
            </Field>
          </div>
          <Button type="submit" disabled={busy} size="lg" className="w-full">
            <HugeiconsIcon icon={Rocket01Icon} strokeWidth={2} data-icon="inline-start" />
            {busy ? "Calculating…" : "Evaluate landing"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
