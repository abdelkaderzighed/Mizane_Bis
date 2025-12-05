#!/usr/bin/env python3
"""
Vérifier pourquoi la recherche sémantique affiche 5203 résultats au lieu de 5217.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from dotenv import load_dotenv
load_dotenv()

from shared.postgres import get_connection_simple

def check_discrepancy():
    """Analyser l'écart entre le total de documents et les résultats de recherche."""
    conn = get_connection_simple()
    cur = conn.cursor()

    print("=" * 100)
    print("🔍 Analyse de l'écart des résultats de recherche sémantique")
    print("=" * 100)
    print()

    # 1. Total documents
    cur.execute("SELECT COUNT(*) as total FROM joradp_documents")
    total = cur.fetchone()['total']
    print(f"📊 Total documents : {total}")

    # 2. Documents avec embeddings_r2 non-NULL
    cur.execute("""
        SELECT COUNT(*) as with_r2
        FROM joradp_documents
        WHERE embeddings_r2 IS NOT NULL
    """)
    with_r2 = cur.fetchone()['with_r2']
    print(f"📊 Documents avec embeddings_r2 : {with_r2}")
    print(f"📊 Écart : {total - with_r2} documents")
    print()

    # 3. Vérifier les documents sans embeddings_r2
    cur.execute("""
        SELECT
            id,
            url,
            ai_analysis_status,
            text_extraction_status,
            embedding_status,
            embeddings_r2,
            analyzed_at
        FROM joradp_documents
        WHERE embeddings_r2 IS NULL
        ORDER BY id
    """)

    missing = cur.fetchall()

    print(f"⚠️  {len(missing)} documents sans embeddings_r2 :")
    print(f"ID     | Fichier              | AI Status | Text Status | Embed Status | Analyzed")
    print("-" * 100)

    for doc in missing:
        filename = doc['url'].split('/')[-1] if doc['url'] else 'N/A'
        analyzed = str(doc['analyzed_at'])[:10] if doc['analyzed_at'] else 'N/A'
        print(f"{doc['id']:5d} | {filename:20s} | {doc['ai_analysis_status']:9s} | "
              f"{doc['text_extraction_status']:11s} | {doc['embedding_status']:12s} | {analyzed}")

    # 4. Vérifier si certains ont embedding_status='success' mais pas embeddings_r2
    cur.execute("""
        SELECT COUNT(*) as count
        FROM joradp_documents
        WHERE embedding_status = 'success'
          AND embeddings_r2 IS NULL
    """)
    status_mismatch = cur.fetchone()['count']

    if status_mismatch > 0:
        print(f"\n⚠️  {status_mismatch} documents ont embedding_status='success' mais embeddings_r2 IS NULL")
        print("   → Ces documents doivent être re-générés")

    # 5. Statistiques détaillées
    cur.execute("""
        SELECT
            embedding_status,
            COUNT(*) as count,
            COUNT(embeddings_r2) as with_r2
        FROM joradp_documents
        GROUP BY embedding_status
        ORDER BY embedding_status
    """)

    stats = cur.fetchall()
    print(f"\n📊 Répartition par embedding_status :")
    print(f"Status        | Total | Avec embeddings_r2")
    print("-" * 50)
    for stat in stats:
        status = stat['embedding_status'] or 'NULL'
        print(f"{status:13s} | {stat['count']:5d} | {stat['with_r2']:5d}")

    print("\n" + "=" * 100)
    print("💡 Conclusion :")
    print("=" * 100)
    print(f"La recherche sémantique affiche {with_r2} résultats (documents avec embeddings_r2).")
    print(f"Il manque {total - with_r2} documents pour atteindre le total de {total}.")
    print()

    cur.close()
    conn.close()

    return with_r2, total - with_r2


if __name__ == '__main__':
    check_discrepancy()
