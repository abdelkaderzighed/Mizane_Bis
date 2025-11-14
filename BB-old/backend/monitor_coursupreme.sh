#!/bin/bash
# Script de monitoring de la complétion Cour Suprême

echo "📊 MONITORING COUR SUPRÊME"
echo "=================================="
echo ""

# Vérifier si le processus tourne
PID=$(cat coursupreme_completion.pid 2>/dev/null)
if [ -z "$PID" ] || ! ps -p $PID > /dev/null 2>&1; then
    echo "❌ Le processus n'est pas en cours d'exécution"
    exit 1
fi

echo "✅ Processus actif (PID: $PID)"
echo ""

# Statistiques via requête SQL directe
echo "📈 Progression (via base de données):"
sqlite3 harvester.db <<SQL
SELECT
    COUNT(*) as total,
    SUM(CASE WHEN title_ar IS NOT NULL AND title_fr IS NOT NULL THEN 1 ELSE 0 END) as avec_titres,
    SUM(CASE WHEN keywords_ar IS NOT NULL AND keywords_fr IS NOT NULL THEN 1 ELSE 0 END) as avec_keywords,
    SUM(CASE WHEN
        title_ar IS NOT NULL AND title_fr IS NOT NULL AND
        summary_ar IS NOT NULL AND summary_fr IS NOT NULL AND
        keywords_ar IS NOT NULL AND keywords_fr IS NOT NULL AND
        entities_ar IS NOT NULL AND entities_fr IS NOT NULL
    THEN 1 ELSE 0 END) as completes
FROM supreme_court_decisions;
SQL

echo ""

# Statistiques du log
ANALYZED=$(grep -c "Base de données mise à jour" coursupreme_completion.log 2>/dev/null || echo 0)
SKIPPED=$(grep -c "Déjà analysée complètement" coursupreme_completion.log 2>/dev/null || echo 0)
FAILED=$(grep -c "Erreur analyse:" coursupreme_completion.log 2>/dev/null || echo 0)

echo "📊 Depuis le démarrage du script:"
echo "   Analysées: $ANALYZED"
echo "   Ignorées:  $SKIPPED"
echo "   Échecs:    $FAILED"

echo ""
echo "📝 Dernières lignes du log:"
echo "----------------------------"
tail -30 coursupreme_completion.log

echo ""
echo "💡 Commandes utiles:"
echo "   - Voir le log en direct:   tail -f coursupreme_completion.log"
echo "   - Voir les stats:          ./monitor_coursupreme.sh"
echo "   - Arrêter le processus:    kill $PID"
