"""Build data/ephemeris.npz from JPL Horizons.

For each 30-minute step in 2026-2030 it stores where the Sun and Earth are as seen from
the Moon's center, in the Moon's body-fixed MOON_ME frame:
sub-solar / sub-Earth point (lon, lat) and distance. Any lunar site's Sun and Earth
directions follow from these with vector math (see lunar/ephemeris.py).

Run from backend/:  uv run python scripts/fetch_ephemeris.py
"""

from pathlib import Path

import numpy as np

from horizons import parse_time, query

AU_KM = 149_597_870.7
YEARS = range(2026, 2031)
OUT = Path(__file__).resolve().parents[1] / "data" / "ephemeris.npz"


def fetch_year(year: int) -> dict[str, np.ndarray]:
    columns, rows = query(
        COMMAND="301",  # target: Moon
        CENTER="500@399",  # observer: Earth geocenter (sub-observer point = sub-Earth point)
        START_TIME=f"{year}-01-01",
        STOP_TIME=f"{year + 1}-01-01",
        STEP_SIZE="30m",
        QUANTITIES="14,15,19,20",  # sub-observer, sub-solar, Sun range (r), observer range (delta)
    )
    col = {name: i for i, name in enumerate(columns)}

    def values(name: str) -> np.ndarray:
        return np.array([float(r[col[name]]) for r in rows])

    return {
        "t": np.array([parse_time(r[0]) for r in rows]),
        "earth_lon": values("ObsSub-LON"),
        "earth_lat": values("ObsSub-LAT"),
        "earth_km": values("delta") * AU_KM,
        "sun_lon": values("SunSub-LON"),
        "sun_lat": values("SunSub-LAT"),
        "sun_km": values("r") * AU_KM,
    }


def main() -> None:
    parts = [fetch_year(year) for year in YEARS]
    data = {key: np.concatenate([p[key] for p in parts]) for key in parts[0]}
    _, keep = np.unique(data["t"], return_index=True)  # years overlap on Jan 1 00:00
    data = {key: value[keep] for key, value in data.items()}
    OUT.parent.mkdir(exist_ok=True)
    np.savez_compressed(OUT, **data)
    print(f"Saved {len(data['t'])} rows to {OUT}")


if __name__ == "__main__":
    main()
