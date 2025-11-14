with open('harvester_coursupreme_v2.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Déplacer la détection APRÈS le comptage
# Chercher la ligne avec "print(f'   ✅ {page_themes} thèmes"
old = """                print(f"   ✅ {page_themes} thèmes, {page_decisions} décisions")
                
                total_themes += page_themes
                total_decisions += page_decisions
                
                conn.commit()"""

new = """                print(f"   ✅ {page_themes} thèmes, {page_decisions} décisions")
                
                # Détecter pages vides après comptage
                if page_themes == 0 and page_decisions == 0:
                    empty_pages += 1
                    print(f"   ⚠️  Page vide ({empty_pages}/3)")
                    if empty_pages >= 3:
                        print(f"   ✓ 3 pages vides - Arrêt")
                        break
                else:
                    empty_pages = 0
                
                total_themes += page_themes
                total_decisions += page_decisions
                
                conn.commit()"""

content = content.replace(old, new)

# Supprimer l'ancienne détection
old2 = """                # Chercher les accordéons pour détecter page vide
                accordions_check = soup.find_all('div', class_='accordion-header')
                
                if not accordions_check or len(accordions_check) == 0:
                    empty_pages += 1
                    print(f'   ⚠️  Page vide ({empty_pages}/3)')
                    if empty_pages >= 3:
                        print(f'   ✓ 3 pages vides consécutives - Fin')
                        break
                else:
                    empty_pages = 0  # Réinitialiser si page avec contenu"""

content = content.replace(old2, "")

with open('harvester_coursupreme_v2.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Détection corrigée - vérifie après comptage")
