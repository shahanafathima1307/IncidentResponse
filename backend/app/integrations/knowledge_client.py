"""
HTTP client adapter for HydraDB Knowledge module.
Allows querying runbooks, architecture docs, and technical specifications.
"""

from typing import Any, Dict, List, Optional
import httpx

from backend.app.config import settings
from backend.app.integrations.base import BaseKnowledgeClient
from backend.app.integrations.exceptions import (
    IntegrationResponseError,
    IntegrationTimeoutError,
    ModuleUnavailableError,
)


class KnowledgeClient(BaseKnowledgeClient):
    """
    Communicates with teammate's HydraDB knowledge service.
    Fails safely if HydraDB module is unavailable.
    """

    def __init__(self, service_url: Optional[str] = None, timeout: Optional[float] = None):
        self.service_url = service_url if service_url is not None else settings.HYDRADB_SERVICE_URL
        self.timeout = timeout if timeout is not None else settings.REQUEST_TIMEOUT_SECONDS

    async def check_health(self) -> str:
        """Check if teammate's HydraDB service is reachable."""
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

    async def query_knowledge(
        self, query: str, tags: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Query HydraDB for relevant knowledge base items.
        Does NOT fabricate fake documentation if service is not configured.
        """
        if not self.service_url:
            raise ModuleUnavailableError(
                module_name="knowledge",
                service_url=None,
                detail="Knowledge module ('HydraDB') is not configured.",
                instructions="Set HYDRADB_SERVICE_URL in .env to the running HydraDB service.",
            )

        url = f"{self.service_url.rstrip('/')}/knowledge/query"
        payload = {"query": query, "tags": tags or []}

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload)
        except httpx.TimeoutException:
            raise IntegrationTimeoutError("knowledge", self.timeout)
        except httpx.ConnectError:
            raise ModuleUnavailableError(
                module_name="knowledge",
                service_url=self.service_url,
                detail=f"Cannot connect to HydraDB service at {self.service_url}.",
                instructions="Ensure teammate's HydraDB service is running.",
            )
        except Exception as exc:
            raise ModuleUnavailableError(
                module_name="knowledge",
                service_url=self.service_url,
                detail=f"Failed to communicate with HydraDB service: {str(exc)}",
            )

        if response.status_code != 200:
            raise IntegrationResponseError("knowledge", response.status_code, response.text)

        try:
            data = response.json()
            return data.get("documents", [])
        except Exception as exc:
            raise IntegrationResponseError(
                "knowledge", response.status_code, f"Failed to parse knowledge data: {str(exc)}"
            )


# Default knowledge client instance
knowledge_client_instance = KnowledgeClient()


def get_knowledge_client() -> BaseKnowledgeClient:
    """Dependency injection helper for KnowledgeClient."""
    return knowledge_client_instance
