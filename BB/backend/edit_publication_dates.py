#!/usr/bin/env python3
"""
Script interactif pour éditer manuellement les dates de publication.
Affiche le PDF et permet de saisir la date correcte.
"""
import sys
import subprocess
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from dotenv import load_dotenv
load_dotenv()

from shared.postgres import get_connection_simple
from datetime import datetime, date as dt_date

def get_documents_without_date(limit=50):
    """Récupérer les documents sans date de publication ou avec date douteuse."""
    conn = get_connection_simple()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, url, publication_date, file_path_r2
        FROM joradp_documents
        WHERE publication_date IS NULL
           OR EXTRACT(YEAR FROM publication_date) = 1
        ORDER BY id
        LIMIT %s
    """, (limit,))

    docs = cur.fetchall()
    cur.close()
    conn.close()
    return docs


def update_publication_date(doc_id, new_date):
    """Mettre à jour la date de publication."""
    conn = get_connection_simple()
    cur = conn.cursor()

    cur.execute(
        "UPDATE joradp_documents SET publication_date = %s WHERE id = %s",
        (new_date, doc_id)
    )
    conn.commit()
    cur.close()
    conn.close()


def open_pdf_in_browser(url):
    """Ouvrir le PDF dans le navigateur."""
    try:
        subprocess.run(['open', url], check=False)
    except Exception:
        print(f"   ℹ️  Ouvrez manuellement: {url}")


def parse_date_input(date_str):
    """Parser différents formats de date."""
    date_str = date_str.strip()

    # Format YYYY-MM-DD
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        pass

    # Format DD/MM/YYYY
    try:
        return datetime.strptime(date_str, '%d/%MM/%Y').date()
    except ValueError:
        pass

    # Format YYYY seulement (année)
    try:
        year = int(date_str)
        if 1900 <= year <= 2100:
            return dt_date(year, 1, 1)
    except ValueError:
        pass

    return None


def main():
    print("=" * 100)
    print("📝 Éditeur interactif de dates de publication")
    print("=" * 100)
    print()

    docs = get_documents_without_date()

    if not docs:
        print("✅ Aucun document sans date trouvé !")
        return

    print(f"📊 Trouvé {len(docs)} documents sans date ou avec date invalide\n")
    print("Commandes:")
    print("  - Entrez une date (YYYY-MM-DD ou YYYY)")
    print("  - 's' = skip (passer)")
    print("  - 'q' = quit (quitter)")
    print("  - 'u' = use URL year (utiliser l'année de l'URL)")
    print()

    edited_count = 0
    skipped_count = 0

    for i, doc in enumerate(docs, 1):
        print("-" * 100)
        print(f"\n[{i}/{len(docs)}] Document ID: {doc['id']}")
        print(f"   URL: {doc['url']}")
        print(f"   Date actuelle: {doc['publication_date'] or 'NULL'}")

        # Extraire l'année de l'URL
        import re
        url_year = None
        match = re.search(r'/F(\d{4})\d{3}\.pdf$', doc['url'])
        if match:
            url_year = match.group(1)
            print(f"   Année URL: {url_year}")

        # Ouvrir le PDF
        print(f"\n   🌐 Ouverture du PDF dans le navigateur...")
        open_pdf_in_browser(doc['url'])

        # Demander la nouvelle date
        while True:
            user_input = input(f"\n   Nouvelle date (YYYY-MM-DD, YYYY, 's', 'q', 'u'): ").strip().lower()

            if user_input == 'q':
                print(f"\n✨ Édition terminée: {edited_count} modifiés, {skipped_count} passés")
                return

            if user_input == 's':
                skipped_count += 1
                print("   ⏭️  Passé")
                break

            if user_input == 'u' and url_year:
                new_date = dt_date(int(url_year), 1, 1)
                update_publication_date(doc['id'], new_date)
                edited_count += 1
                print(f"   ✅ Date mise à jour: {new_date}")
                break

            new_date = parse_date_input(user_input)
            if new_date:
                update_publication_date(doc['id'], new_date)
                edited_count += 1
                print(f"   ✅ Date mise à jour: {new_date}")
                break
            else:
                print("   ❌ Format invalide. Réessayez.")

    print("\n" + "=" * 100)
    print(f"✨ Édition terminée: {edited_count} modifiés, {skipped_count} passés")
    print("=" * 100)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Édition interrompue par l'utilisateur")
        sys.exit(0)
