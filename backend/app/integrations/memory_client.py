"""
HTTP client adapter for Hindsight Memory module.
Allows querying historical incident resolutions and memory references.
"""

from typing import List, Optional
import httpx

from backend.app.config import settings
from backend.app.integrations.base import BaseMemoryClient
from backend.app.integrations.exceptions import (
    IntegrationResponseError,
    IntegrationTimeoutError,
    ModuleUnavailableError,
)
from contracts.schemas import MemoryReference, MemoryRetainRequest


class MemoryClient(BaseMemoryClient):
    """
    Communicates with teammate's Hindsight memory service.
    Fails safely if Hindsight module is unavailable.
    """

    def __init__(self, service_url: Optional[str] = None, timeout: Optional[float] = None):
        self.service_url = service_url if service_url is not None else settings.HINDSIGHT_SERVICE_URL
        self.timeout = timeout if timeout is not None else settings.REQUEST_TIMEOUT_SECONDS

    async def check_health(self) -> str:
        """Check if teammate's Hindsight service is reachable."""
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

    async def retrieve_memories(
        self, affected_service: str, description: str, limit: int = 5
    ) -> List[MemoryReference]:
        """
        Query Hindsight memory for similar historical incidents.
        Does NOT fabricate fake memories if service is not configured.
        """
        if not self.service_url:
            raise ModuleUnavailableError(
                module_name="memory",
                service_url=None,
                detail="Memory module ('Hindsight') is not configured.",
                instructions="Set HINDSIGHT_SERVICE_URL in .env to the running Hindsight service.",
            )

        url = f"{self.service_url.rstrip('/')}/memories/search"
        payload = {
            "affected_service": affected_service,
            "description": description,
            "limit": limit,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload)
        except httpx.TimeoutException:
            raise IntegrationTimeoutError("memory", self.timeout)
        except httpx.ConnectError:
            raise ModuleUnavailableError(
                module_name="memory",
                service_url=self.service_url,
                detail=f"Cannot connect to Hindsight service at {self.service_url}.",
                instructions="Ensure teammate's Hindsight service is running.",
            )
        except Exception as exc:
            raise ModuleUnavailableError(
                module_name="memory",
                service_url=self.service_url,
                detail=f"Failed to communicate with Hindsight service: {str(exc)}",
            )

        if response.status_code != 200:
            raise IntegrationResponseError("memory", response.status_code, response.text)

        try:
            items = response.json().get("memories", [])
            return [MemoryReference.model_validate(item) for item in items]
        except Exception as exc:
            raise IntegrationResponseError(
                "memory", response.status_code, f"Failed to parse memory references: {str(exc)}"
            )

    async def retain_memory(self, request: MemoryRetainRequest) -> bool:
        """
        Send confirmed incident resolution to Hindsight memory for retention.
        Fails safely and raises ModuleUnavailableError if Hindsight service is unconfigured or unreachable.
        """
        if not self.service_url:
            raise ModuleUnavailableError(
                module_name="memory",
                service_url=None,
                detail="Memory module ('Hindsight') is not configured.",
                instructions="Set HINDSIGHT_SERVICE_URL in .env to the running Hindsight service.",
            )

        url = f"{self.service_url.rstrip('/')}/memories/retain"
        payload = request.model_dump(mode="json")

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload)
        except httpx.TimeoutException:
            raise IntegrationTimeoutError("memory", self.timeout)
        except httpx.ConnectError:
            raise ModuleUnavailableError(
                module_name="memory",
                service_url=self.service_url,
                detail=f"Cannot connect to Hindsight service at {self.service_url}.",
                instructions="Ensure teammate's Hindsight service is running.",
            )
        except Exception as exc:
            raise ModuleUnavailableError(
                module_name="memory",
                service_url=self.service_url,
                detail=f"Failed to communicate with Hindsight service: {str(exc)}",
            )

        if response.status_code not in (200, 201):
            raise IntegrationResponseError("memory", response.status_code, response.text)

        return True



# Default memory client instance
memory_client_instance = MemoryClient()


def get_memory_client() -> BaseMemoryClient:
    """Dependency injection helper for MemoryClient."""
    return memory_client_instance
