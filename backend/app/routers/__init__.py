"""
API Routers for Incident Response Agent.
"""

from backend.app.routers.health import router as health_router
from backend.app.routers.incidents import router as incidents_router

__all__ = ["health_router", "incidents_router"]
