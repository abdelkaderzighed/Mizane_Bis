#!/bin/bash

API_FILE="$HOME/doc_harvester/backend/api.py"

# Sauvegarde
cp "$API_FILE" "${API_FILE}.backup-$(date +%Y%m%d-%H%M%S)"
echo "✅ Sauvegarde créée"

# Remplacer la ligne qui lit la clé
sed -i '' "s|'x-api-key': os.environ.get('ANTHROPIC_API_KEY', '')|'x-api-key': get_anthropic_key()|g" "$API_FILE"

echo "✅ Modifié pour utiliser get_anthropic_key()"
echo ""
echo "📋 Vérification :"
grep -A 2 "x-api-key" "$API_FILE" | grep -A 2 "assistant"

