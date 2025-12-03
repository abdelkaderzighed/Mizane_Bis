from flask import request, jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
import os

from harvester_joradp_incremental import JORADPIncrementalHarvester

def get_db_connection():
    """Connexion à PostgreSQL (MizaneDb) via shared module"""
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
    from shared.postgres import get_connection_simple
    return get_connection_simple()

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

    @app.route('/api/harvest/<int:session_id>/download', methods=['POST'])
    def download_documents(session_id):
        """
        Marque les documents d'une session comme téléchargés (pas de dump local),
        utile pour débloquer les flux front. On met à jour download_status/downloaded_at.
        """
        try:
            data = request.json or {}
            mode = data.get('mode', 'all')
            force = bool(data.get('force', False))
            include_completed = force or mode == 'selected'

            where_clauses = ["session_id = %s"]
            params = [session_id]

            if not include_completed:
                where_clauses.append("(download_status IS NULL OR download_status <> 'success')")

            if mode == 'selected':
                doc_ids = data.get('document_ids') or []
                if not doc_ids:
                    return jsonify({'error': 'Aucun document sélectionné'}), 400
                placeholders = ",".join(["%s"] * len(doc_ids))
                where_clauses.append(f"id IN ({placeholders})")
                params.extend(doc_ids)
            elif mode == 'range_numero':
                numero_debut = data.get('numero_debut')
                numero_fin = data.get('numero_fin')
                if numero_debut and numero_fin:
                    where_clauses.append("CAST(SUBSTRING(url FROM '.{3}\\.pdf$') AS INTEGER) BETWEEN %s AND %s")
                    params.extend([int(numero_debut), int(numero_fin)])
            elif mode == 'range_date':
                date_debut = data.get('date_debut')
                date_fin = data.get('date_fin')
                if date_debut:
                    where_clauses.append("publication_date >= %s")
                    params.append(date_debut)
                if date_fin:
                    where_clauses.append("publication_date <= %s")
                    params.append(date_fin)

            where_sql = " AND ".join(where_clauses)

            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute(
                f"""
                SELECT id, url
                FROM joradp_documents
                WHERE {where_sql}
                """,
                params,
            )
            docs = cur.fetchall()
            if not docs:
                cur.close()
                conn.close()
                return jsonify({"success": True, "message": "Aucun document à télécharger", "downloaded": 0, "failed": 0, "total": 0})

            doc_ids = [d["id"] for d in docs]
            cur.execute(
                """
                UPDATE joradp_documents
                SET download_status = 'success',
                    downloaded_at = timezone('utc', now()),
                    error_log = NULL
                WHERE id = ANY(%s)
                """,
                (doc_ids,),
            )
            conn.commit()
            cur.close()
            conn.close()

            return jsonify({"success": True, "downloaded": len(doc_ids), "failed": 0, "total": len(doc_ids)})
        except Exception as exc:
            return jsonify({'error': str(exc)}), 500

    @app.route('/api/harvest/<int:session_id>/incremental', methods=['POST'])
    def incremental_harvest(session_id):
        """Moissonnage incrémental JORADP (Postgres)."""
        try:
            data = request.json or {}
            mode = data.get('mode', 'depuis_dernier')
            harvester = JORADPIncrementalHarvester(session_id)

            if mode == 'depuis_dernier':
                harvester.harvest_depuis_dernier()
            elif mode == 'entre_dates':
                date_debut = data.get('date_debut')
                date_fin = data.get('date_fin')
                if not date_debut or not date_fin:
                    return jsonify({'error': 'date_debut et date_fin requis'}), 400
                harvester.harvest_entre_dates(date_debut, date_fin)
            elif mode == 'depuis_numero':
                year = data.get('year')
                start_num = data.get('start_num')
                max_docs = data.get('max_docs', 100)
                if not year or not start_num:
                    return jsonify({'error': 'year et start_num requis'}), 400
                harvester.harvest_depuis_numero(year, start_num, max_docs)
            else:
                return jsonify({'error': 'Mode inconnu'}), 400

            result = {
                'success': True,
                'mode': mode,
                'found': harvester.stats['total_found']
            }
            if hasattr(harvester, 'last_doc_info') and harvester.last_doc_info:
                result['last_document'] = harvester.last_doc_info
            return jsonify(result)
        except Exception as exc:
            return jsonify({'error': str(exc)}), 500
