"""
Abstract interfaces defining boundaries for teammate modules.

Teammate modules:
- Memory: Hindsight module
- Knowledge: HydraDB module
- Agent: RocketRide + Groq diagnostic & troubleshooting engine
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from contracts.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    MemoryReference,
)


class BaseAgentClient(ABC):
    """Interface boundary for RocketRide + Groq agent module."""

    @abstractmethod
    async def analyze_incident(self, request: AnalysisRequest) -> AnalysisResponse:
        """
        Send an incident to the agent module for AI troubleshooting and diagnostic suggestions.

        Raises:
            ModuleUnavailableError: If agent module is unreachable or unconfigured.
            IntegrationTimeoutError: If agent module takes too long to respond.
            IntegrationResponseError: If agent module returns an invalid response.
        """
        pass

    @abstractmethod
    async def check_health(self) -> str:
        """Return connectivity health string for this module."""
        pass


class BaseMemoryClient(ABC):
    """Interface boundary for Hindsight memory module."""

    @abstractmethod
    async def retrieve_memories(
        self, affected_service: str, description: str, limit: int = 5
    ) -> List[MemoryReference]:
        """
        Query Hindsight memory for similar historical incidents.

        Raises:
            ModuleUnavailableError: If Hindsight memory service is unreachable or unconfigured.
        """
        pass

    @abstractmethod
    async def check_health(self) -> str:
        """Return connectivity health string for this module."""
        pass


class BaseKnowledgeClient(ABC):
    """Interface boundary for HydraDB knowledge module."""

    @abstractmethod
    async def query_knowledge(
        self, query: str, tags: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Query HydraDB for relevant system documentation or runbooks.

        Raises:
            ModuleUnavailableError: If HydraDB module is unreachable or unconfigured.
        """
        pass

    @abstractmethod
    async def check_health(self) -> str:
        """Return connectivity health string for this module."""
        pass
