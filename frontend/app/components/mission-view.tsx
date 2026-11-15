"use client";

import { PauseIcon, PlayIcon, Refresh01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

import { formatDuration, formatUtc, horizonAt } from "../lib/format";
import type { Scenario } from "../lib/types";
import { SkyChart } from "./sky-chart";
import { MarginChart, TimelineChart } from "./timeline-chart";

const FRAME_MS = 80;
const FRAMES_PER_MISSION = 150; // about 12 s to play a whole mission

function Status({ label, color, up, el, disk }: { label: string; color: string; up: boolean; el: number; disk: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block size-2.5 rounded-full" style={{ background: up ? color : "transparent", border: `2px solid ${color}` }} />
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
      <Card>
        <CardHeader>
          <CardTitle>Sky from the landing site</CardTitle>
          <CardDescription>
            Gray area is the terrain horizon. Orange and blue trace the Sun and Earth while visible; gray dots are where they
            are hidden behind terrain. Press play to watch the mission.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="w-24"
              onClick={() => {
                if (atEnd) setIndex(0);
                setPlaying(atEnd || !isPlaying);
              }}
            >
              <HugeiconsIcon icon={isPlaying ? PauseIcon : atEnd ? Refresh01Icon : PlayIcon} strokeWidth={2} data-icon="inline-start" />
              {isPlaying ? "Pause" : atEnd ? "Replay" : "Play"}
            </Button>
            <Slider
              aria-label="Mission time"
              min={0}
              max={last}
              step={1}
              value={[index]}
              onValueChange={([value]) => {
                setPlaying(false);
                setIndex(value);
              }}
              className="min-w-40 flex-1"
            />
            <span className="text-sm text-muted-foreground tabular-nums">
              {formatUtc(t)} · +{formatDuration((t - scenario.start) / 3600)}
            </span>
          </div>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <Status label="Sun" color="var(--sun)" up={sunUp} el={s.sun_el[index]} disk={s.sun_disk[index]} />
            <Status label="Earth" color="var(--earth)" up={earthUp} el={s.earth_el[index]} disk={s.earth_disk[index]} />
          </p>
          <SkyChart scenario={scenario} index={index} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>
            When the Sun and Earth are above the local horizon, and by how much. The white line is the time shown above.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          <TimelineChart scenario={scenario} time={t} />
          <MarginChart scenario={scenario} time={t} />
        </CardContent>
      </Card>
    </>
  );
}
