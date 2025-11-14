import re

with open('routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

print("Remplacement de la route /batch/embed stub...")

# Trouver et remplacer le stub
old_route = r"@coursupreme_bp\.route\('/batch/embed', methods=\['POST'\]\)\ndef batch_embed\(\):.*?except Exception as e:\s+return jsonify\(\{'error': str\(e\)\}\), 500"

new_route = '''@coursupreme_bp.route('/batch/embed', methods=['POST'])
def batch_embed():
    """Générer embeddings pour plusieurs décisions avec SentenceTransformer"""
    from flask import request
    from sentence_transformers import SentenceTransformer
    from bs4 import BeautifulSoup
    import numpy as np
    
    try:
        data = request.get_json()
        decision_ids = data.get('decision_ids', [])
        force = data.get('force', False)
        
        if not decision_ids:
            return jsonify({'error': 'Aucune décision spécifiée'}), 400
        
        # Initialiser le modèle d'embedding
        print("🧬 Chargement du modèle d'embedding...")
        embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Récupérer les décisions
        placeholders = ','.join('?' * len(decision_ids))
        cursor.execute(f"""
            SELECT id, decision_number, html_content_ar, html_content_fr, 
                   download_status, summary_fr, embedding
            FROM supreme_court_decisions
            WHERE id IN ({placeholders})
        """, decision_ids)
        
        decisions = cursor.fetchall()
        
        # Vérifier dépendances
        missing_download = []
        missing_translation = []
        already_embedded = []
        to_embed = []
        
        for dec in decisions:
            dec_id, number, html_ar, html_fr, dl_status, sum_fr, embedding = dec
            
            if not html_ar or dl_status != 'completed':
                missing_download.append(number)
            elif not html_fr:
                missing_translation.append(number)
            elif embedding and not force:
                already_embedded.append(number)
            else:
                to_embed.append({
                    'id': dec_id, 
                    'number': number, 
                    'html_fr': html_fr,
                    'summary_fr': sum_fr
                })
        
        # Erreurs de dépendance
        if missing_download:
            conn.close()
            return jsonify({
                'error': 'Dépendances manquantes',
                'missing_download': missing_download,
                'message': f'{len(missing_download)} décisions doivent être téléchargées'
            }), 400
        
        if missing_translation:
            conn.close()
            return jsonify({
                'error': 'Dépendances manquantes',
                'missing_translation': missing_translation,
                'message': f'{len(missing_translation)} décisions doivent être traduites'
            }), 400
        
        # Confirmation si déjà embeddings
        if already_embedded and not force:
            conn.close()
            return jsonify({
                'needs_confirmation': True,
                'already_embedded_count': len(already_embedded),
                'to_embed_count': len(to_embed),
                'message': f'{len(already_embedded)} décisions ont déjà des embeddings. Voulez-vous les régénérer ?'
            })
        
        # Générer embeddings
        results = {
            'success': [],
            'failed': [],
            'skipped': already_embedded
        }
        
        for dec in to_embed:
            try:
                print(f"🧬 Génération embedding {dec['number']}...")
                
                # Utiliser le résumé FR si disponible, sinon le texte complet
                if dec['summary_fr']:
                    text_to_embed = dec['summary_fr']
                else:
                    soup = BeautifulSoup(dec['html_fr'], 'html.parser')
                    text_to_embed = soup.get_text(separator=' ', strip=True)[:5000]
                
                # Générer l'embedding
                embedding_vector = embedding_model.encode(text_to_embed)
                embedding_bytes = embedding_vector.tobytes()
                
                # Sauvegarder
                cursor.execute("""
                    UPDATE supreme_court_decisions
                    SET embedding = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (embedding_bytes, dec['id']))
                
                results['success'].append(dec['number'])
                print(f"   ✅ {dec['number']} embedding généré ({len(embedding_bytes)} bytes)")
                
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
            'message': f"✅ {len(results['success'])} embeddings générés, ❌ {len(results['failed'])} échecs"
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500'''

content = re.sub(old_route, new_route, content, flags=re.DOTALL)

with open('routes.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Route /batch/embed remplacée avec SentenceTransformer")
