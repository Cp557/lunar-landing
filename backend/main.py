from datetime import datetime, timezone

from fastapi import FastAPI

from lunar.ephemeris import load_ephemeris

app = FastAPI()


def iso(unix_seconds: float) -> str:
    return datetime.fromtimestamp(unix_seconds, timezone.utc).isoformat().replace("+00:00", "Z")


# Vercel rewrites keep the /api prefix, so routes must include it.
@app.get("/api/hello")
def hello() -> dict[str, str]:
    return {"message": "Hello from FastAPI"}


@app.get("/api/health")
def health() -> dict:
    eph = load_ephemeris()
    return {
        "status": "ok",
        "ephemeris": {"start": iso(eph.start), "end": iso(eph.end), "rows": len(eph.t)},
    }
