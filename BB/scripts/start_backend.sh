#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/../backend"

cd "$BACKEND_DIR"

pkill -f "gunicorn.*api:app" 2>/dev/null || true

if [ -f venv/bin/activate ]; then
  # activate local virtualenv if available
  # shellcheck source=/dev/null
  source venv/bin/activate
fi

source env.sh

WORKERS=${WORKERS:-4}
HOST=${API_HOST:-0.0.0.0}
PORT=${API_PORT:-5001}

gunicorn -w "$WORKERS" -b "$HOST:$PORT" api:app
