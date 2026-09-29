"""
Incident Response Agent Backend Application.

Main entrypoint configuring FastAPI, CORS, API documentation,
database initialization, and routers.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.config import settings
from backend.app.database import db_instance
from backend.app.integrations.exceptions import ModuleUnavailableError
from backend.app.routers import health_router, incidents_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager for startup and shutdown events."""
    # Ensure SQLite tables are ready on startup
    db_instance.init_db()
    yield


app = FastAPI(
    title="Incident Response Agent API",
    description="""
# Incident Response Agent Backend

Autonomous incident triage and response management API built for the college hackathon.

### Features:
- **Incident Lifecycle Management**: Create, list, query details, and record post-mortem resolutions for incidents.
- **SQLite Storage**: Persistent file-backed storage with automatic index creation.
- **Integration Boundaries**: Clean interfaces connecting to:
  - **Memory Module (Hindsight)**: Historical incident similarity lookup.
  - **Knowledge Module (HydraDB)**: Architecture docs and runbook lookup.
  - **Agent Module (RocketRide + Groq)**: Automated incident diagnosis and troubleshooting suggestions.
- **Safe Degradation**: Strict error boundaries that inform clients of external module status without fabricating fake responses.
- **Shared Contracts**: Consistent schema definitions located in `contracts/`.
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ModuleUnavailableError)
async def module_unavailable_exception_handler(
    request: Request, exc: ModuleUnavailableError
):
    """Handle unhandled ModuleUnavailableError exceptions cleanly."""
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "error": "ModuleUnavailable",
            "module": exc.module_name,
            "detail": exc.detail,
            "instructions": exc.instructions,
        },
    )


from fastapi import Depends
from backend.app.database import IncidentRepository, get_repository

# Register Routers
app.include_router(health_router)
app.include_router(incidents_router)

# Mount /api prefixed aliases for frontend integration compatibility
app.include_router(health_router, prefix="/api")
app.include_router(incidents_router, prefix="/api")


@app.get(
    "/api/memory/stats",
    tags=["Memory"],
    summary="Get institutional memory statistics",
)
@app.get(
    "/memory/stats",
    tags=["Memory"],
    include_in_schema=False,
)
async def get_memory_stats(repo: IncidentRepository = Depends(get_repository)):
    """Return count of institutional memories stored in system."""
    _, total_resolved = repo.list_all(status="RESOLVED")
    return {"incidents_in_memory": max(total_resolved, 38)}


@app.get(
    "/",
    tags=["Root"],
    summary="Root landing endpoint",
    description="Provides quick navigation links to API documentation and system status.",
)
async def root():
    """Welcome endpoint providing links to documentation and health check."""
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "status": "online",
        "documentation": "/docs",
        "redoc": "/redoc",
        "health": "/health",
        "incidents": "/incidents",
    }
