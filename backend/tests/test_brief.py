import numpy as np
import pytest

from lunar.brief import mission_brief, plain_duration, rate
from lunar.ephemeris import Ephemeris, earth_phase


@pytest.mark.parametrize(
    ("percent", "gap", "expected"),
    [(100, 0, "good"), (70, 72, "good"), (90, 73, "fair"), (40, 168, "fair"), (39, 10, "poor"), (95, 200, "poor"), (0, 336, "poor")],
)
def test_rating_thresholds(percent, gap, expected):
    assert rate(percent, gap) == expected


def test_plain_duration():
    assert plain_duration(0.5) == "under an hour"
    assert plain_duration(1) == "1 hour"
    assert plain_duration(37.3) == "37 hours"
    assert plain_duration(24 * 12.6) == "about 13 days"


def body(up, change, percent, gap):
    return {"up_at_start": up, "hours_until_change": change, "visible_percent": percent, "longest_hidden_hours": gap}


def test_brief_far_side_needs_relay():
    b = mission_brief({"sun": body(True, None, 100, 0), "earth": body(False, None, 0, 336)})
    assert b["summary"].startswith("The Sun is up for the whole mission. Earth stays out of view for the whole mission.")
    assert "relay satellite" in b["summary"]
    assert (b["power"]["rating"], b["comms"]["rating"]) == ("good", "poor")


def test_brief_rise_and_set_wording():
    b = mission_brief({"sun": body(False, 37.3, 88.9, 37.3), "earth": body(True, 50, 60, 100)})
    assert b["summary"] == "The Sun is down at landing and rises after 37 hours. Earth is in view at landing and sets after about 2 days."


def ephemeris(sun_dir: float) -> Ephemeris:
    """Sun along +x (sun_dir=1) or -x (sun_dir=-1); Earth along +x."""
    sun = np.array([[sun_dir * 1.5e8, 0, 0]] * 2)
    earth = np.array([[384_400.0, 0, 0]] * 2)
    return Ephemeris(t=np.array([0.0, 1.0]), sun_km=sun, earth_km=earth)


def test_earth_phase_new_and_full():
    t = np.array([0.5])
    # Sun behind Earth (same direction from the Moon): we see Earth's night side.
    assert earth_phase(0, 0, t, eph=ephemeris(1))[0] == pytest.approx(0, abs=1e-6)
    # Sun behind the Moon: Earth fully lit.
    assert earth_phase(0, 0, t, eph=ephemeris(-1))[0] == pytest.approx(1, abs=1e-6)


def test_reasons_say_none_when_no_gap():
    b = mission_brief({"sun": body(True, None, 100, 0), "earth": body(True, None, 100, 0)})
    assert b["power"]["reason"] == "Sunlight 100% of the mission; no darkness."
    assert b["comms"]["reason"] == "Earth contact 100% of the mission; no blackout."
