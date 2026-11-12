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
  main.py              FastAPI `app` (entrypoint `main:app`)
  pyproject.toml       Python deps; uv.lock pins them
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

## Invariants

- **FastAPI routes must include the `/api` prefix.** Rewrites keep the original path, so `/api/hello` reaches FastAPI as `/api/hello`.
- **Next.js must not define its own `app/api/*` routes.** They would be shadowed by the backend rewrite.
- The `/api` rewrite must stay before the frontend catch-all.

## API

| Method | Path         | Response                              |
|--------|--------------|---------------------------------------|
| GET    | `/api/hello` | `{"message": "Hello from FastAPI"}`   |

## Local development

```bash
cd frontend && npm install && cd ..
npx vercel dev --local
```

`vercel dev --local` runs both services without linking a Vercel project. It syncs the backend's Python environment with uv (and adds `vercel-runtime` to `backend/.venv`). If port 3000 is busy it picks the next free port and prints it.

Checks:

- Frontend: `cd frontend && npm run lint && npm run build`
- Backend: `cd backend && uv run python -c "from fastapi.testclient import TestClient; from main import app; print(TestClient(app).get('/api/hello').json())"`

## Deployment

Import the GitHub repo into Vercel with project root `./`. Vercel detects both services from `vercel.json`. `.vercel/` folders are git-ignored.
