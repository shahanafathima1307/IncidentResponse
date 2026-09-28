"""
Tests for health check and root endpoints.
"""

from fastapi.testclient import TestClient


def test_root_endpoint(client: TestClient):
    """Test the landing root endpoint returns 200 with documentation links."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "documentation" in data
    assert data["documentation"] == "/docs"
    assert data["status"] == "online"


def test_health_check_healthy(client: TestClient):
    """Test GET /health returns 200 OK and reports database and integration states."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"
    assert "integrations" in data
    # When unconfigured, integrations should accurately report unavailable (not configured)
    assert data["integrations"]["agent_module"] == "unavailable (not_configured)"
    assert data["integrations"]["hindsight_memory"] == "unavailable (not_configured)"
    assert data["integrations"]["hydradb_knowledge"] == "unavailable (not_configured)"
