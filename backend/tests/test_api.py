from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health_reports_ephemeris_coverage():
    body = client.get("/api/health").json()
    assert body["status"] == "ok"
    assert body["ephemeris"]["start"] == "2026-01-01T00:00:00Z"
    assert body["ephemeris"]["end"] == "2031-01-01T00:00:00Z"
