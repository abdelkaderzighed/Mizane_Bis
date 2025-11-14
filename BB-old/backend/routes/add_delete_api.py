with open('routes_coursupreme_viewer.py', 'r') as f:
    content = f.read()

delete_api = '''
@api_bp.route('/coursupreme/decisions/<int:decision_id>', methods=['DELETE'])
def delete_decision(decision_id):
    """Supprime une décision (BDD + fichiers)"""
    import os
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT file_path_ar, file_path_fr
        FROM supreme_court_decisions
        WHERE id = ?
    """, (decision_id,))
    
    row = cursor.fetchone()
    
    if not row:
        return jsonify({'error': 'Décision non trouvée'}), 404
    
    file_ar, file_fr = row
    
    try:
        if file_ar and os.path.exists(file_ar):
            os.remove(file_ar)
        if file_fr and os.path.exists(file_fr):
            os.remove(file_fr)
        
        cursor.execute("DELETE FROM supreme_court_decision_classifications WHERE decision_id = ?", (decision_id,))
        cursor.execute("DELETE FROM supreme_court_decisions WHERE id = ?", (decision_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Décision supprimée', 'status': 'success'})
        
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

'''

insert_pos = content.find('def download_decision')
if insert_pos > 0:
    content = content[:insert_pos] + delete_api + content[insert_pos:]

with open('routes_coursupreme_viewer.py', 'w') as f:
    f.write(content)

print("API delete ajoutee")
