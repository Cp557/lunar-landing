"""Curated landing sites and the terrain horizon to use for any site."""

import json
from functools import cache

import numpy as np

from lunar.terrain import DATA_DIR, Horizon, coarse_map, smooth_horizon, terrain_horizon

SITES_PATH = DATA_DIR / "sites.json"
HORIZONS_PATH = DATA_DIR / "horizons.json"  # built by scripts/build_horizons.py
LIVE_TERRAIN = "LOLA 240 m (approximate)"
NO_TERRAIN = "None (smooth sphere)"


@cache
def curated_sites() -> list[dict]:
    """Sites with cited coordinates (lat, east lon in degrees)."""
    return json.loads(SITES_PATH.read_text())


@cache
def precomputed_horizons() -> dict[str, dict]:
    return json.loads(HORIZONS_PATH.read_text()) if HORIZONS_PATH.exists() else {}


def find_site(site_id: str) -> dict | None:
    return next((s for s in curated_sites() if s["id"] == site_id), None)


def horizon_for(lat: float, lon: float, site_id: str | None = None) -> tuple[Horizon, str]:
    """Best available horizon and a label for the terrain data behind it.

    Curated sites use precomputed high-resolution profiles; other south-polar points
    are computed live from the bundled 240 m map; elsewhere the Moon is a smooth sphere.
    """
    pre = precomputed_horizons().get(site_id or "")
    if pre:
        return Horizon(np.array(pre["elevation_deg"]), pre["site_height_m"], True), pre["terrain"]
    pmap = coarse_map()
    if pmap.covers(lat, lon):
        return terrain_horizon([pmap], lat, lon), LIVE_TERRAIN
    return smooth_horizon(), NO_TERRAIN
