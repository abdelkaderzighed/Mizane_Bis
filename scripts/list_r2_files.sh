#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

if [[ -f "$PROJECT_ROOT/BB/backend/.env" ]]; then
    source "$PROJECT_ROOT/BB/backend/.env"
else
    echo "Erreur: Fichier .env non trouve"
    exit 1
fi

if [[ -z "${HARVESTER_R2_BUCKET:-}" ]]; then
    echo "Erreur: Variable HARVESTER_R2_BUCKET non definie"
    exit 1
fi

OUTPUT_FILE="$BACKUP_DIR/r2_files_${TIMESTAMP}.txt"

echo "Listing des fichiers R2 dans le bucket: $HARVESTER_R2_BUCKET"

aws s3 ls "s3://$HARVESTER_R2_BUCKET" \
    --recursive \
    --endpoint-url="${HARVESTER_R2_S3_ENDPOINT}" \
    --region=auto > "$OUTPUT_FILE"

echo ""
echo "Liste sauvegardee: $OUTPUT_FILE"
echo "Nombre de fichiers: $(wc -l < "$OUTPUT_FILE")"
echo "Taille totale: $(awk '{sum+=$3} END {print sum/1024/1024 " MB"}' "$OUTPUT_FILE")"
