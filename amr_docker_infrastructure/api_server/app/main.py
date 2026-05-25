from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import robots, maps, zones, telemetry, commands

app = FastAPI(title="AMR Dashboard API", version="1.0.0")

# Setup CORS to allow React dashboard connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits all local dev origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(robots.router, prefix="/api/robots", tags=["robots"])
app.include_router(maps.router, prefix="/api/maps", tags=["maps"])
app.include_router(zones.router, prefix="/api/zones", tags=["zones"])
app.include_router(telemetry.router, prefix="/api/telemetry", tags=["telemetry"])
app.include_router(commands.router, prefix="/api/commands", tags=["commands"])

@app.get("/health")
def health():
    return {"status": "ok", "service": "amr-api"}
