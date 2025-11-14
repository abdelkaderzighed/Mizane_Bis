with open('routes_coursupreme_viewer.py', 'r') as f:
    content = f.read()

advanced_search_route = '''
@api_bp.route('/coursupreme/search/advanced', methods=['GET'])
def advanced_search_decisions():
    """Recherche avancée avec filtres multiples"""
    keywords_inc = request.args.get('keywords_inc', '').strip()
    keywords_exc = request.args.get('keywords_exc', '').strip()
    decision_number = request.args.get('decision_number', '').strip()
    date_from = request.args.get('date_from', '').strip()
    date_to = request.args.get('date_to', '').strip()
    chambers = request.args.get('chambers', '').strip()
    
    conn = get_db()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    query = """
        SELECT DISTINCT
            d.id,
            d.decision_number,
            d.decision_date,
            d.object_ar,
            d.url
        FROM supreme_court_decisions d
    """
    
    conditions = []
    params = []
    
    if chambers:
        chamber_ids = chambers.split(',')
        placeholders = ','.join(['?' for _ in chamber_ids])
        query += f" LEFT JOIN supreme_court_decision_classifications dc ON d.id = dc.decision_id "
        conditions.append(f"dc.chamber_id IN ({placeholders})")
        params.extend(chamber_ids)
    
    if keywords_inc:
        keywords = keywords_inc.split()
        for kw in keywords:
            conditions.append("(d.object_ar LIKE ? OR d.parties_ar LIKE ? OR d.arguments_ar LIKE ?)")
            params.extend([f'%{kw}%', f'%{kw}%', f'%{kw}%'])
    
    if keywords_exc:
        keywords = keywords_exc.split()
        for kw in keywords:
            conditions.append("(d.object_ar NOT LIKE ? AND d.parties_ar NOT LIKE ? AND d.arguments_ar NOT LIKE ?)")
            params.extend([f'%{kw}%', f'%{kw}%', f'%{kw}%'])
    
    if decision_number:
        conditions.append("d.decision_number LIKE ?")
        params.append(f'%{decision_number}%')
    
    if date_from:
        conditions.append("d.decision_date >= ?")
        params.append(date_from)
    
    if date_to:
        conditions.append("d.decision_date <= ?")
        params.append(date_to)
    
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    
    query += " ORDER BY d.decision_date DESC LIMIT 100"
    
    cursor.execute(query, params)
    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify({'results': results, 'count': len(results)})

'''

insert_pos = content.find('def get_decision_detail')
if insert_pos > 0:
    content = content[:insert_pos] + advanced_search_route + content[insert_pos:]

with open('routes_coursupreme_viewer.py', 'w') as f:
    f.write(content)

print("API recherche avancee ajoutee")
