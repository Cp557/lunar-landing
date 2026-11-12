<p align="center">
  <img src="wise-tortoise-logo.svg" alt="Wise Tortoise logo" width="160" />
</p>

# Wise Tortoise — Lunar Landing Site Navigator

Team Wise Tortoise's project for the [NASA Space Apps Challenge 2026: Lunar Landing Site Navigator](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/).

## Stack

- **Frontend:** Next.js (App Router, TypeScript, Tailwind) in `frontend/`
- **Backend:** FastAPI (Python) in `backend/`
- **Hosting:** Vercel, one project with two [Services](https://vercel.com/docs/services) defined in `vercel.json`

## Run locally

Requirements: Node.js, [uv](https://docs.astral.sh/uv/), and the Vercel CLI (via `npx`).

```bash
cd frontend && npm install && cd ..
npx vercel dev --local
```

Open the URL the CLI prints (usually http://localhost:3000). It starts both services: `/api/*` goes to FastAPI, everything else to Next.js.

## Deploy

Import the GitHub repo in Vercel and keep the project root as `./`. Vercel reads `vercel.json` and builds both services.

See [REFERENCE.md](REFERENCE.md) for technical details.

## License

Not chosen yet. If none is specified, NASA distributes Space Apps submissions under Apache-2.0.
