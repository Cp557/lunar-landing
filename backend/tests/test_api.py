from fastapi.testclient import TestClient

from main import app

client = TestClient(app)
START = "2026-12-01T00:00:00Z"


def test_health_reports_ephemeris_coverage():
    body = client.get("/api/health").json()
    assert body["status"] == "ok"
    assert body["ephemeris"]["start"] == "2026-01-01T00:00:00Z"
    assert body["ephemeris"]["end"] == "2031-01-01T00:00:00Z"


def test_sites_have_cited_coordinates():
    sites = client.get("/api/sites").json()
    assert sites
    for s in sites:
        assert -90 <= s["lat"] <= 90 and -180 <= s["lon"] <= 180
        assert s["source_url"].startswith("http")


def test_scenario_for_custom_south_polar_point_uses_live_terrain():
    r = client.get("/api/scenario", params={"lat": -89.5, "lon": 0, "start": START, "days": 14})
    assert r.status_code == 200
    body = r.json()
    assert body["site"]["terrain"] == "LOLA 120 m + 240 m (approximate)"
    assert len(body["series"]["t"]) == 14 * 24 * 6 + 1
    assert len(body["horizon"]["elevation_deg"]) == 720
    assert set(body["metrics"]) >= {"sun", "earth", "both_percent"}


def test_scenario_between_80s_and_84s_uses_240m_only():
    body = client.get("/api/scenario", params={"lat": -81, "lon": 20, "start": START, "days": 2}).json()
    assert body["site"]["terrain"] == "LOLA 240 m (approximate)"


def test_scenario_far_from_pole_uses_smooth_sphere():
    body = client.get("/api/scenario", params={"lat": 10, "lon": 20, "start": START}).json()
    assert body["site"]["terrain"] == "None (smooth sphere)"


def test_scenario_for_each_curated_site():
    for s in client.get("/api/sites").json():
        r = client.get("/api/scenario", params={"site": s["id"], "start": START, "days": 2})
        assert r.status_code == 200, s["id"]


def test_scenario_errors():
    assert client.get("/api/scenario", params={"site": "nope"}).status_code == 404
    assert client.get("/api/scenario", params={"lat": -89}).status_code == 422
    late = client.get("/api/scenario", params={"lat": 0, "lon": 0, "start": "2030-12-25T00:00:00Z", "days": 14})
    assert late.status_code == 422


def test_landing_windows():
    r = client.get("/api/landing-windows", params={"lat": -89.5, "lon": 0, "start": START, "days": 14, "count": 30})
    assert r.status_code == 200
    windows = r.json()["windows"]
    assert len(windows) == 30
    assert windows[1]["start"] - windows[0]["start"] == 86400
    assert all(0 <= w["sun_percent"] <= 100 for w in windows)
