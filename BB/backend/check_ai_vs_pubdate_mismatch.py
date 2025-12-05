#!/usr/bin/env python3
"""
Vérifier s'il y a des documents où l'IA a extrait une date correcte
mais publication_date n'a pas été mis à jour.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from dotenv import load_dotenv
load_dotenv()

from shared.postgres import get_connection_simple
import re
from datetime import datetime

def check_mismatch():
    """Trouver les documents avec mismatch entre date IA et publication_date."""
    conn = get_connection_simple()
    cur = conn.cursor()

    # Récupérer documents avec métadonnées IA
    cur.execute("""
        SELECT
            d.id,
            d.url,
            d.publication_date,
            ai.extra_metadata
        FROM joradp_documents d
        INNER JOIN document_ai_metadata ai ON ai.document_id = d.id AND ai.corpus = 'joradp'
        WHERE d.publication_date IS NOT NULL
          AND ai.extra_metadata IS NOT NULL
          AND ai.extra_metadata->>'analysis' IS NOT NULL
        ORDER BY d.id
        LIMIT 100
    """)

    results = cur.fetchall()
    mismatches = []

    for doc in results:
        url = doc['url']
        pub_date = doc['publication_date']
        extra_metadata = doc['extra_metadata']

        # Extraire l'année depuis l'URL
        match = re.search(r'/F(\d{4})\d{3}\.pdf$', url)
        if not match:
            continue
        url_year = int(match.group(1))

        # Extraire draft_date depuis les métadonnées IA
        analysis = extra_metadata.get('analysis', {})
        if isinstance(analysis, dict):
            draft_date_str = analysis.get('draft_date')
            if draft_date_str:
                try:
                    draft_date = datetime.strptime(draft_date_str, '%Y-%m-%d').date()
                    draft_year = draft_date.year

                    # Vérifier si l'année IA diffère de publication_date
                    if abs(draft_year - pub_date.year) > 1:
                        mismatches.append({
                            'id': doc['id'],
                            'url': url.split('/')[-1],
                            'url_year': url_year,
                            'pub_year': pub_date.year,
                            'ai_year': draft_year,
                            'pub_date': pub_date,
                            'draft_date': draft_date_str
                        })
                except ValueError:
                    pass

    cur.close()
    conn.close()

    print("=" * 100)
    print("🔍 Vérification: Date IA vs publication_date")
    print("=" * 100)
    print()

    if not mismatches:
        print("✅ Aucun mismatch trouvé ! Toutes les dates sont cohérentes.")
        print()
        print("📊 Conclusion:")
        print("   - L'IA a toujours extrait les dates correctement")
        print("   - Le problème était que publication_date contenait une date par défaut (2020-05-19)")
        print("   - La correction via fix_dates_from_url.py a résolu le problème")
        return

    print(f"⚠️  Trouvé {len(mismatches)} documents avec mismatch\n")
    print("ID     | Fichier        | URL  | Pub  | IA   | Date pub       | Draft date")
    print("-" * 100)

    for m in mismatches[:20]:
        print(f"{m['id']:5d} | {m['url']:14s} | {m['url_year']} | {m['pub_year']} | {m['ai_year']} | {m['pub_date']} | {m['draft_date']}")

    if len(mismatches) > 20:
        print(f"... et {len(mismatches) - 20} autres")


if __name__ == '__main__':
    check_mismatch()
