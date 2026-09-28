"""
Tests for external integration boundaries and failure handling.
Ensures integration failures return 503 and never fabricate fake responses.
"""

from fastapi.testclient import TestClient
from backend.app.integrations.agent_client import get_agent_client
from backend.app.main import app
from backend.tests.conftest import MockWorkingAgentClient


def test_analyze_missing_incident_returns_404(client: TestClient):
    """Test calling analyze on a non-existent incident returns 404 before contacting agent."""
    response = client.post("/incidents/INC-NOTFOUND/analyze")
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
    assert "not found" in data["detail"].lower()


def test_analyze_incident_module_unavailable_returns_503(client: TestClient):
    """
    Test that when Agent module is unavailable/unconfigured:
    1. Returns HTTP 503 Service Unavailable.
    2. Identifies module and provides instructions.
    3. NEVER fabricates a fake successful troubleshooting suggestion.
    """
    # 1. Create a real incident
    create_res = client.post(
        "/incidents",
        json={
            "title": "High CPU utilization on auth pods",
            "description": "Auth service pods pinned at 98% CPU after token validation storm.",
            "affected_service": "auth-service",
            "severity": "HIGH",
        },
    )
    incident_id = create_res.json()["id"]

    # 2. Call analyze with default unconfigured agent module
    analyze_res = client.post(f"/incidents/{incident_id}/analyze")
    assert analyze_res.status_code == 503
    error_data = analyze_res.json()

    assert "detail" in error_data
    detail = error_data["detail"]
    assert detail["error"] == "ModuleUnavailable"
    assert detail["module"] == "agent"
    assert "AGENT_SERVICE_URL" in detail["instructions"]
    assert "Teammate integration pending" in detail["integration_status"]


def test_analyze_incident_with_active_agent_returns_suggestions(client: TestClient):
    """
    Test that when teammate's Agent module is active and responding,
    the backend returns troubleshooting suggestions and memory references correctly.
    """
    # Override agent client with mock working implementation
    mock_agent = MockWorkingAgentClient()
    app.dependency_overrides[get_agent_client] = lambda: mock_agent

    try:
        # Create incident
        create_res = client.post(
            "/incidents",
            json={
                "title": "Payment webhook timeouts",
                "description": "Stripe webhook processor latency spiked to 45s.",
                "affected_service": "payment-webhooks",
                "severity": "CRITICAL",
            },
        )
        incident_id = create_res.json()["id"]

        # Call analyze
        analyze_res = client.post(f"/incidents/{incident_id}/analyze")
        assert analyze_res.status_code == 200
        analysis = analyze_res.json()

        assert analysis["incident_id"] == incident_id
        assert len(analysis["troubleshooting_suggestions"]) > 0
        assert len(analysis["potential_causes"]) > 0
        assert len(analysis["recommended_actions"]) > 0
        assert len(analysis["memory_references"]) > 0
        assert analysis["memory_references"][0]["reference_id"] == "MEM-2024-001"
        assert analysis["confidence_score"] == 0.88
    finally:
        # Clean up dependency override
        if get_agent_client in app.dependency_overrides:
            del app.dependency_overrides[get_agent_client]
