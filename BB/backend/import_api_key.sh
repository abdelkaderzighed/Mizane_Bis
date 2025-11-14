#!/bin/bash

API_FILE="$HOME/doc_harvester/backend/api.py"

# Sauvegarde
cp "$API_FILE" "${API_FILE}.backup-$(date +%Y%m%d-%H%M%S)"

# 1. Ajouter l'import en haut du fichier (après "from database import...")
sed -i '' '/from database import/a\
from analysis import get_api_key
' "$API_FILE"

# 2. Remplacer get_anthropic_key() par get_api_key()
sed -i '' "s|get_anthropic_key()|get_api_key()|g" "$API_FILE"

echo "✅ Import ajouté et fonction corrigée"
echo ""
echo "📋 Vérification import :"
grep "from analysis import" "$API_FILE"
echo ""
echo "📋 Vérification utilisation :"
grep "get_api_key()" "$API_FILE"

