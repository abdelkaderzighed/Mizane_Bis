#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${SCRIPT_DIR}/.."

echo "➜ Building frontend..."
"${ROOT_DIR}/scripts/build_frontend.sh"

echo "➜ Running backend tests..."
(
  cd "${ROOT_DIR}/backend"
  if [ -f venv/bin/activate ]; then
    # shellcheck source=/dev/null
    source venv/bin/activate
  fi
  source env.sh
  pytest test_full_pipeline.py
)

echo "➜ Checking API health..."
curl --fail --show-error http://localhost:5001/api/health

echo "✅ Vérification locale terminée."
