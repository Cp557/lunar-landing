import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** "How we calculate this": method, data, validation and limits, in plain language. */
export function Method() {
  return (
    <Card id="method">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} className="size-5 text-muted-foreground" />
          How we calculate this
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 leading-relaxed">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-3xl bg-muted/50 p-4">
          <h3 className="font-semibold">1. Where are the Sun and Earth?</h3>
          <p className="mt-1 text-muted-foreground">
            NASA JPL&apos;s <a className="underline underline-offset-2 hover:text-foreground" href="https://ssd.jpl.nasa.gov/horizons/">Horizons</a> system gives the
            point on the Moon directly under the Sun and under Earth, every 30 minutes for 2026–2030, in the Moon&apos;s
            mean-Earth frame. From those we compute exactly where each appears in the sky from any landing site, including
            Earth&apos;s parallax.
          </p>
        </div>
        <div className="rounded-3xl bg-muted/50 p-4">
          <h3 className="font-semibold">2. What does the horizon look like?</h3>
          <p className="mt-1 text-muted-foreground">
            We read elevation maps from NASA&apos;s Lunar Orbiter Laser Altimeter (LOLA) and cast 720 rays from the lander
            (2 m above the ground) out to 300 km, placing every sample exactly on the curved Moon. The highest terrain angle
            in each direction is the local horizon. There is no air, so no refraction: the horizon is just rock and the edge
            of the sphere.
          </p>
        </div>
        <div className="rounded-3xl bg-muted/50 p-4">
          <h3 className="font-semibold">3. Sunlight and Earth contact</h3>
          <p className="mt-1 text-muted-foreground">
            The lander has <b>sunlight</b> when the Sun&apos;s center is above the terrain in its direction, and{" "}
            <b>Earth contact</b> when Earth&apos;s center is. We also report how much of the Sun&apos;s disk shows. Rise
            and set times are interpolated between 10-minute samples. Sunlight on a panel is the solar constant (1361
            W/m² at 1 AU) scaled by the Sun&apos;s distance and visible disk, times cos(elevation) for a vertical panel
            facing the Sun or sin(elevation) for a flat one, before any panel efficiency.
          </p>
        </div>
        <div className="rounded-3xl bg-muted/50 p-4">
          <h3 className="font-semibold">Why the south pole is so hard</h3>
          <p className="mt-1 text-muted-foreground">
            At the pole the Sun never climbs more than about 1.5° above a flat horizon; it circles around the sky once a
            month. Earth bobs up and down about ±7° as the Moon wobbles (libration). So a ridge a few degrees high, or a
            landing site a few hundred meters away, can turn two weeks of power into darkness.
          </p>
        </div>
      </div>

      <div>
        <h3 className="font-semibold">How we checked it</h3>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            Sun and Earth directions match Horizons&apos; own answers for observers on the lunar surface to within{" "}
            <b>0.0002° (Sun)</b> and <b>0.006° (Earth)</b> across 250 test cases.
          </li>
          <li>
            Physics sanity checks: equatorial sites get ~50% daylight over a lunar month and see Earth 100% of the time;
            far-side sites never see Earth; the floor of Shackleton crater (a permanently shadowed region) gets{" "}
            <b>0% sunlight</b> over 2026–2030.
          </li>
          <li>
            Against a published illumination study (Gläser et al. 2018, Planetary and Space Science, 20 m LOLA maps,
            2017–2037), our 2026–2030 average illumination is <b>80.0% vs 81.0%</b> on Shackleton&apos;s rim and{" "}
            <b>85.7% vs 88.0%</b> on the Shackleton–de Gerlache connecting ridge (2 m above ground).
          </li>
          <li>Terrain math is tested against shapes with known answers (smooth sphere, walls at known distances).</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold">Limits</h3>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            Terrain detail matters: curated south-pole sites use 20 m near-field maps; custom coordinates use 120 m maps near the pole and 240 m farther out,
            and are approximate. Outside 75°S–90°S the Moon is treated as a smooth sphere.
          </li>
          <li>
            &ldquo;Contact&rdquo; means Earth is above the local horizon; it assumes a Deep Space Network station on Earth
            can see the Moon at that time (true most of the time with three stations).
          </li>
          <li>
            The Good/Fair/Poor mission ratings are our rule of thumb (hover the (i) next to &ldquo;Mission brief&rdquo;),
            not a NASA standard.
          </li>
          <li>
            The map layers (sunlight %, Earth contact %, live shadows) use coarser terrain (240–720 m) and are
            approximate. The 3D views stretch heights so low terrain is easy to see;
            directions and positions are exact.
          </li>
          <li>Dates are limited to 2026–2030, the period of the cached ephemeris.</li>
        </ul>
      </div>

      <p className="text-xs text-muted-foreground">
        Data: JPL Horizons (NASA/JPL-Caltech); LRO LOLA gridded topography (NASA GSFC, PDS Geosciences node,
        imbrium.mit.edu). Site coordinates are cited per site.
      </p>
      </CardContent>
    </Card>
  );
}
