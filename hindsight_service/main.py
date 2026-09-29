"""
Hindsight Memory HTTP Wrapper Service.

Standalone FastAPI service wrapping the official Hindsight memory engine (via hindsight-client).
Exposes /health, /memories/search, and /memories/retain endpoints for the IncidentResponse backend.
"""

import asyncio
import logging
import os
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

try:
    import hindsight_client
except ImportError:
    hindsight_client = None

from contracts.schemas import MemoryReference, MemoryRetainRequest, IncidentSeverity

logger = logging.getLogger("hindsight_service")

# Configuration from environment variables
HINDSIGHT_API_URL = os.getenv("HINDSIGHT_API_URL", "http://localhost:8888")
HINDSIGHT_BANK_ID = os.getenv("HINDSIGHT_BANK_ID", "incident-response-bank")
HINDSIGHT_API_KEY = os.getenv("HINDSIGHT_API_KEY") or None

app = FastAPI(
    title="Hindsight Memory Service",
    description="Standalone HTTP service interface for official Hindsight memory engine",
    version="1.0.0",
)


class SearchRequest(BaseModel):
    """Payload for memory search/recall requests."""
    affected_service: str = Field(..., description="Service name to search historical memories for")
    description: str = Field(..., description="Incident description or query text")
    limit: int = Field(default=5, ge=1, le=50, description="Max memories to return")


def get_hindsight_client() -> Any:
    """Initialize Hindsight client instance with configured parameters."""
    if hindsight_client is None:
        raise RuntimeError("hindsight-client package is not installed. Install via pip install hindsight-client.")
    return hindsight_client.Hindsight(
        base_url=HINDSIGHT_API_URL,
        api_key=HINDSIGHT_API_KEY,
    )


@app.get("/health", summary="Health check endpoint")
async def health_check():
    """Verify connectivity to Hindsight server."""
    try:
        client = get_hindsight_client()

        # Threadpool execution for sync client method
        def _check():
            if hasattr(client, "get_version"):
                return client.get_version()
            return True

        await asyncio.to_thread(_check)
        return {
            "status": "ok",
            "hindsight": "connected",
            "api_url": HINDSIGHT_API_URL,
            "bank_id": HINDSIGHT_BANK_ID,
        }
    except Exception as exc:
        logger.warning(f"Hindsight server health check failed: {exc}")
        return {
            "status": "unhealthy",
            "hindsight": "unreachable",
            "detail": str(exc),
            "api_url": HINDSIGHT_API_URL,
        }


@app.post("/memories/search", summary="Recall historical incident memories")
async def search_memories(payload: SearchRequest):
    """
    Search Hindsight for historical incident memories relevant to service and description.
    Maps Hindsight recall results into standard MemoryReference models.
    """
    try:
        client = get_hindsight_client()
        query_text = f"Service: {payload.affected_service}. Issue: {payload.description}"

        def _do_recall():
            if hasattr(client, "arecall") and asyncio.iscoroutinefunction(getattr(client, "arecall")):
                pass
            return client.recall(
                bank_id=HINDSIGHT_BANK_ID,
                query=query_text,
                tags=[f"service:{payload.affected_service}"],
            )

        # Execute client call safely in threadpool
        recall_response = await asyncio.to_thread(_do_recall)

        memories: List[Dict[str, Any]] = []
        raw_results = getattr(recall_response, "results", []) or []

        for item in raw_results[: payload.limit]:
            item_text = getattr(item, "text", str(item))
            item_id = getattr(item, "id", None) or "MEM-UNKNOWN"
            item_doc_id = getattr(item, "document_id", None)
            metadata = getattr(item, "metadata", None) or {}
            scores = getattr(item, "scores", None)

            # Map similarity score safely without inventing fake numbers
            similarity_score: Optional[float] = None
            if isinstance(scores, dict):
                score_val = scores.get("similarity") or scores.get("score") or scores.get("confidence")
                if isinstance(score_val, (int, float)):
                    similarity_score = float(score_val)

            ref_id = item_doc_id or item_id
            incident_id = metadata.get("incident_id") if isinstance(metadata, dict) else None
            resolution_notes = metadata.get("resolution") if isinstance(metadata, dict) else None

            memory_ref = MemoryReference(
                reference_id=str(ref_id),
                incident_id=incident_id,
                summary=item_text,
                similarity_score=similarity_score,
                resolution_notes=resolution_notes,
            )
            memories.append(memory_ref.model_dump(mode="json"))

        return {"memories": memories}

    except Exception as exc:
        logger.error(f"Hindsight recall error: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Hindsight recall failed: {str(exc)}",
        )


@app.post("/memories/retain", status_code=status.HTTP_201_CREATED, summary="Retain resolved incident memory")
async def retain_memory(payload: MemoryRetainRequest):
    """
    Retain a confirmed incident resolution in Hindsight memory.
    """
    try:
        client = get_hindsight_client()

        content = (
            f"Incident {payload.incident_id}: {payload.title}\n"
            f"Affected Service: {payload.affected_service}\n"
            f"Severity: {payload.severity}\n"
            f"Description: {payload.description}\n"
            f"Root Cause: {payload.root_cause}\n"
            f"Resolution: {payload.resolution}\n"
            f"Outcome: {payload.outcome}"
        )

        metadata = {
            "incident_id": payload.incident_id,
            "affected_service": payload.affected_service,
            "severity": str(payload.severity),
            "root_cause": payload.root_cause,
            "resolution": payload.resolution,
            "outcome": payload.outcome,
        }

        tags = ["incident_resolution", f"service:{payload.affected_service}"]

        def _do_retain():
            return client.retain(
                bank_id=HINDSIGHT_BANK_ID,
                content=content,
                metadata=metadata,
                tags=tags,
                retain_async=False,  # Documented Hindsight option for synchronous retention processing
            )

        # Execute client call safely in threadpool
        response = await asyncio.to_thread(_do_retain)

        return {
            "status": "retained",
            "incident_id": payload.incident_id,
            "bank_id": HINDSIGHT_BANK_ID,
            "success": getattr(response, "success", True),
        }

    except Exception as exc:
        logger.error(f"Hindsight retain error: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Hindsight retention failed: {str(exc)}",
        )
