#!/bin/bash

API_FILE="$HOME/doc_harvester/backend/api.py"

echo "🔄 Correction de l'instanciation JORADPHarvester"

# Utiliser sed pour ajouter job_id et supprimer le doublon
# Ligne 861 : ajouter job_id=job_uuid après config=config
sed -i '' '861 s/config=config$/config=config,\n                job_id=job_uuid/' "$API_FILE"

# Ligne 863 : supprimer la ligne dupliquée
sed -i '' '863d' "$API_FILE"

echo "✅ Instanciation corrigée"
echo ""
echo "📋 Vérification (lignes 857-865) :"
sed -n '857,865p' "$API_FILE"

