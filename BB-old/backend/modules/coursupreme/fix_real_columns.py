with open('routes.py', 'r') as f:
    content = f.read()

# Remplacer par les vraies colonnes (sans embedding)
old = """        cursor.execute('''
            SELECT id, decision_number, decision_date, object_ar, url,
                   content_ar, content_fr,
                   title_ar, title_fr, summary_ar, summary_fr,
                   entities_ar, entities_fr
            FROM supreme_court_decisions WHERE id = ?
        ''', (decision_id,))"""

new = """        cursor.execute('''
            SELECT id, decision_number, decision_date, 
                   object_ar, object_fr, url,
                   html_content_ar, html_content_fr,
                   arguments_ar, arguments_fr,
                   legal_reference_ar, legal_reference_fr,
                   parties_ar, parties_fr,
                   court_response_ar, court_response_fr,
                   president, rapporteur,
                   title_ar, title_fr, summary_ar, summary_fr,
                   entities_ar, entities_fr
            FROM supreme_court_decisions WHERE id = ?
        ''', (decision_id,))"""

content = content.replace(old, new)

with open('routes.py', 'w') as f:
    f.write(content)

print("Colonnes corrigees")
