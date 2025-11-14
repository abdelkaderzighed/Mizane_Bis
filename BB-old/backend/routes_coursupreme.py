"""
Routes API pour la Cour Suprême d'Algérie
"""
from flask import jsonify, request
import sqlite3

def register_coursupreme_routes(app):
    """Enregistrer les routes Cour Suprême"""
    
    def get_db():
        """Connexion à la base de données"""
        conn = sqlite3.connect('harvester.db')
        conn.row_factory = sqlite3.Row
        return conn
    
    @app.route('/api/sites/<int:site_id>/chambers', methods=['GET'])
    def get_chambers(site_id):
        """
        GET /api/sites/2/chambers
        Liste toutes les chambres de la Cour Suprême
        """
        if site_id != 2:
            return jsonify({'error': 'Site non supporté'}), 400
        
        conn = get_db()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT id, name_ar, name_fr, url, active, created_at
                FROM supreme_court_chambers
                WHERE active = 1
                ORDER BY id
            """)
            
            chambers = []
            for row in cursor.fetchall():
                chambers.append({
                    'id': row['id'],
                    'name_ar': row['name_ar'],
                    'name_fr': row['name_fr'],
                    'url': row['url'],
                    'active': row['active'],
                    'created_at': row['created_at']
                })
            
            return jsonify({
                'success': True,
                'count': len(chambers),
                'chambers': chambers
            })
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        finally:
            conn.close()
    
    @app.route('/api/chambers/<int:chamber_id>', methods=['GET'])
    def get_chamber(chamber_id):
        """
        GET /api/chambers/1
        Détails d'une chambre
        """
        conn = get_db()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT id, name_ar, name_fr, url, active, created_at
                FROM supreme_court_chambers
                WHERE id = ?
            """, (chamber_id,))
            
            row = cursor.fetchone()
            
            if not row:
                return jsonify({'error': 'Chambre non trouvée'}), 404
            
            # Compter les décisions
            cursor.execute("""
                SELECT COUNT(*) as count
                FROM supreme_court_decisions
                WHERE chamber_id = ?
            """, (chamber_id,))
            
            count_row = cursor.fetchone()
            decision_count = count_row['count'] if count_row else 0
            
            chamber = {
                'id': row['id'],
                'name_ar': row['name_ar'],
                'name_fr': row['name_fr'],
                'url': row['url'],
                'active': row['active'],
                'created_at': row['created_at'],
                'decision_count': decision_count
            }
            
            return jsonify({
                'success': True,
                'chamber': chamber
            })
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        finally:
            conn.close()
    
    @app.route('/api/chambers/<int:chamber_id>/decisions', methods=['GET'])
    def get_chamber_decisions(chamber_id):
        """
        GET /api/chambers/1/decisions?page=1&limit=20
        Liste des décisions d'une chambre
        """
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 20, type=int)
        offset = (page - 1) * limit
        
        conn = get_db()
        cursor = conn.cursor()
        
        try:
            # Compter le total
            cursor.execute("""
                SELECT COUNT(*) as total
                FROM supreme_court_decisions
                WHERE chamber_id = ?
            """, (chamber_id,))
            
            total = cursor.fetchone()['total']
            
            # Récupérer les décisions
            cursor.execute("""
                SELECT 
                    id, decision_number, decision_date,
                    object_fr, parties_fr, url,
                    download_status, created_at
                FROM supreme_court_decisions
                WHERE chamber_id = ?
                ORDER BY decision_date DESC, id DESC
                LIMIT ? OFFSET ?
            """, (chamber_id, limit, offset))
            
            decisions = []
            for row in cursor.fetchall():
                decisions.append({
                    'id': row['id'],
                    'decision_number': row['decision_number'],
                    'decision_date': row['decision_date'],
                    'object_fr': row['object_fr'],
                    'parties_fr': row['parties_fr'],
                    'url': row['url'],
                    'download_status': row['download_status'],
                    'created_at': row['created_at']
                })
            
            return jsonify({
                'success': True,
                'chamber_id': chamber_id,
                'total': total,
                'page': page,
                'limit': limit,
                'pages': (total + limit - 1) // limit,
                'decisions': decisions
            })
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        finally:
            conn.close()
