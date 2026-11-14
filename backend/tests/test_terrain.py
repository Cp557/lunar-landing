import numpy as np
import pytest

from lunar.terrain import R_M, PolarMap, smooth_horizon, terrain_horizon

SIZE, SCALE_M = 2001, 100.0  # synthetic maps: +-100 km around the south pole
LANDER_M = 2.0


def synthetic_map(height_m=lambda r_m: 0.0 * r_m) -> PolarMap:
    """South-polar map whose height depends only on distance from the pole."""
    c = SIZE / 2 - 0.5
    rows, cols = np.mgrid[0:SIZE, 0:SIZE]
    r = np.hypot(rows - c, cols - c) * SCALE_M
    return PolarMap((height_m(r) / 0.5).astype(np.int16), SCALE_M)


def elevation_deg(height_m: float, distance_m: float, observer_height_m: float) -> float:
    """Exact elevation angle of a point at great-circle distance on the sphere."""
    theta = distance_m / R_M
    radius = R_M + height_m
    return np.degrees(
        np.arctan2(radius * np.cos(theta) - (R_M + observer_height_m), radius * np.sin(theta))
    )


def test_smooth_sphere_gives_limb_dip():
    expected = -np.degrees(np.arccos(R_M / (R_M + LANDER_M)))  # about -0.087 deg
    horizon = terrain_horizon([synthetic_map()], -90.0, 0.0, LANDER_M)
    assert horizon.terrain
    np.testing.assert_allclose(horizon.elevation_deg, expected, atol=0.002)


def test_ring_wall_at_known_distance():
    wall = lambda r: np.where((r >= 10_000) & (r <= 10_300), 500.0, 0.0)  # noqa: E731
    horizon = terrain_horizon([synthetic_map(wall)], -90.0, 0.0, LANDER_M)
    expected = elevation_deg(500, 10_000, LANDER_M)  # nearest full-height point
    one_pixel = np.degrees(SCALE_M / 10_000)
    np.testing.assert_allclose(horizon.elevation_deg, expected, atol=one_pixel)


def test_site_on_tower_sees_lower_limb():
    tower = lambda r: np.where(r <= 50, 1000.0, 0.0)  # one 1 km pixel at the pole  # noqa: E731
    horizon = terrain_horizon([synthetic_map(tower)], -90.0, 0.0, LANDER_M)
    assert horizon.site_height_m == pytest.approx(1000)
    expected = -np.degrees(np.arccos(R_M / (R_M + 1000 + LANDER_M)))  # datum limb, about -1.95 deg
    np.testing.assert_allclose(horizon.elevation_deg, expected, atol=0.01)


def test_outside_map_falls_back_to_smooth_sphere():
    horizon = terrain_horizon([synthetic_map()], 0.0, 0.0, LANDER_M)
    assert not horizon.terrain
    np.testing.assert_allclose(horizon.elevation_deg, smooth_horizon().elevation_deg)


def test_interpolates_with_wraparound():
    h = smooth_horizon()
    profile = np.zeros_like(h.elevation_deg)
    profile[0], profile[-1] = 1.0, 3.0  # 0 deg and 359.5 deg
    wrapped = type(h)(profile, 0.0, True)
    assert wrapped.at(359.75) == pytest.approx(2.0)
