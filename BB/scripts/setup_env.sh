#!/usr/bin/env bash
set -euo pipefail

TEMPLATE="$(dirname "$0")/../backend/.env.example"
TARGET="$(dirname "$0")/../backend/.env"

if [[ -f "$TARGET" && "${FORCE:=0}" != "1" ]]; then
  echo "⚠️  $TARGET already exists. Set FORCE=1 to overwrite."
  exit 1
fi

cat > "$TARGET" <<EOF
TESSDATA_PREFIX=${TESSDATA_PREFIX:-/usr/local/opt/tesseract/share/tessdata}
HARVESTER_R2_BUCKET=${HARVESTER_R2_BUCKET:-textes-juridiques}
HARVESTER_R2_BASE_URL=${HARVESTER_R2_BASE_URL:-https://74003964e23a967983bcf6f9f86a6d1e.r2.cloudflarestorage.com/textes-juridiques}
HARVESTER_R2_ACCOUNT_ID=${HARVESTER_R2_ACCOUNT_ID:-74003964e23a967983bcf6f9f86a6d1e}
HARVESTER_R2_ACCESS_KEY_ID=${HARVESTER_R2_ACCESS_KEY_ID:-9346cfbfa825ef60e85dfdfd64f0d321}
HARVESTER_R2_SECRET_ACCESS_KEY=${HARVESTER_R2_SECRET_ACCESS_KEY:-addc2fe9e80f01995aa86ef873ea375a5a2298ffe0f92880737776ff63d10cac}
FLASK_DEBUG=${FLASK_DEBUG:-0}
API_HOST=${API_HOST:-0.0.0.0}
API_PORT=${API_PORT:-5001}
EOF

echo "✅ $TARGET has been populated. Reload backend with 'cd backend && source env.sh'."
