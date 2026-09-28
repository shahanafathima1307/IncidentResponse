"""
Health check router for the Incident Response Agent Backend.
"""

from fastapi import APIRouter, Depends
from backend.app.config import Settings, get_settings
from backend.app.database import IncidentRepository, get_repository
from backend.app.integrations.agent_client import AgentClient, get_agent_client
from backend.app.integrations.memory_client import MemoryClient, get_memory_client
from backend.app.integrations.knowledge_client import KnowledgeClient, get_knowledge_client
from contracts.schemas import HealthResponse

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Backend Health Check",
    description="Returns the status of the backend API, database connectivity, and configured integration boundaries.",
)
async def check_health(
    settings: Settings = Depends(get_settings),
    repo: IncidentRepository = Depends(get_repository),
    agent_client: AgentClient = Depends(get_agent_client),
    memory_client: MemoryClient = Depends(get_memory_client),
    knowledge_client: KnowledgeClient = Depends(get_knowledge_client),
) -> HealthResponse:
    """Perform health and connectivity checks."""
    db_healthy = repo.db.check_health()
    db_status = "connected" if db_healthy else "disconnected"

    agent_status = await agent_client.check_health()
    memory_status = await memory_client.check_health()
    knowledge_status = await knowledge_client.check_health()

    overall_status = "ok" if db_healthy else "degraded"

    return HealthResponse(
        status=overall_status,
        app_name=settings.APP_NAME,
        version="1.0.0",
        database=db_status,
        integrations={
            "agent_module": agent_status,
            "hindsight_memory": memory_status,
            "hydradb_knowledge": knowledge_status,
        },
    )
