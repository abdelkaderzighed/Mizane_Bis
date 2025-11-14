import os

with open('routes.py', 'r') as f:
    content = f.read()

old = """@coursupreme_bp.route('/decisions/<int:decision_id>', methods=['DELETE'])
def delete_decision(decision_id):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM supreme_court_decisions WHERE id = ?", (decision_id,))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Deleted'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500"""

new = """@coursupreme_bp.route('/decisions/<int:decision_id>', methods=['DELETE'])
def delete_decision(decision_id):
    import os
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Récupérer les chemins des fichiers AVANT suppression
        cursor.execute("SELECT file_path_ar, file_path_fr FROM supreme_court_decisions WHERE id = ?", (decision_id,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return jsonify({'error': 'Décision non trouvée'}), 404
        
        file_ar = row['file_path_ar']
        file_fr = row['file_path_fr']
        
        # Supprimer de la BD
        cursor.execute("DELETE FROM supreme_court_decisions WHERE id = ?", (decision_id,))
        conn.commit()
        conn.close()
        
        # Supprimer les fichiers physiques
        deleted_files = []
        if file_ar and os.path.exists(file_ar):
            os.remove(file_ar)
            deleted_files.append(file_ar)
        
        if file_fr and os.path.exists(file_fr):
            os.remove(file_fr)
            deleted_files.append(file_fr)
        
        return jsonify({
            'message': 'Décision et fichiers supprimés',
            'deleted_files': deleted_files
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500"""

content = content.replace(old, new)

with open('routes.py', 'w') as f:
    f.write(content)

print("Suppression avec fichiers activee")
