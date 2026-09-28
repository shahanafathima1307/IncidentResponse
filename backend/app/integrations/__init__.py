"""
Integration boundaries package for Incident Response Agent.
Exposes clean client adapters and exceptions for teammate modules.
"""

from backend.app.integrations.base import (
    BaseAgentClient,
    BaseMemoryClient,
    BaseKnowledgeClient,
)
from backend.app.integrations.agent_client import AgentClient, get_agent_client
from backend.app.integrations.memory_client import MemoryClient, get_memory_client
from backend.app.integrations.knowledge_client import KnowledgeClient, get_knowledge_client
from backend.app.integrations.exceptions import (
    IntegrationError,
    ModuleUnavailableError,
    IntegrationTimeoutError,
    IntegrationResponseError,
)

__all__ = [
    "BaseAgentClient",
    "BaseMemoryClient",
    "BaseKnowledgeClient",
    "AgentClient",
    "get_agent_client",
    "MemoryClient",
    "get_memory_client",
    "KnowledgeClient",
    "get_knowledge_client",
    "IntegrationError",
    "ModuleUnavailableError",
    "IntegrationTimeoutError",
    "IntegrationResponseError",
]
