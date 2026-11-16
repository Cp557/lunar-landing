# Submission drafts (for the team to edit)

Drafted by Claude from this repo; rewrite in the team's own words before submitting, and mention in the "Use of SI" field that AI helped draft the text. The form opens on the team's Project tab; deadline **Sun Nov 15, 11:59 PM local**.

## Project name
Lunar Landing Site Navigator

## High-level project summary
If a lander touches down here, on this date, how long will it have sunlight and contact with Earth? Our web app answers that in seconds for any site on the Moon. It combines NASA JPL Horizons ephemeris with LRO LOLA terrain to work out, against the real local horizon, the time until sunset and Earthset, the longest dark period and communication blackout, and solar power. Planners can click anywhere on a south-pole map, watch the terrain shadows move, and scan a whole year for the best landing dates — and everyone can see why a few hundred meters or a few days matter so much at the south pole.

## Links
- Final project: https://lunar-landing-delta.vercel.app (repo: https://github.com/Cp557/lunar-landing — make it public first)
- Demo (6 slides): https://github.com/Cp557/lunar-landing/blob/main/docs/demo-slides.pdf (works once the repo is public)

## Detailed project description
**What it does.** Pick a landing site (29 curated sites with sources, including NASA's nine Artemis III candidate regions, past landings and far-side sites; a click on the south-pole map; or typed coordinates), a landing date and a mission length. The app reports:
- whether the Sun and Earth are up at touchdown and how long until sunset/sunrise and Earthset/Earthrise;
- the percentage of the mission that is sunlit, has Earth contact, or both;
- the longest dark period (battery and thermal survival) and longest communication blackout;
- average sunlight on a vertical vs a flat solar panel;
- a mission timeline of every sunlit and Earth-contact window.
Every scenario starts with a plain-language mission brief and Good/Fair/Poor ratings for power and communications. Press Play to watch the mission: real terrain shadows sweep around the south pole on the map, a 3D model of the south pole is lit by the Sun with the same shadows, and a 3D Moon centered on the site shows the real day/night line. On the south-pole map you can switch on sunlight and Earth-contact heat maps or live terrain shadows that sweep around the pole as time moves. A "best landing dates" scan evaluates every landing day over the next year, every term has a hover explanation, results download as CSV, and every scenario has a shareable link.

**How it works.** We query JPL Horizons once for where the Sun and Earth are directly overhead on the Moon (every 30 minutes, 2026–2030), then compute the exact direction to each from any site, including Earth's parallax. The local horizon comes from LOLA elevation maps: 720 rays cast out to 300 km from a 2 m-high lander, with every sample placed on the curved Moon (20 m maps near curated south-pole sites, 120 m beyond; 120 m + 240 m maps for custom points). A site is sunlit when the Sun's center is above that terrain horizon and has Earth contact when Earth's center is.

**How we know it's right.** Our Sun and Earth directions match Horizons' own lunar-surface answers to within 0.0002° and 0.006° (250 test cases). Shackleton crater's floor gets 0% sunlight over five years, as a permanently shadowed region should. Against a published illumination study (Gläser et al. 2018) we get 80.0% vs 81.0% average illumination on Shackleton's rim and 85.7% vs 88.0% on the connecting ridge. 56 automated tests cover the geometry, terrain, metrics and API.

**Why it matters.** Launch slips and hardware delays force teams to re-check landing dates and sites quickly. Existing tools (Quickmap, Moon Trek, Horizons) are powerful but slow for quick what-if checks. This tool turns that into seconds, and its plain-language explanations make the south pole's extreme lighting understandable for students and the public.

**Tools.** Python (FastAPI, numpy, pytest), TypeScript (Next.js, React, Tailwind, Observable Plot), hosted on Vercel.

## Use of Super Intelligence (SI)
We used Claude (Anthropic) throughout: it summarized the challenge and rules, proposed the options and recommendations we chose from for the solution approach, wrote the code, tests and documentation, made the demo slides from screenshots of the app, researched cited site coordinates, and drafted this text. NASA data comes from JPL Horizons and LRO LOLA; no AI-generated images or media are used in the app (the map is rendered from LOLA data). Full log: AI_USE.md in the repository.

## NASA data
- JPL Horizons System (NASA/JPL-Caltech) — Sun and Earth positions relative to the Moon: https://ssd.jpl.nasa.gov/horizons/
- LRO Lunar Orbiter Laser Altimeter (LOLA) gridded elevation maps LDEM_75S_120M and LDEM_85S_20M (NASA GSFC, PDS Geosciences Node): https://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/
- LROC landing-site coordinates (NASA LRO / ASU): https://lroc.im-ldi.com/
- NASA Scientific Visualization Studio, CGI Moon Kit (LRO color mosaic and LOLA relief, used for the 3D globe): https://svs.gsfc.nasa.gov/4720
- Referenced for context: Quickmap (https://quickmap.lroc.asu.edu/), Moon Trek (https://trek.nasa.gov/moon/)

## Space agency partner data and other references
- Gläser, P. et al. 2018, Illumination conditions at the lunar poles: Implications for future exploration, Planetary and Space Science 162:170–178 (validation values)
- Wueller et al. 2026, JGR Planets 131, e2025JE009434 (Artemis III candidate site coordinates)
- Bussey et al. 2010, Icarus 208:558–564; USGS/IAU Gazetteer of Planetary Nomenclature; Heldmann et al. 2026, PSJ 7(4) (site coordinates)
- LOLA DSMAP_POLAR.CAT projection definition
- Libraries: Next.js, React, Tailwind CSS, Observable Plot, three.js, FastAPI, numpy (licenses in README)
