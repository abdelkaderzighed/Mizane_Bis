with open('harvester_coursupreme.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Décommenter la ligne html_content_ar
content = content.replace(
    "# 'html_content_ar': html_content,  # Supprimé - stocké dans fichier",
    "'html_content_ar': html_content,"
)

with open('harvester_coursupreme.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Harvester modifié : download_decision retourne maintenant le HTML")
