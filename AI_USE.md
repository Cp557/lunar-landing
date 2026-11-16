# Use of AI ("Super Intelligence") in this project

Space Apps requires teams to disclose where and how AI tools were used. This log records it.

Tool: Claude (Anthropic), used through Claude Code.

## Before the hackathon (Nov 11–13)

- Summarized the challenge page, rules, resources, submission and judging guides.
- Suggested a general tech stack and pre-hackathon preparation (tool installs, data downloads).
- Nov 12: generated a generic starter scaffold (Next.js frontend + FastAPI backend on Vercel with a "hello" button). It contains no challenge logic.

## During the hackathon

### Nov 14, 9:00 — Planning
- Ran a feasibility check of JPL Horizons for lunar-surface observers.
- Proposed the options and recommendations for every planning decision in [PLAN.md](PLAN.md) (answer definitions, scope, ephemeris and terrain approach, working rules).
- **Team decision:** adopted all of Claude's recommendations.
- Wrote PLAN.md and this log.

### Build
Entries are added per milestone: what Claude wrote, and what the team decided or changed.

- **M1 — Ephemeris engine (Nov 14, morning):** Claude wrote the Horizons client and data scripts, the geometry and ephemeris modules, the validation fixtures and tests, and the `/api/health` route. Data comes from JPL Horizons; the code and data pipeline were AI-generated.
- **M2–M5 — Terrain, metrics, API and UI (Nov 14):** Claude wrote the LOLA terrain/horizon code, visibility and metrics modules, the scenario and landing-window APIs, all tests, and the Next.js interface (form, results, sky view, timelines, comparison, best dates, "How we calculate this"). A Claude research subagent compiled the curated site list from the cited sources (LROC, USGS/IAU, published papers); coordinates are cited per site in `backend/data/sites.json`. The literature comparison uses values from Gläser et al. 2018 found by that subagent.
- **M6 — Polish (Nov 14, evening):** Claude added the solar power estimate, the clickable south-pole map (shaded relief rendered from LOLA data by a Claude-written script, not an AI image generator), shareable scenario URLs, the mission player (time slider and playback), chart accessibility labels, and documentation updates. Claude also drafted the submission text and demo script in `SUBMISSION.md` for the team to edit.
- **Restyle (Nov 14, evening):** the team chose the shadcn/ui preset (Luma style, Outfit font, Hugeicons) and the favicon (CC0 icon from SVG Repo); Claude applied the preset, chose the color palette at the team's request, and moved the interface onto shadcn components.
- **Clarity and visuals (Nov 14, night):** Claude proposed a list of next features (mission brief with ratings, hover explanations, CSV download, a first-person lander view, a sky dome, a sunlight heat map, sharper custom terrain, moving shadows, a 3D globe); the team approved building all of them. Claude also rebuilt the charts so the time slider no longer rebuilds them (fixing the reported glitch) and unified the wording. The rating thresholds are Claude's rule of thumb, stated in the app. Claude wrote the lander view, sky map, 3D globe (texture: NASA SVS CGI Moon Kit, not AI-generated), the WebGL shadow layer, the heat-map script and overlays (computed from LOLA data), and the 120 m near-field terrain for custom points.
- **UI fixes after team testing (Nov 15, morning):** the team reported that the time readout jumped left and right during playback and asked for the south-pole map to be large from the start (no "Enlarge" button). Claude moved the map into a large first-screen layout, replaced the status line with fixed readout tiles, and tested the interface in a browser (layout measured across every slider step, playback, map layers, site picks, comparison, best dates, errors, phone widths), fixing two more issues it found there (a map label hidden under a site dot; no Sun marker in the lander view when the Sun is far below the horizon).

- **Simplification (Nov 15, afternoon):** at the team's request Claude removed the header logo and, after the team found the first-person lander view usually empty (the Sun is below the horizon for half of each lunar day at most sites), removed that view; the 360° chart is now the default sky view. Claude also suggested what information matters most and how to present the project to judges; the team decides. The team then asked Claude to move the mission timeline (with the Play button and slider) right under the map and answer, and to add a one-line validation note under the answer. Next, at the team's request, Claude restyled the map layer buttons as a segmented control (the team found them hard to recognize as buttons) and fixed three issues it had found in testing: sky tabs of different heights, best-date picks updating the answer off-screen, and custom points showing their coordinates twice; it also fixed a globe resize bug found while testing those.

- **Visual redesign (Nov 15, afternoon):** the team found the playable mission timeline pointless and asked for a clearer picture and a cooler Moon visual; Claude proposed, and the team approved, making the timeline a static labeled picture, moving Play under the map with live shadows on by default, a 3D south-pole view, and a globe upgrade. Claude wrote all of it, including the sub-Earth point in the API. The 3D terrain uses the team's existing LOLA-derived heights; the globe uses NASA SVS CGI Moon Kit maps (4k color, LOLA relief), not AI-generated imagery.

- **Judge-readiness (Nov 15, evening):** at the team's request Claude made "Best landing dates" load on its own (no scan button press needed), added a one-line how-to under the title, checked the page at desktop and phone widths, fixed two issues found in that check (dotted hatching in the 3D view's shadows; a hard-to-read tooltip on the best-dates chart), and rewrote the top of the README for judges with screenshots Claude captured from the running app (screenshots, not AI-generated images).

- **Skyline chart removed (Nov 15, evening):** the team found the 360° skyline chart confusing and asked to simplify it. Claude rewrote it (only the visible parts of the Sun's and Earth's paths, no height axis, a shorter legend) and checked it on several kinds of site; the team still found it confusing and questioned the whole "Watch the mission" card, so Claude recommended, and made, a smaller change set: remove the chart and its code, and keep the card as a "3D view" (South pole and Globe tabs).

## Content not generated by AI

- Team name and logo: to be confirmed by the team (if the logo was AI-generated, it needs a visible watermark in submitted materials).
