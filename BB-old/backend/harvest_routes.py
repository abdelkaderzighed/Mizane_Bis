from flask import request, jsonify
from datetime import datetime
import sqlite3

def get_db_connection():
    conn = sqlite3.connect('harvester.db')
    conn.row_factory = sqlite3.Row
    return conn

def register_harvest_routes(app):
    
    @app.route('/api/harvest', methods=['POST'])
    def start_harvest():
        """Créer une session et lancer le moissonnage"""
        data = request.json
        
        # Paramètres
        site_id = data.get('site_id')
        session_name = data.get('session_name', f'harvest_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
        tasks = data.get('tasks', ['collect', 'download', 'analyze'])
        
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Créer la session
            cursor.execute("""
                INSERT INTO harvesting_sessions 
                (site_id, session_name, is_test, status, current_phase, created_at, started_at)
                VALUES (?, ?, 0, 'running', 'metadata_collection', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, (site_id, session_name))
            
            session_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            # Lancer la phase 1 si demandée
            if 'collect' in tasks:
                from harvester_pattern import PatternHarvester
                
                # Paramètres par défaut
                year = data.get('year', 2025)
                start_num = data.get('start_num', 1)
                end_num = data.get('end_num', 10)
                
                try:
                    cursor.execute("""
                        UPDATE documents
                        SET download_status = 'in_progress',
                            text_extraction_status = 'pending',
                            text_extracted_at = NULL,
                            ai_analysis_status = 'pending',
                            analyzed_at = NULL,
                            embedding_status = 'pending',
                            embedded_at = NULL,
                            error_log = NULL
                        WHERE id = ?
                    """, (doc_id,))
                    conn.commit()

                    if not file_path or not str(file_path).strip():
                        filename = url.split('/')[-1] or f'document_{doc_id}.pdf'
                        target_dir = os.path.join('downloads', 'session_' + str(session_id))
                        os.makedirs(target_dir, exist_ok=True)
                        file_path = os.path.join(target_dir, filename)
                        cursor.execute("""
                            UPDATE documents
                            SET file_path = ?
                            WHERE id = ?
                        """, (file_path, doc_id))
                        conn.commit()

                    directory = os.path.dirname(file_path)
                    if directory:
                        os.makedirs(directory, exist_ok=True)
                    
                    response = requests.get(url, timeout=30)
                    response.raise_for_status()
                    
                    with open(file_path, 'wb') as f:
                        f.write(response.content)
                    
                    cursor.execute("""
                        UPDATE documents
                        SET download_status = 'success', downloaded_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    """, (doc_id,))
                    conn.commit()
                    
                    success_count += 1
                    print(f"✅ Téléchargé: {os.path.basename(file_path)}")
                    
                except Exception as e:
                    cursor.execute("""
                        UPDATE documents
                        SET download_status = 'failed', error_log = ?
                        WHERE id = ?
                    """, (str(e), doc_id))
                    conn.commit()
                    
                    failed_count += 1
                    print(f"❌ Échec téléchargement pour {url}: {e}")
            
                    harvester = PatternHarvester(session_id)
                    success, failed = harvester.harvest(year, start_num, end_num)
                    print(f"✅ Moissonnage: {success} succès, {failed} échecs")
                except Exception as e:
                    print(f"❌ Erreur moissonnage: {e}")
            
            return jsonify({
                'success': True,
                'job_id': session_id,
                'status': 'running'
            })
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    
    @app.route('/api/harvest/<int:session_id>', methods=['GET'])
    def get_harvest_status(session_id):
        """Récupérer le statut de la session et des 3 phases"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Session info
            cursor.execute("""
                SELECT status, current_phase, started_at, completed_at
                FROM harvesting_sessions
                WHERE id = ?
            """, (session_id,))
            
            session = cursor.fetchone()
            if not session:
                return jsonify({'error': 'Session non trouvée'}), 404
            
            # Statuts des 3 phases (compte documents)
            cursor.execute("""
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN metadata_collection_status = 'success' THEN 1 ELSE 0 END) as collect_done,
                    SUM(CASE WHEN download_status = 'success' THEN 1 ELSE 0 END) as download_done,
                    SUM(CASE WHEN ai_analysis_status = 'success' THEN 1 ELSE 0 END) as analyze_done
                FROM documents
                WHERE session_id = ?
            """, (session_id,))
            
            stats = cursor.fetchone()
            conn.close()
            
            # Gérer les valeurs NULL
            total = stats['total'] or 0
            collect_done = stats['collect_done'] or 0
            download_done = stats['download_done'] or 0
            analyze_done = stats['analyze_done'] or 0
            
            return jsonify({
                'id': session_id,
                'status': session['status'],
                'current_phase': session['current_phase'],
                'phases': {
                    'collect': {
                        'status': 'completed' if collect_done > 0 else 'pending',
                        'processed': collect_done,
                        'total': total
                    },
                    'download': {
                        'status': 'completed' if download_done > 0 else 'pending',
                        'processed': download_done,
                        'total': total
                    },
                    'analyze': {
                        'status': 'completed' if analyze_done > 0 else 'pending',
                        'processed': analyze_done,
                        'total': total
                    }
                }
            })
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    
    @app.route('/api/harvest/<int:session_id>/stop', methods=['POST'])
    def stop_harvest(session_id):
        """Mettre en pause le moissonnage"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE harvesting_sessions
                SET status = 'paused', paused_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (session_id,))
            
            conn.commit()
            conn.close()
            
            return jsonify({'success': True, 'status': 'paused'})
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    
    @app.route('/api/harvest/<int:session_id>/resume', methods=['POST'])
    def resume_harvest(session_id):
        """Reprendre le moissonnage (mode incrémental)"""
        data = request.json or {}
        phase = data.get('phase', 'collect')
        
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE harvesting_sessions
                SET status = 'running', current_phase = ?
                WHERE id = ?
            """, (f"{phase}_collection" if phase == 'metadata' else f"{phase}", session_id))
            
            conn.commit()
            conn.close()
            
            # Lancer le harvester en mode incrémental
            from harvester_pattern import PatternHarvester
            
            try:
                harvester = PatternHarvester(session_id)
                
                # Récupérer les paramètres de la session
                conn2 = get_db_connection()
                cursor2 = conn2.cursor()
                cursor2.execute(
                    "SELECT start_number, end_number, filter_date_start FROM harvesting_sessions WHERE id = ?",
                    (session_id,)
                )
                session_params = cursor2.fetchone()
                conn2.close()
                
                # Extraire l'année depuis filter_date_start, sinon année courante
                from datetime import datetime
                if session_params['filter_date_start']:
                    year = int(session_params['filter_date_start'][:4])
                else:
                    year = datetime.now().year
                
                start_num = session_params['start_number'] if session_params['start_number'] else 1
                end_num = session_params['end_number'] if session_params['end_number'] else 999
                
                success, failed = harvester.harvest(year, start_num, end_num)
                print(f"✅ Reprise moissonnage: {success} succès, {failed} échecs")
            except Exception as e:
                print(f"❌ Erreur reprise: {e}")
            
            return jsonify({'success': True, 'status': 'running'})
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    
    @app.route('/api/harvest/<int:session_id>/cancel', methods=['POST'])
    def cancel_harvest(session_id):
        """Annuler et nettoyer selon la phase"""
        data = request.json or {}
        phase = data.get('phase', 'all')  # all, collect, download, analyze
        
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            if phase == 'all' or phase == 'collect':
                # Supprimer les métadonnées collectées
                cursor.execute("""
                    DELETE FROM documents WHERE session_id = ?
                """, (session_id,))
            
            if phase == 'all' or phase == 'download':
                # Marquer les téléchargements comme skipped
                cursor.execute("""
                    UPDATE documents 
                    SET download_status = 'skipped', file_path = NULL
                    WHERE session_id = ?
                """, (session_id,))
                # TODO: Supprimer les fichiers PDF physiques
            
            if phase == 'all' or phase == 'analyze':
                # Marquer les analyses comme skipped
                cursor.execute("""
                    UPDATE documents 
                    SET ai_analysis_status = 'skipped', text_path = NULL
                    WHERE session_id = ?
                """, (session_id,))
                # TODO: Supprimer les fichiers .txt
            
            # Mettre la session en cancelled
            cursor.execute("""
                UPDATE harvesting_sessions
                SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (session_id,))
            
            conn.commit()
            conn.close()
            
            return jsonify({'success': True, 'status': 'cancelled'})
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/api/harvest/<int:session_id>/download', methods=['POST'])
    def download_documents(session_id):
        """Télécharger les PDFs avec différents modes"""
        try:
            data = request.json or {}
            mode = data.get('mode', 'all')
            force = bool(data.get('force', False))
            
            conn = get_db_connection()
            cursor = conn.cursor()
            
            include_completed = force or mode == 'selected'
            
            where_clauses = ['session_id = ?']
            params = [session_id]
            
            if not include_completed:
                where_clauses.append("(download_status = 'pending' OR download_status = 'failed')")
            
            if mode == 'selected':
                doc_ids = data.get('document_ids', [])
                if not doc_ids:
                    return jsonify({'error': 'Aucun document sélectionné'}), 400
                placeholders = ','.join('?' * len(doc_ids))
                where_clauses.append(f'id IN ({placeholders})')
                params.extend(doc_ids)
            
            elif mode == 'range_numero':
                numero_debut = data.get('numero_debut')
                numero_fin = data.get('numero_fin')
                if numero_debut and numero_fin:
                    where_clauses.append('CAST(substr(url, -7, 3) AS INTEGER) BETWEEN ? AND ?')
                    params.extend([int(numero_debut), int(numero_fin)])
            
            elif mode == 'range_date':
                date_debut = data.get('date_debut')
                date_fin = data.get('date_fin')
                if date_debut:
                    where_clauses.append('publication_date >= ?')
                    params.append(date_debut)
                if date_fin:
                    where_clauses.append('publication_date <= ?')
                    params.append(date_fin)
            
            where_sql = ' AND '.join(where_clauses)
            
            cursor.execute(f"""
                SELECT id, url, file_path
                FROM documents
                WHERE {where_sql}
            """, params)
            
            documents = cursor.fetchall()
            
            if not documents:
                conn.close()
                return jsonify({
                    'success': True,
                    'message': 'Aucun document à télécharger',
                    'downloaded': 0,
                    'failed': 0,
                    'total': 0
                })
            
            import requests
            import os
            
            success_count = 0
            failed_count = 0
            
            for doc in documents:
                doc_id = doc['id']
                url = doc['url']
                file_path = doc['file_path']
                
                try:
                    cursor.execute("""
                        UPDATE documents
                        SET download_status = 'in_progress',
                            text_extraction_status = 'pending',
                            text_extracted_at = NULL,
                            ai_analysis_status = 'pending',
                            analyzed_at = NULL,
                            embedding_status = 'pending',
                            embedded_at = NULL,
                            error_log = NULL
                        WHERE id = ?
                    """, (doc_id,))
                    conn.commit()
                    
                    if not file_path or not str(file_path).strip():
                        filename = url.split('/')[-1] or f'document_{doc_id}.pdf'
                        target_dir = os.path.join('downloads', f'session_{session_id}')
                        os.makedirs(target_dir, exist_ok=True)
                        file_path = os.path.join(target_dir, filename)
                        cursor.execute("""
                            UPDATE documents
                            SET file_path = ?
                            WHERE id = ?
                        """, (file_path, doc_id))
                        conn.commit()

                    directory = os.path.dirname(file_path) if file_path else ''
                    if directory:
                        os.makedirs(directory, exist_ok=True)
                    
                    response = requests.get(url, timeout=30)
                    response.raise_for_status()
                    
                    with open(file_path, 'wb') as f:
                        f.write(response.content)
                    
                    cursor.execute("""
                        UPDATE documents
                        SET download_status = 'success', downloaded_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    """, (doc_id,))
                    conn.commit()
                    
                    success_count += 1
                    print(f"✅ Téléchargé: {os.path.basename(file_path)}")
                    
                except Exception as e:
                    cursor.execute("""
                        UPDATE documents
                        SET download_status = 'failed', error_log = ?
                        WHERE id = ?
                    """, (str(e), doc_id))
                    conn.commit()
                    
                    failed_count += 1
                    print(f"❌ Échec téléchargement pour {url}: {e}")
            
            conn.close()
            
            return jsonify({
                'success': True,
                'downloaded': success_count,
                'failed': failed_count,
                'total': len(documents)
            })
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/api/harvest/<int:session_id>/analyze', methods=['POST'])
    def analyze_documents(session_id):
        """Analyser les documents avec OpenAI IA"""
        try:
            import os
            from analysis import get_embedding_model
            from openai import OpenAI

            # Charger la clé API
            api_key = os.getenv('OPENAI_API_KEY')
            if not api_key:
                return jsonify({'error': 'OPENAI_API_KEY non trouvée'}), 500

            client = OpenAI(api_key=api_key)
            
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Récupérer les documents téléchargés mais pas encore analysés
            cursor.execute("""
                SELECT id, file_path, text_path, url
                FROM documents
                WHERE session_id = ?
                AND download_status = 'success'
                AND (ai_analysis_status = 'pending' OR ai_analysis_status = 'failed')
            """, (session_id,))
            
            documents = cursor.fetchall()
            conn.close()
            
            if not documents:
                return jsonify({
                    'success': True,
                    'message': 'Aucun document à analyser',
                    'analyzed': 0
                })
            
            success_count = 0
            failed_count = 0
            
            for doc in documents:
                doc_id = doc['id']
                file_path = doc['file_path']
                text_path = doc['text_path']
                url = doc['url']
                
                try:
                    # 1. Extraire le texte du PDF si pas déjà fait
                    if not text_path or not os.path.exists(text_path):
                        # Créer le chemin pour le fichier texte
                        text_path = file_path.replace('.pdf', '.txt')
                        
                        # Extraire le texte avec PyPDF2 ou pdfplumber
                        import PyPDF2
                        with open(file_path, 'rb') as pdf_file:
                            pdf_reader = PyPDF2.PdfReader(pdf_file)
                            text = ''
                            for page in pdf_reader.pages:
                                text += page.extract_text() + '\n'
                        
                        # Sauvegarder le texte
                        with open(text_path, 'w', encoding='utf-8') as txt_file:
                            txt_file.write(text)
                        
                        # Mettre à jour le chemin dans la BD
                        conn = get_db_connection()
                        cursor = conn.cursor()
                        cursor.execute("UPDATE documents SET text_path = ? WHERE id = ?", (text_path, doc_id))
                        conn.commit()
                        conn.close()
                    else:
                        # Lire le texte existant
                        with open(text_path, 'r', encoding='utf-8') as txt_file:
                            text = txt_file.read()
                    
                    # 1.5. Générer l'embedding du texte
                    embedding_model = get_embedding_model()
                    embedding_data = None
                    
                    if embedding_model:
                        try:
                            vector = embedding_model.encode(
                                text[:5000],  # Limiter pour l'embedding
                                convert_to_numpy=True,
                                normalize_embeddings=True
                            )
                            if hasattr(vector, 'tolist'):
                                vector = vector.tolist()
                            
                            embedding_data = {
                                'model': 'all-MiniLM-L6-v2',
                                'dimension': len(vector),
                                'vector': [float(v) for v in vector]
                            }
                        except Exception as e:
                            print(f"   ⚠️  Embedding non généré: {e}")
                    
                    # 2. Analyser avec OpenAI (limiter à 10000 caractères pour l'exemple)
                    text_sample = text[:10000]

                    response = client.chat.completions.create(
                        model="gpt-4o",
                        max_tokens=1024,
                        messages=[{
                            "role": "user",
                            "content": f"""Analyse ce document juridique et fournis :
1. Un résumé en 2-3 phrases
2. Les mots-clés principaux (5 max)
3. Les entités nommées importantes (personnes, organisations, lieux)

Document :
{text_sample}

Réponds en JSON avec les clés: summary, keywords, entities"""
                        }],
                        response_format={"type": "json_object"}
                    )

                    analysis_result = response.choices[0].message.content
                    
                    # 3. Sauvegarder dans la BD
                    conn = get_db_connection()
                    cursor = conn.cursor()
                    
                    # Sauvegarder l'embedding si généré
                    if embedding_data:
                        import json
                        cursor.execute(
                            "UPDATE documents SET extra_metadata = ? WHERE id = ?",
                            (json.dumps({'embedding': embedding_data}), doc_id)
                        )
                    
                    # Mettre à jour le document
                    cursor.execute("""
                        UPDATE documents
                        SET ai_analysis_status = 'success', analyzed_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    """, (doc_id,))
                    
                    # Insérer ou mettre à jour l'analyse
                    cursor.execute("""
                        INSERT OR REPLACE INTO document_ai_analysis
                        (document_id, extracted_text_length, summary, additional_metadata, created_at)
                        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                    """, (doc_id, len(text), analysis_result[:500], analysis_result))
                    
                    conn.commit()
                    conn.close()
                    
                    success_count += 1
                    print(f"✅ Analysé: {os.path.basename(file_path)}")
                    
                except Exception as e:
                    # Marquer comme failed
                    conn = get_db_connection()
                    cursor = conn.cursor()
                    cursor.execute("""
                        UPDATE documents
                        SET ai_analysis_status = 'failed', error_log = ?
                        WHERE id = ?
                    """, (str(e), doc_id))
                    conn.commit()
                    conn.close()
                    
                    failed_count += 1
                    print(f"❌ Échec analyse: {url} - {e}")
            
            return jsonify({
                'success': True,
                'analyzed': success_count,
                'failed': failed_count,
                'total': len(documents)
            })
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/api/harvest/<int:session_id>/incremental', methods=['POST'])
    def incremental_harvest(session_id):
        """Moissonnage incrémental avec différents modes"""
        try:
            data = request.json
            mode = data.get('mode', 'depuis_dernier')  # depuis_dernier, entre_dates, depuis_numero
            
            from harvester_joradp_incremental import JORADPIncrementalHarvester
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
            
            # Ajouter infos du dernier document si disponible
            if hasattr(harvester, 'last_doc_info') and harvester.last_doc_info:
                result['last_document'] = harvester.last_doc_info
            
            return jsonify(result)
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
