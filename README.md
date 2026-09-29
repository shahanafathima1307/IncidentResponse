# IncidentResponse & OnCall Memory

An intelligent incident response platform for on-call engineers that automates diagnostic analysis, coordinates runbooks, and institutionalizes remediation memory across engineering teams.

---

## 🏛️ System Architecture

IncidentResponse combines a high-performance Python FastAPI backend, specialized cognitive teammate modules, and a dense, utilitarian React operations workspace.

```
┌─────────────────────────────────────────────────────────────────┐
│                    OnCall Memory Frontend                       │
│           (React 19 + TypeScript + Vite + Tailwind v4)          │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP / Reverse Proxy (:3000 -> :8000)
┌───────────────────────────────▼─────────────────────────────────┐
│                    FastAPI Incident Backend                     │
│                (backend/app/main.py, Port 8000)                 │
└──────┬────────────────────────┬────────────────────────┬────────┘
       │                        │                        │
┌──────▼──────┐          ┌──────▼──────┐          ┌──────▼──────┐
│  Hindsight  │          │   HydraDB   │          │ RocketRide  │
│   Memory    │          │  Knowledge  │          │  Agent/Groq │
│   Client    │          │   Client    │          │   Client    │
└──────┬──────┘          └──────┬──────┘          └──────┬──────┘
       │                        │                        │
┌──────▼──────┐          ┌──────▼──────┐          ┌──────▼──────┐
│ Hindsight   │          │ Architecture│          │ LLM-powered │
│ Service     │          │ Runbooks &  │          │ Root-Cause  │
│ (:8001)     │          │ Postmortems │          │ & Actions   │
└─────────────┘          └─────────────┘          └─────────────┘
```

- **Backend (`backend/`)**: FastAPI REST API with SQLite storage, WAL concurrency mode, database-level `CHECK` and `COLLATE NOCASE` constraint enforcement, and graceful degradation across all external microservices.
- **Contracts (`contracts/`)**: Unified Pydantic v2 schemas defining incident lifecycles, analysis requests, resolutions, and teammate module communication boundaries.
- **Teammate Modules**:
  - **Memory (`memory/`, `hindsight_service/`)**: Integrates with Hindsight (`hindsight-client`) to recall past similar incidents during triage and retain institutional learnings upon incident resolution.
  - **Knowledge (`knowledge/`)**: Integrates with HydraDB to query contextual service runbooks and architectural documentation.
  - **Agent (`agent/`)**: Coordinates with RocketRide and Groq models for deep-dive root-cause analysis and automated command remediation suggestions.
- **Frontend (`src/`)**: High-density operations dashboard (inspired by Linear, Sentry, and PagerDuty) with light/dark modes, `Cmd+K` command palette, interactive log inspector, and runbook drawer.

---

## 📁 Repository Structure

```
.
├── contracts/                  # Shared Pydantic data schemas
│   ├── __init__.py
│   └── schemas.py             # Incident, Analysis, Memory, Knowledge models
├── backend/                    # FastAPI core service
│   ├── app/
│   │   ├── config.py          # Environment settings (pydantic-settings)
│   │   ├── database.py        # SQLite persistence, migrations, and constraints
│   │   ├── main.py            # FastAPI entry point, routers, and CORS
│   │   └── routers/
│   │       ├── health.py      # /health endpoint reporting integration statuses
│   │       └── incidents.py   # CRUD, /analyze, and /resolve endpoints
│   ├── data/
│   │   └── incidents.db       # Persistent SQLite database file
│   ├── requirements.txt       # Backend Python dependencies
│   └── tests/                 # Backend pytest test suite (26 passing tests)
├── hindsight_service/         # Standalone Hindsight memory wrapper service
│   └── main.py                # Fastify/FastAPI wrapper exposing /memories endpoints
├── memory/                     # Hindsight memory client integration
│   └── client.py
├── knowledge/                  # HydraDB knowledge client integration
│   └── client.py
├── agent/                      # RocketRide + Groq LLM agent integration
│   └── client.py
├── src/                        # React 19 Frontend application
│   ├── api.ts                 # Dual-mode API client (Mock & Live Backend)
│   ├── types.ts               # Domain contracts matching backend schemas
│   ├── mockData.ts            # High-fidelity fixture dataset
│   ├── components/            # Header, Badge, CommandPalette, LogViewer, etc.
│   ├── pages/                 # QueuePage (table) & WorkspacePage (triage)
│   └── utils/                 # Time formatting and utilities
├── package.json               # Frontend dependencies & scripts
├── vite.config.ts             # Vite configuration with backend reverse proxy
└── pytest.ini                 # Pytest configuration with asyncio mode
```

---

## 🚀 Getting Started

### Prerequisites

- **Python**: 3.10+ (tested on Python 3.14)
- **Node.js**: 18+ (tested on Node 26) with `npm`

---

### 1. Backend Setup & Execution

#### Activate the Virtual Environment
```bash
# From repository root
source .venv/bin/activate
```

#### Install Python Dependencies
```bash
pip install -r backend/requirements.txt
```

#### Run the Backend Server
```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
The FastAPI backend will start on `http://localhost:8000`.

- **API Documentation (Swagger UI)**: `http://localhost:8000/docs`
- **Health Check & Integration Status**: `http://localhost:8000/health`

#### Run the Hindsight Memory Service (Optional)
```bash
uvicorn hindsight_service.main:app --host 0.0.0.0 --port 8001
```

#### Run the Pytest Test Suite
```bash
pytest -v
```
All 26 test cases cover health reporting, incident CRUD lifecycles, Hindsight memory recall/retention, agent failure degradation, and persistence.

---

### 2. Frontend Setup & Execution

#### Install Frontend Dependencies
```bash
npm install --legacy-peer-deps
```

#### Start the Frontend Development Server
```bash
npm run dev
```
The application will be accessible at `http://localhost:3000`.

#### Build for Production
```bash
npm run build
```

#### Run Typecheck
```bash
npm run lint
```

---

## 🔄 Switching Between Mock Mode and Live Backend

By default, the frontend runs in **self-contained mock mode** (`VITE_USE_MOCKS=true`) populated with realistic payments and infrastructure failure scenarios.

### Connecting to the Live Backend

1. Create a `.env.local` file in the repository root:
   ```bash
   # Connect to local FastAPI backend
   VITE_USE_MOCKS=false
   VITE_API_BASE_URL=""
   ```
   *(Note: Leaving `VITE_API_BASE_URL` empty allows Vite's built-in dev proxy in `vite.config.ts` to seamlessly route `/api`, `/incidents`, `/health`, and `/memory` requests directly to `http://127.0.0.1:8000` without CORS issues).*

2. Start the backend:
   ```bash
   uvicorn backend.app.main:app --port 8000
   ```

3. Start or restart the Vite dev server:
   ```bash
   npm run dev
   ```

The frontend will now create, read, diagnose, and resolve real incidents stored in the SQLite database and query memory/knowledge modules in real time.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check reporting DB and external module availability |
| `GET` | `/incidents` or `/api/incidents` | List incidents with optional `status`, `severity`, `limit`, `offset` filters |
| `POST` | `/incidents` or `/api/incidents` | Create a new incident (`title`, `description`, `affected_service`, `severity`) |
| `GET` | `/incidents/{id}` or `/api/incidents/{id}` | Retrieve incident by ID (case-insensitive) |
| `POST` | `/incidents/{id}/analyze` | Trigger agent diagnostic analysis with Hindsight memories and HydraDB runbooks |
| `PATCH` | `/incidents/{id}/resolve` | Record root cause & resolution, transition to `RESOLVED`, retain Hindsight memory |
| `POST` | `/api/incidents/{id}/outcome` | Resolution route alias supporting frontend outcome triage submissions |
| `GET` | `/api/memory/stats` | Count of institutional remediation memories recorded in system |

---

## ⌨️ Frontend Keyboard Shortcuts & Features

- **`Cmd + K` or `Ctrl + K`**: Open the global Command Palette from anywhere in the app to quickly search and jump to any incident.
- **Arrow Keys & Enter**: Navigate search results in the command palette.
- **`1`, `2`, `3`**: In the Workspace resolution bar, quickly select remediation outcome:
  - `1`: Worked as recommended
  - `2`: Worked with modifications
  - `3`: Failed (record actual root cause to prevent future misdiagnoses)
- **Theme Toggle**: Switch between dark operations mode and warm linear light mode (respects OS preference by default).
- **Runbook Drawer**: View matched documentation and copy remediation commands with a single click.
- **CSV Export**: Securely export incident queue records from the Queue table.
