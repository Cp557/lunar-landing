# Technical Reference

Canonical reference for how this repo is built and run. Update it whenever architecture, interfaces, invariants, or operational behavior change.

## Layout

```
vercel.json        Vercel Services config + public routing
frontend/          Next.js 16 app (App Router, TypeScript, Tailwind v4)
  app/page.tsx         Home page
  app/hello-button.tsx Client component that calls the backend
  public/              Static assets (logo)
backend/           FastAPI app, managed with uv
  main.py              FastAPI `app` (entrypoint `main:app`): routes only
  lunar/               Physics package (pure functions, no I/O except loading data/)
    geometry.py          Sphere geometry, East-North-Up frames, azimuth/elevation
    ephemeris.py         Sun/Earth positions seen from any site (cached Horizons table)
  data/                Committed data the API loads at runtime
    ephemeris.npz        Horizons sub-solar/sub-Earth table, 2026-01-01 → 2031-01-01, 30 min
  scripts/             One-off data builders (run locally, need network)
    horizons.py          Minimal Horizons API client
    fetch_ephemeris.py   Builds data/ephemeris.npz
    fetch_validation.py  Builds tests/fixtures/horizons_topocentric.json
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
- These give Sun and Earth vectors from the Moon's center. They are interpolated linearly in time; subtracting the site position gives the topocentric direction (this handles Earth's ~0.26° parallax exactly). `sky_track(lat, lon, times, height_m)` returns azimuth, elevation and distance for both bodies.
- Times outside the table raise `ValueError`.
- **Validation** (`tests/test_ephemeris.py`): against 250 Horizons topocentric "airless apparent" positions (5 sites × Sun/Earth × 25 times, off the table grid), worst-case error is 0.0002° (Sun) and 0.006° (Earth; mostly aberration, which the model omits). Tolerance: 0.05°.

## Invariants

- **FastAPI routes must include the `/api` prefix.** Rewrites keep the original path, so `/api/hello` reaches FastAPI as `/api/hello`.
- **Next.js must not define its own `app/api/*` routes.** They would be shadowed by the backend rewrite.
- The `/api` rewrite must stay before the frontend catch-all.

## API

| Method | Path          | Response |
|--------|---------------|----------|
| GET    | `/api/hello`  | `{"message": "Hello from FastAPI"}` |
| GET    | `/api/health` | `{"status": "ok", "ephemeris": {"start", "end", "rows"}}` (ISO 8601 UTC) |

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
