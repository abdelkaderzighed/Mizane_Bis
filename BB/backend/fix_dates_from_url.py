#!/usr/bin/env python3
"""
Corriger les dates incohérentes en utilisant l'année de l'URL comme fallback.
Pour les documents où l'année de l'URL diffère de plus d'1 an de publication_date,
on met à jour publication_date avec l'année de l'URL (au 1er janvier).
"""
import sys
import argparse
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from dotenv import load_dotenv
load_dotenv()

from shared.postgres import get_connection_simple
import re
from datetime import date as dt_date

def find_and_fix_inconsistent_documents(dry_run=True):
    """Trouver et corriger les documents avec dates incohérentes."""
    conn = get_connection_simple()
    cur = conn.cursor()

    # Trouver tous les documents avec dates incohérentes
    cur.execute("""
        SELECT id, url, publication_date
        FROM joradp_documents
        WHERE publication_date IS NOT NULL
        AND ai_analysis_status = 'success'
        ORDER BY id
    """)

    results = cur.fetchall()
    inconsistent = []

    print(f"📊 Analyse de {len(results)} documents...\n")

    for doc in results:
        url = doc['url']
        pub_date = doc['publication_date']

        # Extraire l'année depuis l'URL (FYYYYNNN.pdf)
        match = re.search(r'/F(\d{4})\d{3}\.pdf$', url)
        if not match:
            continue

        annee_url = int(match.group(1))
        annee_pub = pub_date.year

        # Tolérance de 1 an
        if abs(annee_url - annee_pub) > 1:
            inconsistent.append({
                'id': doc['id'],
                'url': url,
                'annee_url': annee_url,
                'annee_pub': annee_pub,
                'pub_date': pub_date
            })

    if not inconsistent:
        print("✅ Aucun document incohérent trouvé !")
        cur.close()
        conn.close()
        return 0

    print(f"⚠️  Trouvé {len(inconsistent)} documents avec dates incohérentes\n")

    # Afficher quelques exemples
    print("Exemples d'incohérences:")
    print("-" * 100)
    for doc in inconsistent[:10]:
        print(f"ID {doc['id']:5d} | URL année: {doc['annee_url']} | "
              f"Pub année: {doc['annee_pub']} | Date actuelle: {doc['pub_date']}")
    if len(inconsistent) > 10:
        print(f"... et {len(inconsistent) - 10} autres")
    print()

    if dry_run:
        print("🔍 Mode DRY-RUN: Aucune modification effectuée.")
        print(f"   Pour appliquer les corrections, relancez avec --apply")
        cur.close()
        conn.close()
        return len(inconsistent)

    # Appliquer les corrections
    print("✏️  Application des corrections...\n")

    updated_count = 0
    for doc in inconsistent:
        # Créer une nouvelle date au 1er janvier de l'année URL
        new_date = dt_date(doc['annee_url'], 1, 1)

        cur.execute(
            """
            UPDATE joradp_documents
            SET publication_date = %s
            WHERE id = %s
            """,
            (new_date, doc['id'])
        )
        updated_count += 1

        if updated_count % 100 == 0:
            print(f"   ✅ {updated_count}/{len(inconsistent)} documents mis à jour...")

    conn.commit()
    print(f"\n✅ {updated_count} documents mis à jour avec succès !\n")

    cur.close()
    conn.close()

    return updated_count


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Corriger les dates de publication en utilisant l\'année de l\'URL'
    )
    parser.add_argument(
        '--apply',
        action='store_true',
        help='Appliquer réellement les corrections (sinon mode dry-run)'
    )
    args = parser.parse_args()

    print("=" * 100)
    print("🔧 Correction des dates via année URL")
    print("=" * 100)
    print()

    count = find_and_fix_inconsistent_documents(dry_run=not args.apply)

    if args.apply:
        print("=" * 100)
        print("🔍 Vérification post-correction...")
        print("=" * 100)

        # Vérifier combien il en reste
        remaining = find_and_fix_inconsistent_documents(dry_run=True)
        if remaining == 0:
            print("\n🎉 Tous les documents sont maintenant cohérents !")
        else:
            print(f"\n⚠️  Il reste {remaining} documents incohérents")
