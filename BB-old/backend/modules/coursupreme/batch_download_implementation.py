# Code à ajouter dans routes.py

import sys
sys.path.append('../../harvesters')
from harvester_coursupreme import HarvesterCourSupreme

@coursupreme_bp.route('/batch/download', methods=['POST'])
def batch_download():
    """Télécharger plusieurs décisions"""
    from flask import request
    try:
        data = request.get_json()
        decision_ids = data.get('decision_ids', [])
        force = data.get('force', False)  # Forcer le re-téléchargement
        
        if not decision_ids:
            return jsonify({'error': 'Aucune décision spécifiée'}), 400
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Récupérer les décisions avec leur statut
        placeholders = ','.join('?' * len(decision_ids))
        cursor.execute(f"""
            SELECT id, decision_number, url, download_status, html_content_ar
            FROM supreme_court_decisions
            WHERE id IN ({placeholders})
        """, decision_ids)
        
        decisions = cursor.fetchall()
        
        # Séparer en déjà téléchargées vs à télécharger
        already_downloaded = []
        to_download = []
        
        for decision in decisions:
            dec_id, number, url, status, html = decision
            if html and status == 'completed' and not force:
                already_downloaded.append(number)
            else:
                to_download.append({'id': dec_id, 'number': number, 'url': url})
        
        # Si déjà téléchargées et pas de force, demander confirmation
        if already_downloaded and not force:
            conn.close()
            return jsonify({
                'needs_confirmation': True,
                'already_downloaded_count': len(already_downloaded),
                'to_download_count': len(to_download),
                'message': f'{len(already_downloaded)} décisions déjà téléchargées. Utiliser force=true pour re-télécharger.'
            })
        
        # Télécharger
        harvester = HarvesterCourSupreme(DB_PATH)
        results = {
            'success': [],
            'failed': [],
            'skipped': already_downloaded
        }
        
        for dec in to_download:
            try:
                print(f"Téléchargement {dec['number']}...")
                content = harvester.download_decision(dec['url'])
                
                if content:
                    # Mettre à jour la BDD
                    cursor.execute("""
                        UPDATE supreme_court_decisions
                        SET html_content_ar = ?,
                            download_status = 'completed',
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    """, (content.get('html_content_ar', ''), dec['id']))
                    
                    results['success'].append(dec['number'])
                else:
                    results['failed'].append(dec['number'])
                    
            except Exception as e:
                print(f"Erreur {dec['number']}: {e}")
                results['failed'].append(dec['number'])
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success_count': len(results['success']),
            'failed_count': len(results['failed']),
            'skipped_count': len(results['skipped']),
            'results': results,
            'message': f"✅ {len(results['success'])} téléchargées, ❌ {len(results['failed'])} échecs"
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

