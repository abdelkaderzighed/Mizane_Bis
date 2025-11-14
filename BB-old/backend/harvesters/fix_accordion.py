with open('harvester_coursupreme_v2.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Remplacer la logique de parsing des thèmes
old_code = """                for h4 in h4_tags:
                    theme_name = h4.get_text(strip=True)
                    
                    if not theme_name or len(theme_name) < 3:
                        continue
                    
                    # Insérer ou récupérer le thème
                    cursor.execute(\"\"\"
                        INSERT OR IGNORE INTO supreme_court_themes 
                        (chamber_id, name_ar, name_fr, url)
                        VALUES (?, ?, ?, ?)
                    \"\"\", (chamber_id, theme_name, theme_name, url))
                    
                    cursor.execute(\"\"\"
                        SELECT id FROM supreme_court_themes 
                        WHERE chamber_id = ? AND name_ar = ?
                    \"\"\", (chamber_id, theme_name))
                    
                    result = cursor.fetchone(); theme_id = result[0] if result else None
                    
                    if not theme_id:
                        print(f"   ⚠️  Thème non inséré: {theme_name[:40]}")
                        continue
                    
                    # Trouver les décisions sous ce thème
                    next_h4 = h4.find_next_sibling('h4')
                    
                    # Chercher tous les liens de décision jusqu'au prochain h4
                    current = h4.find_next_sibling()
                    theme_decisions = 0
                    
                    while current and current != next_h4:
                        links = current.find_all('a', href=lambda h: h and '/decision/' in str(h))
                        
                        for link in links:"""

new_code = """                # Chercher les accordéons
                accordions = soup.find_all('div', class_='accordion-header')
                
                for accordion in accordions:
                    h4 = accordion.find('h4')
                    if not h4:
                        continue
                    
                    theme_name = h4.get_text(strip=True)
                    
                    if not theme_name or len(theme_name) < 3:
                        continue
                    
                    # Insérer ou récupérer le thème
                    cursor.execute(\"\"\"
                        INSERT OR IGNORE INTO supreme_court_themes 
                        (chamber_id, name_ar, name_fr, url)
                        VALUES (?, ?, ?, ?)
                    \"\"\", (chamber_id, theme_name, theme_name, url))
                    
                    cursor.execute(\"\"\"
                        SELECT id FROM supreme_court_themes 
                        WHERE chamber_id = ? AND name_ar = ?
                    \"\"\", (chamber_id, theme_name))
                    
                    result = cursor.fetchone()
                    theme_id = result[0] if result else None
                    
                    if not theme_id:
                        continue
                    
                    # Trouver le div.accordion-content qui suit
                    content_div = accordion.find_next_sibling('div', class_='accordion-content')
                    theme_decisions = 0
                    
                    if content_div:
                        links = content_div.find_all('a', href=lambda h: h and '/decision/' in str(h))
                        
                        for link in links:"""

content = content.replace(old_code, new_code)

# Supprimer aussi la partie qui cherche current.find_next_sibling
content = content.replace("""
                        current = current.find_next_sibling()""", "")

with open('harvester_coursupreme_v2.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Parsing accordéon corrigé")
