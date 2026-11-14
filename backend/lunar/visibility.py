"""Is the Sun / Earth above the local terrain horizon, and how much of its disk shows?"""

from dataclasses import dataclass

import numpy as np

from lunar.ephemeris import sky_track
from lunar.terrain import Horizon

SUN_RADIUS_KM = 695_700.0
EARTH_RADIUS_KM = 6_371.0


def disk_fraction(center_el_deg, horizon_el_deg, angular_radius_deg) -> np.ndarray:
    """Fraction of a disk above a locally flat horizon (circular-segment area), 0..1."""
    u = np.clip((np.asarray(center_el_deg) - horizon_el_deg) / angular_radius_deg, -1.0, 1.0)
    return 1 - (np.arccos(u) - u * np.sqrt(1 - u * u)) / np.pi


@dataclass(frozen=True)
class BodyTrack:
    az_deg: np.ndarray
    el_deg: np.ndarray
    horizon_deg: np.ndarray  # terrain horizon at the body's azimuth
    disk: np.ndarray  # visible fraction of the disk, 0..1

    @property
    def margin_deg(self) -> np.ndarray:
        """Center elevation above the terrain horizon; > 0 means visible."""
        return self.el_deg - self.horizon_deg


def body_track(az, el, distance_km, radius_km: float, horizon: Horizon) -> BodyTrack:
    horizon_el = horizon.at(az)
    angular_radius = np.degrees(np.arcsin(radius_km / distance_km))
    return BodyTrack(az, el, horizon_el, disk_fraction(el, horizon_el, angular_radius))


def visibility(
    lat: float, lon: float, times: np.ndarray, horizon: Horizon, lander_height_m: float
) -> tuple[BodyTrack, BodyTrack]:
    """Sun and Earth tracks with their terrain horizons at a site."""
    sky = sky_track(lat, lon, times, horizon.site_height_m + lander_height_m)
    sun = body_track(sky.sun_az, sky.sun_el, sky.sun_km, SUN_RADIUS_KM, horizon)
    earth = body_track(sky.earth_az, sky.earth_el, sky.earth_km, EARTH_RADIUS_KM, horizon)
    return sun, earth
