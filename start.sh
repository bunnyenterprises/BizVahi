#!/bin/bash
# Fintr — Local Development Start Script
set -e
echo "🚀 Starting Fintr locally..."
cd backend
pip install -r requirements.txt --quiet
echo "✅ Dependencies installed"
uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000} --reload
