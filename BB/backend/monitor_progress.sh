#!/bin/bash
# Script de monitoring de la ré-extraction

echo "📊 MONITORING DE LA RÉ-EXTRACTION"
echo "=================================="
echo ""

# Vérifier si le processus tourne
PID=$(cat reextraction.pid 2>/dev/null)
if [ -z "$PID" ] || ! ps -p $PID > /dev/null 2>&1; then
    echo "❌ Le processus n'est pas en cours d'exécution"
    exit 1
fi

echo "✅ Processus actif (PID: $PID)"
echo ""

# Statistiques du log
TOTAL_DOCS=5203
PROCESSED=$(grep -c "Document.*pdf" reextraction_full.log 2>/dev/null || echo 0)
SUCCESS=$(grep -c "traité avec succès" reextraction_full.log 2>/dev/null || echo 0)
FAILED=$(grep -c "Échec du traitement" reextraction_full.log 2>/dev/null || echo 0)

echo "📈 Progression:"
echo "   Total à traiter: $TOTAL_DOCS documents"
echo "   Traités:         $PROCESSED documents"
echo "   Réussis:         $SUCCESS"
echo "   Échecs:          $FAILED"

if [ $PROCESSED -gt 0 ]; then
    PERCENT=$((PROCESSED * 100 / TOTAL_DOCS))
    echo "   Avancement:      $PERCENT%"
fi

echo ""

# Dernières lignes du log
echo "📝 Dernières lignes du log:"
echo "----------------------------"
tail -30 reextraction_full.log

echo ""
echo "💡 Commandes utiles:"
echo "   - Voir le log en direct:   tail -f reextraction_full.log"
echo "   - Voir les stats:          ./monitor_progress.sh"
echo "   - Arrêter le processus:    kill $PID"
