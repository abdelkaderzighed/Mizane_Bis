"""
Test version with smaller batches to diagnose HTTP 500 errors.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from dotenv import load_dotenv
load_dotenv()

from shared.postgres import get_connection_simple
import re
import requests

def find_inconsistent_documents(limit=None):
    """Trouver les documents avec dates incohérentes."""
    conn = get_connection_simple()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, url, publication_date
        FROM joradp_documents
        WHERE publication_date IS NOT NULL
        AND ai_analysis_status = 'success'
        ORDER BY id
    """)

    results = cur.fetchall()
    inconsistent = []

    for doc in results:
        url = doc['url']
        pub_date = doc['publication_date']

        match = re.search(r'/F(\d{4})\d{3}\.pdf$', url)
        if not match:
            continue

        annee_url = int(match.group(1))
        annee_pub = pub_date.year

        if abs(annee_url - annee_pub) > 1:
            inconsistent.append(doc['id'])
            if limit and len(inconsistent) >= limit:
                break

    cur.close()
    conn.close()

    return inconsistent


def reanalyze_documents(doc_ids, batch_size=5):
    """Relancer l'analyse IA par lots."""
    total = len(doc_ids)
    print(f"\n📋 Relance de l'analyse sur {total} documents (batch size={batch_size})...\n")

    api_url = "http://localhost:5001/api/joradp/batch/analyze"

    for i in range(0, total, batch_size):
        batch = doc_ids[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (total + batch_size - 1) // batch_size

        print(f"🔄 Lot {batch_num}/{total_batches} ({len(batch)} documents)...")

        try:
            response = requests.post(
                api_url,
                json={
                    'document_ids': batch,
                    'force': True,
                    'generate_embeddings': False
                },
                timeout=600
            )

            if response.status_code == 200:
                result = response.json()
                print(f"   ✅ Succès: {result.get('analyzed', 0)} | "
                      f"Échecs: {result.get('failed', 0)}")
                print(f"   Déjà analysés: {result.get('already_analyzed', 0)}")
                print(f"   Texte manquant: {result.get('missing_text', 0)}")
            else:
                print(f"   ❌ Erreur HTTP {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Erreur: {error_data.get('error', 'Unknown')}")
                except:
                    print(f"   Réponse: {response.text[:200]}")

        except Exception as e:
            print(f"   ❌ Exception: {e}")

    print(f"\n✨ Terminé !\n")


if __name__ == '__main__':
    print("=" * 80)
    print("🔍 Test correction avec petits lots...")
    print("=" * 80)

    inconsistent_ids = find_inconsistent_documents(limit=15)

    if not inconsistent_ids:
        print("\n✅ Aucun document incohérent trouvé !")
        sys.exit(0)

    print(f"\n⚠️  Trouvé {len(inconsistent_ids)} documents pour le test\n")

    reanalyze_documents(inconsistent_ids, batch_size=5)
