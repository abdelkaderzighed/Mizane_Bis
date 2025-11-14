import re

with open('routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Trouver et remplacer la route /batch/download
old_route = r"@coursupreme_bp\.route\('/batch/download', methods=\['POST'\]\)\ndef batch_download\(\):.*?except Exception as e:\s+return jsonify\(\{'error': str\(e\)\}\), 500"

new_route = """@coursupreme_bp.route('/batch/download', methods=['POST'])
def batch_download():
    \"\"\"Télécharger plusieurs décisions\"\"\"
    from flask import request
    import sys
    import os
    sys.path.append(os.path.join(os.path.dirname(__file__), '../../harvesters'))
    from harvester_coursupreme import HarvesterCourSupreme
    
    try:
        data = request.get_json()
        decision_ids = data.get('decision_ids', [])
        force = data.get('force', False)
        
        if not decision_ids:
            return jsonify({'error': 'Aucune décision spécifiée'}), 400
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Récupérer les décisions avec leur statut
        placeholders = ','.join('?' * len(decision_ids))
        cursor.execute(f\"\"\"
            SELECT id, decision_number, url, download_status, html_content_ar
            FROM supreme_court_decisions
            WHERE id IN ({placeholders})
        \"\"\", decision_ids)
        
        decisions = cursor.fetchall()
        
        # Séparer déjà téléchargées vs à télécharger
        already_downloaded = []
        to_download = []
        
        for decision in decisions:
            dec_id, number, url, status, html = decision
            if html and status == 'completed' and not force:
                already_downloaded.append(number)
            else:
                to_download.append({'id': dec_id, 'number': number, 'url': url})
        
        # Si déjà téléchargées sans force, demander confirmation
        if already_downloaded and not force:
            conn.close()
            return jsonify({
                'needs_confirmation': True,
                'already_downloaded_count': len(already_downloaded),
                'to_download_count': len(to_download),
                'message': f'{len(already_downloaded)} décisions déjà téléchargées. Voulez-vous les re-télécharger ?'
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
                print(f"📥 Téléchargement {dec['number']}...")
                content_dict = harvester.download_decision(dec['url'])
                
                if content_dict and 'html_content_ar' in content_dict:
                    cursor.execute(\"\"\"
                        UPDATE supreme_court_decisions
                        SET html_content_ar = ?,
                            download_status = 'completed',
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    \"\"\", (content_dict['html_content_ar'], dec['id']))
                    
                    results['success'].append(dec['number'])
                    print(f"   ✅ {dec['number']} téléchargée")
                else:
                    results['failed'].append(dec['number'])
                    print(f"   ❌ {dec['number']} échec")
                    
            except Exception as e:
                print(f"   ❌ Erreur {dec['number']}: {e}")
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
        return jsonify({'error': str(e)}), 500"""

content = re.sub(old_route, new_route, content, flags=re.DOTALL)

with open('routes.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Route /batch/download remplacée")
