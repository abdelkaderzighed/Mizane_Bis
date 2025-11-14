import re

with open('routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

print("Ajout de la route /batch/translate...")

# Trouver où insérer (après batch/download)
insert_position = content.find("@coursupreme_bp.route('/batch/analyze'")

if insert_position == -1:
    print("❌ Route /batch/analyze non trouvée")
    exit(1)

new_route = '''
@coursupreme_bp.route('/batch/translate', methods=['POST'])
def batch_translate():
    """Traduire plusieurs décisions AR -> FR avec OpenAI"""
    from flask import request
    import os
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
            SELECT id, decision_number, html_content_ar, html_content_fr, download_status
            FROM supreme_court_decisions
            WHERE id IN ({placeholders})
        """, decision_ids)
        
        decisions = cursor.fetchall()
        
        # Vérifier les dépendances et statuts
        missing_download = []
        already_translated = []
        to_translate = []
        
        for dec in decisions:
            dec_id, number, html_ar, html_fr, dl_status = dec
            
            # Vérifier si téléchargée
            if not html_ar or dl_status != 'completed':
                missing_download.append(number)
            # Vérifier si déjà traduite
            elif html_fr and not force:
                already_translated.append(number)
            else:
                to_translate.append({'id': dec_id, 'number': number, 'html_ar': html_ar})
        
        # Erreurs de dépendance
        if missing_download:
            conn.close()
            return jsonify({
                'error': 'Dépendances manquantes',
                'missing_download': missing_download,
                'message': f'{len(missing_download)} décisions doivent être téléchargées avant traduction'
            }), 400
        
        # Confirmation si déjà traduites
        if already_translated and not force:
            conn.close()
            return jsonify({
                'needs_confirmation': True,
                'already_translated_count': len(already_translated),
                'to_translate_count': len(to_translate),
                'message': f'{len(already_translated)} décisions déjà traduites. Voulez-vous les re-traduire ?'
            })
        
        # Traduire
        results = {
            'success': [],
            'failed': [],
            'skipped': already_translated
        }
        
        for dec in to_translate:
            try:
                print(f"🌐 Traduction {dec['number']}...")
                
                # Extraire le texte du HTML
                soup = BeautifulSoup(dec['html_ar'], 'html.parser')
                text_ar = soup.get_text(separator='\\n', strip=True)
                
                # Limiter à 3000 caractères pour ne pas dépasser les tokens
                text_to_translate = text_ar[:3000]
                
                # Traduire avec OpenAI
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "Tu es un traducteur juridique professionnel. Traduis le texte arabe en français en conservant la structure et la terminologie juridique."},
                        {"role": "user", "content": f"Traduis cette décision de justice:\\n\\n{text_to_translate}"}
                    ],
                    max_tokens=2000,
                    temperature=0.3
                )
                
                text_fr = response.choices[0].message.content.strip()
                
                # Recréer le HTML avec le texte traduit
                html_fr = f"<article>{text_fr}</article>"
                
                # Sauvegarder
                cursor.execute("""
                    UPDATE supreme_court_decisions
                    SET html_content_fr = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (html_fr, dec['id']))
                
                results['success'].append(dec['number'])
                print(f"   ✅ {dec['number']} traduite")
                
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
            'message': f"✅ {len(results['success'])} traduites, ❌ {len(results['failed'])} échecs"
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

'''

# Insérer avant @coursupreme_bp.route('/batch/analyze'
content = content[:insert_position] + new_route + content[insert_position:]

with open('routes.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Route /batch/translate ajoutée")
