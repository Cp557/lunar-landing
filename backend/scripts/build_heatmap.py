"""Sunlight and Earth-contact maps over the south-pole map (approximate, 240 m terrain).

For a GRID x GRID grid covering the same square as south-pole-map.png, compute the share of
2026-2030 (every 4 hours) with the Sun's center / Earth's center above the terrain horizon
seen from 2 m above the ground. Uses the bundled 240 m LOLA map, which smooths small peaks and
pits, so values are approximate (see REFERENCE.md).

Outputs (frontend/public/):
  sunlight-map.png, earth-map.png  colored RGBA overlays (GRID x GRID)
  heatmap.json                     {grid, half_extent_m, sun: [%...], earth: [%...]} row-major from the top-left

Values are at each cell's center (~3.8 km apart), so narrow sunlit ridges (tens of meters
wide) are not resolved: the map shows area patterns, not individual peaks.

Run from backend/:  uv run python -m scripts.build_heatmap            (all CPU cores, ~15 min)
                    uv run python -m scripts.build_heatmap --render   (recolor from heatmap.json)
"""

import json
import sys
from multiprocessing import Pool
from pathlib import Path

import numpy as np

from lunar.terrain import LANDER_HEIGHT_M, R_M, coarse_map, terrain_horizon
from lunar.visibility import visibility
from scripts.build_basemap import HALF_EXTENT_M, write_png

GRID = 160
SUN_SCALE_MAX = 70.0  # % mapped to the brightest color (the map's sunlight peaks at ~64%)
TIMES = np.arange(1767225600, 1924992000, 4 * 3600.0)  # 2026-01-01 .. 2030-12-31, every 4 h
PUBLIC = Path(__file__).resolve().parents[2] / "frontend" / "public"


def cell_latlon(ix: int, iy: int) -> tuple[float, float]:
    """Center of grid cell (ix from the left, iy from the top); image up = 0 deg E (toward Earth)."""
    x = (-1 + (2 * ix + 1) / GRID) * HALF_EXTENT_M
    y = (1 - (2 * iy + 1) / GRID) * HALF_EXTENT_M
    lat = -90 + np.degrees(2 * np.arctan(np.hypot(x, y) / (2 * R_M)))
    return float(lat), float(np.degrees(np.arctan2(x, y)))


def cell(index: int) -> tuple[float, float]:
    lat, lon = cell_latlon(index % GRID, index // GRID)
    horizon = terrain_horizon([coarse_map()], lat, lon)
    sun, earth = visibility(lat, lon, TIMES, horizon, LANDER_HEIGHT_M)
    return 100 * float((sun.margin_deg > 0).mean()), 100 * float((earth.margin_deg > 0).mean())


def colorize(percent: np.ndarray, high: tuple[int, int, int], scale_max: float) -> np.ndarray:
    """Navy (0%) -> `high` color (>= scale_max %), semi-transparent so the relief shows through."""
    low = np.array([11, 29, 58])
    f = np.clip(percent / scale_max, 0, 1)[..., None]
    rgb = low + (np.array(high) - low) * f
    alpha = np.full(percent.shape + (1,), 190)
    return np.concatenate([rgb, alpha], axis=-1).round().astype(np.uint8)


def render(sun: np.ndarray, earth: np.ndarray) -> None:
    write_png(PUBLIC / "sunlight-map.png", colorize(sun, (255, 210, 122), SUN_SCALE_MAX))
    write_png(PUBLIC / "earth-map.png", colorize(earth, (143, 211, 255), 100.0))
    data = {
        "grid": GRID,
        "half_extent_m": HALF_EXTENT_M,
        "period": "2026-2030, every 4 hours",
        "scale_max": {"sun": SUN_SCALE_MAX, "earth": 100.0},
        "sun": np.round(sun).astype(int).ravel().tolist(),
        "earth": np.round(earth).astype(int).ravel().tolist(),
    }
    (PUBLIC / "heatmap.json").write_text(json.dumps(data, separators=(",", ":")))
    print(f"Sunlight {sun.min():.0f}-{sun.max():.0f}%, Earth {earth.min():.0f}-{earth.max():.0f}%")


def main() -> None:
    if "--render" in sys.argv:
        d = json.loads((PUBLIC / "heatmap.json").read_text())
        render(np.array(d["sun"], float).reshape(GRID, GRID), np.array(d["earth"], float).reshape(GRID, GRID))
        return
    with Pool() as pool:
        values = np.array(pool.map(cell, range(GRID * GRID), chunksize=64)).reshape(GRID, GRID, 2)
    render(values[..., 0], values[..., 1])


if __name__ == "__main__":
    main()
