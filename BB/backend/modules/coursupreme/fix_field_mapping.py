with open('routes.py', 'r') as f:
    content = f.read()

# Trouver la fonction get_decision et ajouter le mapping
old = """        row = cursor.fetchone()
        conn.close()
        if row:
            return jsonify(dict(row))
        return jsonify({'error': 'Not found'}), 404"""

new = """        row = cursor.fetchone()
        conn.close()
        if row:
            decision = dict(row)
            # Mapper les noms de colonnes pour le frontend
            decision['content_ar'] = decision.pop('html_content_ar', None)
            decision['content_fr'] = decision.pop('html_content_fr', None)
            return jsonify(decision)
        return jsonify({'error': 'Not found'}), 404"""

content = content.replace(old, new)

with open('routes.py', 'w') as f:
    f.write(content)

print("Mapping champs ajoute")
