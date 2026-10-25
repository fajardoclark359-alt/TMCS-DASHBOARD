#!/usr/bin/env bash
# Advance Ultimate OSINT Tools — local launcher
# Starts the backend and frontend, then opens the dashboard.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_LOG="${TMPDIR:-/tmp}/auosint-backend.log"
FRONTEND_LOG="${TMPDIR:-/tmp}/auosint-frontend.log"
BACKEND_URL="http://127.0.0.1:8000"
FRONTEND_URL="http://localhost:3000"

if pgrep -f "uvicorn app.main:app" > /dev/null; then
    echo "Backend already running"
else
    echo "Starting backend..."
    cd "$ROOT/backend"
    if [ -x venv/bin/uvicorn ]; then
        nohup ./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > "$BACKEND_LOG" 2>&1 &
    else
        nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > "$BACKEND_LOG" 2>&1 &
    fi
    sleep 2
fi

if pgrep -f "vite" > /dev/null; then
    echo "Frontend already running"
else
    echo "Starting frontend..."
    cd "$ROOT/frontend"
    nohup npm run dev > "$FRONTEND_LOG" 2>&1 &
    sleep 3
fi

echo "Advance Ultimate OSINT Tools — $FRONTEND_URL"
echo "API health — $BACKEND_URL/health"
xdg-open "$FRONTEND_URL" 2>/dev/null || true
