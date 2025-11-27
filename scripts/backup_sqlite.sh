#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

DB_PATH="$PROJECT_ROOT/BB/backend/harvester.db"

if [[ ! -f "$DB_PATH" ]]; then
    echo "Erreur: Base de donnees non trouvee: $DB_PATH"
    exit 1
fi

BACKUP_FILE="$BACKUP_DIR/harvester_${TIMESTAMP}.db"
cp "$DB_PATH" "$BACKUP_FILE"

echo "Backup cree: $BACKUP_FILE"
echo "Taille: $(du -h "$BACKUP_FILE" | cut -f1)"

sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table';" > "$BACKUP_DIR/tables_${TIMESTAMP}.txt"
echo "Liste des tables sauvegardee: $BACKUP_DIR/tables_${TIMESTAMP}.txt"

sqlite3 "$DB_PATH" ".dump" > "$BACKUP_DIR/harvester_${TIMESTAMP}.sql"
echo "Dump SQL cree: $BACKUP_DIR/harvester_${TIMESTAMP}.sql"

echo ""
echo "Backup termine avec succes!"
