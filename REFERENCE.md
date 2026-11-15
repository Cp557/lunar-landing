# Technical Reference

Canonical reference for how this repo is built and run. Update it whenever architecture, interfaces, invariants, or operational behavior change.

## Layout

```
vercel.json        Vercel Services config + public routing
frontend/          Next.js 16 app (App Router, TypeScript, Tailwind v4, shadcn/ui, Observable Plot)
  components.json      shadcn config: preset b1VlJD4S (style radix-luma, Outfit font, Hugeicons), base radix
  components/ui/       shadcn components (generated; edit freely — slider thumb gets the root's aria-label)
  lib/utils.ts         `cn` class helper (shadcn)
  app/page.tsx         Page shell (header, method section, footer)
  app/layout.tsx       Fonts (Geist), metadata, favicon (/lander.svg)
  app/navigator.tsx    Client component: loads sites, runs scenarios, lays out results, syncs the URL
  app/components/      Scenario form, south-pole map, results, sky chart, timelines, comparison, best dates, method
  public/south-pole-map.png  Shaded relief 80°S–90°S (built by backend/scripts/build_basemap.py)
  public/south-pole-heights.bin  848×848 int16 heights (m) for live shadows, same projection as the relief map
  public/sunlight-map.png, earth-map.png, heatmap.json  Heat map overlays and values (build_heatmap.py)
  public/moon-texture.jpg    NASA SVS CGI Moon Kit color map (lroc_color_poles_1k) for the 3D globe
  app/lib/             API client + types, formatting helpers, chart colors
  public/lander.svg    Favicon: "Lander Galaxy" by SVG Repo, CC0 (svgrepo.com/svg/275140)
backend/           FastAPI app, managed with uv
  main.py              FastAPI `app` (entrypoint `main:app`): routes only
  lunar/               Physics package (pure functions, no I/O except loading data/)
    geometry.py          Sphere geometry, East-North-Up frames, azimuth/elevation
    ephemeris.py         Sun/Earth positions seen from any site (cached Horizons table)
    terrain.py           LOLA polar maps, horizon profiles, bare-sphere fallback
    visibility.py        Sun/Earth above the terrain horizon; visible disk fraction
    metrics.py           Rise/set crossings, visible intervals, mission metrics
    sites.py             Curated sites + choice of horizon source per site
    scenario.py          Site + start + mission length → timeline and metrics
  data/                Committed data the API loads at runtime
    ephemeris.npz        Horizons sub-solar/sub-Earth table, 2026-01-01 → 2031-01-01, 30 min
    sites.json           Curated sites with cited coordinates
    horizons.json        Precomputed high-resolution horizons for curated south-polar sites
    terrain/ldem_75s_240m.npz  Bundled 240 m LOLA map (75°S–90°S): far field for live horizons
    terrain/ldem_845s_120m.npz Bundled 120 m LOLA crop (pole to ~84.5°S + 15 km): near field for live horizons
  scripts/             One-off data builders (run locally)
    horizons.py          Minimal Horizons API client
    fetch_ephemeris.py   Builds data/ephemeris.npz
    fetch_validation.py  Builds tests/fixtures/horizons_topocentric.json
    build_terrain.py     Builds both data/terrain maps from raw-data
    build_horizons.py    Builds data/horizons.json from raw-data (run with -m)
    build_basemap.py     Builds frontend/public/south-pole-map.png + south-pole-heights.bin (run with -m)
    build_heatmap.py     Builds frontend/public/sunlight-map.png, earth-map.png, heatmap.json (run with -m; all cores, minutes)
  tests/               pytest suite (+ fixtures)
  pyproject.toml       Python deps; uv.lock pins them
raw-data/          Git-ignored downloads (LOLA LDEM_75S_120M, LDEM_85S_20M)
PLAN.md            Hackathon build plan (not a reference)
AI_USE.md          Required disclosure of AI use
```

## Architecture

One Vercel project, two [Services](https://vercel.com/docs/services) (Services is a beta Vercel feature):

| Service    | Root        | Framework | Entry        |
|------------|-------------|-----------|--------------|
| `frontend` | `frontend/` | Next.js   | —            |
| `backend`  | `backend/`  | FastAPI   | `main:app`   |

Public routing (`vercel.json` `rewrites`, evaluated in order):

1. `/api/(.*)` → `backend`
2. `/(.*)` → `frontend`

The browser calls the backend on the same origin (`fetch("/api/...")`), so there is no CORS and no backend URL to configure.

## Physics model

### Conventions
- Moon = sphere of radius 1737.4 km (same as Horizons and LOLA). Body-fixed frame MOON_ME (mean-Earth/polar axis), planetocentric latitude, east-positive longitude, degrees.
- Azimuth clockwise from local north; elevation from the local horizontal plane. At a pole, "north" is along the site's longitude meridian.
- Times are UTC unix seconds internally.

### Sun and Earth positions (`lunar/ephemeris.py`)
- `data/ephemeris.npz` stores, every 30 minutes, the sub-solar and sub-Earth points on the Moon (Horizons quantities 15 and 14, observer = Earth geocenter, target = Moon, frame MOON_ME) and the Sun–Moon and Earth–Moon distances (quantities 19, 20).
- These give Sun and Earth vectors from the Moon's center. They are interpolated linearly in time; subtracting the site position gives the topocentric direction (this handles Earth's ~0.26° parallax exactly). `sky_track(lat, lon, times, height_m)` returns azimuth, elevation and distance for both bodies. `earth_phase(...)` returns Earth's illuminated fraction seen from the site, (1 + cos i)/2 with i the Sun–Earth–site angle (tested: 0 when the Sun is behind Earth, 1 when it is behind the Moon).
- Times outside the table raise `ValueError`.
- **Validation** (`tests/test_ephemeris.py`): against 250 Horizons topocentric "airless apparent" positions (5 sites × Sun/Earth × 25 times, off the table grid), worst-case error is 0.0002° (Sun) and 0.006° (Earth; mostly aberration, which the model omits). Tolerance: 0.05°.

### Terrain horizon (`lunar/terrain.py`)
- LOLA polar maps: polar stereographic on the 1737.4 km sphere, true scale at the pole, heights = DN × 0.5 m above the sphere. Pixel ↔ position: `x = (col − c0)·scale`, `y = −(row − c0)·scale`, `c0 = N/2 − 0.5`, east lon = `atan2(x, y)`, lat = `−90° + 2·atan(r / 2R)` (from the PDS label and `DSMAP_POLAR.CAT`; orientation verified on Shackleton's floor and Malapert).
- Horizon profile: 720 rays (0.5° azimuth). Along each ray, samples one map pixel apart, each placed exactly on the sphere at great-circle distance `s` (angle `s/R`), with bilinear heights. Elevation angle from the observer at radius `R + site height + 2 m`; the profile is the max per ray. Curvature is exact, not approximated.
- Map choice per site: the finest map covering a 15 km near field supplies site height and near field; the coarsest map continues to 300 km. Beyond any map edge the bare-sphere limb is used.
- `smooth_horizon`: bare sphere through the site, limb dip `acos(r/(r + 2 m))` ≈ 0.087°.
- Sources by site (`lunar/sites.py`): curated south-polar sites → precomputed `data/horizons.json` (LOLA 20 m near field + 120 m); other points in 75°S–90°S → live from the bundled maps, 120 m near field where the 120 m crop covers a 15 km disc around the point (to about 84.5°S, label "LOLA 120 m + 240 m (approximate)") and 240 m out to 300 km ("LOLA 240 m (approximate)" when there is no 120 m near field); elsewhere → smooth sphere. The label is returned as `site.terrain`. A cold start loads both maps (~0.6 s); later live horizons take ~0.1–0.3 s.
- Resolution matters near the pole (e.g., 5-year sunlight at the pole: 25% with 20 m, 31% with a 120 m near field, 47% with 240 m only), which is why live custom-coordinate results are labelled approximate.

### Visibility and metrics (`lunar/visibility.py`, `lunar/metrics.py`)
- A body is visible when its center is above the terrain horizon at its azimuth ("sunlit", "Earth contact"). The visible disk fraction is the circular-segment area above a locally flat horizon (Sun radius 695,700 km, Earth 6,371 km).
- Timeline: 10-minute samples for missions ≤ 30 days, hourly up to 365 days. Rise/set times are found by linear interpolation of the margin (elevation − horizon) between samples.
- Metrics per body: `up_at_start`, `hours_until_change` (sunset/sunrise or Earthset/Earthrise; `null` if none in the window), `visible_hours`, `visible_percent`, `longest_hidden_hours` (within the window), `disk_percent_at_start`; plus `both_percent`.
- Solar power (`solar_irradiance_w_m2`): 1361 W/m² × (1 AU / Sun distance)² × visible disk fraction, times cos(elevation) for a vertical panel turned toward the Sun or sin(elevation) for a flat panel; reported as mission averages (`metrics.solar_w_m2.vertical_avg`, `horizontal_avg`), before panel efficiency. Tested: flat panel at the equator ≈ 1361/π; at the pole vertical ≫ flat.
- Landing windows (`landing_windows`): for each of `count` consecutive daily landings, hourly-sampled `sun_percent`, `earth_percent`, `both_percent`, `longest_dark_hours`, `longest_blackout_hours`, `sun_up_at_start`.
- **Sanity tests** (`tests/test_scenario.py`): equator ≈ 50% sunlit per synodic month and 100% Earth; far side 0% Earth; flat south pole ≈ 50% Earth over a year; equatorial night ≈ 14.8 days. Terrain tests (`tests/test_terrain.py`) check the smooth-sphere dip, a wall at known distance, an elevated site, and map fallback.
- **Literature comparison** (Gläser et al. 2018, PSS 162, Table 1: 20 m LOLA, hourly 2017–2037; ours: 2026–2030 hourly). Average illumination (mean visible disk fraction): Shackleton rim S at the surface 80.0% vs 81.0% (partly visible 84.4% vs 85.5%, longest shadow 228 h vs 221 h); Connecting Ridge C1 at 2 m 85.7% vs 88.0% (87.7% at the best point within 100 m); C1 at the surface 69.2% vs 76.0%. Differences come from the period and the 20–40 m-wide crests. `tests/test_sites.py` checks C1 within ±5 points of 88.0%, Shackleton rim S ≥ 78%, and Shackleton's floor at 0% over 2026–2030.

### Curated sites (`data/sites.json`)
29 sites (south pole incl. the 9 NASA Artemis III candidate regions, Apollo and other near-side landings, far side), each with a citation. Artemis III region centers are approximate (means of candidate sites in Wueller et al. 2026, Table A1); NASA published only a map. Coordinates were researched with AI assistance from the cited sources.

## Frontend behavior

- **Look:** shadcn preset `b1VlJD4S` (Luma style, Outfit font, Hugeicons). Dark-only (`<html class="dark">`) with a custom "lunar night" palette in `app/globals.css`: navy-tinted neutrals and a near-white primary for UI chrome; color is reserved for data (`--sun` #f5b544, `--earth` #4ea8f5, `--both` #7bd389, mirrored in `app/lib/colors.ts` for charts). Use shadcn tokens (`bg-card`, `text-muted-foreground`, `border-border`) rather than raw colors. Add components with `npx shadcn@latest add <name>` from `frontend/`.

- **Shareable URLs:** after each successful evaluation the page URL is replaced with `?site=<id>` or `?lat=…&lon=…`, plus `start=YYYY-MM-DDTHH:mm` (UTC) and `days`. On load these parameters prefill the form; missing ones fall back to the defaults (first south-pole site, 2026-12-01 00:00 UTC, 14 days).
- **South-pole map:** `south-pole-map.png` is 848 × 848 px, polar stereographic centered on the pole, half-width 305,280 m (≈80°S at the edge midpoints), image up = 0°E (toward Earth), 90°E to the right. The constants in `components/south-pole-map.tsx` must match `scripts/build_basemap.py`. Clicking a dot selects a curated site; clicking elsewhere evaluates that point as custom coordinates.
- **Mission player** (`components/mission-view.tsx`): a time slider plus Play/Pause over the scenario samples (about 12 s per mission, 80 ms frames). The sky chart marks the Sun and Earth at the selected sample; the timeline and elevation chart draw a white cursor at that time; a status line shows each body's elevation, visibility, visible Sun disk and Earth phase. It remounts (resets to landing time) whenever the scenario changes.
- **Sky views** (tabs in the sky card, all driven by the same time slider):
  - *Lander view* (`components/lander-view.tsx`): first-person SVG, 120° wide, centered on the Sun, on Earth, or dragged freely. Black sky with fixed pseudo-random stars; the terrain skyline from the horizon profile (lighter when the Sun is up); the Sun with a glow and Earth with its phase (`earth_lit`, bright limb turned toward the Sun on screen). Drawing the bodies before the terrain makes the skyline hide them; hidden bodies get a dashed outline. Heights are stretched (×1–20 so the scene fills the view) and the Sun and Earth are drawn larger than life; directions and elevations are exact. The caption says so.
  - *360° chart* (`components/sky-chart.tsx`): the Plot panorama.
  - *Sky map* (`components/sky-dome.tsx`): bird's-eye round map, north up and east right; radius maps elevation linearly from the shown range's top (center) to bottom (rim); terrain is the area between the rim and the skyline; paths are memoized so only the two markers redraw per frame.
  - *Globe* (`components/moon-globe.tsx`, three.js, loaded only when the tab opens via `next/dynamic` with `ssr: false`): unit sphere with the NASA SVS CGI Moon Kit texture, a directional light from the sub-solar point at the selected time (real day/night line), dots for curated sites and a white dot for the current site; OrbitControls to rotate/zoom; renders on demand. Moon-fixed (x, y, z) maps to three.js as (x, z, −y) to match `SphereGeometry`'s texture layout.
- **Time state** (`index`) lives in `navigator.tsx` and is reset to 0 for each new scenario, so the sky views, timelines and the map's shadows all follow the same slider.
- **South-pole map layers** (`components/south-pole-map.tsx`): Terrain (relief only); Sunlight % and Earth contact % (precomputed overlays: share of 2026–2030, every 4 h, with the body's center above the terrain horizon seen from 2 m, on a 160×160 grid (~3.8 km apart) using the 240 m map — approximate; values are at cell centers, so narrow ridges (e.g. Connecting Ridge: cell 40% vs 85% at the exact point) are not resolved, while Shackleton's floor reads 0%; the sunlight colors saturate at 70% (`scale_max` in `heatmap.json`, map maximum 64%); hovering shows the value); Shadows now (`components/shadow-layer.tsx`, WebGL2): for each map pixel a ray is marched from 2 m above the ground toward the Sun (unit vector from the sub-solar point at the slider time) across `south-pole-heights.bin` (720 m), placing every sample exactly on the sphere; shadowed pixels are darkened. Approximate at 720 m: a Python copy of the ray-march agreed with the horizon model (240 m) in 254 of 300 sampled site/time cases (85%); disagreements are where the Sun is within a fraction of a degree of the skyline. Shows a message if WebGL2 is missing.
- **Charts are built once per scenario.** `PlotFigure` rebuilds a Plot chart only when its `render` callback changes (new scenario) or its width changes; per-time marks (markers, cursor) are drawn by an `overlay` callback into a `<g data-overlay>` using `plot.scale("x"|"y").apply`, so dragging the slider never rebuilds thousands of marks. Charts must not use Plot legends (that would wrap the SVG in a `<figure>`); legends are HTML.
- **Timeline + elevation chart** share `MARGIN` and an x axis in "days after landing", so their cursors line up.
- **Wording:** "Sunlight" (Sun above the terrain horizon) and "Earth contact" (Earth above it), "Longest darkness", "Longest blackout", "Both at once" — used the same way everywhere; one-line explanations live in `app/lib/glossary.ts` (shown via `components/info-tip.tsx`).
- **Mission brief** (from the API, `lunar/brief.py`): a plain-language summary sentence plus Good/Fair/Poor ratings for power and comms. Rule (ours, not NASA's): good = ≥70% of the mission with no gap over 3 days; fair = ≥40% with no gap over 7 days; else poor. Tested in `tests/test_brief.py`.
- **CSV download** (`app/lib/csv.ts`): the scenario timeline, one row per sample (UTC time, Sun/Earth azimuth, elevation, terrain horizon at that azimuth, visibility flags, Sun disk %, Earth lit %).
- Charts are Observable Plot SVGs re-rendered on container resize (`components/plot-figure.tsx`), each with an `aria-label`.

## Invariants

- **FastAPI routes must include the `/api` prefix.** Rewrites keep the original path, so `/api/health` reaches FastAPI as `/api/health`.
- **Next.js must not define its own `app/api/*` routes.** They would be shadowed by the backend rewrite.
- The `/api` rewrite must stay before the frontend catch-all.
- **Raster images must use `next/image` with `unoptimized`.** On this Services deployment `/_next/image` returns 404 in production (it works locally). SVGs are served as-is anyway.

## API

| Method | Path            | Response |
|--------|-----------------|----------|
| GET    | `/api/health`   | `{"status": "ok", "ephemeris": {"start", "end", "rows"}}` (ISO 8601 UTC) |
| GET    | `/api/sites`    | Curated sites: `id, name, lat, lon, group (south_pole/historical/far_side), kind, note, source_title, source_url` |
| GET    | `/api/scenario` | Timeline + metrics for one landing (below) |
| GET    | `/api/landing-windows` | Metrics for landing on each day over a period (below) |

`/api/scenario` query: `site` (curated id) **or** `lat` + `lon` (degrees, east-positive; lon normalized to −180..180); `start` (ISO 8601, naive = UTC; default: current hour); `days` (0 < days ≤ 365, default 14). The window must fit in the ephemeris coverage, else 422; unknown site → 404.

Response: `site {id, name, lat, lon, terrain}`, `start`, `end`, `step_seconds` (unix seconds), `lander_height_m`, `site_height_m`, `horizon {azimuth_deg[720], elevation_deg[720]}`, `series {t, sun_az, sun_el, sun_disk, earth_az, earth_el, earth_disk, earth_lit, subsolar_lat, subsolar_lon}`, `intervals {sun, earth}` (visible `[start, end]` spans), `metrics {sun, earth, both_percent, sun_elevation_at_start_deg, earth_elevation_at_start_deg, solar_w_m2}`, `brief {summary, power {rating, reason}, comms {rating, reason}, rule}`.

`/api/landing-windows` query: same site/`start` parameters, `days` (1–60, default 14), `count` (1–366, default 365; trimmed so the last mission ends inside the ephemeris coverage). Response: `site`, `days`, `windows[]` (see Landing windows above).

## Local development

```bash
cd frontend && npm install && cd ..
npx vercel dev --local
```

`vercel dev --local` runs both services without linking a Vercel project. It syncs the backend's Python environment with uv (and adds `vercel-runtime` to `backend/.venv`). If port 3000 is busy it picks the next free port and prints it.

Checks:

- Frontend: `cd frontend && npm run lint && npm run build`
- Backend: `cd backend && uv run pytest -q` (add `-s` to print validation errors)

Rebuilding data (only needed if the coverage window changes): `cd backend/scripts && uv run python fetch_ephemeris.py` (and `fetch_validation.py`). The scripts verify TLS with the OS trust store (`truststore`, dev dependency) so they work behind HTTPS-inspecting proxies.

## Deployment

Deployed as one Vercel project (`lunar-landing`, team ConnorBuilds) connected to GitHub; pushes to `main` deploy to production.

To recreate: import the GitHub repo in the Vercel dashboard with Root Directory `./` and Application Preset **Services** (detected from `vercel.json`), then click **Deploy**. Do not use "Import single project" on either service; that creates separate projects on separate domains and breaks same-origin `/api` routing. No environment variables are needed. `.vercel/` folders are git-ignored.

Production URL: https://lunar-landing-delta.vercel.app. Vercel's automatic bot protection can put one IP behind a "Security Checkpoint" (HTTP 403 + JavaScript challenge) after many rapid scripted requests (e.g. polling a deploy with curl); browsers pass it automatically and it clears on its own. Avoid tight polling loops against production.
