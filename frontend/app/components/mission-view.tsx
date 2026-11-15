"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { COLORS } from "../lib/colors";
import { horizonAt } from "../lib/format";
import type { Scenario, Site } from "../lib/types";
import { type MissionClock, MissionPlayer } from "./mission-player";
import { SkyChart } from "./sky-chart";
import { TimelineChart } from "./timeline-chart";

// three.js is large: load the 3D views only when their tab is opened, and never on the server.
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

/** Watch the mission play out: the skyline around the lander and the 3D views, all on the mission clock. */
export function MissionViews({ scenario, sites, clock }: { scenario: Scenario; sites: Site[]; clock: MissionClock }) {
  const s = scenario.series;
  const { index } = clock;
  const [view, setView] = useState("skyline");
  const [opened, setOpened] = useState(() => new Set(["skyline"])); // 3D views mount the first time they're opened
  const sunUp = s.sun_el[index] > horizonAt(scenario, s.sun_az[index]);
  const earthUp = s.earth_el[index] > horizonAt(scenario, s.earth_az[index]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Watch the mission</CardTitle>
        <CardDescription>
          Press play to see the Sun and Earth move along the real skyline of hills and crater rims around the lander:
          each is visible only while it is above that skyline.
        </CardDescription>
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
            <TabsTrigger value="skyline" className={TAB}>
              360° skyline
            </TabsTrigger>
            <TabsTrigger value="pole3d" className={TAB}>
              3D south pole
            </TabsTrigger>
            <TabsTrigger value="globe" className={TAB}>
              Globe
            </TabsTrigger>
          </TabsList>
          <div className="grid grid-cols-1 *:col-start-1 *:row-start-1">
            <TabsContent value="skyline" forceMount className={VIEW_PANEL}>
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
            <TabsContent value="pole3d" forceMount className={VIEW_PANEL}>
              <div className="h-[360px]">
                {opened.has("pole3d") && (
                  <SouthPole3D
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
                  <MoonGlobe sites={sites} site={scenario.site} subsolar={{ lat: s.subsolar_lat[index], lon: s.subsolar_lon[index] }} />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Lit by the Sun at the time on the mission slider, so the day/night line is real. White dot = this site. Drag
                to rotate, scroll to zoom. Texture: NASA&apos;s Scientific Visualization Studio (CGI Moon Kit, LRO data).
              </p>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
