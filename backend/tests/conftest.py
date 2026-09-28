"""
Pytest configuration and fixtures.
Provides isolated test databases, TestClient instances, and mock adapters.
"""

import os
import tempfile
from pathlib import Path
from typing import Generator
import pytest
from fastapi.testclient import TestClient

from backend.app.config import Settings
from backend.app.database import Database, IncidentRepository, get_repository
from backend.app.integrations.agent_client import AgentClient, get_agent_client
from backend.app.integrations.base import BaseAgentClient
from backend.app.main import app
from contracts.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    MemoryReference,
)


@pytest.fixture
def temp_db_path() -> Generator[Path, None, None]:
    """Provide a path to a temporary SQLite database file for isolated tests."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        tmp_path = Path(f.name)
    yield tmp_path
    if tmp_path.exists():
        tmp_path.unlink()


@pytest.fixture
def test_repo(temp_db_path: Path) -> IncidentRepository:
    """Provide an isolated IncidentRepository instance using the temp database."""
    db = Database(db_path=temp_db_path)
    return IncidentRepository(db)


@pytest.fixture
def client(test_repo: IncidentRepository) -> Generator[TestClient, None, None]:
    """Provide a FastAPI TestClient with the isolated repository injected."""
    app.dependency_overrides[get_repository] = lambda: test_repo
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


class MockWorkingAgentClient(BaseAgentClient):
    """Simulates an active, running RocketRide + Groq agent module for testing."""

    async def check_health(self) -> str:
        return "connected"

    async def analyze_incident(self, request: AnalysisRequest) -> AnalysisResponse:
        return AnalysisResponse(
            incident_id=request.incident_id,
            troubleshooting_suggestions=[
                "Inspect connection pool metrics for database and cache.",
                "Review recent deployments or configuration changes.",
                "Check error log volume on affected service pods.",
            ],
            potential_causes=[
                "Exhaustion of Redis connection pool under spike traffic.",
                "Downstream third-party API timeout.",
            ],
            recommended_actions=[
                "Increase max connection pool limit to 200.",
                "Enable circuit breaker pattern on downstream payment gateway.",
            ],
            memory_references=[
                MemoryReference(
                    reference_id="MEM-2024-001",
                    incident_id="INC-HIST-01",
                    summary="Past timeout incident on payment service resolved by tuning pool timeout.",
                    similarity_score=0.92,
                    resolution_notes="Increased connection pool and reduced keep-alive timeout.",
                )
            ],
            confidence_score=0.88,
        )
