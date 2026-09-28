# Incident Response Agent

An autonomous system for triaging, troubleshooting, and resolving software incidents during hackathon operations.

## Project Structure

```
incident-response/
├── backend/      # FastAPI backend service (endpoints, SQLite, integrations)
├── contracts/    # Shared Pydantic data schemas for all modules
├── memory/       # [Teammate Module] Hindsight - historical incident memory
├── knowledge/    # [Teammate Module] HydraDB - runbooks and architecture docs
├── agent/        # [Teammate Module] RocketRide + Groq - automated diagnostics
└── frontend/     # [Teammate Module] UI Dashboard
```

## Running the Backend

```bash
# 1. Setup virtual environment and dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

# 2. Start the FastAPI server
./backend/run.sh
```

- **Interactive API Documentation (Swagger)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Health Check**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

See [backend/README.md](file:///Users/shaikamiranaaz/incident-response/backend/README.md) for full endpoint specifications, integration details, and tests.
