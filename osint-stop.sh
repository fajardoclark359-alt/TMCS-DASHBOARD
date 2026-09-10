#!/bin/bash
# OSINT Tool Stopper
pkill -f "uvicorn app.main:app" 2>/dev/null
pkill -f "npm run dev" 2>/dev/null
pkill -f "vite" 2>/dev/null
echo "OSINT Tool stopped"
