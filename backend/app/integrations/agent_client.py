"""
HTTP client adapter for RocketRide + Groq Agent module.
Coordinates incident troubleshooting requests with the teammate's agent module.
"""

from typing import Optional
import httpx

from backend.app.config import settings
from backend.app.integrations.base import BaseAgentClient
from backend.app.integrations.exceptions import (
    IntegrationResponseError,
    IntegrationTimeoutError,
    ModuleUnavailableError,
)
from contracts.schemas import AnalysisRequest, AnalysisResponse


class AgentClient(BaseAgentClient):
    """
    Communicates with teammate's RocketRide + Groq Agent service.
    Fails safely and raises typed exceptions when module is unreachable.
    """

    def __init__(self, service_url: Optional[str] = None, timeout: Optional[float] = None):
        self.service_url = service_url if service_url is not None else settings.AGENT_SERVICE_URL
        self.timeout = timeout if timeout is not None else settings.REQUEST_TIMEOUT_SECONDS

    async def check_health(self) -> str:
        """Check if teammate's agent service is reachable."""
        if not self.service_url:
            return "unavailable (not_configured)"

        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{self.service_url.rstrip('/')}/health")
                if res.status_code == 200:
                    return "connected"
                return f"unhealthy (status {res.status_code})"
        except Exception:
            return "unreachable"

    async def analyze_incident(self, request: AnalysisRequest) -> AnalysisResponse:
        """
        Send incident to teammate's agent service.
        Does NOT fabricate fake results if service is unavailable.
        """
        if not self.service_url:
            raise ModuleUnavailableError(
                module_name="agent",
                service_url=None,
                detail="Agent module ('RocketRide + Groq') is not configured.",
                instructions=(
                    "Set AGENT_SERVICE_URL in your .env file to the teammate's "
                    "running agent service (e.g. http://localhost:8001)."
                ),
            )

        url = f"{self.service_url.rstrip('/')}/analyze"
        payload = request.model_dump(mode="json")

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload)
        except httpx.TimeoutException:
            raise IntegrationTimeoutError(
                module_name="agent",
                timeout_seconds=self.timeout,
            )
        except httpx.ConnectError:
            raise ModuleUnavailableError(
                module_name="agent",
                service_url=self.service_url,
                detail=f"Cannot connect to Agent module at {self.service_url}. Connection refused.",
                instructions="Ensure teammate's agent service is running on the specified host/port.",
            )
        except Exception as exc:
            raise ModuleUnavailableError(
                module_name="agent",
                service_url=self.service_url,
                detail=f"Failed to communicate with Agent service: {str(exc)}",
            )

        if response.status_code != 200:
            raise IntegrationResponseError(
                module_name="agent",
                status_code=response.status_code,
                response_text=response.text,
            )

        try:
            data = response.json()
            return AnalysisResponse.model_validate(data)
        except Exception as exc:
            raise IntegrationResponseError(
                module_name="agent",
                status_code=response.status_code,
                response_text=f"Invalid JSON/Schema received from agent service: {str(exc)}",
            )


# Default agent client instance
agent_client_instance = AgentClient()


def get_agent_client() -> BaseAgentClient:
    """Dependency injection helper for AgentClient."""
    return agent_client_instance
