"""Plain-language mission brief: one summary sentence plus simple ratings.

The ratings are our rule of thumb (not a NASA standard), defined here in one place:
  good: visible >= 70% of the mission and no gap longer than 3 days
  fair: visible >= 40% of the mission and no gap longer than 7 days
  poor: anything else
"""

GOOD = {"percent": 70.0, "gap_hours": 72.0}
FAIR = {"percent": 40.0, "gap_hours": 168.0}
RATING_RULE = (
    "Good: at least 70% of the mission and no gap over 3 days. "
    "Fair: at least 40% and no gap over 7 days. Poor: anything else. "
    "Our rule of thumb, not a NASA standard."
)


def rate(percent: float, longest_gap_hours: float) -> str:
    for name, rule in (("good", GOOD), ("fair", FAIR)):
        if percent >= rule["percent"] and longest_gap_hours <= rule["gap_hours"]:
            return name
    return "poor"


def plain_duration(hours: float) -> str:
    """'under an hour', '5 hours', 'about 13 days'."""
    if hours < 1:
        return "under an hour"
    if hours < 48:
        n = round(hours)
        return f"{n} hour{'s' if n != 1 else ''}"
    return f"about {round(hours / 24)} days"


def _body_sentence(m: dict, subject: str, up: str, down: str, never: str, sets: str, rises: str) -> str:
    change = m["hours_until_change"]
    if m["up_at_start"]:
        if change is None:
            return f"{subject} {up} for the whole mission"
        return f"{subject} {up} at landing and {sets} after {plain_duration(change)}"
    if change is None:
        return f"{subject} {never} for the whole mission"
    return f"{subject} {down} at landing and {rises} after {plain_duration(change)}"


def _gap(hours: float, what: str) -> str:
    return f"no {what}" if hours == 0 else f"longest {what} {plain_duration(hours)}"


def mission_brief(metrics: dict) -> dict:
    """Summary sentence and power/comms ratings from scenario metrics."""
    sun, earth = metrics["sun"], metrics["earth"]
    sun_text = _body_sentence(sun, "The Sun", "is up", "is down", "stays down", "sets", "rises")
    earth_text = _body_sentence(earth, "Earth", "is in view", "is out of view", "stays out of view", "sets", "rises")
    advice = []
    if earth["visible_percent"] == 0:
        advice.append("Talking to Earth would need a relay satellite.")
    if sun["longest_hidden_hours"] >= 72:
        advice.append(f"Batteries must last {plain_duration(sun['longest_hidden_hours'])} of darkness.")
    power = rate(sun["visible_percent"], sun["longest_hidden_hours"])
    comms = rate(earth["visible_percent"], earth["longest_hidden_hours"])
    return {
        "summary": " ".join([f"{sun_text}. {earth_text}.", *advice]),
        "power": {
            "rating": power,
            "reason": f"Sunlight {sun['visible_percent']:.0f}% of the mission; {_gap(sun['longest_hidden_hours'], 'darkness')}.",
        },
        "comms": {
            "rating": comms,
            "reason": f"Earth contact {earth['visible_percent']:.0f}% of the mission; {_gap(earth['longest_hidden_hours'], 'blackout')}.",
        },
        "rule": RATING_RULE,
    }
