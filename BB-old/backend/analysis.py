# Module d'analyse IA - Utilise OpenAI
import os, json, sqlite3, time, threading
from datetime import datetime
from contextlib import contextmanager
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    from PyPDF2 import PdfReader
    PYPDF2_AVAILABLE = True
except ImportError:
    PYPDF2_AVAILABLE = False

try:
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = os.getenv("HARVESTER_DB_PATH", str(BASE_DIR / "harvester.db"))
STOP_ANALYSIS = False
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")
_EMBEDDING_MODEL = None
_EMBEDDING_MODEL_LOCK = threading.Lock()

@contextmanager
def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def get_embedding_model():
    global _EMBEDDING_MODEL
    if not EMBEDDING_MODEL_NAME:
        return None
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError:
        print("⚠️  Module sentence-transformers introuvable, embeddings ignorés.")
        return None

    with _EMBEDDING_MODEL_LOCK:
        if _EMBEDDING_MODEL is None:
            try:
                print(f"🔁 Chargement du modèle d'embedding {EMBEDDING_MODEL_NAME}...")
                _EMBEDDING_MODEL = SentenceTransformer(EMBEDDING_MODEL_NAME)
            except Exception as exc:
                print(f"⚠️  Impossible de charger le modèle d'embedding ({exc})")
                _EMBEDDING_MODEL = False
        if _EMBEDDING_MODEL is False:
            return None
        return _EMBEDDING_MODEL

def get_api_key():
    env_key = os.getenv("OPENAI_API_KEY")
    if env_key:
        return env_key
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM settings WHERE key = 'openai_api_key'")
        result = cursor.fetchone()
        return result['value'] if result else None

def set_api_key(api_key):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        cursor.execute(
            """
            INSERT INTO settings (key, value, updated_at)
            VALUES ('openai_api_key', ?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
            """,
            (api_key, now),
        )
        return True

def extract_text_from_pdf(pdf_path):
    if not os.path.exists(pdf_path):
        return False, None, f"Fichier introuvable"
    
    if PDFPLUMBER_AVAILABLE:
        try:
            text = ""
            with __import__('pdfplumber').open(pdf_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n\n"
            if text.strip():
                return True, text.strip(), None
        except Exception as e:
            print(f"pdfplumber échec: {e}")
    
    if PYPDF2_AVAILABLE:
        try:
            reader = PdfReader(pdf_path)
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n\n"
            if text.strip():
                return True, text.strip(), None
        except Exception as e:
            return False, None, f"Erreur: {str(e)}"
    
    return False, None, "Aucune bibliothèque disponible"

def save_full_text(text, local_path):
    try:
        txt_path = local_path[:-4] + '.txt' if local_path.lower().endswith('.pdf') else local_path + '.txt'
        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write(text)
        return True, txt_path, None
    except Exception as e:
        return False, None, f"Erreur: {str(e)}"

def analyze_with_openai(text, api_key, document_info=None):
    if not OPENAI_AVAILABLE:
        return False, None, 0, "openai non disponible"
    if not api_key:
        return False, None, 0, "Clé API manquante"

    if len(text) > 100000:
        text = text[:100000] + "\n[tronqué]"

    try:
        client = OpenAI(api_key=api_key)
        doc_title = document_info.get('title', 'Document') if document_info else 'Document'

        prompt = f'''Analysez ce document juridique officiel (Journal Officiel).

IMPORTANT : Extrayez d'abord le titre EXACT et la date de publication depuis la première page.

Titre actuel : {doc_title}

Répondez UNIQUEMENT en JSON valide :
{{
  "official_title": "Titre COMPLET du document (première page)",
  "publication_date": "Date EXACTE au format YYYY-MM-DD (première page)",
  "summary": "Résumé 300-500 mots",
  "entities": {{
    "organizations": ["liste"],
    "persons": ["liste"],
    "locations": ["liste"],
    "dates": ["ISO format"]
  }},
  "document_type": "type",
  "main_topics": ["3-5 thèmes"],
  "keywords": ["10-15 mots"],
  "legal_references": ["références"],
  "effective_date": "ISO ou null"
}}

TEXTE :
{text}'''

        response = client.chat.completions.create(
            model="gpt-4o",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )

        response_text = response.choices[0].message.content.strip()
        response_text = response_text.replace('```json', '').replace('```', '').strip()

        analysis = json.loads(response_text)
        analysis['analyzed_at'] = datetime.now().isoformat()
        analysis['model_used'] = "gpt-4o"

        tokens = response.usage.prompt_tokens + response.usage.completion_tokens
        return True, analysis, tokens, None

    except Exception as e:
        return False, None, 0, f"Erreur: {str(e)}"

def process_single_document(doc_id, api_key, stop_event=None):
    result = {'success': False, 'status': 'pending', 'doc_id': doc_id, 'tokens_used': 0, 'error': None}
    
    try:
        if stop_event and stop_event.is_set():
            result['status'] = 'stopped'
            result['error'] = "Opération interrompue"
            return result

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, local_path, title, filename, extra_metadata FROM documents WHERE id = ? AND downloaded = 1",
                (doc_id,),
            )
            doc = cursor.fetchone()
            
            if not doc:
                result['error'] = "Document introuvable"
                return result
            
            local_path = doc['local_path']
            if not local_path or not os.path.exists(local_path):
                result['error'] = "Fichier manquant"
                return result
            
            cursor.execute("UPDATE documents SET analysis_status = 'processing' WHERE id = ?", (doc_id,))
            conn.commit()
            
            print("   📄 Extraction...")
            if stop_event and stop_event.is_set():
                cursor.execute("UPDATE documents SET analysis_status = 'pending' WHERE id = ?", (doc_id,))
                conn.commit()
                result['status'] = 'stopped'
                result['error'] = "Opération interrompue"
                return result

            success, text, error = extract_text_from_pdf(local_path)
            if not success:
                result['error'] = error
                cursor.execute("UPDATE documents SET analysis_status = 'error' WHERE id = ?", (doc_id,))
                conn.commit()
                return result
            print(f"   ✓ {len(text)} car.")
            
            print("   💾 Sauvegarde...")
            if stop_event and stop_event.is_set():
                cursor.execute("UPDATE documents SET analysis_status = 'pending' WHERE id = ?", (doc_id,))
                conn.commit()
                result['status'] = 'stopped'
                result['error'] = "Opération interrompue"
                return result

            success, txt_path, error = save_full_text(text, local_path)
            if not success:
                result['error'] = error
                cursor.execute("UPDATE documents SET analysis_status = 'error' WHERE id = ?", (doc_id,))
                conn.commit()
                return result
            metadata_obj = {}
            if doc['extra_metadata']:
                try:
                    metadata_obj = json.loads(doc['extra_metadata'])
                except json.JSONDecodeError:
                    metadata_obj = {}

            metadata_updated = False
            embedding_model = get_embedding_model()
            if embedding_model and not (stop_event and stop_event.is_set()):
                try:
                    vector = embedding_model.encode(
                        text,
                        convert_to_numpy=True,
                        normalize_embeddings=True,
                    )
                    if hasattr(vector, 'tolist'):
                        vector = vector.tolist()
                    metadata_obj['embedding'] = {
                        'model': EMBEDDING_MODEL_NAME,
                        'dimension': len(vector),
                        'generated_at': datetime.now().isoformat(),
                        'vector': [float(v) for v in vector],
                    }
                    metadata_updated = True
                except Exception as exc:
                    print(f"   ⚠️  Embedding non généré : {exc}")

            if metadata_updated:
                cursor.execute(
                    "UPDATE documents SET extra_metadata = ? WHERE id = ?",
                    (json.dumps(metadata_obj, ensure_ascii=False), doc_id),
                )
                conn.commit()

            print("   🤖 Analyse...")
            doc_info = {'title': doc['title'], 'filename': doc['filename']}
            if stop_event and stop_event.is_set():
                cursor.execute("UPDATE documents SET analysis_status = 'pending' WHERE id = ?", (doc_id,))
                conn.commit()
                result['status'] = 'stopped'
                result['error'] = "Opération interrompue"
                return result

            success, analysis, tokens, error = analyze_with_openai(text, api_key, doc_info)
            if not success:
                result['error'] = error
                cursor.execute("UPDATE documents SET analysis_status = 'error' WHERE id = ?", (doc_id,))
                conn.commit()
                return result
            
            result['tokens_used'] = tokens
            analysis_json = json.dumps(analysis, ensure_ascii=False)
            
            cursor.execute("""
                UPDATE documents SET analyzed = 1, analysis_status = 'completed',
                full_text_path = ?, ai_analysis = ? WHERE id = ?
            """, (txt_path, analysis_json, doc_id))
            conn.commit()
            
            result['success'] = True
            result['status'] = 'completed'
            print("   ✅ OK")
            return result
    except Exception as e:
        result['error'] = str(e)
        if stop_event and stop_event.is_set() and result['status'] != 'completed':
            result['status'] = 'stopped'
        return result

def process_documents_batch(api_key, job_uuid=None, callback=None):
    global STOP_ANALYSIS
    STOP_ANALYSIS = False
    
    stats = {'total': 0, 'processed': 0, 'successful': 0, 'failed': 0, 'skipped': 0, 'total_tokens': 0, 'estimated_cost': 0.0}
    
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, title, filename FROM documents WHERE downloaded = 1 AND (analyzed = 0 OR analyzed IS NULL) ORDER BY added_at")
            docs = cursor.fetchall()
            stats['total'] = len(docs)
            
            if stats['total'] == 0:
                print("✨ Aucun document")
                return stats
            
            print(f"\n📊 {stats['total']} document(s)")
            
            for idx, doc in enumerate(docs, 1):
                if STOP_ANALYSIS:
                    stats['skipped'] = stats['total'] - stats['processed']
                    break
                
                doc_title = doc['title'] or doc['filename'] or f"Doc {doc['id']}"
                print(f"\n[{idx}/{stats['total']}] {doc_title}")
                
                result = process_single_document(doc['id'], api_key)
                stats['processed'] += 1
                
                if result['success']:
                    stats['successful'] += 1
                    stats['total_tokens'] += result['tokens_used']
                else:
                    stats['failed'] += 1
                    print(f"   ❌ {result['error']}")
                
                if callback:
                    callback(stats)
                time.sleep(0.5)
            
            stats['estimated_cost'] = (stats['total_tokens'] * 0.8 / 1_000_000 * 3.0) + (stats['total_tokens'] * 0.2 / 1_000_000 * 15.0)
            
            print(f"\n📊 Total: {stats['total']} | ✅ {stats['successful']} | ❌ {stats['failed']} | Tokens: {stats['total_tokens']:,} | ${stats['estimated_cost']:.2f}")
            return stats
    except Exception as e:
        print(f"Erreur: {e}")
        return stats

def stop_analysis():
    global STOP_ANALYSIS
    STOP_ANALYSIS = True

def get_analysis_stats():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM documents WHERE downloaded = 1")
        total_dl = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM documents WHERE analyzed = 1")
        total_analyzed = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM documents WHERE analysis_status = 'error'")
        total_errors = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM documents WHERE downloaded = 1 AND (analyzed = 0 OR analyzed IS NULL)")
        total_pending = cursor.fetchone()[0]
        
        return {
            'total_downloaded': total_dl,
            'total_analyzed': total_analyzed,
            'total_errors': total_errors,
            'total_pending': total_pending,
            'completion_rate': (total_analyzed / total_dl * 100) if total_dl > 0 else 0
        }
