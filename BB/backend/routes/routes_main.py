from flask import jsonify
import sqlite3
from . import api_bp

DB_PATH = 'harvester.db'

@api_bp.route('/documents/<int:doc_id>/metadata', methods=['GET'])
def get_document_metadata(doc_id):
    """Récupérer les métadonnées d'un document JORADP"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                d.id, d.url, d.publication_date,
                d.file_size_bytes, d.file_path,
                d.metadata_collection_status, d.download_status, d.ai_analysis_status,
                ai.summary, ai.keywords, ai.named_entities
            FROM documents d
            LEFT JOIN document_ai_analysis ai ON d.id = ai.document_id
            WHERE d.id = ?
        """, (doc_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return jsonify({'error': 'Document non trouvé'}), 404
        
        doc = dict(row)
        doc['statuts'] = {
            'collected': doc.pop('metadata_collection_status') == 'success',
            'downloaded': doc.pop('download_status') == 'success',
            'analyzed': doc.pop('ai_analysis_status') == 'success'
        }
        
        return jsonify({'success': True, 'metadata': doc})
        
    except Exception as e:
        print(f"Erreur metadata: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
