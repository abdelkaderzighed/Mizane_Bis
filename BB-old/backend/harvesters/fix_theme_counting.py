with open('harvester_coursupreme_v2.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Déplacer l'incrémentation de page_themes AVANT le if
old = """                    if theme_decisions > 0:
                        page_themes += 1
                        page_decisions += theme_decisions"""

new = """                    # Compter le thème même si décisions déjà en BDD
                    page_themes += 1
                    if theme_decisions > 0:
                        page_decisions += theme_decisions"""

content = content.replace(old, new)

with open('harvester_coursupreme_v2.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Comptage thèmes corrigé")
