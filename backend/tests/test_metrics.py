import numpy as np
import pytest

from lunar.metrics import HOUR, body_metrics, both_percent, crossings, longest_run, visible_intervals
from lunar.visibility import disk_fraction

# 10 days sampled every 10 minutes; a "body" rising and setting with a 24 h period.
T = np.arange(0, 10 * 24 * HOUR + 1, 600.0)
PERIOD = 24 * HOUR
MARGIN = np.sin(2 * np.pi * (T - 3 * HOUR) / PERIOD)  # rises at 3h, sets at 15h, ...


def test_crossings_are_interpolated_to_within_a_minute():
    times = crossings(T, MARGIN)
    expected = np.sort(np.concatenate([3 * HOUR + np.arange(10) * PERIOD, 15 * HOUR + np.arange(10) * PERIOD]))
    np.testing.assert_allclose(times, expected, atol=60)


def test_visible_intervals_and_metrics():
    spans = visible_intervals(T, MARGIN)
    assert len(spans) == 10
    assert spans[0][0] == pytest.approx(3 * HOUR, abs=60)
    assert spans[0][1] == pytest.approx(15 * HOUR, abs=60)

    m = body_metrics(T, MARGIN, np.ones_like(T))
    assert m["up_at_start"] is False
    assert m["hours_until_change"] == pytest.approx(3, abs=1 / 60)
    assert m["visible_percent"] == pytest.approx(50, abs=0.1)
    # The window starts in darkness at t=0 (3 h) and the longest night is a full 12 h.
    assert m["longest_hidden_hours"] == pytest.approx(12, abs=1 / 60)


def test_always_visible_and_never_visible():
    always = body_metrics(T, np.ones_like(T), np.ones_like(T))
    assert always["visible_percent"] == pytest.approx(100)
    assert always["hours_until_change"] is None
    assert always["longest_hidden_hours"] == 0

    never = body_metrics(T, -np.ones_like(T), np.zeros_like(T))
    assert never["visible_percent"] == pytest.approx(0)
    assert never["longest_hidden_hours"] == pytest.approx(240)


def test_both_percent():
    assert both_percent(T, MARGIN, np.ones_like(T)) == pytest.approx(50, abs=0.5)
    assert both_percent(T, MARGIN, -np.ones_like(T)) == 0


@pytest.mark.parametrize(("offset", "expected"), [(-1, 0.0), (0, 0.5), (1, 1.0), (2, 1.0)])
def test_disk_fraction(offset, expected):
    assert float(disk_fraction(offset * 0.25, 0.0, 0.25)) == pytest.approx(expected)


def test_longest_run():
    assert longest_run(np.array([True, True, False, True, True, True, False])) == 3
    assert longest_run(np.array([False, False])) == 0
