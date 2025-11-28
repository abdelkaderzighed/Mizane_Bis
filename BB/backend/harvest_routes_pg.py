from flask import request, jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
import os

def get_db_connection():
    """Connexion à PostgreSQL (MizaneDb)"""
    conn = psycopg2.connect(
        os.getenv('DATABASE_URL', 
                  'postgresql://postgres:Piano_2025_Sup@db.pxcwsfnuvmowlvtycslc.supabase.co:5432/postgres'),
        cursor_factory=RealDictCursor
    )
    return conn

def register_harvest_routes(app):
    
    @app.route('/api/statistics', methods=['GET'])
    def get_statistics():
        """Statistiques des corpus"""
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            
            # JORADP stats
            cur.execute("SELECT COUNT(*) as count FROM joradp_documents")
            joradp_count = cur.fetchone()['count']
            
            # Supreme Court stats
            cur.execute("SELECT COUNT(*) as count FROM supreme_court_decisions")
            sc_count = cur.fetchone()['count']
            
            cur.close()
            conn.close()
            
            return jsonify({
                'joradp': {'total': joradp_count},
                'coursupreme': {'total': sc_count}  # Changé de supreme_court à coursupreme
            })
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/documents', methods=['GET'])
    def get_documents():
        """Récupérer les documents par corpus"""
        try:
            corpus = request.args.get('corpus', 'joradp')
            page = request.args.get('page', 1, type=int)
            limit = request.args.get('limit', 20, type=int)
            offset = (page - 1) * limit
            
            conn = get_db_connection()
            cur = conn.cursor()
            
            if corpus == 'joradp':
                # Compter total
                cur.execute("SELECT COUNT(*) as count FROM joradp_documents")
                total = cur.fetchone()['count']
                
                # Récupérer les documents
                cur.execute("""
                    SELECT 
                        d.id, d.url, d.file_extension,
                        d.file_path_r2 as file_path, 
                        d.text_path_r2 as text_path,
                        d.publication_date, d.file_size_bytes,
                        d.download_status,
                        m.title, m.author, m.language, m.page_count
                    FROM joradp_documents d
                    LEFT JOIN joradp_metadata m ON d.id = m.document_id
                    ORDER BY d.publication_date DESC NULLS LAST, d.id DESC
                    LIMIT %s OFFSET %s
                """, (limit, offset))
                
            elif corpus == 'coursupreme' or corpus == 'supreme_court':  # Accepter les 2 formats
                # Compter total
                cur.execute("SELECT COUNT(*) as count FROM supreme_court_decisions")
                total = cur.fetchone()['count']
                
                # Récupérer les décisions
                cur.execute("""
                    SELECT 
                        d.id, d.decision_number, d.decision_date,
                        d.title_ar, d.title_fr,
                        d.object_ar as title, d.object_fr,
                        d.president, d.rapporteur,
                        d.file_path_ar_r2 as file_path, 
                        d.file_path_fr_r2,
                        d.url, d.download_status
                    FROM supreme_court_decisions d
                    ORDER BY d.decision_date DESC NULLS LAST, d.id DESC
                    LIMIT %s OFFSET %s
                """, (limit, offset))
            else:
                cur.close()
                conn.close()
                return jsonify({'error': 'Corpus invalide'}), 400
            
            documents = cur.fetchall()
            
            cur.close()
            conn.close()
            
            return jsonify({
                'total': total,
                'page': page,
                'limit': limit,
                'documents': [dict(doc) for doc in documents]
            })
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
