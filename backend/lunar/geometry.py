"""Spherical-Moon geometry: positions, local East-North-Up frames, azimuth/elevation.

Conventions: planetocentric latitude, east-positive longitude, degrees; Moon body-fixed
(mean-Earth/polar-axis) frame; azimuth clockwise from local north. At a pole, "north"
points along the site's longitude meridian.
"""

import numpy as np

MOON_RADIUS_KM = 1737.4


def unit_vector(lat_deg, lon_deg) -> np.ndarray:
    """Unit vector(s) for latitude/longitude, shape (..., 3)."""
    lat, lon = np.radians(lat_deg), np.radians(lon_deg)
    return np.stack(
        [np.cos(lat) * np.cos(lon), np.cos(lat) * np.sin(lon), np.sin(lat)], axis=-1
    )


def site_position_km(lat_deg: float, lon_deg: float, height_m: float = 0.0) -> np.ndarray:
    """Site position relative to the Moon's center (height above the 1737.4 km sphere)."""
    return (MOON_RADIUS_KM + height_m / 1000) * unit_vector(lat_deg, lon_deg)


def enu_basis(lat_deg: float, lon_deg: float) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Local east, north, up unit vectors at a site."""
    lat, lon = np.radians(lat_deg), np.radians(lon_deg)
    east = np.array([-np.sin(lon), np.cos(lon), 0.0])
    north = np.array([-np.sin(lat) * np.cos(lon), -np.sin(lat) * np.sin(lon), np.cos(lat)])
    up = unit_vector(lat_deg, lon_deg)
    return east, north, up


def az_el(vectors: np.ndarray, lat_deg: float, lon_deg: float) -> tuple[np.ndarray, np.ndarray]:
    """Azimuth and elevation (degrees) of site-relative vectors, shape (..., 3)."""
    east, north, up = enu_basis(lat_deg, lon_deg)
    e, n, u = vectors @ east, vectors @ north, vectors @ up
    az = np.degrees(np.arctan2(e, n)) % 360
    el = np.degrees(np.arctan2(u, np.hypot(e, n)))
    return az, el


def direction_from_az_el(az_deg, el_deg) -> np.ndarray:
    """Local unit vector(s) (east, north, up) for azimuth/elevation."""
    az, el = np.radians(az_deg), np.radians(el_deg)
    return np.stack([np.cos(el) * np.sin(az), np.cos(el) * np.cos(az), np.sin(el)], axis=-1)


def angular_separation_deg(az1, el1, az2, el2) -> np.ndarray:
    """Angle between two sky directions given as azimuth/elevation."""
    a, b = direction_from_az_el(az1, el1), direction_from_az_el(az2, el2)
    cross = np.linalg.norm(np.cross(a, b), axis=-1)
    return np.degrees(np.arctan2(cross, np.sum(a * b, axis=-1)))
