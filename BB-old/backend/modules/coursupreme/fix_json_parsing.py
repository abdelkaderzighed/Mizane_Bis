with open('routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

print("Ajout du nettoyage JSON dans batch_analyze...")

# Remplacer les deux json.loads sans nettoyage
content = content.replace(
    "ar_json = json.loads(ar_response.choices[0].message.content.strip())",
    """ar_content = ar_response.choices[0].message.content.strip()
                ar_content = ar_content.replace('```json', '').replace('```', '').strip()
                ar_json = json.loads(ar_content)"""
)

content = content.replace(
    "fr_json = json.loads(fr_response.choices[0].message.content.strip())",
    """fr_content = fr_response.choices[0].message.content.strip()
                fr_content = fr_content.replace('```json', '').replace('```', '').strip()
                fr_json = json.loads(fr_content)"""
)

with open('routes.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Nettoyage JSON ajouté")
