"""Minimal JPL Horizons API client for the data-building scripts (observer tables, CSV)."""

import urllib.parse
import urllib.request
from datetime import datetime, timezone

import truststore

# Verify TLS with the OS trust store (works behind HTTPS-inspecting proxies).
truststore.inject_into_ssl()

API_URL = "https://ssd.jpl.nasa.gov/api/horizons.api"


def query(**params: str) -> tuple[list[str], list[list[str]]]:
    """Run an observer-table query. Returns (column names, rows) from the CSV table."""
    defaults = {
        "MAKE_EPHEM": "YES",
        "EPHEM_TYPE": "OBSERVER",
        "CSV_FORMAT": "YES",
        "ANG_FORMAT": "DEG",
        "EXTRA_PREC": "YES",
        "OBJ_DATA": "NO",
    }
    quoted = {k: f"'{v}'" for k, v in (defaults | params).items()}
    url = f"{API_URL}?{urllib.parse.urlencode({'format': 'text', **quoted})}"
    with urllib.request.urlopen(url, timeout=300) as resp:
        text = resp.read().decode()
    if "$$SOE" not in text:
        raise RuntimeError(f"Horizons returned no table:\n{text[-2000:]}")

    head, rest = text.split("$$SOE", 1)
    header = next(line for line in reversed(head.splitlines()) if "Date__" in line)
    columns = [c.strip() for c in header.split(",")]
    body = rest.split("$$EOE", 1)[0]
    rows = [[c.strip() for c in line.split(",")] for line in body.strip().splitlines()]
    return columns, rows


def parse_time(value: str) -> float:
    """Horizons calendar time ('2026-Nov-14 00:00', UT) -> unix seconds."""
    return datetime.strptime(value, "%Y-%b-%d %H:%M").replace(tzinfo=timezone.utc).timestamp()
