#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="${SCRIPT_DIR}/../frontend/harvester-ui"

cd "$FRONTEND_DIR"

if [ -f package-lock.json ]; then
  npm install --no-audit --prefer-offline
fi

npm run build
