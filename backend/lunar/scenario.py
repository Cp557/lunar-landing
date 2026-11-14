"""One landing scenario: a site, a start time and a mission length -> timeline + metrics."""

import numpy as np

from lunar.metrics import body_metrics, both_percent, longest_run, visible_intervals
from lunar.terrain import AZIMUTHS_DEG, LANDER_HEIGHT_M, Horizon
from lunar.visibility import visibility

DAY = 86_400.0
MAX_DAYS = 365


def time_grid(start: float, days: float) -> np.ndarray:
    """Sample times: every 10 minutes for missions up to 30 days, hourly beyond."""
    step = 600.0 if days <= 30 else 3600.0
    n = int(np.ceil(days * DAY / step))
    return start + step * np.arange(n + 1)


def rounded(values: np.ndarray, digits: int = 3) -> list:
    return np.round(values, digits).tolist()


def scenario(lat: float, lon: float, horizon: Horizon, start: float, days: float) -> dict:
    """Sun/Earth visibility timeline and metrics for a landing at `start` (unix seconds)."""
    t = time_grid(start, days)
    sun, earth = visibility(lat, lon, t, horizon, LANDER_HEIGHT_M)
    return {
        "start": float(t[0]),
        "end": float(t[-1]),
        "step_seconds": float(t[1] - t[0]),
        "lander_height_m": LANDER_HEIGHT_M,
        "site_height_m": round(horizon.site_height_m, 1),
        "horizon": {"azimuth_deg": AZIMUTHS_DEG.tolist(), "elevation_deg": rounded(horizon.elevation_deg)},
        "series": {
            "t": t.tolist(),
            "sun_az": rounded(sun.az_deg),
            "sun_el": rounded(sun.el_deg),
            "sun_disk": rounded(sun.disk),
            "earth_az": rounded(earth.az_deg),
            "earth_el": rounded(earth.el_deg),
            "earth_disk": rounded(earth.disk),
        },
        "intervals": {
            "sun": visible_intervals(t, sun.margin_deg),
            "earth": visible_intervals(t, earth.margin_deg),
        },
        "metrics": {
            "sun": body_metrics(t, sun.margin_deg, sun.disk),
            "earth": body_metrics(t, earth.margin_deg, earth.disk),
            "both_percent": both_percent(t, sun.margin_deg, earth.margin_deg),
            "sun_elevation_at_start_deg": float(sun.el_deg[0]),
            "earth_elevation_at_start_deg": float(earth.el_deg[0]),
        },
    }


def landing_windows(lat: float, lon: float, horizon: Horizon, first: float, days: float, count: int) -> list[dict]:
    """Mission metrics for landing at `first` and each following day (`count` days),
    sampled hourly, so durations are accurate to about an hour."""
    hours = int(round(days * 24))
    t = first + 3600.0 * np.arange((count - 1) * 24 + hours + 1)
    sun, earth = visibility(lat, lon, t, horizon, LANDER_HEIGHT_M)
    sun_up, earth_up = sun.margin_deg > 0, earth.margin_deg > 0
    rows = []
    for k in range(count):
        s = sun_up[k * 24 : k * 24 + hours + 1]
        e = earth_up[k * 24 : k * 24 + hours + 1]
        rows.append(
            {
                "start": float(t[k * 24]),
                "sun_percent": round(100 * float(s.mean()), 1),
                "earth_percent": round(100 * float(e.mean()), 1),
                "both_percent": round(100 * float((s & e).mean()), 1),
                "longest_dark_hours": longest_run(~s),
                "longest_blackout_hours": longest_run(~e),
                "sun_up_at_start": bool(s[0]),
            }
        )
    return rows
