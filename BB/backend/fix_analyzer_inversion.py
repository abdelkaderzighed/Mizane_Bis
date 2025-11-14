with open('openai_coursupreme_analyzer.py', 'r') as f:
    content = f.read()

# Inverser les assignations AR/FR
old_ar = """        # 1. Résumé + Titre AR
        if text_ar:
            ar_analysis = self._analyze_text(text_ar, 'ar')
            results['summary_ar'] = ar_analysis['summary']
            results['title_ar'] = ar_analysis['title']
            results['entities_ar'] = json.dumps(ar_analysis['entities'], ensure_ascii=False)"""

new_ar = """        # 1. Résumé + Titre AR
        if text_ar:
            ar_analysis = self._analyze_text(text_ar, 'ar')
            results['summary_ar'] = ar_analysis['summary']
            results['title_ar'] = ar_analysis['title']
            results['entities_ar'] = json.dumps(ar_analysis['entities'], ensure_ascii=False)"""

old_fr = """        # 2. Résumé + Titre FR
        if text_fr:
            fr_analysis = self._analyze_text(text_fr, 'fr')
            results['summary_fr'] = fr_analysis['summary']
            results['title_fr'] = fr_analysis['title']
            results['entities_fr'] = json.dumps(fr_analysis['entities'], ensure_ascii=False)"""

new_fr = """        # 2. Résumé + Titre FR (IMPORTANT: on analyse le texte FR pour avoir résultats en FR)
        if text_fr:
            fr_analysis = self._analyze_text(text_fr, 'fr')
            results['summary_fr'] = fr_analysis['summary']
            results['title_fr'] = fr_analysis['title']
            results['entities_fr'] = json.dumps(fr_analysis['entities'], ensure_ascii=False)"""

# Le vrai problème : vérifier le prompt
content_check = content

with open('openai_coursupreme_analyzer.py', 'w') as f:
    f.write(content_check)

print("Verifie - voir le prompt _analyze_text")
