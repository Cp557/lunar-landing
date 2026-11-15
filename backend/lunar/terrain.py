"""Local terrain horizon from LOLA south-polar elevation maps.

LOLA polar maps are polar stereographic grids on a 1737.4 km sphere, true scale at the
pole. For pixel (row, col) with c0 = N/2 - 0.5: x = (col - c0)*scale, y = -(row - c0)*scale,
east lon = atan2(x, y), lat = -90 + 2*atan(r / 2R). Values are heights above the sphere
(LOLA DN * 0.5 m). Source: LOLA PDS label + DSMAP_POLAR.CAT.

The horizon profile is the highest terrain elevation angle along rays every 0.5 deg of
azimuth, out to 300 km. Each sample is placed on the sphere exactly (great-circle
distance s, angle s/R from the site), so the Moon's curvature is included.
"""

from dataclasses import dataclass
from functools import cache
from pathlib import Path

import numpy as np

from lunar.geometry import MOON_RADIUS_KM, enu_basis, unit_vector

R_M = MOON_RADIUS_KM * 1000
AZIMUTHS_DEG = np.arange(0, 360, 0.5)
LANDER_HEIGHT_M = 2.0
MAX_RANGE_M = 300_000.0
NEAR_FIELD_M = 15_000.0  # range covered by the finest map when one is available
DATA_DIR = Path(__file__).resolve().parents[1] / "data"
COARSE_MAP_PATH = DATA_DIR / "terrain" / "ldem_75s_240m.npz"
NEAR_MAP_PATH = DATA_DIR / "terrain" / "ldem_845s_120m.npz"


@dataclass(frozen=True)
class PolarMap:
    """A LOLA south-polar stereographic elevation map."""

    dn: np.ndarray  # (N, N) int16 heights in units of m_per_dn (may be a memmap)
    scale_m: float  # meters per pixel at the pole
    m_per_dn: float = 0.5

    @property
    def size(self) -> int:
        return self.dn.shape[0]

    def to_pixel(self, unit_vectors: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """Fractional (row, col) of Moon-centered unit vectors (southern hemisphere)."""
        ux, uy, uz = unit_vectors[..., 0], unit_vectors[..., 1], unit_vectors[..., 2]
        k = 2 * R_M / (1 - uz)  # stereographic radius r = 2R tan(c/2), c = angle from pole
        center = self.size / 2 - 0.5
        return center - k * ux / self.scale_m, center + k * uy / self.scale_m

    def heights_m(self, row: np.ndarray, col: np.ndarray) -> np.ndarray:
        """Bilinear heights at fractional pixels; NaN outside the map."""
        last = self.size - 1
        inside = (row >= 0) & (row <= last) & (col >= 0) & (col <= last)
        r = np.clip(row, 0, last - 1e-6)
        c = np.clip(col, 0, last - 1e-6)
        r0, c0 = r.astype(int), c.astype(int)
        fr, fc = r - r0, c - c0
        d = self.dn
        top = d[r0, c0] * (1 - fc) + d[r0, c0 + 1] * fc
        bottom = d[r0 + 1, c0] * (1 - fc) + d[r0 + 1, c0 + 1] * fc
        return np.where(inside, (top * (1 - fr) + bottom * fr) * self.m_per_dn, np.nan)

    def height_at(self, lat: float, lon: float) -> float:
        row, col = self.to_pixel(unit_vector(lat, lon))
        return float(self.heights_m(np.atleast_1d(row), np.atleast_1d(col))[0])

    def covers(self, lat: float, lon: float, margin_m: float = 0.0) -> bool:
        row, col = self.to_pixel(unit_vector(lat, lon))
        m = margin_m / self.scale_m
        return bool(m <= row <= self.size - 1 - m and m <= col <= self.size - 1 - m)


@dataclass(frozen=True)
class Horizon:
    elevation_deg: np.ndarray  # terrain horizon at AZIMUTHS_DEG
    site_height_m: float  # terrain height above the 1737.4 km sphere
    terrain: bool  # False: smooth sphere (no elevation map covers the site)

    def at(self, azimuth_deg: np.ndarray) -> np.ndarray:
        """Horizon elevation at arbitrary azimuths (linear, wrapping at 360)."""
        az = np.append(AZIMUTHS_DEG, 360.0)
        el = np.append(self.elevation_deg, self.elevation_deg[0])
        return np.interp(np.asarray(azimuth_deg) % 360, az, el)


def smooth_horizon(site_height_m: float = 0.0, lander_height_m: float = LANDER_HEIGHT_M) -> Horizon:
    """Horizon of a bare sphere through the site: the limb dips by acos(r / (r + lander))."""
    r = R_M + site_height_m
    dip = np.degrees(np.arccos(r / (r + lander_height_m)))
    return Horizon(np.full(AZIMUTHS_DEG.shape, -dip), site_height_m, terrain=False)


def ray_elevations(
    pmap: PolarMap, lat: float, lon: float, observer_radius_m: float, start_m: float, end_m: float
) -> np.ndarray:
    """Max terrain elevation angle (deg) per azimuth for samples in [start_m, end_m]."""
    east, north, up = enu_basis(lat, lon)
    s = np.arange(max(start_m, pmap.scale_m), end_m + 1, pmap.scale_m)  # ranges, one pixel apart
    theta = s / R_M
    az = np.radians(AZIMUTHS_DEG)
    heading = np.cos(az)[:, None] * north + np.sin(az)[:, None] * east  # (A, 3)
    points = (
        np.cos(theta)[None, :, None] * up + np.sin(theta)[None, :, None] * heading[:, None, :]
    )  # (A, S, 3) unit vectors along each ray
    h = pmap.heights_m(*pmap.to_pixel(points))
    radius = R_M + h
    el = np.degrees(np.arctan2(radius * np.cos(theta) - observer_radius_m, radius * np.sin(theta)))
    return np.where(np.isnan(el), -np.inf, el).max(axis=1)  # -inf: no samples on the map


def terrain_horizon(
    maps: list[PolarMap], lat: float, lon: float, lander_height_m: float = LANDER_HEIGHT_M
) -> Horizon:
    """Horizon profile from elevation maps ordered finest first.

    The finest map that covers the site's surroundings (NEAR_FIELD_M) supplies the site
    height and the near field; the coarsest map supplies the rest out to MAX_RANGE_M.
    """
    usable = [m for m in maps if m.covers(lat, lon)]
    if not usable:
        return smooth_horizon(lander_height_m=lander_height_m)
    near = next((m for m in usable if m.covers(lat, lon, NEAR_FIELD_M)), usable[-1])
    far = usable[-1]
    site_height = near.height_at(lat, lon)
    observer = R_M + site_height + lander_height_m

    if near is far:
        el = ray_elevations(far, lat, lon, observer, 0, MAX_RANGE_M)
    else:
        el = np.maximum(
            ray_elevations(near, lat, lon, observer, 0, NEAR_FIELD_M),
            ray_elevations(far, lat, lon, observer, NEAR_FIELD_M, MAX_RANGE_M),
        )
    # Where no terrain was sampled (beyond the map edge), fall back to the bare-sphere limb.
    limb = smooth_horizon(site_height, lander_height_m).elevation_deg
    el = np.where(np.isfinite(el), el, limb)
    return Horizon(el, site_height, terrain=True)


def load_lola_img(path: Path, scale_m: float) -> PolarMap:
    """Memory-map a raw LOLA polar IMG (square, little-endian int16)."""
    n = int(round((path.stat().st_size / 2) ** 0.5))
    return PolarMap(np.memmap(path, dtype="<i2", mode="r", shape=(n, n)), scale_m)


def _load(path: Path) -> PolarMap:
    d = np.load(path)
    return PolarMap(d["dn"], float(d["scale_m"]))


@cache
def coarse_map() -> PolarMap:
    """Bundled 240 m map of 75S-90S: far field for live (custom-coordinate) horizons."""
    return _load(COARSE_MAP_PATH)


@cache
def near_map() -> PolarMap:
    """Bundled 120 m map to about 84.5S: near field for live horizons when it covers the site."""
    return _load(NEAR_MAP_PATH)
