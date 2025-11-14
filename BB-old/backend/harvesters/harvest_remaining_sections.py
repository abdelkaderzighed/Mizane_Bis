from harvester_coursupreme_v3 import HarvesterCourSupremeV3
import sqlite3

sections = [
    (2, "Chambres pénales"),
    (3, "Chambres civiles"),
    (4, "Commission d'indemnisation")
]

harvester = HarvesterCourSupremeV3()

print("\n" + "="*70)
print("🚀 MOISSONNAGE SECTIONS RESTANTES (2, 3, 4)")
print("="*70 + "\n")

results = {}

for section_id, section_name in sections:
    print(f"\n{'='*70}")
    print(f"📂 SECTION {section_id}: {section_name}")
    print(f"{'='*70}")
    
    result = harvester.harvest_section(chamber_id=section_id, max_pages=None)
    results[section_id] = result
    
    print(f"\n✅ Section {section_id} terminée")
    print(f"   Thèmes: {result['themes']}")
    print(f"   Décisions: {result['decisions']}")

print(f"\n{'='*70}")
print("🎉 MOISSONNAGE TERMINÉ")
print(f"{'='*70}\n")

# Stats finales
conn = sqlite3.connect('../../harvester.db')
cursor = conn.cursor()

print("\n╔════════════════════════════════════════════════════════════════╗")
print("║              STATISTIQUES FINALES PAR SECTION                  ║")
print("╚════════════════════════════════════════════════════════════════╝\n")

cursor.execute("""
SELECT 
    c.id,
    c.name_fr,
    COUNT(DISTINCT dc.theme_id) as themes,
    COUNT(DISTINCT dc.decision_id) as decisions,
    COUNT(dc.id) as classifications
FROM supreme_court_chambers c
LEFT JOIN supreme_court_decision_classifications dc ON dc.chamber_id = c.id
GROUP BY c.id
ORDER BY c.id
""")

print(f"{'Section':<35} | {'Thèmes':>7} | {'Décisions':>10} | {'Classifications':>15}")
print("-" * 75)

for row in cursor.fetchall():
    section_id, name, themes, decisions, classifications = row
    print(f"{name:<35} | {themes:>7} | {decisions:>10} | {classifications:>15}")

print()

# Stats par thème (top 10)
print("\n╔════════════════════════════════════════════════════════════════╗")
print("║           TOP 10 THÈMES PAR NOMBRE DE DÉCISIONS               ║")
print("╚════════════════════════════════════════════════════════════════╝\n")

cursor.execute("""
SELECT 
    t.name_ar,
    c.name_fr as section,
    COUNT(dc.decision_id) as nb_decisions
FROM supreme_court_themes t
JOIN supreme_court_chambers c ON c.id = t.chamber_id
LEFT JOIN supreme_court_decision_classifications dc ON dc.theme_id = t.id
GROUP BY t.id
ORDER BY nb_decisions DESC
LIMIT 10
""")

print(f"{'Thème':<40} | {'Section':<30} | {'Décisions':>10}")
print("-" * 85)

for row in cursor.fetchall():
    theme, section, nb = row
    print(f"{theme:<40} | {section:<30} | {nb:>10}")

conn.close()

print("\n" + "="*70)
print("✅ MOISSONNAGE COMPLET TERMINÉ")
print("="*70 + "\n")
