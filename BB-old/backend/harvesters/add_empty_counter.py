with open('harvester_coursupreme_v2.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Ajouter compteur au début
old = "        page_num = 1\n        total_themes = 0\n        total_decisions = 0"
new = "        page_num = 1\n        total_themes = 0\n        total_decisions = 0\n        empty_pages = 0"

content = content.replace(old, new)

# Incrémenter si page vide
old2 = "                if not accordions_check or len(accordions_check) == 0:\n                    print(f'   ⚠️  Page vide - Fin pagination')\n                    break"
new2 = """                if not accordions_check or len(accordions_check) == 0:
                    empty_pages += 1
                    print(f'   ⚠️  Page vide ({empty_pages}/3)')
                    if empty_pages >= 3:
                        print(f'   ✓ 3 pages vides consécutives - Fin')
                        break
                else:
                    empty_pages = 0  # Réinitialiser si page avec contenu"""

content = content.replace(old2, new2)

with open('harvester_coursupreme_v2.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Arrêt après 3 pages vides ajouté")
