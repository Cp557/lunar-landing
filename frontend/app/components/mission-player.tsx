"use client";

import { PauseIcon, PlayIcon, Refresh01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

import { formatUtc } from "../lib/format";
import type { Scenario } from "../lib/types";

const FRAME_MS = 80;
const FRAMES_PER_MISSION = 150; // about 12 s to play a whole mission

/** The page's one mission time (a sample index) and playback state, shared by every player and view. */
export type MissionClock = {
  index: number;
  setIndex: (index: number) => void;
  playing: boolean;
  setPlaying: (playing: boolean) => void;
  reset: () => void;
};

/** Mission time over samples 0..last, with Play advancing it about 12 s per mission. */
export function useMissionClock(last: number): MissionClock {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const current = Math.min(index, last);
  const isPlaying = playing && current < last;

  useEffect(() => {
    if (!isPlaying) return;
    const step = Math.max(1, Math.ceil(last / FRAMES_PER_MISSION));
    const timer = setInterval(() => setIndex((i) => Math.min(i + step, last)), FRAME_MS);
    return () => clearInterval(timer);
  }, [isPlaying, last]);

  const reset = useCallback(() => {
    setIndex(0);
    setPlaying(false);
  }, []);
  return { index: current, setIndex, playing: isPlaying, setPlaying, reset };
}

/**
 * Play/Pause and the time slider. Several can sit on the page (under the map, above the views);
 * they all drive the same clock.
 */
export function MissionPlayer({ scenario, clock }: { scenario: Scenario; clock: MissionClock }) {
  const { index, setIndex, playing, setPlaying } = clock;
  const last = scenario.series.t.length - 1;
  const atEnd = index >= last;
  const t = scenario.series.t[index];
  const totalDays = Number(((scenario.end - scenario.start) / 86400).toFixed(1));
  return (
    <div className="grid min-w-0 gap-1.5">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="w-24 shrink-0"
          onClick={() => {
            if (atEnd) setIndex(0);
            setPlaying(atEnd || !playing);
          }}
        >
          <HugeiconsIcon icon={playing ? PauseIcon : atEnd ? Refresh01Icon : PlayIcon} strokeWidth={2} data-icon="inline-start" />
          {playing ? "Pause" : atEnd ? "Replay" : "Play"}
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
      {/* Fixed-length date first, growing day count last, so nothing shifts while it plays. */}
      <p className="text-xs text-muted-foreground tabular-nums">
        {formatUtc(t)} · day {((t - scenario.start) / 86400).toFixed(1)} of {totalDays}
      </p>
    </div>
  );
}
