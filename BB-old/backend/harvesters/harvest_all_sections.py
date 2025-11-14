from harvester_coursupreme_v2 import HarvesterCourSupremeV2

sections = [
    (1, "Décisions par sujets"),
    (2, "Chambres pénales"),
    (3, "Chambres civiles"),
    (4, "Commission d'indemnisation"),
    (5, "Chambres réunies"),
    (6, "Décisions importantes")
]

harvester = HarvesterCourSupremeV2()

print("\n" + "="*70)
print("🚀 MOISSONNAGE COMPLET - 6 SECTIONS")
print("="*70 + "\n")

total_themes = 0
total_decisions = 0

for section_id, section_name in sections:
    print(f"\n{'='*70}")
    print(f"📂 SECTION {section_id}: {section_name}")
    print(f"{'='*70}")
    
    result = harvester.harvest_section(chamber_id=section_id, max_pages=None)
    
    total_themes += result['themes']
    total_decisions += result['decisions']

print(f"\n{'='*70}")
print(f"🎉 MOISSONNAGE TERMINÉ")
print(f"{'='*70}")
print(f"Total thèmes: {total_themes}")
print(f"Total décisions: {total_decisions}")
print(f"{'='*70}\n")
