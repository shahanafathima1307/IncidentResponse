"""
Incidents router for Incident Response Agent.
Handles incident creation, retrieval, listing, resolution, and AI analysis requests.
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.app.database import IncidentRepository, get_repository
from backend.app.integrations.agent_client import AgentClient, get_agent_client
from backend.app.integrations.memory_client import MemoryClient, get_memory_client
from backend.app.integrations.knowledge_client import KnowledgeClient, get_knowledge_client
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
    MemoryReference,
    MemoryRetainRequest,
)

logger = logging.getLogger("backend.incidents")

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
@router.post(
    "/{incident_id}/resolve",
    response_model=IncidentResponse,
    include_in_schema=False,
)
@router.post(
    "/{incident_id}/outcome",
    response_model=IncidentResponse,
    include_in_schema=False,
)
async def resolve_incident(
    incident_id: str,
    payload: IncidentResolutionRequest,
    repo: IncidentRepository = Depends(get_repository),
    memory_client: MemoryClient = Depends(get_memory_client),
) -> IncidentResponse:
    """Record post-incident resolution and mark incident as RESOLVED."""
    clean_id = incident_id.strip().upper()
    existing = repo.get_by_id(clean_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with ID '{clean_id}' was not found. Cannot resolve non-existent incident.",
        )

    already_resolved = existing.status == IncidentStatus.RESOLVED

    updated = repo.resolve(clean_id, payload)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with ID '{clean_id}' was not found. Cannot resolve non-existent incident.",
        )

    # Construct Hindsight memory retention payload
    retain_payload = MemoryRetainRequest(
        incident_id=updated.id,
        title=updated.title,
        description=updated.description,
        affected_service=updated.affected_service,
        severity=updated.severity,
        root_cause=updated.root_cause or payload.root_cause,
        resolution=updated.resolution or payload.resolution,
        outcome=updated.outcome or payload.outcome,
        resolved_at=updated.resolved_at,
    )

    # Trigger retention to Hindsight memory module only on initial resolution
    if not already_resolved:
        try:
            await memory_client.retain_memory(retain_payload)
        except Exception as err:
            logger.warning(
                f"Hindsight memory retention unavailable during resolution of incident '{clean_id}': {err}. "
                "SQLite resolution succeeded."
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
    memory_client: MemoryClient = Depends(get_memory_client),
    knowledge_client: KnowledgeClient = Depends(get_knowledge_client),
) -> AnalysisResponse:
    """
    Request diagnostic analysis and troubleshooting suggestions.
    Interacts with the agent module boundary after querying Hindsight memory and HydraDB knowledge.
    Never fabricates fake successful responses when external agent module is unavailable.
    """
    clean_id = incident_id.strip().upper()
    incident = repo.get_by_id(clean_id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with ID '{clean_id}' was not found.",
        )

    # Query Hindsight memory for relevant historical memories
    recalled_memories: List[MemoryReference] = []
    try:
        recalled_memories = await memory_client.retrieve_memories(
            affected_service=incident.affected_service,
            description=incident.description,
            limit=5,
        )
    except Exception as err:
        logger.warning(
            f"Hindsight memory recall unavailable during analysis of incident '{clean_id}': {err}. "
            "Proceeding with analysis without historical context."
        )

    # Query HydraDB knowledge module for relevant architecture docs/runbooks
    recalled_knowledge: List[dict] = []
    try:
        recalled_knowledge = await knowledge_client.query_knowledge(
            query=f"{incident.affected_service} {incident.title}",
            tags=[f"service:{incident.affected_service}"],
        )
    except Exception as err:
        logger.warning(
            f"HydraDB knowledge query unavailable during analysis of incident '{clean_id}': {err}. "
            "Proceeding without knowledge references."
        )

    # Prepare Analysis contract payload including historical memories & runbooks in context
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
            "historical_memories": [mem.model_dump(mode="json") for mem in recalled_memories],
            "runbooks": recalled_knowledge,
        },
    )

    try:
        # Call agent interface boundary
        analysis_result = await agent_client.analyze_incident(analysis_request)

        # Populate AnalysisResponse.memory_references if not already populated by agent module
        if recalled_memories and not analysis_result.memory_references:
            analysis_result.memory_references = recalled_memories

        # Populate AnalysisResponse.knowledge_references if not already populated by agent module
        if recalled_knowledge and not analysis_result.knowledge_references:
            analysis_result.knowledge_references = recalled_knowledge

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

