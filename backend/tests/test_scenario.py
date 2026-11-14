"""Physical sanity checks for whole scenarios (PLAN.md M3 success criteria)."""

from datetime import datetime, timezone

import numpy as np
import pytest

from lunar.scenario import scenario
from lunar.terrain import smooth_horizon

SYNODIC_MONTH_DAYS = 29.530589
START = datetime(2026, 2, 1, tzinfo=timezone.utc).timestamp()


def run(lat, lon, days, start=START):
    return scenario(lat, lon, smooth_horizon(), start, days)["metrics"]


def test_equator_has_half_month_daylight_and_constant_earth():
    m = run(0.0, 0.0, SYNODIC_MONTH_DAYS)
    assert m["sun"]["visible_percent"] == pytest.approx(50, abs=2)
    assert m["earth"]["visible_percent"] == pytest.approx(100)  # near side: Earth never sets


def test_far_side_never_sees_earth():
    m = run(0.0, 180.0, SYNODIC_MONTH_DAYS)
    assert m["earth"]["visible_percent"] == 0
    assert m["sun"]["visible_percent"] == pytest.approx(50, abs=2)


def test_flat_south_pole_sees_earth_about_half_the_time():
    # Libration tips Earth +-6.7 deg about the polar horizon over each ~27-day cycle.
    m = run(-89.9, 0.0, 365)
    assert m["earth"]["visible_percent"] == pytest.approx(50, abs=5)


def test_longest_night_at_equator_is_about_two_weeks():
    m = run(0.0, 0.0, 2 * SYNODIC_MONTH_DAYS)
    assert m["sun"]["longest_hidden_hours"] / 24 == pytest.approx(SYNODIC_MONTH_DAYS / 2, abs=0.5)


def test_solar_power_flat_panel_at_equator_and_vertical_panel_at_pole():
    # Equator: a flat panel averages S/pi over a lunar day (half the time dark, sin-weighted).
    equator = run(0.0, 0.0, SYNODIC_MONTH_DAYS)["solar_w_m2"]
    assert equator["horizontal_avg"] == pytest.approx(1361 / np.pi, rel=0.05)
    # Pole: the Sun grazes the horizon, so a vertical panel collects far more than a flat one.
    pole = run(-89.9, 0.0, SYNODIC_MONTH_DAYS)["solar_w_m2"]
    assert pole["vertical_avg"] > 20 * pole["horizontal_avg"]
