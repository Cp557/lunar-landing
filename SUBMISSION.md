# Submission drafts (for the team to edit)

Drafted by Claude from this repo; rewrite in the team's own words before submitting, and mention in the "Use of SI" field that AI helped draft the text. The form opens on the team's Project tab; deadline **Sun Nov 15, 11:59 PM local**.

## Project name
Lunar Landing Site Navigator

## High-level project summary
If a lander touches down here, on this date, how long will it have sunlight and contact with Earth? Our web app answers that in seconds for any site on the Moon. It combines NASA JPL Horizons ephemeris with LRO LOLA terrain to show the real local horizon, the Sun's and Earth's paths across it, time until sunset and Earthset, the longest dark period and communication blackout, and solar power. Planners can compare sites side by side, click anywhere on a south-pole map, and scan a whole year for the best landing dates — and everyone can see why a few hundred meters or a few days matter so much at the south pole.

## Links
- Final project: https://lunar-landing-delta.vercel.app (repo: https://github.com/Cp557/lunar-landing — make it public first)
- Demo: _team to add (≤ 30 s video or ≤ 7 slides, public link)_

## Detailed project description
**What it does.** Pick a landing site (29 curated sites with sources, including NASA's nine Artemis III candidate regions, past landings and far-side sites; a click on the south-pole map; or typed coordinates), a landing date and a mission length. The app reports:
- whether the Sun and Earth are up at touchdown and how long until sunset/sunrise and Earthset/Earthrise;
- the percentage of the mission that is sunlit, has Earth contact, or both;
- the longest dark period (battery and thermal survival) and longest communication blackout;
- average sunlight on a vertical vs a flat solar panel;
- a sky panorama of the terrain horizon with the Sun's and Earth's paths, and timelines of every window.
Every scenario starts with a plain-language mission brief and Good/Fair/Poor ratings for power and communications. Press Play to watch the mission: real terrain shadows sweep around the south pole on the map, the Sun and Earth move along the 360° skyline, a 3D model of the south pole is lit by the Sun with the same shadows, and a 3D Moon shows the day/night line with Earth in its real direction and phase. On the south-pole map you can switch on sunlight and Earth-contact heat maps or live terrain shadows that sweep around the pole as time moves. Scenarios can be compared side by side, a "best landing dates" scan evaluates every landing day over the next year, every term has a hover explanation, results download as CSV, and every scenario has a shareable link.

**How it works.** We query JPL Horizons once for where the Sun and Earth are directly overhead on the Moon (every 30 minutes, 2026–2030), then compute the exact direction to each from any site, including Earth's parallax. The local horizon comes from LOLA elevation maps: 720 rays cast out to 300 km from a 2 m-high lander, with every sample placed on the curved Moon (20 m maps near curated south-pole sites, 120 m beyond; 120 m + 240 m maps for custom points). A site is sunlit when the Sun's center is above that terrain horizon and has Earth contact when Earth's center is.

**How we know it's right.** Our Sun and Earth directions match Horizons' own lunar-surface answers to within 0.0002° and 0.006° (250 test cases). Shackleton crater's floor gets 0% sunlight over five years, as a permanently shadowed region should. Against a published illumination study (Gläser et al. 2018) we get 80.0% vs 81.0% average illumination on Shackleton's rim and 85.7% vs 88.0% on the connecting ridge. 55 automated tests cover the geometry, terrain, metrics and API.

**Why it matters.** Launch slips and hardware delays force teams to re-check landing dates and sites quickly. Existing tools (Quickmap, Moon Trek, Horizons) are powerful but slow for side-by-side scenario checks. This tool turns that into seconds, and its plain-language explanations make the south pole's extreme lighting understandable for students and the public.

**Tools.** Python (FastAPI, numpy, pytest), TypeScript (Next.js, React, Tailwind, Observable Plot), hosted on Vercel.

## Use of Super Intelligence (SI)
We used Claude (Anthropic) throughout: it summarized the challenge and rules, proposed the options and recommendations we chose from for the solution approach, wrote the code, tests and documentation, researched cited site coordinates, and drafted this text. NASA data comes from JPL Horizons and LRO LOLA; no AI-generated images or media are used in the app (the map is rendered from LOLA data). Full log: AI_USE.md in the repository.

## NASA data
- JPL Horizons System (NASA/JPL-Caltech) — Sun and Earth positions relative to the Moon: https://ssd.jpl.nasa.gov/horizons/
- LRO Lunar Orbiter Laser Altimeter (LOLA) gridded elevation maps LDEM_75S_120M and LDEM_85S_20M (NASA GSFC, PDS Geosciences Node): https://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/
- LROC landing-site coordinates (NASA LRO / ASU): https://lroc.im-ldi.com/
- Referenced for context: Quickmap (https://quickmap.lroc.asu.edu/), Moon Trek (https://trek.nasa.gov/moon/)

## Space agency partner data and other references
- Gläser, P. et al. 2018, Illumination conditions at the lunar poles: Implications for future exploration, Planetary and Space Science 162:170–178 (validation values)
- Wueller et al. 2026, JGR Planets 131, e2025JE009434 (Artemis III candidate site coordinates)
- Bussey et al. 2010, Icarus 208:558–564; USGS/IAU Gazetteer of Planetary Nomenclature; Heldmann et al. 2026, PSJ 7(4) (site coordinates)
- LOLA DSMAP_POLAR.CAT projection definition
- Libraries: Next.js, React, Tailwind CSS, Observable Plot, FastAPI, numpy (licenses in README)

## Demo script (≤ 30 seconds)
1. **0–5 s** — South-pole map with the "Shadows" layer on, press Play (just below the map) so the shadows sweep around the pole: "At the Moon's south pole the Sun barely clears the horizon. One ridge decides whether a lander has power."
2. **5–14 s** — Click Connecting Ridge C1 on the map, Dec 1 2026: "Here, the Sun stays up the whole mission… but Earth is hidden for 12 days."
3. **14–21 s** — Add it to the comparison, click the Malapert Massif region, add it: "Another candidate site, same dates — a completely different answer."
4. **21–27 s** — Scroll to "Best landing dates" (already scanned for the next 12 months) and click the top date: "Delayed? Find the best landing day in seconds."
5. **27–30 s** — "Validated against JPL Horizons and published studies. Lunar Landing Site Navigator — Team Wise Tortoise."

Add English subtitles if the narration is in another language.

## Alternative: 7 slides
1. Title + one-line question
2. The problem: south-pole lighting and comms, schedule slips
3. Our approach: Horizons + LOLA → horizon → windows (diagram)
4. Demo screenshot: headline answers + sky view
5. Compare + best dates
6. Validation numbers
7. Impact and what's next
