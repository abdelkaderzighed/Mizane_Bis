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

def register_search_routes(app):
    
    @app.route('/api/search', methods=['GET'])
    def search_documents():
        """Recherche plein texte dans les corpus JORADP et Cour Suprême"""
        try:
            query = request.args.get('q', '').strip()
            corpus = request.args.get('corpus', 'all')  # all, joradp, coursupreme
            page = request.args.get('page', 1, type=int)
            limit = request.args.get('limit', 20, type=int)
            offset = (page - 1) * limit
            
            if not query or len(query) < 2:
                return jsonify({'error': 'Requête trop courte (min 2 caractères)'}), 400
            
            conn = get_db_connection()
            cur = conn.cursor()
            
            results = {'joradp': [], 'coursupreme': [], 'total': 0}
            
            # Recherche JORADP
            if corpus in ['all', 'joradp']:
                # Tokeniser la requête (simpliste, à améliorer)
                tokens = [t.lower() for t in query.split() if len(t) >= 2]
                
                if tokens:
                    # Construire la requête avec similarité
                    token_conditions = ' OR '.join([f"token ILIKE %s" for _ in tokens])
                    token_params = [f'%{t}%' for t in tokens]
                    
                    # Compter les résultats
                    cur.execute(f"""
                        SELECT COUNT(DISTINCT d.id) as count
                        FROM joradp_documents d
                        INNER JOIN joradp_keyword_index ki ON d.id = ki.document_id
                        WHERE {token_conditions}
                    """, token_params)
                    
                    joradp_total = cur.fetchone()['count']
                    
                    # Récupérer les documents
                    cur.execute(f"""
                        SELECT DISTINCT ON (d.id)
                            d.id, d.url, d.file_extension,
                            d.file_path_r2 as file_path,
                            d.text_path_r2 as text_path,
                            d.publication_date, d.file_size_bytes,
                            m.title, m.author, m.language,
                            COUNT(*) OVER (PARTITION BY d.id) as match_count
                        FROM joradp_documents d
                        INNER JOIN joradp_keyword_index ki ON d.id = ki.document_id
                        LEFT JOIN joradp_metadata m ON d.id = m.document_id
                        WHERE {token_conditions}
                        ORDER BY d.id, d.publication_date DESC
                        LIMIT %s OFFSET %s
                    """, token_params + [limit, offset])
                    
                    results['joradp'] = [dict(row) for row in cur.fetchall()]
                    results['total'] += joradp_total
            
            # Recherche Cour Suprême
            if corpus in ['all', 'coursupreme']:
                tokens = [t.lower() for t in query.split() if len(t) >= 2]
                
                if tokens:
                    token_conditions = ' OR '.join([f"token ILIKE %s" for _ in tokens])
                    token_params = [f'%{t}%' for t in tokens]
                    
                    # Compter les résultats
                    cur.execute(f"""
                        SELECT COUNT(DISTINCT d.id) as count
                        FROM supreme_court_decisions d
                        INNER JOIN french_keyword_index ki ON d.id = ki.decision_id
                        WHERE {token_conditions}
                    """, token_params)
                    
                    sc_total = cur.fetchone()['count']
                    
                    # Récupérer les décisions
                    cur.execute(f"""
                        SELECT DISTINCT ON (d.id)
                            d.id, d.decision_number, d.decision_date,
                            d.title_ar, d.title_fr,
                            d.object_ar as title, d.object_fr,
                            d.president, d.rapporteur,
                            d.url,
                            COUNT(*) OVER (PARTITION BY d.id) as match_count
                        FROM supreme_court_decisions d
                        INNER JOIN french_keyword_index ki ON d.id = ki.decision_id
                        WHERE {token_conditions}
                        ORDER BY d.id, d.decision_date DESC
                        LIMIT %s OFFSET %s
                    """, token_params + [limit, offset])
                    
                    results['coursupreme'] = [dict(row) for row in cur.fetchall()]
                    results['total'] += sc_total
            
            cur.close()
            conn.close()
            
            return jsonify({
                'query': query,
                'corpus': corpus,
                'page': page,
                'limit': limit,
                'total': results['total'],
                'results': results
            })
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/search/suggest', methods=['GET'])
    def search_suggestions():
        """Suggestions de recherche (autocomplete)"""
        try:
            query = request.args.get('q', '').strip().lower()
            corpus = request.args.get('corpus', 'joradp')
            limit = request.args.get('limit', 10, type=int)
            
            if not query or len(query) < 2:
                return jsonify({'suggestions': []})
            
            conn = get_db_connection()
            cur = conn.cursor()
            
            if corpus == 'joradp':
                cur.execute("""
                    SELECT DISTINCT token, COUNT(*) as frequency
                    FROM joradp_keyword_index
                    WHERE token ILIKE %s
                    GROUP BY token
                    ORDER BY frequency DESC, token
                    LIMIT %s
                """, (f'{query}%', limit))
            else:
                cur.execute("""
                    SELECT DISTINCT token, COUNT(*) as frequency
                    FROM french_keyword_index
                    WHERE token ILIKE %s
                    GROUP BY token
                    ORDER BY frequency DESC, token
                    LIMIT %s
                """, (f'{query}%', limit))
            
            suggestions = [row['token'] for row in cur.fetchall()]
            
            cur.close()
            conn.close()
            
            return jsonify({'suggestions': suggestions})
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
