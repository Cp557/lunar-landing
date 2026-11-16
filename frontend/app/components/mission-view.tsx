"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { horizonAt } from "../lib/format";
import type { Scenario } from "../lib/types";
import { type MissionClock, MissionPlayer } from "./mission-player";
import { TimelineChart } from "./timeline-chart";

// three.js is large: load each 3D view in the browser only, the first time its tab is shown.
const loading = () => <p className="grid h-full place-items-center text-sm text-muted-foreground">Loading 3D view…</p>;
const MoonGlobe = dynamic(() => import("./moon-globe"), { ssr: false, loading });
const SouthPole3D = dynamic(() => import("./south-pole-3d"), { ssr: false, loading });

// Every view sits in one grid cell (inactive ones invisible), so the card is always as tall as the
// tallest view and switching tabs never moves the page below. grid-cols-1 (minmax(0, 1fr)) so a
// wide canvas can't hold the column open after the window shrinks.
const VIEW_PANEL = "grid grid-cols-1 content-start gap-2 pt-2 data-[state=inactive]:invisible";
const TAB = "px-2 text-xs sm:px-3 sm:text-sm";

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

/** The whole mission at a glance: a static picture, readable without playing anything. */
export function MissionTimeline({ scenario }: { scenario: Scenario }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mission timeline</CardTitle>
        <CardDescription>
          When the lander has sunlight, Earth contact, or both, from landing to the end of the mission, and how long each
          stretch lasts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TimelineChart scenario={scenario} />
      </CardContent>
    </Card>
  );
}

/**
 * The mission in 3D, on the mission clock: the south pole (the default for sites within its 80°S edge)
 * or the whole Moon.
 */
export function MissionViews({ scenario, clock }: { scenario: Scenario; clock: MissionClock }) {
  const s = scenario.series;
  const { index } = clock;
  const [view, setView] = useState(() => (scenario.site.lat <= -80 ? "pole3d" : "globe"));
  const [opened, setOpened] = useState(() => new Set([view])); // each 3D view mounts the first time it's shown
  const sunUp = s.sun_el[index] > horizonAt(scenario, s.sun_az[index]);
  const earthUp = s.earth_el[index] > horizonAt(scenario, s.earth_az[index]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>3D view</CardTitle>
        <CardDescription>Press Play to watch sunlight and shadows move across the Moon.</CardDescription>
      </CardHeader>
      <CardContent className="grid min-w-0 gap-3">
        <MissionPlayer scenario={scenario} clock={clock} />
        <div className="grid max-w-2xl grid-cols-2 gap-2">
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
        <Tabs
          value={view}
          onValueChange={(v) => {
            setView(v);
            setOpened((o) => new Set(o).add(v));
          }}
        >
          <TabsList className="w-full sm:w-fit">
            <TabsTrigger value="pole3d" className={TAB}>
              South pole
            </TabsTrigger>
            <TabsTrigger value="globe" className={TAB}>
              Globe
            </TabsTrigger>
          </TabsList>
          <div className="grid grid-cols-1 *:col-start-1 *:row-start-1">
            <TabsContent value="pole3d" forceMount className={VIEW_PANEL}>
              <div className="h-[360px]">
                {opened.has("pole3d") && (
                  <SouthPole3D
                    active={view === "pole3d"}
                    site={scenario.site}
                    subsolar={{ lat: s.subsolar_lat[index], lon: s.subsolar_lon[index] }}
                    subearth={{ lat: s.subearth_lat[index], lon: s.subearth_lon[index] }}
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                80°S to the pole from NASA LOLA elevations, lit by the Sun at the time on the slider with the same terrain
                shadows as the map. Glow = the Sun&apos;s direction, blue dot = Earth&apos;s, white pin = this site. Heights
                ×5. Drag to orbit, scroll to zoom.
              </p>
            </TabsContent>
            <TabsContent value="globe" forceMount className={VIEW_PANEL}>
              <div className="h-[360px]">
                {opened.has("globe") && (
                  <MoonGlobe
                    active={view === "globe"}
                    site={scenario.site}
                    subsolar={{ lat: s.subsolar_lat[index], lon: s.subsolar_lon[index] }}
                    subearth={{ lat: s.subearth_lat[index], lon: s.subearth_lon[index] }}
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Centered on this site (white dot), lit by the Sun at the time on the slider, so the day/night line is real.
                Drag to turn the Moon (Earth, in blue, is in its real direction, drawn much closer than it is); scroll to zoom.
                Maps: NASA SVS CGI Moon Kit (LRO color, LOLA relief).
              </p>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
