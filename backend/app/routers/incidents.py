"""
Incidents router for Incident Response Agent.
Handles incident creation, retrieval, listing, resolution, and AI analysis requests.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.app.database import IncidentRepository, get_repository
from backend.app.integrations.agent_client import AgentClient, get_agent_client
from backend.app.integrations.exceptions import (
    IntegrationResponseError,
    IntegrationTimeoutError,
    ModuleUnavailableError,
)
from contracts.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    IncidentCreateRequest,
    IncidentListResponse,
    IncidentResolutionRequest,
    IncidentResponse,
    IncidentSeverity,
    IncidentStatus,
)

router = APIRouter(prefix="/incidents", tags=["Incidents"])


@router.post(
    "",
    response_model=IncidentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new incident",
    description="Accepts title, description, affected service, and severity. Generates a unique incident ID and records the incident as OPEN.",
)
async def create_incident(
    payload: IncidentCreateRequest,
    repo: IncidentRepository = Depends(get_repository),
) -> IncidentResponse:
    """Create and persist a new incident."""
    return repo.create(payload)


@router.get(
    "",
    response_model=IncidentListResponse,
    summary="Incident history",
    description="Returns a paginated list of recorded incidents with their status, sorted newest first.",
)
async def list_incidents(
    status_filter: Optional[IncidentStatus] = Query(
        None,
        alias="status",
        description="Filter by incident status (OPEN, INVESTIGATING, RESOLVED, CLOSED)",
    ),
    severity_filter: Optional[IncidentSeverity] = Query(
        None,
        alias="severity",
        description="Filter by incident severity (LOW, MEDIUM, HIGH, CRITICAL)",
    ),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of items to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    repo: IncidentRepository = Depends(get_repository),
) -> IncidentListResponse:
    """Retrieve history of incidents with optional filtering."""
    status_str = status_filter.value if status_filter else None
    severity_str = severity_filter.value if severity_filter else None

    items, total = repo.list_all(
        status=status_str,
        severity=severity_str,
        limit=limit,
        offset=offset,
    )
    return IncidentListResponse(total=total, items=items)


@router.get(
    "/{incident_id}",
    response_model=IncidentResponse,
    summary="Incident details",
    description="Returns full details of a specific incident by its unique identifier (e.g. INC-XXXXXXXX).",
)
async def get_incident(
    incident_id: str,
    repo: IncidentRepository = Depends(get_repository),
) -> IncidentResponse:
    """Retrieve incident by ID."""
    clean_id = incident_id.strip().upper()
    incident = repo.get_by_id(clean_id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with ID '{clean_id}' was not found.",
        )
    return incident


@router.patch(
    "/{incident_id}/resolve",
    response_model=IncidentResponse,
    summary="Record incident resolution",
    description="Saves the root cause, resolution steps, and outcome. Updates status to RESOLVED and records resolved timestamp.",
)
async def resolve_incident(
    incident_id: str,
    payload: IncidentResolutionRequest,
    repo: IncidentRepository = Depends(get_repository),
) -> IncidentResponse:
    """Record post-incident resolution and mark incident as RESOLVED."""
    clean_id = incident_id.strip().upper()
    updated = repo.resolve(clean_id, payload)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with ID '{clean_id}' was not found. Cannot resolve non-existent incident.",
        )
    return updated


@router.post(
    "/{incident_id}/analyze",
    response_model=AnalysisResponse,
    summary="Request incident analysis",
    description="Dispatches incident details to teammate's RocketRide + Groq agent module for troubleshooting suggestions and relevant memory references. Returns HTTP 503 if agent module is unavailable.",
    responses={
        200: {"description": "Troubleshooting suggestions and memory references from agent module"},
        404: {"description": "Incident not found"},
        502: {"description": "Agent module returned an error"},
        503: {"description": "Agent module is currently unavailable or unconfigured"},
        504: {"description": "Agent module timed out"},
    },
)
async def analyze_incident(
    incident_id: str,
    repo: IncidentRepository = Depends(get_repository),
    agent_client: AgentClient = Depends(get_agent_client),
) -> AnalysisResponse:
    """
    Request diagnostic analysis and troubleshooting suggestions.
    Interacts with the agent module boundary.
    Never fabricates fake successful responses when external module is unavailable.
    """
    clean_id = incident_id.strip().upper()
    incident = repo.get_by_id(clean_id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with ID '{clean_id}' was not found.",
        )

    # Prepare Analysis contract payload
    analysis_request = AnalysisRequest(
        incident_id=incident.id,
        title=incident.title,
        description=incident.description,
        affected_service=incident.affected_service,
        severity=incident.severity,
        status=incident.status,
        context={
            "created_at": incident.created_at.isoformat(),
            "updated_at": incident.updated_at.isoformat(),
            "is_resolved": incident.status == IncidentStatus.RESOLVED,
        },
    )

    try:
        # Call agent interface boundary
        analysis_result = await agent_client.analyze_incident(analysis_request)
        return analysis_result

    except ModuleUnavailableError as err:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "ModuleUnavailable",
                "module": err.module_name,
                "message": err.detail,
                "instructions": err.instructions,
                "incident_id": incident.id,
                "integration_status": "Teammate integration pending",
            },
        )
    except IntegrationTimeoutError as err:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail={
                "error": "ModuleTimeout",
                "module": err.module_name,
                "message": f"Module '{err.module_name}' timed out after {err.timeout_seconds}s.",
                "incident_id": incident.id,
            },
        )
    except IntegrationResponseError as err:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "error": "ModuleError",
                "module": err.module_name,
                "status_code": err.status_code,
                "message": err.message,
                "incident_id": incident.id,
            },
        )
