#!/usr/bin/env python3
"""
Forcer la re-génération des embeddings pour les documents avec embedding_status='success'
mais embeddings_r2 IS NULL.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from dotenv import load_dotenv
load_dotenv()

from shared.postgres import get_connection_simple
from shared.r2_storage import get_r2_client, normalize_key, get_bucket_name, upload_bytes
import numpy as np
from sentence_transformers import SentenceTransformer

def fix_missing_embeddings():
    """Re-générer les embeddings manquants."""
    conn = get_connection_simple()
    cur = conn.cursor()

    # Trouver les documents problématiques
    cur.execute("""
        SELECT id, url, text_path_r2
        FROM joradp_documents
        WHERE embedding_status = 'success'
          AND embeddings_r2 IS NULL
        ORDER BY id
    """)

    docs = cur.fetchall()

    if not docs:
        print("✅ Aucun document à corriger")
        cur.close()
        conn.close()
        return

    print(f"🔧 Correction de {len(docs)} documents avec embeddings manquants\n")

    # Charger le modèle d'embeddings
    print("📦 Chargement du modèle sentence-transformers...")
    model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

    r2_client = get_r2_client()
    bucket = get_bucket_name()

    fixed_count = 0
    failed_count = 0

    for doc in docs:
        doc_id = doc['id']
        filename = doc['url'].split('/')[-1] if doc['url'] else f"doc_{doc_id}"
        print(f"Processing document {doc_id} ({filename})...", end=" ")

        try:
            # Télécharger le texte depuis R2
            text_key = normalize_key(doc['text_path_r2'])
            if not text_key:
                print(f"❌ Pas de texte R2")
                failed_count += 1
                continue

            response = r2_client.get_object(Bucket=bucket, Key=text_key)
            text_bytes = response['Body'].read()
            text = text_bytes.decode('utf-8') if isinstance(text_bytes, bytes) else text_bytes

            if not text or len(text) < 10:
                print(f"❌ Texte vide ou trop court")
                failed_count += 1
                continue

            # Générer l'embedding
            embedding = model.encode(text, convert_to_numpy=True)
            embedding_bytes = embedding.astype(np.float32).tobytes()

            # Uploader vers R2
            embed_key = f"Textes_juridiques_DZ/joradp.dz/embeddings/{filename.replace('.pdf', '_embedding.bin')}"
            upload_bytes(embed_key, embedding_bytes, content_type='application/octet-stream')

            # Mettre à jour la BD
            cur.execute(
                """
                UPDATE joradp_documents
                SET embeddings_r2 = %s
                WHERE id = %s
                """,
                (embed_key, doc_id)
            )
            conn.commit()

            print(f"✅ OK")
            fixed_count += 1

        except Exception as e:
            print(f"❌ Erreur: {e}")
            failed_count += 1

    print(f"\n{'=' * 80}")
    print(f"✨ Résultat : {fixed_count} corrigés, {failed_count} échecs")

    cur.close()
    conn.close()


if __name__ == '__main__':
    fix_missing_embeddings()
