"use client";

import { useEffect, useState } from "react";

import { formatDuration, formatUtc, horizonAt } from "../lib/format";
import type { Scenario } from "../lib/types";
import { SkyChart } from "./sky-chart";
import { MarginChart, TimelineChart } from "./timeline-chart";

const FRAME_MS = 80;
const FRAMES_PER_MISSION = 150; // about 12 s to play a whole mission

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-panel p-4">
      <h2 className="font-semibold">{title}</h2>
      <p className="mb-2 text-sm text-muted">{subtitle}</p>
      {children}
    </section>
  );
}

function Status({ label, color, up, el, disk }: { label: string; color: string; up: boolean; el: number; disk: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: up ? color : "transparent", border: `2px solid ${color}` }} />
      {label} {up ? "visible" : "hidden"} ({el.toFixed(2)}°, {Math.round(disk * 100)}% of disk)
    </span>
  );
}

/** Sky view and timelines with a shared time cursor that can be scrubbed or played. */
export function MissionView({ scenario }: { scenario: Scenario }) {
  const s = scenario.series;
  const last = s.t.length - 1;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const atEnd = index >= last;
  const isPlaying = playing && !atEnd;

  useEffect(() => {
    if (!isPlaying) return;
    const step = Math.max(1, Math.ceil(last / FRAMES_PER_MISSION));
    const timer = setInterval(() => setIndex((i) => Math.min(i + step, last)), FRAME_MS);
    return () => clearInterval(timer);
  }, [isPlaying, last]);

  const t = s.t[index];
  const sunUp = s.sun_el[index] > horizonAt(scenario, s.sun_az[index]);
  const earthUp = s.earth_el[index] > horizonAt(scenario, s.earth_az[index]);

  return (
    <>
      <Card
        title="Sky from the landing site"
        subtitle="Gray area is the terrain horizon. Orange and blue trace the Sun and Earth over the mission while visible; gray dots are where they are hidden behind terrain. Press play to watch the mission."
      >
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (atEnd) setIndex(0);
              setPlaying(atEnd || !isPlaying);
            }}
            className="w-20 rounded-md border border-earth px-3 py-1 text-sm font-semibold text-earth hover:bg-earth/10"
          >
            {isPlaying ? "Pause" : atEnd ? "Replay" : "Play"}
          </button>
          <input
            type="range"
            min={0}
            max={last}
            value={index}
            onChange={(e) => {
              setPlaying(false);
              setIndex(Number(e.target.value));
            }}
            aria-label="Mission time"
            className="min-w-40 flex-1 accent-[var(--earth)]"
          />
          <span className="text-sm tabular-nums text-muted">
            {formatUtc(t)} · +{formatDuration((t - scenario.start) / 3600)}
          </span>
        </div>
        <p className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Status label="Sun" color="var(--sun)" up={sunUp} el={s.sun_el[index]} disk={s.sun_disk[index]} />
          <Status label="Earth" color="var(--earth)" up={earthUp} el={s.earth_el[index]} disk={s.earth_disk[index]} />
        </p>
        <SkyChart scenario={scenario} index={index} />
      </Card>
      <Card title="Timeline" subtitle="When the Sun and Earth are above the local horizon, and by how much. The white line is the time shown above.">
        <TimelineChart scenario={scenario} time={t} />
        <MarginChart scenario={scenario} time={t} />
      </Card>
    </>
  );
}
