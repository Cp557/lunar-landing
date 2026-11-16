"use client";

import { Calendar03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

// Dates the cached ephemeris covers; times are whole UTC hours.
const FIRST_DAY = new Date(2026, 0, 1);
const LAST_DAY = new Date(2030, 11, 31);
const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Landing date (a calendar in a popover, styled like the rest of the app) and hour, both UTC.
 * `value` is "YYYY-MM-DDTHH:mm". Calendar days are plain local dates, so no time-zone shift can move them.
 */
function LandingPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [date = "", time = "00:00"] = value.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const day = new Date(y, m - 1, d);
  const valid = !Number.isNaN(day.getTime());
  const hours = HOURS.includes(time) ? HOURS : [...HOURS, time].sort(); // keep a non-whole hour from a shared link

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id="start"
            type="button"
            className="flex h-9 w-full min-w-0 items-center gap-2 rounded-3xl border border-transparent bg-input/50 px-3 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {valid ? day.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "Choose a date"}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={valid ? day : undefined}
            defaultMonth={valid ? day : FIRST_DAY}
            captionLayout="dropdown"
            startMonth={FIRST_DAY}
            endMonth={LAST_DAY}
            disabled={[{ before: FIRST_DAY }, { after: LAST_DAY }]}
            onSelect={(picked) => {
              if (!picked) return;
              onChange(`${picked.getFullYear()}-${pad(picked.getMonth() + 1)}-${pad(picked.getDate())}T${time}`);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      <Select value={time} onValueChange={(t) => onChange(`${date}T${t}`)}>
        <SelectTrigger aria-label="Landing hour (UTC)" className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {hours.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
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

/** Site, landing date and mission length. There is no submit button: the page re-evaluates on every change. */
export function ScenarioForm({ sites, form, onChange }: { sites: Site[]; form: FormState; onChange: (f: FormState) => void }) {
  const set = (patch: Partial<FormState>) => onChange({ ...form, ...patch });
  const site = sites.find((s) => s.id === form.siteId);

  return (
    <Card size="sm">
      <CardContent>
        <div className="grid gap-4">
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
              <LandingPicker value={form.start} onChange={(start) => set({ start })} />
            </Field>
            <Field id="days" label="Mission length (days)">
              <Input id="days" type="number" min={1} max={365} step={1} required value={form.days} onChange={(e) => set({ days: e.target.value })} />
            </Field>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
