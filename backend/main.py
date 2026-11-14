from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Query

from lunar.ephemeris import load_ephemeris
from lunar.scenario import DAY, MAX_DAYS, landing_windows, scenario
from lunar.sites import curated_sites, find_site, horizon_for

app = FastAPI(title="Lunar Landing Site Navigator API")


def iso(unix_seconds: float) -> str:
    return datetime.fromtimestamp(unix_seconds, timezone.utc).isoformat().replace("+00:00", "Z")


def unix(value: datetime) -> float:
    """Unix seconds; naive datetimes are treated as UTC."""
    return (value if value.tzinfo else value.replace(tzinfo=timezone.utc)).timestamp()


# Vercel rewrites keep the /api prefix, so routes must include it.
@app.get("/api/health")
def health() -> dict:
    eph = load_ephemeris()
    return {
        "status": "ok",
        "ephemeris": {"start": iso(eph.start), "end": iso(eph.end), "rows": len(eph.t)},
    }


@app.get("/api/sites")
def sites() -> list[dict]:
    return curated_sites()


def resolve_site(site: str | None, lat: float | None, lon: float | None) -> dict:
    """Curated site by id, or custom coordinates (lon normalized to -180..180)."""
    if site:
        info = find_site(site)
        if not info:
            raise HTTPException(404, f"Unknown site '{site}'")
        lat, lon, name, site_id = info["lat"], info["lon"], info["name"], info["id"]
    elif lat is None or lon is None:
        raise HTTPException(422, "Give a curated site id or both lat and lon")
    else:
        lon = (lon + 180) % 360 - 180
        name, site_id = f"{lat:.4f}°, {lon:.4f}°", None
    horizon, terrain = horizon_for(lat, lon, site_id)
    return {"id": site_id, "name": name, "lat": lat, "lon": lon, "terrain": terrain, "horizon": horizon}


def check_window(t0: float, seconds: float) -> None:
    eph = load_ephemeris()
    if t0 < eph.start or t0 + seconds > eph.end:
        raise HTTPException(422, f"Dates must fall between {iso(eph.start)} and {iso(eph.end)}")


def current_hour() -> float:
    return datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0).timestamp()


def site_info(s: dict) -> dict:
    return {k: v for k, v in s.items() if k != "horizon"}


@app.get("/api/scenario")
def get_scenario(
    site: str | None = None,
    lat: float | None = Query(None, ge=-90, le=90),
    lon: float | None = Query(None, ge=-180, le=360),
    start: datetime | None = None,
    days: float = Query(14, gt=0, le=MAX_DAYS),
) -> dict:
    """Sun and Earth visibility for a landing at a curated site or custom coordinates."""
    s = resolve_site(site, lat, lon)
    t0 = unix(start) if start else current_hour()
    check_window(t0, days * DAY)
    return {**scenario(s["lat"], s["lon"], s["horizon"], t0, days), "site": site_info(s)}


@app.get("/api/landing-windows")
def get_landing_windows(
    site: str | None = None,
    lat: float | None = Query(None, ge=-90, le=90),
    lon: float | None = Query(None, ge=-180, le=360),
    start: datetime | None = None,
    days: float = Query(14, ge=1, le=60),
    count: int = Query(365, ge=1, le=366),
) -> dict:
    """Mission metrics for landing on each of `count` consecutive days (hourly resolution).
    `count` is trimmed so the last mission ends within the ephemeris coverage."""
    s = resolve_site(site, lat, lon)
    t0 = unix(start) if start else current_hour()
    check_window(t0, days * DAY)
    count = min(count, int((load_ephemeris().end - t0 - days * DAY) // DAY) + 1)
    windows = landing_windows(s["lat"], s["lon"], s["horizon"], t0, days, count)
    return {"site": site_info(s), "days": days, "windows": windows}
