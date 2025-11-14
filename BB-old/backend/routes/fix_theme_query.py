with open('routes_coursupreme_viewer.py', 'r') as f:
    content = f.read()

old_query = """    cursor.execute(\"\"\"
        SELECT 
            d.id,
            d.decision_number,
            d.decision_date,
            d.object_ar,
            d.parties_ar,
            d.url"""

new_query = """    cursor.execute(\"\"\"
        SELECT 
            d.id,
            d.decision_number,
            d.decision_date,
            d.object_ar,
            d.url"""

if old_query in content:
    content = content.replace(old_query, new_query)
else:
    content = content.replace(
        """    cursor.execute(\"\"\"
        SELECT 
            d.id,
            d.decision_number,
            d.decision_date,""",
        """    cursor.execute(\"\"\"
        SELECT 
            d.id,
            d.decision_number,
            d.decision_date,
            d.object_ar,"""
    )

with open('routes_coursupreme_viewer.py', 'w') as f:
    f.write(content)

print("object_ar ajoute au SELECT")
