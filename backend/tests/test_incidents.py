"""
Tests for Incident CRUD lifecycle and validation.
"""

from fastapi.testclient import TestClient


def test_create_incident_success(client: TestClient):
    """Test successful incident creation."""
    payload = {
        "title": "Database connection pool exhaustion",
        "description": "500 Internal Server Errors spike across auth service after load increase.",
        "affected_service": "auth-service",
        "severity": "HIGH",
    }
    response = client.post("/incidents", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert data["id"].startswith("INC-")
    assert data["title"] == payload["title"]
    assert data["description"] == payload["description"]
    assert data["affected_service"] == payload["affected_service"]
    assert data["severity"] == "HIGH"
    assert data["status"] == "OPEN"
    assert "created_at" in data
    assert "updated_at" in data
    assert data["root_cause"] is None
    assert data["resolved_at"] is None


def test_create_incident_validation_errors(client: TestClient):
    """Test validation errors on invalid incident creation payloads."""
    # 1. Missing required field (title)
    res1 = client.post(
        "/incidents",
        json={"description": "Missing title", "affected_service": "api"},
    )
    assert res1.status_code == 422

    # 2. Title too short (< 3 characters)
    res2 = client.post(
        "/incidents",
        json={
            "title": "AB",
            "description": "Valid description text here",
            "affected_service": "api",
        },
    )
    assert res2.status_code == 422

    # 3. Only whitespace in title
    res3 = client.post(
        "/incidents",
        json={
            "title": "   ",
            "description": "Valid description text here",
            "affected_service": "api",
        },
    )
    assert res3.status_code == 422

    # 4. Invalid severity
    res4 = client.post(
        "/incidents",
        json={
            "title": "Valid Title Here",
            "description": "Valid description text here",
            "affected_service": "api",
            "severity": "SUPER_CRITICAL_INVALID",
        },
    )
    assert res4.status_code == 422


def test_get_incident_by_id(client: TestClient):
    """Test fetching an existing incident by ID."""
    create_res = client.post(
        "/incidents",
        json={
            "title": "API Gateway 502 Errors",
            "description": "Upstream service timeout triggering 502 Bad Gateway responses.",
            "affected_service": "api-gateway",
            "severity": "CRITICAL",
        },
    )
    incident_id = create_res.json()["id"]

    get_res = client.get(f"/incidents/{incident_id}")
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["id"] == incident_id
    assert data["severity"] == "CRITICAL"


def test_get_missing_incident_returns_404(client: TestClient):
    """Test fetching a non-existent incident returns 404."""
    response = client.get("/incidents/INC-DOESNOTEXIST")
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
    assert "not found" in data["detail"].lower()


def test_list_incidents_and_filtering(client: TestClient):
    """Test listing incidents and filtering by status and severity."""
    # Create 3 incidents
    client.post(
        "/incidents",
        json={
            "title": "Incident 1 - Auth Low",
            "description": "Minor logging glitch",
            "affected_service": "auth",
            "severity": "LOW",
        },
    )
    client.post(
        "/incidents",
        json={
            "title": "Incident 2 - Payment Critical",
            "description": "Payment transactions dropping",
            "affected_service": "payment",
            "severity": "CRITICAL",
        },
    )
    inc3 = client.post(
        "/incidents",
        json={
            "title": "Incident 3 - Search Medium",
            "description": "Search index lag",
            "affected_service": "search",
            "severity": "MEDIUM",
        },
    ).json()

    # Resolve incident 3
    client.patch(
        f"/incidents/{inc3['id']}/resolve",
        json={
            "root_cause": "Index queue stuck",
            "resolution": "Flushed and replayed Kafka topic",
            "outcome": "Search latency normalized",
        },
    )

    # 1. List all
    all_res = client.get("/incidents")
    assert all_res.status_code == 200
    data = all_res.json()
    assert data["total"] >= 3
    assert len(data["items"]) >= 3

    # 2. Filter by status: OPEN
    open_res = client.get("/incidents?status=OPEN")
    assert open_res.status_code == 200
    open_data = open_res.json()
    for item in open_data["items"]:
        assert item["status"] == "OPEN"

    # 3. Filter by status: RESOLVED
    resolved_res = client.get("/incidents?status=RESOLVED")
    assert resolved_res.status_code == 200
    resolved_data = resolved_res.json()
    assert any(item["id"] == inc3["id"] for item in resolved_data["items"])

    # 4. Filter by severity: CRITICAL
    crit_res = client.get("/incidents?severity=CRITICAL")
    assert crit_res.status_code == 200
    crit_data = crit_res.json()
    for item in crit_data["items"]:
        assert item["severity"] == "CRITICAL"


def test_resolve_incident_success(client: TestClient):
    """Test recording resolution details on an incident."""
    create_res = client.post(
        "/incidents",
        json={
            "title": "Memory leak in worker process",
            "description": "Worker memory usage climbs linearly until OOM killer triggers.",
            "affected_service": "worker-queue",
            "severity": "HIGH",
        },
    )
    incident_id = create_res.json()["id"]

    resolution_payload = {
        "root_cause": "Unclosed database cursor in message consumption loop.",
        "resolution": "Wrapped cursor in context manager with explicit close and deployed v1.2.3.",
        "outcome": "Worker memory stabilized at 120MB over 48h.",
    }

    resolve_res = client.patch(f"/incidents/{incident_id}/resolve", json=resolution_payload)
    assert resolve_res.status_code == 200
    updated = resolve_res.json()

    assert updated["id"] == incident_id
    assert updated["status"] == "RESOLVED"
    assert updated["root_cause"] == resolution_payload["root_cause"]
    assert updated["resolution"] == resolution_payload["resolution"]
    assert updated["outcome"] == resolution_payload["outcome"]
    assert updated["resolved_at"] is not None


def test_resolve_missing_incident_returns_404(client: TestClient):
    """Test resolving a non-existent incident returns 404."""
    response = client.patch(
        "/incidents/INC-NONEXISTENT/resolve",
        json={
            "root_cause": "Test cause",
            "resolution": "Test resolution",
            "outcome": "Test outcome",
        },
    )
    assert response.status_code == 404


def test_resolve_incident_validation_errors(client: TestClient):
    """Test validation errors when resolving with empty fields."""
    create_res = client.post(
        "/incidents",
        json={
            "title": "Kafka consumer group rebalance storm",
            "description": "Heartbeat timeouts caused cyclic rebalances.",
            "affected_service": "event-stream",
            "severity": "MEDIUM",
        },
    )
    incident_id = create_res.json()["id"]

    # Empty root_cause
    res1 = client.patch(
        f"/incidents/{incident_id}/resolve",
        json={
            "root_cause": "   ",
            "resolution": "Increased heartbeat timeout",
            "outcome": "Rebalance loop resolved",
        },
    )
    assert res1.status_code == 422
