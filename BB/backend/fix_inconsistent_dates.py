"""
Script pour corriger les dates de publication incohérentes.
Relance l'analyse IA sur les documents où l'année de l'URL ≠ année de publication_date.
"""
import sys
import argparse
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from dotenv import load_dotenv
load_dotenv()

from shared.postgres import get_connection_simple
import re
import requests

def find_inconsistent_documents():
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

        # Extraire l'année depuis l'URL
        match = re.search(r'/F(\d{4})\d{3}\.pdf$', url)
        if not match:
            continue

        annee_url = int(match.group(1))
        annee_pub = pub_date.year

        # Tolérance de 1 an
        if abs(annee_url - annee_pub) > 1:
            inconsistent.append(doc['id'])

    cur.close()
    conn.close()

    return inconsistent


def reanalyze_documents(doc_ids, batch_size=50):
    """Relancer l'analyse IA par lots."""
    total = len(doc_ids)
    print(f"\n📋 Relance de l'analyse sur {total} documents...\n")

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
                    'force': True,  # Force la ré-analyse
                    'generate_embeddings': False  # Pas besoin de régénérer les embeddings
                },
                timeout=600  # 10 minutes max par lot
            )

            if response.status_code == 200:
                result = response.json()
                print(f"   ✅ Succès: {result.get('success_count', 0)} | "
                      f"Échecs: {result.get('failed_count', 0)}")
            else:
                print(f"   ❌ Erreur HTTP {response.status_code}")

        except Exception as e:
            print(f"   ❌ Erreur: {e}")

    print(f"\n✨ Terminé !\n")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Corriger les dates de publication incohérentes')
    parser.add_argument('--yes', '-y', action='store_true', help='Confirmer automatiquement sans prompt')
    args = parser.parse_args()

    print("=" * 80)
    print("🔍 Recherche des documents avec dates incohérentes...")
    print("=" * 80)

    inconsistent_ids = find_inconsistent_documents()

    if not inconsistent_ids:
        print("\n✅ Aucun document incohérent trouvé !")
        sys.exit(0)

    print(f"\n⚠️  Trouvé {len(inconsistent_ids)} documents avec dates incohérentes")

    # Demander confirmation si --yes n'est pas fourni
    if not args.yes:
        response = input(f"\nVoulez-vous relancer l'analyse sur ces {len(inconsistent_ids)} documents ? (oui/non): ")
        if response.lower() not in ['oui', 'o', 'yes', 'y']:
            print("❌ Opération annulée")
            sys.exit(0)
    else:
        print(f"\n✅ Mode automatique activé, lancement de la correction...")

    reanalyze_documents(inconsistent_ids)

    print("=" * 80)
    print("🔍 Vérification post-correction...")
    print("=" * 80)

    remaining = find_inconsistent_documents()
    print(f"\n📊 Documents encore incohérents: {len(remaining)}")

    if len(remaining) < len(inconsistent_ids):
        fixed = len(inconsistent_ids) - len(remaining)
        print(f"✅ {fixed} documents corrigés ({100*fixed/len(inconsistent_ids):.1f}%)")
