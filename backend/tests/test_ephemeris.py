import json
from pathlib import Path

import numpy as np
import pytest

from lunar.ephemeris import load_ephemeris, sky_track
from lunar.geometry import angular_separation_deg

FIXTURES = json.loads(
    (Path(__file__).parent / "fixtures" / "horizons_topocentric.json").read_text()
)
TOLERANCE_DEG = 0.05  # PLAN.md M1 success criterion


def model_az_el(case: dict) -> tuple[float, float]:
    track = sky_track(case["lat"], case["lon"], np.array([case["t"]]))
    if case["body"] == "sun":
        return float(track.sun_az[0]), float(track.sun_el[0])
    return float(track.earth_az[0]), float(track.earth_el[0])


@pytest.mark.parametrize("body", ["sun", "earth"])
def test_matches_horizons_topocentric(body):
    cases = [c for c in FIXTURES if c["body"] == body]
    errors = []
    for case in cases:
        az, el = model_az_el(case)
        errors.append(float(angular_separation_deg(az, el, case["az"], case["el"])))
    worst = max(errors)
    print(f"{body}: {len(cases)} cases, max error {worst:.4f} deg, mean {np.mean(errors):.4f} deg")
    assert worst <= TOLERANCE_DEG


def test_rejects_times_outside_table():
    eph = load_ephemeris()
    with pytest.raises(ValueError):
        eph.vectors(np.array([eph.start - 3600]))
