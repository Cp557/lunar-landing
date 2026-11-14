"""Precompute high-resolution horizon profiles for curated south-polar sites.

Inputs (git-ignored), from https://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/ :
  raw-data/LDEM_85S_20M.IMG   85S-90S at 20 m (near field)
  raw-data/LDEM_75S_120M.IMG  75S-90S at 120 m (out to 300 km)
Output: data/horizons.json  {site_id: {elevation_deg, site_height_m, terrain}}

Run from backend/:  uv run python -m scripts.build_horizons
"""

import json
from pathlib import Path

import numpy as np

from lunar.sites import HORIZONS_PATH, curated_sites
from lunar.terrain import NEAR_FIELD_M, load_lola_img, terrain_horizon

RAW = Path(__file__).resolve().parents[2] / "raw-data"


def main() -> None:
    fine = load_lola_img(RAW / "LDEM_85S_20M.IMG", 20.0)
    coarse = load_lola_img(RAW / "LDEM_75S_120M.IMG", 120.0)
    out = {}
    for site in curated_sites():
        lat, lon = site["lat"], site["lon"]
        if not coarse.covers(lat, lon):
            continue
        horizon = terrain_horizon([fine, coarse], lat, lon)
        near_20m = fine.covers(lat, lon, NEAR_FIELD_M)
        out[site["id"]] = {
            "elevation_deg": np.round(horizon.elevation_deg, 3).tolist(),
            "site_height_m": round(horizon.site_height_m, 1),
            "terrain": "LOLA 20 m + 120 m" if near_20m else "LOLA 120 m",
        }
        print(f"{site['id']:28s} {out[site['id']]['terrain']:18s} height {horizon.site_height_m:7.0f} m")
    HORIZONS_PATH.write_text(json.dumps(out))
    print(f"Saved {len(out)} profiles to {HORIZONS_PATH}")


if __name__ == "__main__":
    main()
