"""
Shared Contracts for Incident Response Agent.
These schemas define standard data contracts for communication between:
- Backend (FastAPI)
- Frontend
- Memory Module (Hindsight)
- Knowledge Module (HydraDB)
- Agent Module (RocketRide + Groq)
"""

from contracts.schemas import (
    IncidentSeverity,
    IncidentStatus,
    IncidentCreateRequest,
    IncidentResolutionRequest,
    IncidentResponse,
    IncidentListResponse,
    MemoryReference,
    AnalysisRequest,
    AnalysisResponse,
    HealthResponse,
    ModuleStatus,
)

__all__ = [
    "IncidentSeverity",
    "IncidentStatus",
    "IncidentCreateRequest",
    "IncidentResolutionRequest",
    "IncidentResponse",
    "IncidentListResponse",
    "MemoryReference",
    "AnalysisRequest",
    "AnalysisResponse",
    "HealthResponse",
    "ModuleStatus",
]
