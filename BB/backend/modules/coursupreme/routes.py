from __future__ import annotations
from flask import Blueprint, jsonify, request, send_file, Response
import sqlite3
import sys
from pathlib import Path
import requests

from shared.r2_storage import (
    generate_presigned_url,
    build_public_url,
    get_r2_client,
    get_bucket_name,
    normalize_key,
    R2ConfigurationError,
)

coursupreme_bp = Blueprint('coursupreme', __name__)
DB_PATH = 'harvester.db'

HARVESTERS_DIR = Path(__file__).resolve().parents[2] / 'harvesters'
if str(HARVESTERS_DIR) not in sys.path:
    sys.path.append(str(HARVESTERS_DIR))


def _build_access_url(raw_path: str | None) -> str | None:
    if not raw_path:
        return None
    return generate_presigned_url(raw_path) or build_public_url(raw_path)


def _fetch_text_from_r2(raw_path: str | None, fallback: str | None = None) -> str | None:
    url = _build_access_url(raw_path)
    if not url:
        return fallback
    try:
        resp = requests.get(url, timeout=30)
        if resp.ok:
            resp.encoding = 'utf-8'
            return resp.text
    except Exception as exc:
        print(f"⚠️ Impossible de charger {raw_path}: {exc}")
    return fallback


def _delete_r2_object(raw_path: str | None) -> bool:
    if not raw_path:
        return False
    try:
        client = get_r2_client()
        key = normalize_key(raw_path)
        if not key:
            return False
        bucket = get_bucket_name()
        client.delete_object(Bucket=bucket, Key=key)
        return True
    except R2ConfigurationError:
        return False
    except Exception as exc:
        print(f"⚠️ Impossible de supprimer {raw_path} de R2: {exc}")
        return False

@coursupreme_bp.route('/chambers', methods=['GET'])
def get_chambers():
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT c.id, c.name_ar, c.name_fr,
                   COUNT(DISTINCT sct.id) as theme_count,
                   COUNT(DISTINCT scd.id) as decision_count
            FROM supreme_court_chambers c
            LEFT JOIN supreme_court_themes sct ON c.id = sct.chamber_id
            LEFT JOIN supreme_court_decision_classifications scdc ON sct.id = scdc.theme_id
            LEFT JOIN supreme_court_decisions scd ON scdc.decision_id = scd.id
            GROUP BY c.id
        """)
        chambers = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify({'chambers': chambers})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@coursupreme_bp.route('/collect', methods=['POST'])
def collect_decisions():
    """Relancer la collecte incrémentale (optionnellement ciblée sur une chambre)"""
    try:
        from harvester_coursupreme_v4_intelligent import HarvesterCourSupremeV4Intelligent

        data = request.get_json() or {}
        chamber_id = data.get('chamber_id')

        db_path = Path(DB_PATH).resolve()
        harvester = HarvesterCourSupremeV4Intelligent(db_path=str(db_path))

        if chamber_id:
            result = harvester.harvest_section(chamber_id)
            return jsonify({
                'success': True,
                'mode': 'section',
                'chamber_id': chamber_id,
                'result': result
            })

        stats = harvester.harvest_incremental()
        return jsonify({
            'success': True,
            'mode': 'incremental',
            'stats': stats
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@coursupreme_bp.route('/chambers/<int:chamber_id>/themes', methods=['GET'])
def get_themes(chamber_id):
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT t.id, t.name_ar, t.name_fr,
                   COUNT(DISTINCT scdc.decision_id) as decision_count
            FROM supreme_court_themes t
            LEFT JOIN supreme_court_decision_classifications scdc ON t.id = scdc.theme_id
            WHERE t.chamber_id = ?
            GROUP BY t.id
        """, (chamber_id,))
        themes = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify({'themes': themes})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@coursupreme_bp.route('/themes/<int:theme_id>/decisions', methods=['GET'])
def get_decisions(theme_id):
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT d.id, d.decision_number, d.decision_date, d.object_ar, d.url
            FROM supreme_court_decisions d
            JOIN supreme_court_decision_classifications c ON d.id = c.decision_id
            WHERE c.theme_id = ?
            ORDER BY d.decision_date DESC
        """, (theme_id,))
        decisions = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify({'decisions': decisions})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@coursupreme_bp.route('/decisions/<int:decision_id>', methods=['GET'])
def get_decision(decision_id):
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, decision_number, decision_date, 
                   object_ar, object_fr, url,
                   file_path_ar, file_path_fr,
                   html_content_ar, html_content_fr,
                   arguments_ar, arguments_fr,
                   legal_reference_ar, legal_reference_fr,
                   parties_ar, parties_fr,
                   court_response_ar, court_response_fr,
                   president, rapporteur,
                   title_ar, title_fr, summary_ar, summary_fr,
                   entities_ar, entities_fr
            FROM supreme_court_decisions WHERE id = ?
        ''', (decision_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            decision = dict(row)
            
            html_ar = decision.pop('html_content_ar', None)
            html_fr = decision.pop('html_content_fr', None)
            decision['content_ar'] = _fetch_text_from_r2(decision.get('file_path_ar'), html_ar)
            decision['content_fr'] = _fetch_text_from_r2(decision.get('file_path_fr'), html_fr)
            
            # Nettoyer les champs inutiles
            decision.pop('html_content_ar', None)
            decision.pop('html_content_fr', None)
            decision.pop('file_path_ar', None)
            decision.pop('file_path_fr', None)
            
            return jsonify(decision)
        return jsonify({'error': 'Not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@coursupreme_bp.route('/metadata/<int:decision_id>', methods=['GET'])
def get_metadata(decision_id):
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT decision_number, decision_date,
                   summary_ar, summary_fr, title_ar, title_fr,
                   entities_ar, entities_fr,
                   file_path_ar, file_path_fr,
                   html_content_ar, html_content_fr
            FROM supreme_court_decisions WHERE id = ?
        """, (decision_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            decision = dict(row)
            
            # Lire les contenus depuis les fichiers texte
            html_ar = decision.pop('html_content_ar', None)
            html_fr = decision.pop('html_content_fr', None)
            decision['content_ar'] = _fetch_text_from_r2(decision.get('file_path_ar'), html_ar)
            decision['content_fr'] = _fetch_text_from_r2(decision.get('file_path_fr'), html_fr)
            
            # Nettoyer les champs inutiles
            decision.pop('html_content_ar', None)
            decision.pop('html_content_fr', None)
            decision.pop('file_path_ar', None)
            decision.pop('file_path_fr', None)
            
            return jsonify(decision)
        return jsonify({'error': 'Not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@coursupreme_bp.route('/search', methods=['GET'])
def search():
    from flask import request
    query = request.args.get('q', '')
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, decision_number, decision_date, object_ar
            FROM supreme_court_decisions
            WHERE decision_number LIKE ? OR decision_date LIKE ? OR object_ar LIKE ?
            LIMIT 50
        """, (f'%{query}%', f'%{query}%', f'%{query}%'))
        results = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify({'results': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@coursupreme_bp.route('/decisions/<int:decision_id>', methods=['DELETE'])
def delete_decision(decision_id):
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Récupérer les chemins des fichiers AVANT suppression
        cursor.execute("SELECT file_path_ar, file_path_fr FROM supreme_court_decisions WHERE id = ?", (decision_id,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return jsonify({'error': 'Décision non trouvée'}), 404
        
        file_ar = row['file_path_ar']
        file_fr = row['file_path_fr']
        
        # Supprimer de la BD
        cursor.execute("DELETE FROM supreme_court_decisions WHERE id = ?", (decision_id,))
        conn.commit()
        conn.close()
        
        # Supprimer les objets R2
        deleted_files = []
        if file_ar and _delete_r2_object(file_ar):
            deleted_files.append(file_ar)
        
        if file_fr and _delete_r2_object(file_fr):
            deleted_files.append(file_fr)
        
        return jsonify({
            'message': 'Décision et fichiers supprimés',
            'deleted_files': deleted_files
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================================
# ROUTE DE GESTION DES DÉCISIONS - Vue de statut complète
# ============================================================================

@coursupreme_bp.route('/decisions/status', methods=['GET'])
def get_decisions_status():
    """Récupérer toutes les décisions avec leur statut de complétion détaillé"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Récupérer toutes les décisions avec leurs statuts
        cursor.execute("""
            SELECT
                d.id,
                d.decision_number,
                d.decision_date,
                d.url,
                d.file_path_ar,
                d.file_path_fr,
                d.html_content_ar,
                d.html_content_fr,
                d.title_ar,
                d.title_fr,
                d.summary_ar,
                d.summary_fr,
                d.keywords_ar,
                d.keywords_fr,
                d.entities_ar,
                d.entities_fr,
                d.embedding_ar,
                d.embedding_fr
            FROM supreme_court_decisions d
            ORDER BY d.decision_date DESC, d.decision_number DESC
        """)

        decisions_raw = cursor.fetchall()
        decisions = []

        for row in decisions_raw:
            dec = dict(row)

            has_file_ar = bool(dec['file_path_ar'])
            has_html_ar = bool(dec['html_content_ar'])
            has_file_fr = bool(dec['file_path_fr'])
            has_html_fr = bool(dec['html_content_fr'])

            downloaded_status = 'complete' if (has_file_ar or has_html_ar) else 'missing'
            translated_status = 'complete' if (has_file_fr or has_html_fr) else 'missing'

            # Calcul du statut "analyzed"
            has_title_ar = bool(dec['title_ar'])
            has_title_fr = bool(dec['title_fr'])
            has_summary_ar = bool(dec['summary_ar'])
            has_summary_fr = bool(dec['summary_fr'])
            has_keywords_ar = bool(dec['keywords_ar'])
            has_keywords_fr = bool(dec['keywords_fr'])
            has_entities_ar = bool(dec['entities_ar'])
            has_entities_fr = bool(dec['entities_fr'])

            analyzed_ar = has_title_ar and has_summary_ar and has_keywords_ar and has_entities_ar
            analyzed_fr = has_title_fr and has_summary_fr and has_keywords_fr and has_entities_fr

            if analyzed_ar and analyzed_fr:
                analyzed_status = 'complete'
            elif analyzed_ar or analyzed_fr or has_title_ar or has_title_fr:
                analyzed_status = 'partial'
            else:
                analyzed_status = 'missing'

            # Calcul du statut "embeddings"
            has_embedding_ar = bool(dec['embedding_ar'])
            has_embedding_fr = bool(dec['embedding_fr'])

            if has_embedding_ar and has_embedding_fr:
                embeddings_status = 'complete'
            elif has_embedding_ar or has_embedding_fr:
                embeddings_status = 'partial'
            else:
                embeddings_status = 'missing'

            # Récupérer les chambres et thèmes
            cursor.execute("""
                SELECT DISTINCT c.name_fr, c.name_ar
                FROM supreme_court_chambers c
                JOIN supreme_court_decision_classifications dc ON c.id = dc.chamber_id
                WHERE dc.decision_id = ?
            """, (dec['id'],))
            chambers_raw = cursor.fetchall()
            chambers = [{'name_fr': c['name_fr'], 'name_ar': c['name_ar']} for c in chambers_raw]

            cursor.execute("""
                SELECT DISTINCT t.name_fr, t.name_ar
                FROM supreme_court_themes t
                JOIN supreme_court_decision_classifications dc ON t.id = dc.theme_id
                WHERE dc.decision_id = ?
            """, (dec['id'],))
            themes_raw = cursor.fetchall()
            themes = [{'name_fr': t['name_fr'], 'name_ar': t['name_ar']} for t in themes_raw]

            # Construire l'objet décision
            decisions.append({
                'id': dec['id'],
                'decision_number': dec['decision_number'],
                'decision_date': dec['decision_date'],
                'url': dec['url'],
                'status': {
                    'downloaded': downloaded_status,
                    'translated': translated_status,
                    'analyzed': analyzed_status,
                    'embeddings': embeddings_status
                },
                'chambers': chambers,
                'themes': themes
            })

        conn.close()

        return jsonify({
            'decisions': decisions,
            'count': len(decisions)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================================
# ROUTES BATCH - Actions groupées
# ============================================================================

@coursupreme_bp.route('/batch/status', methods=['POST'])
def batch_status():
    """Obtenir le statut de plusieurs décisions"""
    from flask import request
    try:
        data = request.get_json()
        decision_ids = data.get('decision_ids', [])
        
        if not decision_ids:
            return jsonify({'error': 'Aucune décision spécifiée'}), 400
        
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        placeholders = ','.join('?' * len(decision_ids))
        cursor.execute(f"""
            SELECT id, decision_number, download_status,
                   file_path_ar, file_path_fr,
                   title_ar IS NOT NULL as analyzed,
                   embedding IS NOT NULL as has_embedding
            FROM supreme_court_decisions
            WHERE id IN ({placeholders})
        """, decision_ids)
        
        statuses = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return jsonify({'statuses': statuses})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@coursupreme_bp.route('/batch/download', methods=['POST'])
def batch_download():
    """Télécharger plusieurs décisions"""
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
        cursor.execute(f"""
            SELECT id, decision_number, url, download_status, html_content_ar
            FROM supreme_court_decisions
            WHERE id IN ({placeholders})
        """, decision_ids)
        
        decisions = cursor.fetchall()
        
        # Séparer déjà téléchargées vs à télécharger
        already_downloaded = []
        to_download = []
        
        for decision in decisions:
            dec_id, number, url, status, html = decision
            if html and status in ('downloaded', 'completed') and not force:
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
                    cursor.execute("""
                        UPDATE supreme_court_decisions
                        SET html_content_ar = ?,
                            download_status = 'downloaded',
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    """, (content_dict['html_content_ar'], dec['id']))
                    
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
        return jsonify({'error': str(e)}), 500


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
            SELECT id, decision_number, html_content_ar, html_content_fr, download_status,
                   file_path_ar, file_path_fr
            FROM supreme_court_decisions
            WHERE id IN ({placeholders})
        """, decision_ids)
        
        decisions = cursor.fetchall()
        
        # Vérifier les dépendances et statuts
        missing_download = []
        already_translated = []
        to_translate = []
        
        for dec in decisions:
            dec_id, number, html_ar, html_fr, dl_status, file_ar, file_fr = dec

            available_ar = bool(html_ar) or (file_ar and file_exists(file_ar))
            available_fr = bool(html_fr) or (file_fr and file_exists(file_fr))

            if not available_ar or dl_status not in ('downloaded', 'completed'):
                missing_download.append(number)
            elif available_fr and not force:
                already_translated.append(number)
            else:
                to_translate.append({
                    'id': dec_id,
                    'number': number,
                    'html_ar': html_ar,
                    'file_path_ar': file_ar
                })
        
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

                html_content = load_html_content(dec.get('html_ar'), dec.get('file_path_ar'))
                if not html_content:
                    raise ValueError("Contenu AR introuvable (ni en base, ni sur disque)")

                # Extraire le texte du HTML
                soup = BeautifulSoup(html_content, 'html.parser')
                text_ar = soup.get_text(separator='\\n', strip=True)
                
                # Limiter à 3000 caractères pour ne pas dépasser les tokens
                text_to_translate = text_ar[:3000]
                
                # Traduire avec OpenAI
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "Tu es un traducteur juridique professionnel. Traduis le texte arabe en français en conservant la structure et la terminologie juridique."},
                        {"role": "user", "content": f"Traduis cette décision de justice:\n\n{text_to_translate}"}
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

@coursupreme_bp.route('/batch/analyze', methods=['POST'])
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
                   download_status, summary_ar, summary_fr,
                   file_path_ar, file_path_fr
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
            dec_id, number, html_ar, html_fr, dl_status, sum_ar, sum_fr, file_ar, file_fr = dec

            available_ar = bool(html_ar) or (file_ar and file_exists(file_ar))
            available_fr = bool(html_fr) or (file_fr and file_exists(file_fr))

            if not available_ar or dl_status not in ('downloaded', 'completed'):
                missing_download.append(number)
            elif not available_fr:
                missing_translation.append(number)
            elif sum_ar and sum_fr and not force:
                already_analyzed.append(number)
            else:
                to_analyze.append({
                    'id': dec_id,
                    'number': number,
                    'html_ar': html_ar,
                    'html_fr': html_fr,
                    'file_path_ar': file_ar,
                    'file_path_fr': file_fr
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

                html_ar = load_html_content(dec.get('html_ar'), dec.get('file_path_ar'))
                html_fr = load_html_content(dec.get('html_fr'), dec.get('file_path_fr'))
                if not html_ar or not html_fr:
                    raise ValueError("Contenu AR/FR introuvable pour l'analyse")

                # Extraire textes
                soup_ar = BeautifulSoup(html_ar, 'html.parser')
                text_ar = soup_ar.get_text(separator='\n', strip=True)[:3000]

                soup_fr = BeautifulSoup(html_fr, 'html.parser')
                text_fr = soup_fr.get_text(separator='\n', strip=True)[:3000]
                
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
                
                ar_content = ar_response.choices[0].message.content.strip()
                ar_content = ar_content.replace('```json', '').replace('```', '').strip()
                ar_json = json.loads(ar_content)
                
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
                
                fr_content = fr_response.choices[0].message.content.strip()
                fr_content = fr_content.replace('```json', '').replace('```', '').strip()
                fr_json = json.loads(fr_content)
                
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
        return jsonify({'error': str(e)}), 500

@coursupreme_bp.route('/batch/embed', methods=['POST'])
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
                   download_status, summary_ar, summary_fr, embedding_ar, embedding_fr,
                   file_path_ar, file_path_fr
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
            dec_id, number, html_ar, html_fr, dl_status, sum_ar, sum_fr, embedding_ar, embedding_fr, file_ar, file_fr = dec

            available_ar = bool(html_ar) or (file_ar and file_exists(file_ar))
            available_fr = bool(html_fr) or (file_fr and file_exists(file_fr))

            if not available_ar or dl_status not in ('downloaded', 'completed'):
                missing_download.append(number)
            elif not available_fr:
                missing_translation.append(number)
            elif embedding_ar and embedding_fr and not force:
                already_embedded.append(number)
            else:
                to_embed.append({
                    'id': dec_id,
                    'number': number,
                    'html_fr': html_fr,
                    'html_ar': html_ar,
                    'file_path_ar': file_ar,
                    'file_path_fr': file_fr,
                    'summary_ar': sum_ar,
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
                
                # Texte FR priorisant le résumé
                if dec['summary_fr']:
                    text_fr = dec['summary_fr'][:5000]
                else:
                    html_fr = load_html_content(dec.get('html_fr'), dec.get('file_path_fr'))
                    if not html_fr:
                        raise ValueError("Contenu FR introuvable pour générer l'embedding")
                    soup_fr = BeautifulSoup(html_fr, 'html.parser')
                    text_fr = soup_fr.get_text(separator=' ', strip=True)[:5000]

                # Texte AR
                if dec['summary_ar']:
                    text_ar = dec['summary_ar'][:5000]
                else:
                    html_ar = load_html_content(dec.get('html_ar'), dec.get('file_path_ar'))
                    if not html_ar:
                        raise ValueError("Contenu AR introuvable pour générer l'embedding")
                    soup_ar = BeautifulSoup(html_ar, 'html.parser')
                    text_ar = soup_ar.get_text(separator=' ', strip=True)[:5000]
                
                # Générer les embeddings
                embedding_vector_fr = embedding_model.encode(text_fr)
                embedding_vector_ar = embedding_model.encode(text_ar)
                embedding_bytes_fr = embedding_vector_fr.tobytes()
                embedding_bytes_ar = embedding_vector_ar.tobytes()
                
                # Sauvegarder
                cursor.execute("""
                    UPDATE supreme_court_decisions
                    SET embedding_fr = ?,
                        embedding_ar = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (embedding_bytes_fr, embedding_bytes_ar, dec['id']))
                
                results['success'].append(dec['number'])
                print(f"   ✅ {dec['number']} embeddings générés (FR: {len(embedding_bytes_fr)} bytes, AR: {len(embedding_bytes_ar)} bytes)")
                
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
        return jsonify({'error': str(e)}), 500

# ============================================================================
# ROUTES POUR SÉLECTION EN CASCADE - Récupération rapide des IDs
# ============================================================================

@coursupreme_bp.route('/chambers/<int:chamber_id>/all-decision-ids', methods=['GET'])
def get_chamber_all_decision_ids(chamber_id):
    """Récupérer tous les IDs des décisions d'une chambre (pour sélection en cascade)"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Récupérer tous les IDs des décisions de cette chambre
        cursor.execute("""
            SELECT DISTINCT d.id
            FROM supreme_court_decisions d
            JOIN supreme_court_decision_classifications dc ON d.id = dc.decision_id
            WHERE dc.chamber_id = ?
            ORDER BY d.id
        """, (chamber_id,))
        
        decision_ids = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        return jsonify({
            'chamber_id': chamber_id,
            'decision_ids': decision_ids,
            'count': len(decision_ids)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@coursupreme_bp.route('/themes/<int:theme_id>/all-decision-ids', methods=['GET'])
def get_theme_all_decision_ids(theme_id):
    """Récupérer tous les IDs des décisions d'un thème (pour sélection en cascade)"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Récupérer tous les IDs des décisions de ce thème
        cursor.execute("""
            SELECT DISTINCT d.id
            FROM supreme_court_decisions d
            JOIN supreme_court_decision_classifications dc ON d.id = dc.decision_id
            WHERE dc.theme_id = ?
            ORDER BY d.id
        """, (theme_id,))
        
        decision_ids = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        return jsonify({
            'theme_id': theme_id,
            'decision_ids': decision_ids,
            'count': len(decision_ids)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@coursupreme_bp.route('/all-decision-ids', methods=['GET'])
def get_all_decision_ids():
    """Récupérer tous les IDs de toutes les décisions (pour 'Tout sélectionner')"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM supreme_court_decisions ORDER BY id")
        decision_ids = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        return jsonify({
            'decision_ids': decision_ids,
            'count': len(decision_ids)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@coursupreme_bp.route('/chambers/<int:chamber_id>/all-ids', methods=['GET'])
def get_chamber_all_ids(chamber_id):
    """Récupérer tous les IDs (thèmes + décisions) d'une chambre"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Récupérer les IDs des thèmes
        cursor.execute("""
            SELECT DISTINCT theme_id
            FROM supreme_court_decision_classifications
            WHERE chamber_id = ?
        """, (chamber_id,))
        theme_ids = [row[0] for row in cursor.fetchall()]
        
        # Récupérer les IDs des décisions
        cursor.execute("""
            SELECT DISTINCT decision_id
            FROM supreme_court_decision_classifications
            WHERE chamber_id = ?
        """, (chamber_id,))
        decision_ids = [row[0] for row in cursor.fetchall()]
        
        conn.close()
        
        return jsonify({
            'chamber_id': chamber_id,
            'theme_ids': theme_ids,
            'decision_ids': decision_ids,
            'theme_count': len(theme_ids),
            'decision_count': len(decision_ids)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@coursupreme_bp.route('/search/advanced', methods=['GET'])
def advanced_search():
    """Recherche avancée avec keywords inclusifs/exclusifs et dates"""
    from flask import request

    keywords_inc = request.args.get('keywords_inc', '')
    keywords_exc = request.args.get('keywords_exc', '')
    decision_number = request.args.get('decision_number', '')
    date_from = request.args.get('date_from', '')
    date_to = request.args.get('date_to', '')

    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Construire la requête dynamiquement
        where_clauses = []
        params = []

        # Keywords inclusifs (tous doivent être présents)
        if keywords_inc:
            keywords_list = [kw.strip() for kw in keywords_inc.split(',') if kw.strip()]
            for kw in keywords_list:
                where_clauses.append("(object_ar LIKE ? OR object_fr LIKE ? OR summary_ar LIKE ? OR summary_fr LIKE ?)")
                params.extend([f'%{kw}%', f'%{kw}%', f'%{kw}%', f'%{kw}%'])

        # Keywords exclusifs (aucun ne doit être présent)
        if keywords_exc:
            keywords_list = [kw.strip() for kw in keywords_exc.split(',') if kw.strip()]
            for kw in keywords_list:
                where_clauses.append("(object_ar NOT LIKE ? AND object_fr NOT LIKE ? AND summary_ar NOT LIKE ? AND summary_fr NOT LIKE ?)")
                params.extend([f'%{kw}%', f'%{kw}%', f'%{kw}%', f'%{kw}%'])

        # Numéro de décision
        if decision_number:
            where_clauses.append("decision_number LIKE ?")
            params.append(f'%{decision_number}%')

        # Dates
        if date_from:
            where_clauses.append("decision_date >= ?")
            params.append(date_from)
        if date_to:
            where_clauses.append("decision_date <= ?")
            params.append(date_to)

        # Construire la requête SQL
        where_sql = ' AND '.join(where_clauses) if where_clauses else '1=1'

        query = f"""
            SELECT id, decision_number, decision_date, object_ar, object_fr, url
            FROM supreme_court_decisions
            WHERE {where_sql}
            ORDER BY decision_date DESC
            LIMIT 100
        """

        cursor.execute(query, params)
        results = [dict(row) for row in cursor.fetchall()]
        conn.close()

        return jsonify({'results': results, 'count': len(results)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@coursupreme_bp.route('/stats', methods=['GET'])
def get_global_stats():
    """Récupérer les statistiques globales pour Cour Suprême"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Total de décisions
        cursor.execute("SELECT COUNT(*) as total FROM supreme_court_decisions")
        total = cursor.fetchone()['total']

        # Décisions téléchargées (HTML arabe)
        cursor.execute("""
            SELECT COUNT(*) as downloaded
            FROM supreme_court_decisions
            WHERE download_status IN ('downloaded', 'completed')
        """)
        downloaded = cursor.fetchone()['downloaded']

        # Décisions traduites (HTML français)
        cursor.execute("""
            SELECT COUNT(*) as translated
            FROM supreme_court_decisions
            WHERE (html_content_fr IS NOT NULL AND html_content_fr != '')
               OR (file_path_fr IS NOT NULL AND file_path_fr != '')
        """)
        translated = cursor.fetchone()['translated']

        # Décisions analysées avec IA
        cursor.execute("""
            SELECT COUNT(*) as analyzed
            FROM supreme_court_decisions
            WHERE summary_fr IS NOT NULL
            AND summary_fr != ''
        """)
        analyzed = cursor.fetchone()['analyzed']

        # Décisions avec embeddings
        cursor.execute("""
            SELECT COUNT(*) as embedded
            FROM supreme_court_decisions
            WHERE embedding_fr IS NOT NULL
               OR embedding_ar IS NOT NULL
        """)
        embedded = cursor.fetchone()['embedded']

        conn.close()

        return jsonify({
            'success': True,
            'stats': {
                'total': total,
                'downloaded': downloaded,
                'translated': translated,
                'analyzed': analyzed,
                'embedded': embedded
            }
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@coursupreme_bp.route('/download/<int:decision_id>', methods=['POST'])
def download_single_decision(decision_id):
    """Télécharger une seule décision (wrapper vers batch/download)"""
    import requests
    from flask import request

    try:
        # Récupérer la décision
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('SELECT id, url, download_status FROM supreme_court_decisions WHERE id = ?', (decision_id,))
        decision = cursor.fetchone()
        conn.close()

        if not decision:
            return jsonify({'error': 'Décision non trouvée'}), 404

        # Si déjà téléchargée et pas de force
        if decision['download_status'] == 'completed' and not request.json.get('force', False):
            return jsonify({'success': True, 'message': 'Décision déjà téléchargée', 'already_downloaded': True})

        # Télécharger via batch (plus simple que de dupliquer la logique)
        from harvesters.download_decisions_content import download_decision_content

        try:
            result = download_decision_content(decision_id, decision['url'])
            if result:
                return jsonify({'success': True, 'message': 'Décision téléchargée avec succès'})
            else:
                return jsonify({'success': False, 'message': 'Échec du téléchargement'}), 500
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500
def file_exists(path):
    url = _build_access_url(path)
    if not url:
        return False
    try:
        resp = requests.head(url, timeout=10)
        if resp.status_code == 403:
            # Certains buckets privés refusent HEAD : on tente un GET léger.
            resp = requests.get(url, stream=True, timeout=10)
            exists = resp.status_code == 200
            resp.close()
            return exists
        return resp.status_code == 200
    except Exception:
        return False


def load_html_content(in_memory_html, file_path):
    """Retourner le contenu HTML depuis la base ou depuis R2."""
    if in_memory_html:
        return in_memory_html
    if not file_path:
        return None
    return _fetch_text_from_r2(file_path)
