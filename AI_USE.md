# How we used AI

Space Apps asks teams to disclose their use of AI ("Super Intelligence"). We used one tool: Claude (Anthropic), through Claude Code.

## What Claude did

- **Research and planning:** summarized the challenge, rules and judging guides; checked that NASA JPL Horizons can give Sun and Earth positions for the lunar surface; proposed the approach, scope and tech stack in [PLAN.md](PLAN.md), which we adopted.
- **Code:** wrote nearly all of the code (the Python backend for ephemeris, terrain horizons, metrics and the API; the Next.js app with the map, timeline, 3D views and best dates) and its automated tests.
- **Sources:** found the landing-site coordinates and the published values we check against (Gläser et al. 2018); every site cites its source in `backend/data/sites.json`.
- **Testing:** ran the tests and checked the app in a browser at desktop and phone sizes, fixing what it found.
- **Writing:** drafted the README, REFERENCE.md, PLAN.md, the submission text and the demo slides. The slides are built from screenshots of our app, and each one says it was made with AI.

## What we did

- Picked the challenge and set the goal: answer "If we land here, on this date, how long will we have sunlight and contact with Earth?" in seconds.
- Made the decisions: approved the plan, chose the visual style, and decided what to build, keep or cut.
- Tested the app ourselves and pushed for simplicity; many parts were redesigned or removed after our feedback (for example a sky chart, a comparison table and extra map layers).
- Review the final project and submit it ourselves.

## Not made by AI

- **Data:** NASA JPL Horizons (Sun and Earth positions), LRO LOLA (terrain) and the NASA SVS CGI Moon Kit (globe images).
- **Images:** the maps and 3D views are rendered from that NASA data, not by an image generator; the README screenshots are captures of the running app.
- **Team name and logo:** to be confirmed by the team (an AI-made logo would need a visible watermark).
