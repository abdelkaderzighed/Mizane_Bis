"""
Lance le moissonnage exhaustif JORADP 1962-2025
Session: joradp-depuis-1962 (ID 14)
"""
from harvester_joradp_exhaustive import JORADPExhaustiveHarvester

print("🚀 Lancement moissonnage COMPLET JORADP")
print("   Période: 1962 - 2025")
print("   Session: joradp-depuis-1962 (ID 14)")
print("   Estimation: ~5000 documents, 2-3h")
print("\n⏳ Démarrage dans 3 secondes...")

import time
time.sleep(3)

# Lancer avec la session existante
harvester = JORADPExhaustiveHarvester(session_id=14)
harvester.harvest_all(start_year=1962, end_year=2025)

print("\n✅ MOISSONNAGE TERMINÉ !")
print("   Consultez la BD pour voir les résultats")
