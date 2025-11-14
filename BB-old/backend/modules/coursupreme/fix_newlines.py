with open('routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Corriger les sauts de ligne cassés dans get_text
import re

# Pattern pour trouver separator=' suivi d'un vrai saut de ligne
content = re.sub(
    r"separator='[\r\n]+',",
    r"separator='\\n',",
    content
)

with open('routes.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Sauts de ligne corrigés")
