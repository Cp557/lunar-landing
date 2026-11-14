"""Save JPL Horizons topocentric Sun/Earth azimuth-elevation for test sites.

These are Horizons' own "airless apparent" answers for an observer on the lunar surface.
tests/test_ephemeris.py checks our cached-table model against them.

Run from backend/:  uv run python scripts/fetch_validation.py
"""

import json
from pathlib import Path

from horizons import parse_time, query

OUT = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "horizons_topocentric.json"

# name: (lat, east lon) in degrees
SITES = {
    "near_south_pole": (-89.8, 223.0),
    "mons_mouton_area": (-85.0, 30.0),
    "apollo_11": (0.674, 23.473),
    "far_side_change_4": (-45.444, 177.599),
    "west_limb": (0.0, 270.0),
}
BODIES = {"sun": "10", "earth": "399"}


def main() -> None:
    cases = []
    for site, (lat, lon) in SITES.items():
        for body, command in BODIES.items():
            columns, rows = query(
                COMMAND=command,
                CENTER="coord@301",
                COORD_TYPE="GEODETIC",
                SITE_COORD=f"{lon},{lat},0",
                # Odd start minute so samples fall between the 30-min table steps.
                START_TIME="2026-01-03 07:17",
                STOP_TIME="2030-12-20 07:17",
                STEP_SIZE="73d",
                QUANTITIES="4",
            )
            az_i, el_i = columns.index("Azimuth_(a-app)"), columns.index("Elevation_(a-app)")
            cases += [
                {
                    "site": site,
                    "lat": lat,
                    "lon": lon,
                    "body": body,
                    "t": parse_time(r[0]),
                    "az": float(r[az_i]),
                    "el": float(r[el_i]),
                }
                for r in rows
            ]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(cases, indent=1))
    print(f"Saved {len(cases)} cases to {OUT}")


if __name__ == "__main__":
    main()
