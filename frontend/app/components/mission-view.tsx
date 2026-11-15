"use client";

import { PauseIcon, PlayIcon, Refresh01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

import { COLORS } from "../lib/colors";
import { formatDuration, formatUtc, horizonAt } from "../lib/format";
import type { Scenario } from "../lib/types";
import { SkyChart } from "./sky-chart";
import { ElevationChart, TimelineChart } from "./timeline-chart";

const FRAME_MS = 80;
const FRAMES_PER_MISSION = 150; // about 12 s to play a whole mission

function Dot({ color, hollow = false }: { color: string; hollow?: boolean }) {
  return (
    <span
      className="inline-block size-2.5 shrink-0 rounded-full"
      style={{ background: hollow ? "transparent" : color, border: `2px solid ${color}` }}
    />
  );
}

function Status({ label, color, up, el, extra }: { label: string; color: string; up: boolean; el: number; extra: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Dot color={color} hollow={!up} />
      <span>
        <b className="font-medium">{label}:</b> {up ? "yes" : "no"} <span className="text-muted-foreground">({el.toFixed(2)}° high, {extra})</span>
      </span>
    </span>
  );
}

/** Sky view and timelines with one shared time cursor that can be dragged or played. */
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
          <CardTitle>The sky from the lander</CardTitle>
          <CardDescription>
            A 360° view around the landing site. The gray shape is the real skyline of hills and crater rims; the Sun and
            Earth are visible only when they are above it. Drag the slider or press play to move through the mission.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="w-24 shrink-0"
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
              className="flex-1"
            />
          </div>
          <div className="grid gap-1 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-6">
            <span className="text-muted-foreground tabular-nums">
              Day {((t - scenario.start) / 86400).toFixed(1)} · {formatUtc(t)} (+{formatDuration((t - scenario.start) / 3600)})
            </span>
            <span className="flex flex-wrap gap-x-4 gap-y-1">
              <Status label="Sunlight" color="var(--sun)" up={sunUp} el={s.sun_el[index]} extra={`${Math.round(s.sun_disk[index] * 100)}% of disk`} />
              <Status
                label="Earth contact"
                color="var(--earth)"
                up={earthUp}
                el={s.earth_el[index]}
                extra={`Earth ${Math.round(s.earth_lit[index] * 100)}% lit`}
              />
            </span>
          </div>
          <SkyChart scenario={scenario} index={index} />
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <Dot color={COLORS.sun} /> Sun&apos;s path (visible)
            </li>
            <li className="flex items-center gap-1.5">
              <Dot color={COLORS.earth} /> Earth&apos;s path (visible)
            </li>
            <li className="flex items-center gap-1.5">
              <Dot color={COLORS.muted} /> hidden behind terrain
            </li>
            <li className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: COLORS.terrain }} /> terrain skyline
            </li>
            <li>Heights are stretched so the low skyline is easy to see.</li>
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Mission timeline</CardTitle>
          <CardDescription>
            Top: when the lander has sunlight, Earth contact, or both. Bottom: how high the Sun and Earth are above the
            skyline — above the white line means visible. The white cursor is the time chosen above.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-1">
          <TimelineChart scenario={scenario} time={t} />
          <ElevationChart scenario={scenario} time={t} />
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4" style={{ background: COLORS.sun }} /> Sun
            </li>
            <li className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4" style={{ background: COLORS.earth }} /> Earth
            </li>
            <li className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: COLORS.track }} /> below the skyline = hidden
            </li>
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
