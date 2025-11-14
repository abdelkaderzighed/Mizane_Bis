with open('routes.py', 'r') as f:
    content = f.read()

# Corriger le double fetchone
old = """        cursor.execute("SELECT * FROM supreme_court_decisions WHERE id = ?", (decision_id,))
        decision = dict(cursor.fetchone()) if cursor.fetchone() else None
        conn.close()
        if decision:
            return jsonify(decision)
        return jsonify({'error': 'Not found'}), 404"""

new = """        cursor.execute("SELECT * FROM supreme_court_decisions WHERE id = ?", (decision_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return jsonify(dict(row))
        return jsonify({'error': 'Not found'}), 404"""

content = content.replace(old, new)

with open('routes.py', 'w') as f:
    f.write(content)

print("Bug fetchone corrige")
