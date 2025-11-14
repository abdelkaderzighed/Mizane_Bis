import re

with open('routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

print("Remplacement de la route /batch/analyze stub...")

# Trouver et remplacer la route /batch/analyze
old_route = r"@coursupreme_bp\.route\('/batch/analyze', methods=\['POST'\]\)\ndef batch_analyze\(\):.*?except Exception as e:\s+return jsonify\(\{'error': str\(e\)\}\), 500"

new_route = '''@coursupreme_bp.route('/batch/analyze', methods=['POST'])
def batch_analyze():
    """Analyser plusieurs décisions avec OpenAI + extraction mots-clés"""
    from flask import request
    import os
    import json
    from openai import OpenAI
    from bs4 import BeautifulSoup
    
    try:
        data = request.get_json()
        decision_ids = data.get('decision_ids', [])
        force = data.get('force', False)
        
        if not decision_ids:
            return jsonify({'error': 'Aucune décision spécifiée'}), 400
        
        # Vérifier la clé API
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            return jsonify({'error': 'OPENAI_API_KEY non trouvée dans .env'}), 500
        
        client = OpenAI(api_key=api_key)
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Récupérer les décisions
        placeholders = ','.join('?' * len(decision_ids))
        cursor.execute(f"""
            SELECT id, decision_number, html_content_ar, html_content_fr, 
                   download_status, summary_ar, summary_fr
            FROM supreme_court_decisions
            WHERE id IN ({placeholders})
        """, decision_ids)
        
        decisions = cursor.fetchall()
        
        # Vérifier dépendances
        missing_download = []
        missing_translation = []
        already_analyzed = []
        to_analyze = []
        
        for dec in decisions:
            dec_id, number, html_ar, html_fr, dl_status, sum_ar, sum_fr = dec
            
            if not html_ar or dl_status != 'completed':
                missing_download.append(number)
            elif not html_fr:
                missing_translation.append(number)
            elif sum_ar and sum_fr and not force:
                already_analyzed.append(number)
            else:
                to_analyze.append({
                    'id': dec_id, 
                    'number': number, 
                    'html_ar': html_ar,
                    'html_fr': html_fr
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
        
        # Confirmation si déjà analysées
        if already_analyzed and not force:
            conn.close()
            return jsonify({
                'needs_confirmation': True,
                'already_analyzed_count': len(already_analyzed),
                'to_analyze_count': len(to_analyze),
                'message': f'{len(already_analyzed)} décisions déjà analysées. Voulez-vous les re-analyser ?'
            })
        
        # Analyser
        results = {
            'success': [],
            'failed': [],
            'skipped': already_analyzed
        }
        
        for dec in to_analyze:
            try:
                print(f"🤖 Analyse IA {dec['number']}...")
                
                # Extraire textes
                soup_ar = BeautifulSoup(dec['html_ar'], 'html.parser')
                text_ar = soup_ar.get_text(separator='\\n', strip=True)[:3000]
                
                soup_fr = BeautifulSoup(dec['html_fr'], 'html.parser')
                text_fr = soup_fr.get_text(separator='\\n', strip=True)[:3000]
                
                # Analyse AR
                ar_response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "Tu es un analyste juridique. Réponds UNIQUEMENT en JSON valide."},
                        {"role": "user", "content": f"""Analyse cette décision de justice en ARABE et retourne un JSON avec:
1. "summary": résumé en 3-4 lignes
2. "title": titre court et descriptif
3. "entities": liste d'objets {{"type": "person/institution/location/legal", "name": "..."}}
4. "keywords": liste de 5-8 mots-clés juridiques importants

Décision:
{text_ar}

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après."""}
                    ],
                    max_tokens=1000,
                    temperature=0.3
                )
                
                ar_json = json.loads(ar_response.choices[0].message.content.strip())
                
                # Analyse FR
                fr_response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "Tu es un analyste juridique. Réponds UNIQUEMENT en JSON valide."},
                        {"role": "user", "content": f"""Analyse cette décision de justice en FRANÇAIS et retourne un JSON avec:
1. "summary": résumé en 3-4 lignes
2. "title": titre court et descriptif
3. "entities": liste d'objets {{"type": "person/institution/location/legal", "name": "..."}}
4. "keywords": liste de 5-8 mots-clés juridiques importants

Décision:
{text_fr}

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après."""}
                    ],
                    max_tokens=1000,
                    temperature=0.3
                )
                
                fr_json = json.loads(fr_response.choices[0].message.content.strip())
                
                # Sauvegarder
                cursor.execute("""
                    UPDATE supreme_court_decisions
                    SET summary_ar = ?,
                        summary_fr = ?,
                        title_ar = ?,
                        title_fr = ?,
                        entities_ar = ?,
                        entities_fr = ?,
                        keywords_ar = ?,
                        keywords_fr = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (
                    ar_json.get('summary'),
                    fr_json.get('summary'),
                    ar_json.get('title'),
                    fr_json.get('title'),
                    json.dumps(ar_json.get('entities', []), ensure_ascii=False),
                    json.dumps(fr_json.get('entities', []), ensure_ascii=False),
                    json.dumps(ar_json.get('keywords', []), ensure_ascii=False),
                    json.dumps(fr_json.get('keywords', []), ensure_ascii=False),
                    dec['id']
                ))
                
                results['success'].append(dec['number'])
                print(f"   ✅ {dec['number']} analysée")
                
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
            'message': f"✅ {len(results['success'])} analysées, ❌ {len(results['failed'])} échecs"
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500'''

content = re.sub(old_route, new_route, content, flags=re.DOTALL)

with open('routes.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Route /batch/analyze remplacée avec extraction de mots-clés")
