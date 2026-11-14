import numpy as np
import pytest

from lunar.geometry import angular_separation_deg, az_el, unit_vector


def test_unit_vector_axes():
    np.testing.assert_allclose(unit_vector(0, 0), [1, 0, 0], atol=1e-12)
    np.testing.assert_allclose(unit_vector(0, 90), [0, 1, 0], atol=1e-12)
    np.testing.assert_allclose(unit_vector(-90, 0), [0, 0, -1], atol=1e-12)


@pytest.mark.parametrize(
    ("vector", "az", "el"),
    [
        ([1, 0, 0], None, 90),  # straight up at (0, 0)
        ([0, 0, 1], 0, 0),  # toward the north pole: due north on the horizon
        ([0, 1, 0], 90, 0),  # due east
        ([0, -1, 0], 270, 0),  # due west
        ([1, 0, 1], 0, 45),
    ],
)
def test_az_el_at_equator(vector, az, el):
    got_az, got_el = az_el(np.array(vector, dtype=float), 0, 0)
    assert got_el == pytest.approx(el, abs=1e-9)
    if az is not None:
        assert got_az == pytest.approx(az, abs=1e-9)


def test_az_el_at_south_pole_up_is_minus_z():
    _, el = az_el(np.array([0.0, 0.0, -1.0]), -90, 0)
    assert el == pytest.approx(90)


def test_angular_separation():
    assert angular_separation_deg(0, 0, 90, 0) == pytest.approx(90)
    assert angular_separation_deg(10, 89.999, 190, 89.999) == pytest.approx(0.002, abs=1e-6)
    assert angular_separation_deg(359.99, 0, 0.01, 0) == pytest.approx(0.02, abs=1e-9)
