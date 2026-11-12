from fastapi import FastAPI

app = FastAPI()


# Vercel rewrites keep the /api prefix, so routes must include it.
@app.get("/api/hello")
def hello() -> dict[str, str]:
    return {"message": "Hello from FastAPI"}
