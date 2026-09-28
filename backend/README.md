# Incident Response Agent - Backend Service

FastAPI-powered backend for the **Incident Response Agent** college hackathon project.

This service manages the incident lifecycle, provides SQLite persistent storage, and defines clean integration boundaries for teammate modules (**Hindsight memory**, **HydraDB knowledge**, and **RocketRide + Groq agent**).

---

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.10+ (tested on Python 3.14)
- `pip` package manager

### 2. Environment Setup
From the project root:

```bash
# 1. Create a virtual environment
python3 -m venv .venv

# 2. Activate the virtual environment
source .venv/bin/activate    # On macOS/Linux
# .venv\Scripts\activate     # On Windows

# 3. Install backend dependencies
pip install -r backend/requirements.txt
```

### 3. Run the Backend Server
From the project root directory:

```bash
# Option A: Using the convenience script
chmod +x backend/run.sh
./backend/run.sh

# Option B: Running uvicorn directly
PYTHONPATH=. uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

The server will start at:
- **Interactive Swagger Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc Documentation**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Health Check**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
- **API Root**: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)

---

## 📁 Backend Architecture

```
incident-response-agent/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app configuration & CORS
│   │   ├── config.py            # Environment settings & path resolution
│   │   ├── database.py          # SQLite connection & IncidentRepository CRUD
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── health.py        # GET /health
│   │   │   └── incidents.py     # Incident lifecycle & analysis endpoints
│   │   └── integrations/
│   │       ├── __init__.py
│   │       ├── base.py          # Abstract interfaces for teammate modules
│   │       ├── exceptions.py    # ModuleUnavailableError & typed exceptions
│   │       ├── agent_client.py  # RocketRide + Groq adapter
│   │       ├── memory_client.py # Hindsight memory adapter
│   │       └── knowledge_client.py # HydraDB adapter
│   ├── data/
│   │   └── incidents.db         # Persistent SQLite database file
│   ├── tests/
│   │   ├── conftest.py          # Test database fixtures & mock adapters
│   │   ├── test_health.py       # Health check & root endpoint tests
│   │   ├── test_incidents.py    # CRUD & validation tests
│   │   ├── test_integrations.py # External failure handling & 503 tests
│   │   └── test_persistence.py # Server restart & SQLite persistence tests
│   ├── .env.example             # Configuration template
│   ├── requirements.txt         # Python dependencies
│   ├── run.sh                   # Startup helper script
│   └── README.md                # This guide
├── contracts/                   # Shared Pydantic data schemas
│   ├── __init__.py
│   └── schemas.py               # Shared data structures
└── [teammate folders: memory/, knowledge/, agent/, frontend/]
```

---

## 📡 API Endpoints

### 1. Health Check
- **Endpoint**: `GET /health`
- **Description**: Returns overall API health, SQLite database connectivity, and status of external module integrations.
- **Example Response**:
  ```json
  {
    "status": "ok",
    "app_name": "Incident Response Agent Backend",
    "version": "1.0.0",
    "database": "connected",
    "integrations": {
      "agent_module": "unavailable (not_configured)",
      "hindsight_memory": "unavailable (not_configured)",
      "hydradb_knowledge": "unavailable (not_configured)"
    }
  }
  ```

---

### 2. Create Incident
- **Endpoint**: `POST /incidents`
- **Status**: `201 Created`
- **Request Body**:
  ```json
  {
    "title": "Payment gateway timeout",
    "description": "504 Gateway Timeouts began occurring at 14:20 UTC affecting 15% of checkout traffic.",
    "affected_service": "payment-gateway",
    "severity": "HIGH"
  }
  ```
- **Example Response**:
  ```json
  {
    "id": "INC-7B3E4F9A",
    "title": "Payment gateway timeout",
    "description": "504 Gateway Timeouts began occurring at 14:20 UTC affecting 15% of checkout traffic.",
    "affected_service": "payment-gateway",
    "severity": "HIGH",
    "status": "OPEN",
    "created_at": "2026-09-28T15:25:03.884788Z",
    "updated_at": "2026-09-28T15:25:03.884788Z",
    "root_cause": null,
    "resolution": null,
    "outcome": null,
    "resolved_at": null
  }
  ```

---

### 3. List Incidents (History)
- **Endpoint**: `GET /incidents`
- **Query Parameters**:
  - `status`: Filter by status (`OPEN`, `INVESTIGATING`, `RESOLVED`, `CLOSED`)
  - `severity`: Filter by severity (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
  - `limit`: Number of items (default 50, max 100)
  - `offset`: Pagination offset (default 0)
- **Example Response**:
  ```json
  {
    "total": 1,
    "items": [
      {
        "id": "INC-7B3E4F9A",
        "title": "Payment gateway timeout",
        "severity": "HIGH",
        "status": "OPEN",
        "created_at": "2026-09-28T15:25:03.884788Z"
      }
    ]
  }
  ```

---

### 4. Incident Details
- **Endpoint**: `GET /incidents/{incident_id}`
- **Response**: Full incident record. Returns `404 Not Found` if the ID does not exist.

---

### 5. Record Incident Resolution
- **Endpoint**: `PATCH /incidents/{incident_id}/resolve`
- **Request Body**:
  ```json
  {
    "root_cause": "Redis connection pool exhaustion under high checkout volume.",
    "resolution": "Increased max pool connections to 200 and set idle connection timeout to 30s.",
    "outcome": "P99 latency returned to < 35ms; all payment queues processed."
  }
  ```
- **Response**: Updated incident with `status: "RESOLVED"` and `resolved_at` timestamp.

---

### 6. Request Incident Analysis
- **Endpoint**: `POST /incidents/{incident_id}/analyze`
- **Behavior**:
  - Validates incident exists (`404` if missing).
  - Contacts teammate's **RocketRide + Groq Agent module** via the configured `AgentClient`.
  - **Safe Failure Guarantee**: If the teammate's agent service is not running or unconfigured, the backend **never fabricates fake troubleshooting data**. Instead, it returns `HTTP 503 Service Unavailable`:
    ```json
    {
      "detail": {
        "error": "ModuleUnavailable",
        "module": "agent",
        "message": "Agent module ('RocketRide + Groq') is not configured.",
        "instructions": "Set AGENT_SERVICE_URL in your .env file to the teammate's running agent service (e.g. http://localhost:8001).",
        "incident_id": "INC-7B3E4F9A",
        "integration_status": "Teammate integration pending"
      }
    }
    ```
  - When the teammate's agent module is running, returns `HTTP 200 OK` with troubleshooting suggestions, potential causes, and historical memory references.

---

## 🤝 Integration Guide for Teammates

### Shared Contracts (`contracts/schemas.py`)
All teammates should use or adhere to the shared Pydantic models in `contracts/schemas.py`:
- `IncidentCreateRequest` / `IncidentResponse`
- `IncidentResolutionRequest`
- `AnalysisRequest` / `AnalysisResponse`
- `MemoryReference`

### Connecting Teammate Modules via `.env`
When teammates run their microservices, set their URLs in `backend/.env`:

```bash
# RocketRide + Groq Agent service
AGENT_SERVICE_URL="http://localhost:8001"

# Hindsight Memory service
HINDSIGHT_SERVICE_URL="http://localhost:8002"

# HydraDB Knowledge service
HYDRADB_SERVICE_URL="http://localhost:8003"
```

The backend integration clients (`AgentClient`, `MemoryClient`, `KnowledgeClient`) automatically route requests to these services with configurable timeouts.

---

## 🧪 Running Automated Tests

Run the complete test suite with `pytest`:

```bash
PYTHONPATH=. .venv/bin/pytest backend/tests -v
```

The test suite covers:
1. `test_health.py`: Health check and documentation root endpoint.
2. `test_incidents.py`: Incident creation, input validation, 404 handling, filtering, and resolution.
3. `test_integrations.py`: External module failure handling, 503 status code verification, and successful analysis responses with active agent.
4. `test_persistence.py`: Verification that incident records and resolutions persist across server restarts in SQLite.
