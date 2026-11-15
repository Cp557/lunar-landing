"""Sun and Earth positions seen from any lunar site, from the cached Horizons table.

data/ephemeris.npz (built by scripts/fetch_ephemeris.py) holds, every 30 minutes, the
sub-solar and sub-Earth points on the Moon (MOON_ME frame) and their distances. Those
give Sun and Earth vectors from the Moon's center; subtracting the site's position gives
what an observer on the surface sees (including Earth's ~0.26 deg parallax).
"""

from dataclasses import dataclass
from functools import cache
from pathlib import Path

import numpy as np

from lunar.geometry import az_el, site_position_km, unit_vector

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "ephemeris.npz"


@dataclass(frozen=True)
class Ephemeris:
    t: np.ndarray  # unix seconds (UTC), increasing
    sun_km: np.ndarray  # (N, 3) Moon-centered, body-fixed
    earth_km: np.ndarray  # (N, 3)

    @property
    def start(self) -> float:
        return float(self.t[0])

    @property
    def end(self) -> float:
        return float(self.t[-1])

    def vectors(self, times: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """Linearly interpolated Sun and Earth vectors (km) at unix times."""
        times = np.atleast_1d(np.asarray(times, dtype=float))
        if times.min() < self.start or times.max() > self.end:
            raise ValueError("time outside ephemeris coverage")

        def interp(vectors: np.ndarray) -> np.ndarray:
            return np.stack([np.interp(times, self.t, vectors[:, i]) for i in range(3)], axis=-1)

        return interp(self.sun_km), interp(self.earth_km)


@cache
def load_ephemeris(path: Path = DATA_PATH) -> Ephemeris:
    d = np.load(path)
    return Ephemeris(
        t=d["t"].astype(float),
        sun_km=d["sun_km"][:, None] * unit_vector(d["sun_lat"], d["sun_lon"]),
        earth_km=d["earth_km"][:, None] * unit_vector(d["earth_lat"], d["earth_lon"]),
    )


@dataclass(frozen=True)
class SkyTrack:
    """Topocentric Sun and Earth positions at a site over time (degrees, km)."""

    sun_az: np.ndarray
    sun_el: np.ndarray
    sun_km: np.ndarray
    earth_az: np.ndarray
    earth_el: np.ndarray
    earth_km: np.ndarray


def sky_track(
    lat: float, lon: float, times: np.ndarray, height_m: float = 0.0, eph: Ephemeris | None = None
) -> SkyTrack:
    """Where the Sun and Earth appear from a site at the given unix times."""
    eph = eph or load_ephemeris()
    sun, earth = eph.vectors(times)
    site = site_position_km(lat, lon, height_m)
    to_sun, to_earth = sun - site, earth - site
    sun_az, sun_el = az_el(to_sun, lat, lon)
    earth_az, earth_el = az_el(to_earth, lat, lon)
    return SkyTrack(
        sun_az=sun_az,
        sun_el=sun_el,
        sun_km=np.linalg.norm(to_sun, axis=-1),
        earth_az=earth_az,
        earth_el=earth_el,
        earth_km=np.linalg.norm(to_earth, axis=-1),
    )


def earth_phase(
    lat: float, lon: float, times: np.ndarray, height_m: float = 0.0, eph: Ephemeris | None = None
) -> np.ndarray:
    """Illuminated fraction of Earth's disk seen from a site (0 = new Earth, 1 = full).

    Uses the phase angle at Earth between the Sun and the observer: (1 + cos i) / 2.
    """
    eph = eph or load_ephemeris()
    sun, earth = eph.vectors(times)
    site = site_position_km(lat, lon, height_m)
    to_sun, to_site = sun - earth, site - earth
    cos_i = np.sum(to_sun * to_site, axis=-1) / (
        np.linalg.norm(to_sun, axis=-1) * np.linalg.norm(to_site, axis=-1)
    )
    return (1 + cos_i) / 2


def subsolar_point(times: np.ndarray, eph: Ephemeris | None = None) -> tuple[np.ndarray, np.ndarray]:
    """Latitude and east longitude (degrees) of the point on the Moon directly under the Sun."""
    eph = eph or load_ephemeris()
    sun, _ = eph.vectors(times)
    lat = np.degrees(np.arcsin(sun[:, 2] / np.linalg.norm(sun, axis=-1)))
    return lat, np.degrees(np.arctan2(sun[:, 1], sun[:, 0]))
