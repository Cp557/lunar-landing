"use client";

import { PauseIcon, PlayIcon, Refresh01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { COLORS } from "../lib/colors";
import { formatUtc, horizonAt } from "../lib/format";
import type { Scenario, Site } from "../lib/types";
import { SkyChart } from "./sky-chart";
import { SkyDome } from "./sky-dome";
import { ElevationChart, TimelineChart } from "./timeline-chart";

// three.js is large: load the globe only when its tab is opened, and never on the server.
const MoonGlobe = dynamic(() => import("./moon-globe"), {
  ssr: false,
  loading: () => <p className="text-sm text-muted-foreground">Loading globe…</p>,
});

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

/** Signed degrees with two decimals and a real minus sign: "+1.07°", "−29.97°". */
const degrees = (value: number) => `${value < 0 ? "\u2212" : "+"}${Math.abs(value).toFixed(2)}°`;

/**
 * One live readout tile. Labels sit on the left and values on the right edge, with tabular digits
 * and no wrapping, so values changing every frame never move anything else on the page.
 */
function Readout({ title, rows }: { title: React.ReactNode; rows: [string, React.ReactNode][] }) {
  return (
    <div className="grid content-start gap-0.5 rounded-2xl px-3 py-2 text-xs whitespace-nowrap ring-1 ring-foreground/10 sm:text-sm">
      <div className="flex items-center gap-1.5 font-medium">{title}</div>
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3">
          <span className="text-muted-foreground">{label}</span>
          <span className="tabular-nums">{value}</span>
        </div>
      ))}
    </div>
  );
}

/** Sky view and timelines with one shared time cursor that can be dragged or played. */
export function MissionView({
  scenario,
  sites,
  index,
  setIndex,
}: {
  scenario: Scenario;
  sites: Site[];
  index: number;
  setIndex: (update: number | ((i: number) => number)) => void;
}) {
  const s = scenario.series;
  const last = s.t.length - 1;
  const [playing, setPlaying] = useState(false);
  const atEnd = index >= last;
  const isPlaying = playing && !atEnd;

  useEffect(() => {
    if (!isPlaying) return;
    const step = Math.max(1, Math.ceil(last / FRAMES_PER_MISSION));
    const timer = setInterval(() => setIndex((i) => Math.min(i + step, last)), FRAME_MS);
    return () => clearInterval(timer);
  }, [isPlaying, last, setIndex]);

  const t = s.t[index];
  const totalDays = Number(((scenario.end - scenario.start) / 86400).toFixed(1));
  const sunUp = s.sun_el[index] > horizonAt(scenario, s.sun_az[index]);
  const earthUp = s.earth_el[index] > horizonAt(scenario, s.earth_az[index]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>The sky from the lander</CardTitle>
          <CardDescription>
            The real skyline of hills and crater rims around the landing site. The Sun and Earth are visible only when they
            are above it. Drag the slider or press play to move through the mission; switch views below.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid min-w-0 gap-3">
          <div className="flex min-w-0 items-center gap-3">
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
          <div className="grid max-w-4xl grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="col-span-2 sm:col-span-1">
              <Readout
                title="Mission time"
                rows={[
                  ["Day", `${((t - scenario.start) / 86400).toFixed(1)} of ${totalDays}`],
                  ["UTC", formatUtc(t).replace(" UTC", "")],
                ]}
              />
            </div>
            <Readout
              title={
                <>
                  <Dot color="var(--sun)" hollow={!sunUp} /> Sunlight: {sunUp ? "yes" : "no"}
                </>
              }
              rows={[
                ["Sun height", degrees(s.sun_el[index])],
                ["Disk visible", `${Math.round(s.sun_disk[index] * 100)}%`],
              ]}
            />
            <Readout
              title={
                <>
                  <Dot color="var(--earth)" hollow={!earthUp} /> Earth contact: {earthUp ? "yes" : "no"}
                </>
              }
              rows={[
                ["Earth height", degrees(s.earth_el[index])],
                ["Earth lit", `${Math.round(s.earth_lit[index] * 100)}%`],
              ]}
            />
          </div>
          <Tabs defaultValue="panorama">
            <TabsList className="w-full sm:w-fit">
              <TabsTrigger value="panorama" className="px-2 text-xs sm:px-3 sm:text-sm">
                360° chart
              </TabsTrigger>
              <TabsTrigger value="dome" className="px-2 text-xs sm:px-3 sm:text-sm">
                Sky map
              </TabsTrigger>
              <TabsTrigger value="globe" className="px-2 text-xs sm:px-3 sm:text-sm">
                Globe
              </TabsTrigger>
            </TabsList>
            <TabsContent value="panorama" className="grid gap-2 pt-2">
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
            </TabsContent>
            <TabsContent value="dome" className="pt-2">
              <SkyDome scenario={scenario} index={index} />
            </TabsContent>
            <TabsContent value="globe" className="pt-2">
              <MoonGlobe
                sites={sites}
                site={scenario.site}
                subsolar={{ lat: s.subsolar_lat[index], lon: s.subsolar_lon[index] }}
              />
            </TabsContent>
          </Tabs>
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
