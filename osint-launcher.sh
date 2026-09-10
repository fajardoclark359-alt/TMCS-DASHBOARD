#!/bin/bash
# OSINT Tool Launcher for Omarchy
# Starts the backend and frontend, then opens in browser

OSINT_DIR="$HOME/Work/osint-tool"

# Check if already running
if pgrep -f "uvicorn app.main:app" > /dev/null; then
    echo "Backend already running"
else
    echo "Starting OSINT backend..."
    cd "$OSINT_DIR/backend"
    source venv/bin/activate
    nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > /tmp/osint-backend.log 2>&1 &
    sleep 2
fi

if pgrep -f "npm run dev" > /dev/null || pgrep -f "vite" > /dev/null; then
    echo "Frontend already running"
else
    echo "Starting OSINT frontend..."
    cd "$OSINT_DIR/frontend"
    nohup npm run dev > /tmp/osint-frontend.log 2>&1 &
    sleep 3
fi

echo "OSINT Tool starting at http://localhost:3000"
xdg-open "http://localhost:3000" 2>/dev/null || xdg-open "http://localhost:3000"
