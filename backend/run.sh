#!/usr/bin/env bash
# Startup script for Incident Response Agent Backend
set -e

# Move to the workspace root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$WORKSPACE_ROOT"

# Check for virtual environment
if [ -d ".venv" ]; then
    PYTHON_BIN=".venv/bin/python"
    UVICORN_BIN=".venv/bin/uvicorn"
else
    PYTHON_BIN="python3"
    UVICORN_BIN="uvicorn"
fi

echo "================================================="
echo " Starting Incident Response Agent Backend..."
echo " Root directory: $WORKSPACE_ROOT"
echo " Docs URL:       http://127.0.0.1:8000/docs"
echo " Health URL:     http://127.0.0.1:8000/health"
echo "================================================="

export PYTHONPATH=.
exec $UVICORN_BIN backend.app.main:app --host 0.0.0.0 --port 8000 --reload
