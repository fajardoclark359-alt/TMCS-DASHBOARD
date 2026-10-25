#!/usr/bin/env bash
# Advance Ultimate OSINT Tools — stop local services
pkill -f "uvicorn app.main:app" 2>/dev/null
pkill -f "npm run dev" 2>/dev/null
pkill -f "vite" 2>/dev/null
echo "Advance Ultimate OSINT Tools stopped"
