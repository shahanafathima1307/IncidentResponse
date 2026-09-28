"""
Tests to verify SQLite data persistence across server restarts.
"""

from pathlib import Path
from backend.app.database import Database, IncidentRepository
from contracts.schemas import (
    IncidentCreateRequest,
    IncidentResolutionRequest,
    IncidentSeverity,
    IncidentStatus,
)


def test_incident_persistence_across_restart(temp_db_path: Path):
    """
    Verify that incident records and updates persist across simulated
    application crashes or restarts.
    """
    # 1. Startup phase 1: Initial server run
    db1 = Database(db_path=temp_db_path)
    repo1 = IncidentRepository(db1)

    create_data = IncidentCreateRequest(
        title="CoreDNS CrashLoopBackOff",
        description="Kubernetes cluster DNS pods restarting continuously under heavy UDP packet rate.",
        affected_service="kube-system/coredns",
        severity=IncidentSeverity.CRITICAL,
    )
    incident = repo1.create(create_data)
    incident_id = incident.id
    assert incident_id.startswith("INC-")

    # 2. Simulate server shutdown: drop references to db1 and repo1
    del repo1
    del db1

    # 3. Startup phase 2: Server restarts, creating a brand new DB connection
    db2 = Database(db_path=temp_db_path)
    repo2 = IncidentRepository(db2)

    persisted_incident = repo2.get_by_id(incident_id)
    assert persisted_incident is not None
    assert persisted_incident.id == incident_id
    assert persisted_incident.title == create_data.title
    assert persisted_incident.affected_service == "kube-system/coredns"
    assert persisted_incident.severity == IncidentSeverity.CRITICAL
    assert persisted_incident.status == IncidentStatus.OPEN

    # 4. Resolve the incident in session 2
    resolution_data = IncidentResolutionRequest(
        root_cause="UDP flood caused conntrack table exhaustion on node interfaces.",
        resolution="Applied ConfigMap with dns-autoscaler and increased max conntrack limit to 1048576.",
        outcome="DNS lookup latency dropped below 2ms; CoreDNS pods healthy.",
    )
    resolved_incident = repo2.resolve(incident_id, resolution_data)
    assert resolved_incident.status == IncidentStatus.RESOLVED

    # 5. Simulate second restart
    del repo2
    del db2

    # 6. Startup phase 3: Re-open again
    db3 = Database(db_path=temp_db_path)
    repo3 = IncidentRepository(db3)

    final_check = repo3.get_by_id(incident_id)
    assert final_check is not None
    assert final_check.status == IncidentStatus.RESOLVED
    assert final_check.root_cause == resolution_data.root_cause
    assert final_check.resolution == resolution_data.resolution
    assert final_check.outcome == resolution_data.outcome
    assert final_check.resolved_at is not None
