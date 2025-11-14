with open('harvester_coursupreme_v3.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Changer 3 → 2 pages
old = """                # Détecter pages vides (0 décisions = vide même si thèmes présents)
                if page_decisions == 0:
                    empty_pages += 1
                    print(f"   ⚠️  Page sans nouvelles décisions ({empty_pages}/3)")
                    if empty_pages >= 3:
                        print(f"   ✓ 3 pages sans décisions - Arrêt")
                        break"""

new = """                # Détecter pages vides (0 décisions = vide même si thèmes présents)
                if page_decisions == 0:
                    empty_pages += 1
                    print(f"   ⚠️  Page sans nouvelles décisions ({empty_pages}/2)")
                    if empty_pages >= 2:
                        print(f"   ✓ 2 pages consécutives sans décisions - Arrêt")
                        break"""

content = content.replace(old, new)

with open('harvester_coursupreme_v3.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Arrêt après 2 pages à 0 (au lieu de 3)")
