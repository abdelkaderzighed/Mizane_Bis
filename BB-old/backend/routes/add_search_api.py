with open('routes_coursupreme_viewer.py', 'r') as f:
    lines = f.readlines()

search_route = '''
@api_bp.route('/coursupreme/search', methods=['GET'])
def search_decisions():
    """Recherche dans les décisions"""
    query = request.args.get('q', '').strip()
    
    if not query:
        return jsonify({'results': []})
    
    conn = get_db()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    search_pattern = f'%{query}%'
    
    cursor.execute("""
        SELECT DISTINCT
            d.id,
            d.decision_number,
            d.decision_date,
            d.object_ar,
            d.url
        FROM supreme_court_decisions d
        WHERE 
            d.decision_number LIKE ?
            OR d.decision_date LIKE ?
            OR d.object_ar LIKE ?
            OR d.parties_ar LIKE ?
        ORDER BY d.decision_date DESC
        LIMIT 50
    """, (search_pattern, search_pattern, search_pattern, search_pattern))
    
    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify({'results': results, 'count': len(results)})

'''

for i, line in enumerate(lines):
    if 'def get_decision_detail' in line:
        lines.insert(i, search_route)
        break

with open('routes_coursupreme_viewer.py', 'w') as f:
    f.writelines(lines)

print("API recherche ajoutee")
