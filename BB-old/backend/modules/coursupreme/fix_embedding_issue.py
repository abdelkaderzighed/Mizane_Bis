with open('routes.py', 'r') as f:
    content = f.read()

# Remplacer SELECT * par SELECT explicite sans embedding
old = """        cursor.execute("SELECT * FROM supreme_court_decisions WHERE id = ?", (decision_id,))"""

new = """        cursor.execute('''
            SELECT id, decision_number, decision_date, object_ar, url,
                   content_ar, content_fr,
                   title_ar, title_fr, summary_ar, summary_fr,
                   entities_ar, entities_fr
            FROM supreme_court_decisions WHERE id = ?
        ''', (decision_id,))"""

content = content.replace(old, new)

with open('routes.py', 'w') as f:
    f.write(content)

print("Embedding exclu de la route")
