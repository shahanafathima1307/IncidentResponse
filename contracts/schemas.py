"""
Shared Data Contracts for Incident Response Agent.

This module provides Pydantic data schemas shared across all system components:
- Backend: REST API validation & response models
- Memory: Hindsight memory query and retrieval references
- Knowledge: HydraDB knowledge base lookup results
- Agent: RocketRide + Groq incident analysis and troubleshooting suggestions
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class IncidentSeverity(str, Enum):
    """Severity levels for incidents."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

    @classmethod
    def _missing_(cls, value: object):
        if isinstance(value, str):
            for member in cls:
                if member.value.lower() == value.lower():
                    return member
        return None


class IncidentStatus(str, Enum):
    """Lifecycle status of an incident."""
    OPEN = "OPEN"
    INVESTIGATING = "INVESTIGATING"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"

    @classmethod
    def _missing_(cls, value: object):
        if isinstance(value, str):
            for member in cls:
                if member.value.lower() == value.lower():
                    return member
        return None


class IncidentCreateRequest(BaseModel):
    """Request payload to create a new incident."""
    title: str = Field(
        ...,
        min_length=3,
        max_length=200,
        description="Brief summary of the incident",
        examples=["High latency observed in payment processing service"]
    )
    description: str = Field(
        ...,
        min_length=5,
        description="Detailed description of symptoms, logs, or error reports",
        examples=["504 Gateway Timeouts began occurring at 14:20 UTC affecting 15% of checkout traffic."]
    )
    affected_service: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Name of the impacted service, component, or microservice",
        examples=["payment-gateway"]
    )
    severity: IncidentSeverity = Field(
        default=IncidentSeverity.MEDIUM,
        description="Severity level of the incident (LOW, MEDIUM, HIGH, CRITICAL)",
        examples=["HIGH"]
    )

    @field_validator("title", "description", "affected_service")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("Field cannot be empty or only whitespace")
        return v_stripped


class IncidentResolutionRequest(BaseModel):
    """Request payload to mark an incident as resolved with post-mortem details."""
    root_cause: str = Field(
        ...,
        min_length=3,
        description="Identified root cause of the incident",
        examples=["Redis connection pool exhaustion due to missing connection timeout configuration."]
    )
    resolution: str = Field(
        ...,
        min_length=3,
        description="Action taken to fix or mitigate the incident",
        examples=["Increased pool size to 200, set idle timeout to 30s, and deployed hotfix v2.4.1."]
    )
    outcome: str = Field(
        ...,
        min_length=3,
        description="Outcome of the fix and current health status",
        examples=["Resolved. Latency returned to < 45ms and all pending transactions cleared."]
    )

    @field_validator("root_cause", "resolution", "outcome")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("Field cannot be empty or only whitespace")
        return v_stripped


class IncidentResponse(BaseModel):
    """Full incident record representation."""
    id: str = Field(..., description="Unique incident identifier, e.g. INC-A1B2C3D4")
    title: str = Field(..., description="Brief summary of the incident")
    description: str = Field(..., description="Detailed description")
    affected_service: str = Field(..., description="Impacted service name")
    severity: IncidentSeverity = Field(..., description="Severity level")
    status: IncidentStatus = Field(..., description="Current status of the incident")
    created_at: datetime = Field(..., description="Timestamp when incident was created")
    updated_at: datetime = Field(..., description="Timestamp when incident was last updated")
    root_cause: Optional[str] = Field(None, description="Root cause explanation (populated upon resolution)")
    resolution: Optional[str] = Field(None, description="Resolution steps taken (populated upon resolution)")
    outcome: Optional[str] = Field(None, description="Outcome of resolution (populated upon resolution)")
    resolved_at: Optional[datetime] = Field(None, description="Timestamp when incident was resolved")


class IncidentListResponse(BaseModel):
    """Response containing a list of incidents and metadata."""
    total: int = Field(..., description="Total number of incidents matching query")
    items: List[IncidentResponse] = Field(..., description="List of incident records")


class MemoryReference(BaseModel):
    """Historical incident reference retrieved from Hindsight memory module."""
    reference_id: str = Field(..., description="Unique memory reference or past incident ID")
    incident_id: Optional[str] = Field(None, description="Linked incident ID if available")
    summary: str = Field(..., description="Summary of past similar incident and findings")
    similarity_score: Optional[float] = Field(
        None,
        ge=0.0,
        le=1.0,
        description="Similarity confidence score between 0.0 and 1.0"
    )
    resolution_notes: Optional[str] = Field(None, description="How the past incident was resolved")


class AnalysisRequest(BaseModel):
    """Contract sent to Agent module (RocketRide + Groq) for troubleshooting."""
    incident_id: str = Field(..., description="ID of the incident to analyze")
    title: str = Field(..., description="Title of the incident")
    description: str = Field(..., description="Detailed description of the incident")
    affected_service: str = Field(..., description="Service experiencing the issue")
    severity: IncidentSeverity = Field(..., description="Severity level")
    status: IncidentStatus = Field(..., description="Current status")
    context: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Additional context, telemetry, or telemetry logs"
    )


class AnalysisResponse(BaseModel):
    """Troubleshooting and diagnostic result returned by Agent module."""
    incident_id: str = Field(..., description="Incident identifier")
    troubleshooting_suggestions: List[str] = Field(
        default_factory=list,
        description="Step-by-step diagnostic and troubleshooting suggestions"
    )
    potential_causes: List[str] = Field(
        default_factory=list,
        description="Potential root causes identified by analysis"
    )
    recommended_actions: List[str] = Field(
        default_factory=list,
        description="Recommended immediate mitigation and remediation actions"
    )
    memory_references: List[MemoryReference] = Field(
        default_factory=list,
        description="Relevant historical incident references from Hindsight memory"
    )
    knowledge_references: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Relevant documentation or runbooks from HydraDB knowledge module"
    )
    confidence_score: Optional[float] = Field(
        None,
        ge=0.0,
        le=1.0,
        description="Model confidence score for diagnosis"
    )
    analyzed_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when analysis was generated"
    )


class ModuleStatus(str, Enum):
    """Status of an integrated module."""
    CONNECTED = "connected"
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    NOT_CONFIGURED = "not_configured"


class HealthResponse(BaseModel):
    """Backend health check response."""
    status: str = Field(..., description="Overall backend health status", examples=["ok", "healthy"])
    app_name: str = Field(..., description="Application name")
    version: str = Field(..., description="API Version")
    database: str = Field(..., description="Database connection status", examples=["connected", "error"])
    integrations: Dict[str, str] = Field(
        ...,
        description="Status of integration boundaries (agent, memory, knowledge)",
        examples=[{
            "agent_module": "unavailable (not_configured)",
            "hindsight_memory": "unavailable (not_configured)",
            "hydradb_knowledge": "unavailable (not_configured)"
        }]
    )
