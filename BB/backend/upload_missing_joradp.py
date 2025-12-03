"""
Script pour télécharger et uploader les 4 documents JORADP manquants dans R2.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import requests
from dotenv import load_dotenv

from shared.r2_storage import get_r2_client, get_bucket_name
from shared.postgres import get_connection_simple

load_dotenv()


def upload_missing_documents():
    """Upload les documents manquants (IDs 1-4) dans R2."""

    conn = get_connection_simple()
    cur = conn.cursor()

    # Récupérer les 4 documents manquants
    cur.execute("""
        SELECT id, url, file_path_r2
        FROM joradp_documents
        WHERE id IN (1, 2, 3, 4)
        ORDER BY id
    """)

    docs = cur.fetchall()

    if not docs:
        print("❌ Aucun document trouvé avec IDs 1-4")
        return

    client = get_r2_client()
    bucket = get_bucket_name()

    print(f"📦 Bucket R2: {bucket}\n")

    for doc in docs:
        doc_id = doc['id']
        source_url = doc['url']
        file_path_r2 = doc['file_path_r2']

        # Extraire la clé R2 (partie après /textes-juridiques/)
        if '/textes-juridiques/' in file_path_r2:
            key = file_path_r2.split('/textes-juridiques/', 1)[1]
        else:
            print(f"❌ [Doc {doc_id}] Impossible d'extraire la clé R2 de: {file_path_r2}")
            continue

        print(f"📄 [Doc {doc_id}] Traitement...")
        print(f"   URL source: {source_url}")
        print(f"   Clé R2: {key}")

        try:
            # 1. Télécharger le PDF depuis joradp.dz
            print(f"   ⬇️  Téléchargement depuis joradp.dz...")
            response = requests.get(source_url, timeout=30)
            response.raise_for_status()
            pdf_data = response.content
            size_kb = len(pdf_data) / 1024
            print(f"   ✅ Téléchargé: {size_kb:.1f} KB")

            # 2. Uploader dans R2
            print(f"   ⬆️  Upload vers R2...")
            client.put_object(
                Bucket=bucket,
                Key=key,
                Body=pdf_data,
                ContentType='application/pdf'
            )
            print(f"   ✅ Uploadé dans R2")

            # 3. Mettre à jour le statut dans la DB
            cur.execute("""
                UPDATE joradp_documents
                SET download_status = 'success',
                    downloaded_at = timezone('utc', now()),
                    updated_at = timezone('utc', now())
                WHERE id = %s
            """, (doc_id,))
            conn.commit()

            print(f"   ✅ Document {doc_id} traité avec succès\n")

        except requests.exceptions.RequestException as e:
            print(f"   ❌ Erreur lors du téléchargement: {e}\n")
        except Exception as e:
            print(f"   ❌ Erreur lors de l'upload: {e}\n")

    cur.close()
    conn.close()

    print("✨ Terminé!")


if __name__ == '__main__':
    upload_missing_documents()
