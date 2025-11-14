with open('openai_coursupreme_analyzer.py', 'r') as f:
    content = f.read()

# Remplacer le prompt
old_prompt = '''        prompt = f"""Analyse cette décision juridique et retourne un JSON avec:
1. "summary": résumé de 3-4 lignes
2. "title": titre court et descriptif
3. "entities": liste des entités nommées (personnes, institutions, lieux)

Décision:
{text[:3000]}

Réponds UNIQUEMENT avec un JSON valide, sans markdown."""'''

new_prompt = '''        lang_instruction = "Réponds en ARABE" if lang == 'ar' else "Réponds en FRANÇAIS"
        
        prompt = f"""{lang_instruction}. Analyse cette décision juridique et retourne un JSON avec:
1. "summary": résumé de 3-4 lignes
2. "title": titre court et descriptif
3. "entities": liste des entités nommées (personnes, institutions, lieux)

Décision:
{text[:3000]}

IMPORTANT: Toutes tes réponses (summary, title, entities) doivent être dans la langue du texte ({"arabe" if lang == "ar" else "français"}).
Réponds UNIQUEMENT avec un JSON valide, sans markdown."""'''

content = content.replace(old_prompt, new_prompt)

with open('openai_coursupreme_analyzer.py', 'w') as f:
    f.write(content)

print("Prompt corrige avec instruction de langue")
