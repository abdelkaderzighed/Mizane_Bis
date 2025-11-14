with open('routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Corriger les \n mal échappés
content = content.replace("separator='\\n'", "separator='\\\\n'")
content = content.replace('separator="\\n"', 'separator="\\\\n"')

with open('routes.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Erreur de syntaxe corrigée")
