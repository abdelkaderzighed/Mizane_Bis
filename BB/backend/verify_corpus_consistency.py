#!/usr/bin/env python3
"""
Vérifier la cohérence complète du corpus :
1. Concordance dates vs URL pour TOUS les documents
2. État des embeddings
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from dotenv import load_dotenv
load_dotenv()

from shared.postgres import get_connection_simple
import re

def verify_full_corpus():
    """Vérifier tous les documents du corpus."""
    conn = get_connection_simple()
    cur = conn.cursor()

    print("=" * 100)
    print("🔍 Vérification complète du corpus JORADP")
    print("=" * 100)
    print()

    # 1. Compter le total de documents
    cur.execute("SELECT COUNT(*) as total FROM joradp_documents")
    total = cur.fetchone()['total']
    print(f"📊 Total documents dans la base : {total}")

    # 2. Vérifier les embeddings
    cur.execute("""
        SELECT
            COUNT(*) as total,
            COUNT(embeddings_r2) as with_embeddings,
            COUNT(*) - COUNT(embeddings_r2) as missing_embeddings
        FROM joradp_documents
        WHERE ai_analysis_status = 'success'
    """)
    emb_stats = cur.fetchone()
    print(f"\n📈 État des embeddings :")
    print(f"   - Documents analysés : {emb_stats['total']}")
    print(f"   - Avec embeddings : {emb_stats['with_embeddings']}")
    print(f"   - Sans embeddings : {emb_stats['missing_embeddings']}")

    if emb_stats['missing_embeddings'] > 0:
        print(f"\n   ⚠️  {emb_stats['missing_embeddings']} documents manquent des embeddings !")

        # Trouver lesquels
        cur.execute("""
            SELECT id, url, ai_analysis_status, embedding_status
            FROM joradp_documents
            WHERE ai_analysis_status = 'success'
              AND embeddings_r2 IS NULL
            ORDER BY id
            LIMIT 20
        """)
        missing = cur.fetchall()
        print(f"\n   Exemples de documents sans embeddings :")
        for doc in missing:
            print(f"      ID {doc['id']:5d} | {doc['url'].split('/')[-1]:20s} | embedding_status: {doc['embedding_status']}")

        if len(missing) == 20:
            print(f"      ... (limité à 20 résultats)")

    # 3. Vérifier concordance dates vs URL
    print(f"\n🔍 Vérification concordance dates vs URL...")

    cur.execute("""
        SELECT id, url, publication_date
        FROM joradp_documents
        WHERE publication_date IS NOT NULL
        ORDER BY id
    """)

    all_docs = cur.fetchall()
    inconsistent = []
    no_url_pattern = []

    for doc in all_docs:
        url = doc['url']
        pub_date = doc['publication_date']

        # Extraire l'année depuis l'URL (FYYYYNNN.pdf)
        match = re.search(r'/F(\d{4})\d{3}\.pdf$', url)
        if not match:
            no_url_pattern.append({
                'id': doc['id'],
                'url': url.split('/')[-1]
            })
            continue

        annee_url = int(match.group(1))
        annee_pub = pub_date.year

        # Tolérance de 1 an
        if abs(annee_url - annee_pub) > 1:
            inconsistent.append({
                'id': doc['id'],
                'url': url.split('/')[-1],
                'annee_url': annee_url,
                'annee_pub': annee_pub,
                'pub_date': pub_date
            })

    print(f"\n📋 Résultats de la vérification :")
    print(f"   - Documents vérifiés : {len(all_docs)}")
    print(f"   - Documents sans pattern URL standard : {len(no_url_pattern)}")
    print(f"   - Documents incohérents (>1 an d'écart) : {len(inconsistent)}")

    if no_url_pattern:
        print(f"\n   ℹ️  Documents sans pattern URL standard (FYYYYNNN.pdf) :")
        for doc in no_url_pattern[:10]:
            print(f"      ID {doc['id']:5d} | {doc['url']}")
        if len(no_url_pattern) > 10:
            print(f"      ... et {len(no_url_pattern) - 10} autres")

    if inconsistent:
        print(f"\n   ⚠️  DOCUMENTS INCOHÉRENTS TROUVÉS :")
        print(f"   ID     | Fichier             | Année URL | Année Pub | Date actuelle")
        print("   " + "-" * 80)
        for doc in inconsistent[:20]:
            print(f"   {doc['id']:5d} | {doc['url']:19s} | {doc['annee_url']}      | {doc['annee_pub']}      | {doc['pub_date']}")

        if len(inconsistent) > 20:
            print(f"   ... et {len(inconsistent) - 20} autres")
    else:
        print(f"\n   ✅ Aucune incohérence détectée ! Tous les documents ont des dates cohérentes.")

    # 4. Résumé final
    print("\n" + "=" * 100)
    print("📊 RÉSUMÉ FINAL")
    print("=" * 100)

    if emb_stats['missing_embeddings'] == 0 and len(inconsistent) == 0:
        print("✅ Corpus 100% cohérent !")
        print(f"   - {total} documents au total")
        print(f"   - {emb_stats['with_embeddings']} documents avec embeddings")
        print(f"   - 0 incohérence de dates")
    else:
        print("⚠️  Problèmes détectés :")
        if emb_stats['missing_embeddings'] > 0:
            print(f"   - {emb_stats['missing_embeddings']} documents sans embeddings")
        if len(inconsistent) > 0:
            print(f"   - {len(inconsistent)} documents avec dates incohérentes")

    print()

    cur.close()
    conn.close()

    return {
        'total': total,
        'with_embeddings': emb_stats['with_embeddings'],
        'missing_embeddings': emb_stats['missing_embeddings'],
        'inconsistent_dates': len(inconsistent)
    }


if __name__ == '__main__':
    verify_full_corpus()
