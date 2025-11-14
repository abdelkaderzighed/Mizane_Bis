with open('routes.py', 'r') as f:
    content = f.read()

old_select = """            SELECT id, decision_number, decision_date, 
                   object_ar, object_fr, url,
                   html_content_ar, html_content_fr,
                   arguments_ar, arguments_fr,
                   legal_reference_ar, legal_reference_fr,
                   parties_ar, parties_fr,
                   court_response_ar, court_response_fr,
                   president, rapporteur,
                   title_ar, title_fr, summary_ar, summary_fr,
                   entities_ar, entities_fr
            FROM supreme_court_decisions WHERE id = ?"""

new_select = """            SELECT id, decision_number, decision_date, 
                   object_ar, object_fr, url,
                   file_path_ar, file_path_fr,
                   html_content_ar, html_content_fr,
                   arguments_ar, arguments_fr,
                   legal_reference_ar, legal_reference_fr,
                   parties_ar, parties_fr,
                   court_response_ar, court_response_fr,
                   president, rapporteur,
                   title_ar, title_fr, summary_ar, summary_fr,
                   entities_ar, entities_fr
            FROM supreme_court_decisions WHERE id = ?"""

content = content.replace(old_select, new_select)

with open('routes.py', 'w') as f:
    f.write(content)

print("file_path ajoutes au SELECT")
