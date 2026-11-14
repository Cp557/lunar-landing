"""Curated sites: data integrity and comparison with published illumination studies."""

import numpy as np
import pytest

from lunar.sites import curated_sites, horizon_for
from lunar.terrain import LANDER_HEIGHT_M
from lunar.visibility import visibility

YEARS_2026_2030 = np.arange(1767225600, 1924992000, 3600.0)  # hourly


def sun_track(site_id: str):
    site = next(s for s in curated_sites() if s["id"] == site_id)
    horizon, _ = horizon_for(site["lat"], site["lon"], site_id)
    sun, _ = visibility(site["lat"], site["lon"], YEARS_2026_2030, horizon, LANDER_HEIGHT_M)
    return sun


def test_site_ids_unique_and_south_pole_sites_have_terrain():
    sites = curated_sites()
    assert len({s["id"] for s in sites}) == len(sites)
    for s in sites:
        _, terrain = horizon_for(s["lat"], s["lon"], s["id"])
        if s["group"] == "south_pole" and s["lat"] <= -75:
            assert terrain.startswith("LOLA 20 m") or terrain == "LOLA 120 m", s["id"]


def test_shackleton_floor_is_permanently_shadowed():
    sun = sun_track("shackleton_crater")
    assert (sun.margin_deg > 0).sum() == 0
    assert sun.disk.max() == 0


def test_connecting_ridge_matches_glaser_2018():
    # Glaser et al. 2018, Table 1: 88.0% average illumination at 2 m above ground (2017-2037).
    sun = sun_track("connecting_ridge_c1")
    assert 100 * sun.disk.mean() == pytest.approx(88.0, abs=5)
    assert 100 * (sun.margin_deg > 0).mean() >= 70  # PLAN.md M2 criterion


def test_shackleton_rim_s_is_highly_illuminated():
    # Published 81.0% at the surface; our 2 m lander can only see more.
    sun = sun_track("shackleton_rim_s")
    assert 100 * sun.disk.mean() >= 78
