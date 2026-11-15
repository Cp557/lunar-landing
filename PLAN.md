# Plan: Wise Tortoise — Lunar Landing Site Navigator

Hackathon: NASA Space Apps 2026, Nov 14 9:00 AM → Nov 15 11:59 PM (CST).
This file is the build plan. [REFERENCE.md](REFERENCE.md) documents only what is implemented.

## The question

> **"If we land here, on this date, how long will we have sunlight and contact with Earth?"**

We answer it with NASA data (JPL Horizons ephemeris + LRO LOLA topography), geometry and physics, for any site and date, and make the answer fast to compare.

## Decisions (Nov 14, 9:00 AM)

All options and recommendations below were proposed by Claude; the team chose to adopt every recommendation. See [AI_USE.md](AI_USE.md).

| # | Decision | Choice |
|---|---|---|
| 1 | What "how long" means | Three layers from one timeline: **headline** (time until next sunset / Earthset from touchdown), **mission summary** (hours and % sunlit, % in contact over mission length), **risk** (longest dark period, longest blackout) |
| 2 | Definitions | **Sunlit** = Sun's center above local terrain horizon; also report % of solar disk visible. **Contact** = Earth's center above local terrain horizon. Lander height 2 m |
| 3 | Coverage | Sun/Earth geometry anywhere on the Moon; real LOLA terrain for 80°S–90°S (data covers 75°S–90°S); smooth-Moon horizon elsewhere, clearly labelled |
| 4 | Custom coordinates | Curated sites first, then typed lat/lon computed live; click-on-map is stretch |
| 5 | First audience | Mission planners (numbers, timelines, comparison), with plain-language explanations layered on |
| 6 | Scope | Must-haves and ordered stretch list below |
| 7 | Ephemeris | Query Horizons **once** for site-independent geometry (sub-solar and sub-Earth points + distances, Moon body-fixed), cache 2026–2030, compute any site with vector math. Direct Horizons topocentric queries are the validation oracle. Fallback: local SPICE kernels |
| 8 | Terrain | Precompute horizon profiles for curated sites from the 120 m map (20 m near-field where available); live profiles for custom coordinates from a bundled ~240 m map |
| 9 | Caching | Ephemeris table, site list, curated horizon profiles and coarse map committed to `backend/data/`. Scenarios computed per request. No database |
| 10 | Where math runs | All physics in FastAPI (Python + numpy, pytest). Next.js only renders (Observable Plot) |
| 11–15 | Working rules | See "Working rules" below |

## Model and definitions

- **Moon**: sphere, R = 1737.4 km (same as Horizons and LOLA). Frame: Moon mean-Earth/polar-axis (ME). Planetocentric lat, east-positive lon.
- **Site**: position = (R + terrain height + 2 m) × unit vector(lat, lon). Local East-North-Up frame; azimuth clockwise from north.
- **Sun / Earth direction** at time t: from cached sub-solar / sub-Earth points and distances, minus the site vector (handles Earth's ~0.26° parallax exactly). All times UTC.
- **Horizon profile**: highest elevation angle of terrain in each 0.5° azimuth bin, from LOLA pixels converted to 3D points (exact spherical geometry, curvature included).
- **Visible disk fraction**: circular-segment area of the body's disk above the horizon at its azimuth (Sun radius ≈ 0.27°, Earth ≈ 0.95°).
- **Timeline**: 10-min steps for missions ≤ 30 days, 1 h beyond; crossing times refined by linear interpolation.

## Scope

**Must-have**
1. Site picker: curated sites (south pole, Apollo, far side) with cited coordinates + custom lat/lon.
2. Landing date/time (UTC) and mission length (default 14 days).
3. Headline answers: time until sunset/sunrise and Earthset/Earthrise.
4. Mission summary + risk metrics: % sunlit, % contact, % both, longest dark, longest blackout, Sun elevation.
5. Sky view: horizon silhouette with Sun and Earth tracks over the mission.
6. Timeline bands: sunlit / Earth visible / both.
7. Side-by-side comparison of 2–3 scenarios.
8. "How we calculate this" section with validation results and limitations.

**Stretch (in order)** — status Nov 14 night: 1–3 and 5 done; 4 not started.
1. Best landing dates: metrics for every landing day over the next 12 months at one site. ✅
2. Clickable south-pole map to pick coordinates. ✅
3. Solar power estimate (vertical vs horizontal panel). ✅
4. Deep Space Network station visibility.
5. 3D view. ✅ (sky map, 3D globe; a lander view was built, then cut on Nov 15)

**Added Nov 14 night (team-approved):** mission brief + ratings, hover explanations, CSV download, sunlight/Earth heat maps, live shadows, sharper (120 m) terrain for custom points.

## Architecture

```
Browser (Next.js) ──fetch /api/*──▶ FastAPI (Vercel Services, same origin)
                                       │
                                       ├─ lunar/ephemeris  ◀─ data/ephemeris (from Horizons, 2026–2030)
                                       ├─ lunar/terrain    ◀─ data/horizons/*.json, data/dem (coarse LOLA)
                                       ├─ lunar/visibility + metrics
                                       └─ lunar/sites      ◀─ data/sites.json (cited coordinates)

backend/scripts/   one-off builders (fetch Horizons, build horizon profiles, build coarse map)
raw-data/          git-ignored LOLA downloads (LDEM_75S_120M, LDEM_85S_20M)
```

Planned API (finalized in REFERENCE.md as built):
- `GET /api/sites`
- `GET /api/scenario?site=…|lat=…&lon=…&start=…&days=…`
- `GET /api/best-dates?site=…|lat=…&lon=…&days=…` (stretch 1)

## Milestones

Ordered by risk. Each one ends with its checks passing, a commit + push to `main` (auto-deploys), and a short report.

### M0 — Plan and setup (9:00–10:00)
- Deliverables: PLAN.md, AI_USE.md, LOLA downloads started, memory/notes updated.
- Done when: pushed to `main`.

### M1 — Ephemeris engine (10:00–12:00)
- Deliverables: `scripts/fetch_ephemeris.py`, cached table, `lunar/geometry.py`, `lunar/ephemeris.py`, Horizons validation fixtures + tests, `/api/health`.
- Success criteria:
  - Angular separation between our Sun/Earth directions and Horizons topocentric "airless apparent" directions **≤ 0.05°** (target 0.02°) for ≥ 5 sites (south pole, mid-south, Apollo 11, far side, equator) × ≥ 20 times across 2026–2030.
  - **Deploy spike:** production `GET /api/health` returns ok and the ephemeris date range (proves numpy + data files work on Vercel, not just locally).
- If late: call Horizons topocentric per scenario with caching.

### M2 — Terrain horizon (12:00–15:00)
- Deliverables: LOLA reader, horizon algorithm, curated site horizon profiles, bundled coarse map, live custom-coordinate horizons.
- Success criteria:
  - Synthetic tests: smooth sphere gives the analytic dip angle (≤ 0.01°); a block of known height/distance gives the expected angle (within one pixel's angular size).
  - Physical sanity: a permanently shadowed crater floor (Shackleton) is **0% sunlit** over 2026–2030; a known high-illumination rim/ridge point is **≥ 70% sunlit** (literature reports ~80–90%).
  - Live custom horizon on production **≤ 2 s**.
- If late: curated sites only; smooth horizon for custom coordinates.

### M3 — Visibility, metrics and scenario API (15:00–17:30)
- Deliverables: `lunar/visibility.py`, `lunar/metrics.py`, `lunar/sites.py` (cited coordinates), `/api/sites`, `/api/scenario`.
- Success criteria:
  - Metric tests on synthetic series: crossing times exact to ≤ 1 min; interval and longest-gap logic correct.
  - Physical sanity: equatorial site ≈ 50% sunlit over a synodic month (±2%); Apollo sites 100% Earth contact; far-side site 0%; flat south-pole point ≈ 50% contact.
  - `/api/scenario` (14 days, curated site) responds in ≤ 1 s on production.
- If late: drop longest-gap metrics.

### M4 — Core UI (17:30–22:00)
- Deliverables: scenario builder, headline answers, metrics, sky view, timeline bands; replaces the hello button.
- Success criteria: on production, picking a curated site + date shows all must-have 2–6 outputs in ≤ 3 s; lint + build pass; checked in a browser at desktop and phone width.
- If late: static charts only (no hover/animation).

### M5 — Compare + best dates (Sun 8:00–11:00)
- Success criteria: 3 scenarios side by side; best-dates for one site over 12 months in ≤ 3 s; clicking a date loads that scenario.
- If late: drop best dates, keep compare.

### M6 — Explain, validate, polish (11:00–15:00, feature freeze at 15:00)
- Success criteria: "How we calculate this" shows validation numbers, data sources and limitations; loading/error states; README and REFERENCE.md current.

### M7 — Submission package (15:00–22:00)
- See checklist below. Working version submitted by ~18:00, final by ~22:00.

## Working rules

- Claude builds autonomously, commits and pushes to `main` from Connor's terminal after each milestone, only when checks pass (standing OK from the team).
- Short report after each milestone; stop and ask only when blocked or a decision is needed.
- Feature freeze: Sunday 15:00 CST.
- Assumption: no teammates pushing code (tell Claude if that changes, and split work by area).
- People-only tasks: demo (≤ 30 s video or ≤ 7 slides), making the repo public, the submission form, the AI-use field.

## Submission checklist

- [ ] Repo public; production URL opens in a private window
- [ ] Demo: ≤ 30 s video or ≤ 7 slides, English, public link
- [ ] Form: name, summary, demo link, project link, description, AI use, NASA data, other references
- [ ] Every data source and library cited with license
- [ ] AI_USE.md complete; AI-generated images watermarked (logo, if AI-made)
- [ ] "Terms and Conditions" and "Confirm All Work is Original" boxes

## Risks

| Risk | Mitigation |
|---|---|
| Horizons body-fixed frame for sub-points differs from topocentric | Validation test in M1; fall back to SPICE |
| Vercel Services is beta / bundle limits | Deploy spike in M1 |
| DEM edge: sites near 75°S miss distant terrain | Document; terrain claims limited to 80°S–90°S |
| Horizons down during judging | Runtime never calls Horizons; everything cached |
| Scope creep | Ordered stretch list; freeze Sunday 15:00 |
