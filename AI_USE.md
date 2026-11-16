# How I used AI

I used one AI tool, Claude (Anthropic), through Claude Code. Space Apps asks every team to disclose this.

- **Claude wrote most of the code** (the Python backend and the Next.js app) and its tests, and drafted the docs, the submission text and the demo slides. Each slide says it was made with AI.
- **I set the direction:** I picked the challenge, made the planning calls (choosing from options Claude laid out in [PLAN.md](PLAN.md)), tested the app, and decided what to build, change or cut.
- **Claude also helped with research:** it summarized the rules, checked that NASA JPL Horizons gives Sun and Earth positions on the Moon, and found the site coordinates and published numbers we check against. Each site cites its source in `backend/data/sites.json`.

## Not made by AI

- **Data:** NASA JPL Horizons (Sun and Earth positions), LRO LOLA (terrain) and the NASA SVS CGI Moon Kit (globe images).
- **Images:** the maps and 3D views are drawn from that NASA data, not by an image generator; the README screenshots are captures of the running app.
- **Team name and logo:** to be confirmed by the team (an AI-made logo would need a visible watermark).
