from harvester_coursupreme_v2 import HarvesterCourSupremeV2

harvester = HarvesterCourSupremeV2()

print("\n" + "="*70)
print("🚀 MOISSONNAGE COMPLET - SECTION 1")
print("="*70 + "\n")

# Section 1 : toutes les pages (18 attendues)
result = harvester.harvest_section(chamber_id=1, max_pages=None)

print(f"""
📊 RÉSUMÉ FINAL:
   Pages moissonnées : {result['pages']}
   Thèmes découverts : {result['themes']} 
   Décisions récupérées : {result['decisions']}
""")
