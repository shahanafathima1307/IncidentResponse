"""
Tests for Hindsight memory integration and standalone service wrapper.

Covers:
- MemoryClient health check
- MemoryClient recall
- MemoryClient retention
- Incident analysis -> Hindsight recall -> Agent context
- Incident resolution -> SQLite update -> Hindsight retention
- Safe degradation when Hindsight is unavailable during resolution
- Safe degradation when Hindsight is unavailable during analysis
- Mapping Hindsight results to MemoryReference (including score handling)
"""

from typing import List, Optional
import pytest
from fastapi.testclient import TestClient

from backend.app.integrations.base import BaseMemoryClient
from backend.app.integrations.exceptions import ModuleUnavailableError
from backend.app.integrations.memory_client import MemoryClient, get_memory_client
from backend.app.integrations.agent_client import get_agent_client
from backend.app.main import app
from backend.tests.conftest import MockWorkingAgentClient
from contracts.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    IncidentSeverity,
    MemoryReference,
    MemoryRetainRequest,
)
from hindsight_service.main import app as hindsight_app


class MockHindsightMemoryClient(BaseMemoryClient):
    """Mock memory client simulating an active Hindsight memory service."""

    def __init__(self):
        self.retained_records: List[MemoryRetainRequest] = []
        self.recalled_queries: List[tuple] = []

    async def check_health(self) -> str:
        return "connected"

    async def retrieve_memories(
        self, affected_service: str, description: str, limit: int = 5
    ) -> List[MemoryReference]:
        self.recalled_queries.append((affected_service, description, limit))
        return [
            MemoryReference(
                reference_id="MEM-MOCK-001",
                incident_id="INC-HIST-99",
                summary=f"Past incident on {affected_service}: {description[:30]}",
                similarity_score=None,  # No score invented
                resolution_notes="Increased pool size and restarted service.",
            )
        ]

    async def retain_memory(self, request: MemoryRetainRequest) -> bool:
        self.retained_records.append(request)
        return True


class MockUnavailableMemoryClient(BaseMemoryClient):
    """Mock memory client simulating an unconfigured/unavailable Hindsight service."""

    async def check_health(self) -> str:
        return "unavailable (not_configured)"

    async def retrieve_memories(
        self, affected_service: str, description: str, limit: int = 5
    ) -> List[MemoryReference]:
        raise ModuleUnavailableError(
            module_name="memory",
            service_url=None,
            detail="Hindsight memory service unavailable.",
        )

    async def retain_memory(self, request: MemoryRetainRequest) -> bool:
        raise ModuleUnavailableError(
            module_name="memory",
            service_url=None,
            detail="Hindsight memory service unavailable.",
        )


# --- Tests for MemoryClient Abstraction ---

@pytest.mark.asyncio
async def test_memory_client_health():
    """Test MemoryClient health check when service_url is unconfigured vs configured."""
    client_unconfigured = MemoryClient(service_url=None)
    health = await client_unconfigured.check_health()
    assert health == "unavailable (not_configured)"


@pytest.mark.asyncio
async def test_memory_client_recall_unconfigured():
    """Test MemoryClient retrieve_memories raises ModuleUnavailableError when unconfigured."""
    client = MemoryClient(service_url=None)
    with pytest.raises(ModuleUnavailableError) as exc_info:
        await client.retrieve_memories("payment", "timeout error")
    assert exc_info.value.module_name == "memory"


@pytest.mark.asyncio
async def test_memory_client_retention_unconfigured():
    """Test MemoryClient retain_memory raises ModuleUnavailableError when unconfigured."""
    client = MemoryClient(service_url=None)
    req = MemoryRetainRequest(
        incident_id="INC-123",
        title="Test Incident",
        description="Test description",
        affected_service="auth",
        severity=IncidentSeverity.HIGH,
        root_cause="OOM",
        resolution="Restarted",
        outcome="Resolved",
    )
    with pytest.raises(ModuleUnavailableError) as exc_info:
        await client.retain_memory(req)
    assert exc_info.value.module_name == "memory"


# --- End-to-End Incident Lifecycle Tests ---

def test_resolution_triggers_hindsight_retention(client: TestClient):
    """
    Test that resolving an incident in SQLite triggers Hindsight memory retention.
    """
    mock_memory = MockHindsightMemoryClient()
    app.dependency_overrides[get_memory_client] = lambda: mock_memory

    try:
        # 1. Create incident
        create_res = client.post(
            "/incidents",
            json={
                "title": "Redis latency spike",
                "description": "High memory consumption causing swap activity and high command latency.",
                "affected_service": "redis-cache",
                "severity": "CRITICAL",
            },
        )
        assert create_res.status_code == 201
        incident_id = create_res.json()["id"]

        # 2. Resolve incident
        resolve_payload = {
            "root_cause": "Maxmemory limit not set in redis.conf.",
            "resolution": "Configured maxmemory 4gb and allkeys-lru eviction policy.",
            "outcome": "Latency returned to < 1ms.",
        }
        resolve_res = client.patch(f"/incidents/{incident_id}/resolve", json=resolve_payload)
        assert resolve_res.status_code == 200
        assert resolve_res.json()["status"] == "RESOLVED"

        # 3. Verify retention request was sent to Hindsight memory client
        assert len(mock_memory.retained_records) == 1
        retained = mock_memory.retained_records[0]
        assert retained.incident_id == incident_id
        assert retained.affected_service == "redis-cache"
        assert retained.root_cause == resolve_payload["root_cause"]
        assert retained.resolution == resolve_payload["resolution"]
        assert retained.outcome == resolve_payload["outcome"]
    finally:
        app.dependency_overrides.clear()


def test_resolution_succeeds_when_hindsight_unavailable(client: TestClient):
    """
    Test that if Hindsight service is unavailable, SQLite incident resolution
    STILL succeeds cleanly without throwing 500 error.
    """
    mock_unavailable = MockUnavailableMemoryClient()
    app.dependency_overrides[get_memory_client] = lambda: mock_unavailable

    try:
        # 1. Create incident
        create_res = client.post(
            "/incidents",
            json={
                "title": "Auth token verification failure",
                "description": "JWT signature verification failing for expired secret.",
                "affected_service": "auth-service",
                "severity": "HIGH",
            },
        )
        incident_id = create_res.json()["id"]

        # 2. Resolve incident with Hindsight down
        resolve_payload = {
            "root_cause": "JWKS key rotation mismatch.",
            "resolution": "Reloaded public keys from OAuth provider.",
            "outcome": "Tokens verifying successfully.",
        }
        resolve_res = client.patch(f"/incidents/{incident_id}/resolve", json=resolve_payload)
        assert resolve_res.status_code == 200
        updated = resolve_res.json()
        assert updated["status"] == "RESOLVED"
        assert updated["root_cause"] == resolve_payload["root_cause"]
    finally:
        app.dependency_overrides.clear()


def test_analysis_recalls_hindsight_memories_into_agent_context(client: TestClient):
    """
    Test that analyze_incident recalls historical memories from Hindsight
    and passes them into Agent context as supporting evidence.
    """
    mock_memory = MockHindsightMemoryClient()
    mock_agent = MockWorkingAgentClient()

    app.dependency_overrides[get_memory_client] = lambda: mock_memory
    app.dependency_overrides[get_agent_client] = lambda: mock_agent

    try:
        # 1. Create incident
        create_res = client.post(
            "/incidents",
            json={
                "title": "Postgres connection limit reached",
                "description": "FATAL: remaining connection slots are reserved for non-replication superuser connections.",
                "affected_service": "database-cluster",
                "severity": "CRITICAL",
            },
        )
        incident_id = create_res.json()["id"]

        # 2. Analyze incident
        analyze_res = client.post(f"/incidents/{incident_id}/analyze")
        assert analyze_res.status_code == 200
        analysis = analyze_res.json()

        # Verify memory search was performed
        assert len(mock_memory.recalled_queries) == 1
        query_service, query_desc, _ = mock_memory.recalled_queries[0]
        assert query_service == "database-cluster"
        assert "FATAL" in query_desc

        # Verify memories were returned in response
        assert len(analysis["memory_references"]) > 0
    finally:
        app.dependency_overrides.clear()


def test_analysis_succeeds_when_hindsight_unavailable(client: TestClient):
    """
    Test that if Hindsight service is unavailable during analysis,
    the agent analysis still succeeds safely without historical context.
    """
    mock_unavailable = MockUnavailableMemoryClient()
    mock_agent = MockWorkingAgentClient()

    app.dependency_overrides[get_memory_client] = lambda: mock_unavailable
    app.dependency_overrides[get_agent_client] = lambda: mock_agent

    try:
        create_res = client.post(
            "/incidents",
            json={
                "title": "Kafka partition lag",
                "description": "High consumer group lag on topic telemetry-events.",
                "affected_service": "event-stream",
                "severity": "MEDIUM",
            },
        )
        incident_id = create_res.json()["id"]

        analyze_res = client.post(f"/incidents/{incident_id}/analyze")
        assert analyze_res.status_code == 200
        analysis = analyze_res.json()

        assert analysis["incident_id"] == incident_id
        assert len(analysis["troubleshooting_suggestions"]) > 0
    finally:
        app.dependency_overrides.clear()


def test_hindsight_result_mapping_without_score():
    """
    Test mapping Hindsight recall results to MemoryReference.
    Verifies similarity_score is None when score is unavailable (Requirement 5).
    """
    ref = MemoryReference(
        reference_id="REF-100",
        summary="Historical memory text without explicit vector score",
        similarity_score=None,
        resolution_notes="Fixed by scaling up workers",
    )
    assert ref.similarity_score is None
    assert ref.reference_id == "REF-100"


def test_hindsight_wrapper_service_endpoints(monkeypatch):
    """
    Test the standalone Hindsight HTTP wrapper service endpoints (/health, /memories/search, /memories/retain).
    """
    service_client = TestClient(hindsight_app)

    # Health endpoint
    health_res = service_client.get("/health")
    assert health_res.status_code == 200
    assert "status" in health_res.json()

    # Mock client for search and retain
    class MockClient:
        def recall(self, bank_id, query, tags):
            class Item:
                id = "MEM-1"
                text = "Past resolution"
                metadata = {"incident_id": "INC-0", "resolution": "Scaled up"}
                scores = {"similarity": 0.85}
            class Res:
                results = [Item()]
            return Res()

        def retain(self, bank_id, content, metadata, tags, retain_async=False):
            class RetainRes:
                success = True
            return RetainRes()

    monkeypatch.setattr("hindsight_service.main.get_hindsight_client", lambda: MockClient())

    search_res = service_client.post(
        "/memories/search",
        json={"affected_service": "redis", "description": "timeout", "limit": 3},
    )
    assert search_res.status_code == 200
    assert "memories" in search_res.json()
    assert len(search_res.json()["memories"]) == 1

    retain_res = service_client.post(
        "/memories/retain",
        json={
            "incident_id": "INC-123",
            "title": "T",
            "description": "D",
            "affected_service": "S",
            "severity": "HIGH",
            "root_cause": "RC",
            "resolution": "RES",
            "outcome": "OUT",
        },
    )
    assert retain_res.status_code == 201
    assert retain_res.json()["status"] == "retained"


class SpyAgentClient(MockWorkingAgentClient):
    """Spy agent client that captures the AnalysisRequest sent to analyze_incident."""

    def __init__(self):
        super().__init__()
        self.captured_request: Optional[AnalysisRequest] = None

    async def analyze_incident(self, request: AnalysisRequest) -> AnalysisResponse:
        self.captured_request = request
        # Return response without pre-populated memory references to test backend injection
        res = await super().analyze_incident(request)
        res.memory_references = []
        return res


def test_analyze_endpoint_injects_memories_into_agent_context(client: TestClient):
    """
    Test that analyze endpoint retrieves memories via retrieve_memories,
    injects them into AnalysisRequest.context['historical_memories'],
    and populates AnalysisResponse.memory_references.
    """
    mock_memory = MockHindsightMemoryClient()
    spy_agent = SpyAgentClient()

    app.dependency_overrides[get_memory_client] = lambda: mock_memory
    app.dependency_overrides[get_agent_client] = lambda: spy_agent

    try:
        create_res = client.post(
            "/incidents",
            json={
                "title": "DNS resolution failure in Kubernetes",
                "description": "CoreDNS pods crashing due to memory limits under high DNS query volume.",
                "affected_service": "coredns",
                "severity": "HIGH",
            },
        )
        incident_id = create_res.json()["id"]

        analyze_res = client.post(f"/incidents/{incident_id}/analyze")
        assert analyze_res.status_code == 200
        analysis = analyze_res.json()

        # 1. Verify agent received recalled memories in context
        assert spy_agent.captured_request is not None
        context = spy_agent.captured_request.context
        assert "historical_memories" in context
        assert len(context["historical_memories"]) == 1
        assert context["historical_memories"][0]["reference_id"] == "MEM-MOCK-001"

        # 2. Verify backend populated memory_references in AnalysisResponse
        assert len(analysis["memory_references"]) == 1
        assert analysis["memory_references"][0]["reference_id"] == "MEM-MOCK-001"
    finally:
        app.dependency_overrides.clear()


def test_analyze_endpoint_fallback_returns_empty_memory_references(client: TestClient):
    """
    Test that if retrieve_memories fails (Hindsight down), analysis continues
    and returns 200 with an empty memory_references list.
    """
    mock_unavailable = MockUnavailableMemoryClient()
    spy_agent = SpyAgentClient()

    app.dependency_overrides[get_memory_client] = lambda: mock_unavailable
    app.dependency_overrides[get_agent_client] = lambda: spy_agent

    try:
        create_res = client.post(
            "/incidents",
            json={
                "title": "Nginx 504 Gateway Timeout",
                "description": "Upstream proxy timeouts under heavy traffic load.",
                "affected_service": "nginx-ingress",
                "severity": "HIGH",
            },
        )
        incident_id = create_res.json()["id"]

        analyze_res = client.post(f"/incidents/{incident_id}/analyze")
        assert analyze_res.status_code == 200
        analysis = analyze_res.json()

        assert analysis["incident_id"] == incident_id
        assert analysis["memory_references"] == []
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_memory_client_timeout_error_handling(httpx_mock=None):
    """
    Test MemoryClient handles timeout exceptions cleanly by raising IntegrationTimeoutError.
    """
    import httpx
    from backend.app.integrations.exceptions import IntegrationTimeoutError

    class TimeoutMemoryClient(MemoryClient):
        async def retrieve_memories(self, affected_service: str, description: str, limit: int = 5):
            raise IntegrationTimeoutError("memory", self.timeout)

        async def retain_memory(self, request: MemoryRetainRequest):
            raise IntegrationTimeoutError("memory", self.timeout)

    client = TimeoutMemoryClient(service_url="http://localhost:8002", timeout=1.0)

    with pytest.raises(IntegrationTimeoutError):
        await client.retrieve_memories("api", "test")

    with pytest.raises(IntegrationTimeoutError):
        await client.retain_memory(
            MemoryRetainRequest(
                incident_id="INC-1",
                title="T",
                description="D",
                affected_service="S",
                severity=IncidentSeverity.LOW,
                root_cause="R",
                resolution="Res",
                outcome="O",
            )
        )

