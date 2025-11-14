with open('routes.py', 'r') as f:
    content = f.read()

# Modifier la route pour lire les fichiers
old = """        row = cursor.fetchone()
        conn.close()
        if row:
            decision = dict(row)
            # Mapper les noms de colonnes pour le frontend
            decision['content_ar'] = decision.pop('html_content_ar', None)
            decision['content_fr'] = decision.pop('html_content_fr', None)
            return jsonify(decision)
        return jsonify({'error': 'Not found'}), 404"""

new = """        row = cursor.fetchone()
        conn.close()
        if row:
            decision = dict(row)
            
            # Lire les contenus depuis les fichiers texte
            try:
                if decision.get('file_path_ar'):
                    with open(decision['file_path_ar'], 'r', encoding='utf-8') as f:
                        decision['content_ar'] = f.read()
                else:
                    decision['content_ar'] = decision.pop('html_content_ar', None)
            except:
                decision['content_ar'] = decision.pop('html_content_ar', None)
            
            try:
                if decision.get('file_path_fr'):
                    with open(decision['file_path_fr'], 'r', encoding='utf-8') as f:
                        decision['content_fr'] = f.read()
                else:
                    decision['content_fr'] = decision.pop('html_content_fr', None)
            except:
                decision['content_fr'] = None
            
            # Nettoyer les champs inutiles
            decision.pop('html_content_ar', None)
            decision.pop('html_content_fr', None)
            decision.pop('file_path_ar', None)
            decision.pop('file_path_fr', None)
            
            return jsonify(decision)
        return jsonify({'error': 'Not found'}), 404"""

content = content.replace(old, new)

with open('routes.py', 'w') as f:
    f.write(content)

print("Lecture depuis fichiers ajoutee")
