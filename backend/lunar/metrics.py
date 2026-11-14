"""Turn a sampled visibility margin into intervals and mission metrics.

A margin series m(t) (> 0 means visible) is sampled at times t. Sign changes between
samples are located by linear interpolation, so rise/set times are accurate to well
under a sampling step.
"""

import numpy as np

HOUR = 3600.0


def crossings(t: np.ndarray, margin: np.ndarray) -> np.ndarray:
    """Interpolated times where the margin changes sign."""
    up = margin > 0
    k = np.nonzero(up[:-1] != up[1:])[0]
    m0, m1 = margin[k], margin[k + 1]
    return t[k] + m0 / (m0 - m1) * (t[k + 1] - t[k])


def visible_intervals(t: np.ndarray, margin: np.ndarray) -> list[tuple[float, float]]:
    """[start, end] spans with margin > 0, clipped to [t[0], t[-1]]."""
    edges = [t[0], *crossings(t, margin), t[-1]]
    first_up = margin[0] > 0
    spans = list(zip(edges[:-1], edges[1:]))
    return [(float(a), float(b)) for i, (a, b) in enumerate(spans) if (i % 2 == 0) == first_up]


def hidden_intervals(t: np.ndarray, margin: np.ndarray) -> list[tuple[float, float]]:
    return visible_intervals(t, -margin)


def body_metrics(t: np.ndarray, margin: np.ndarray, disk: np.ndarray) -> dict:
    """Headline, summary and risk metrics for one body over the window t[0]..t[-1]."""
    total = t[-1] - t[0]
    visible = visible_intervals(t, margin)
    hidden = hidden_intervals(t, margin)
    changes = crossings(t, margin)
    up = bool(margin[0] > 0)
    visible_s = sum(b - a for a, b in visible)
    return {
        "up_at_start": up,
        "hours_until_change": float((changes[0] - t[0]) / HOUR) if len(changes) else None,
        "visible_hours": visible_s / HOUR,
        "visible_percent": 100 * visible_s / total,
        "longest_hidden_hours": max((b - a for a, b in hidden), default=0.0) / HOUR,
        "disk_percent_at_start": float(100 * disk[0]),
    }


def longest_run(mask: np.ndarray) -> int:
    """Length of the longest run of True values."""
    edges = np.diff(np.concatenate([[0], mask.astype(np.int8), [0]]))
    starts, ends = np.nonzero(edges == 1)[0], np.nonzero(edges == -1)[0]
    return int((ends - starts).max()) if len(starts) else 0


def both_percent(t: np.ndarray, sun_margin: np.ndarray, earth_margin: np.ndarray) -> float:
    """Percent of the window with the Sun and Earth both visible (sample-based)."""
    both = (sun_margin > 0) & (earth_margin > 0)
    weights = np.gradient(t)  # each sample's share of the window
    return float(100 * np.sum(weights * both) / np.sum(weights))
