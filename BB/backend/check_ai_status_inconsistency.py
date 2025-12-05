#!/usr/bin/env python3
"""
Vérifier les incohérences entre ai_analysis_status et la présence réelle de métadonnées IA.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / '.env')

from shared.postgres import get_connection_simple

def check_status_inconsistency():
    conn = get_connection_simple()
    cur = conn.cursor()

    print("\n" + "="*100)
    print("🔍 VÉRIFICATION DES INCOHÉRENCES - STATUT AI vs MÉTADONNÉES RÉELLES")
    print("="*100 + "\n")

    # 1. Documents avec ai_analysis_status = 'success' mais SANS métadonnées
    print("1️⃣ Documents marqués 'success' mais SANS métadonnées IA :")
    print("-" * 100)

    cur.execute("""
        SELECT
            d.id,
            d.url,
            d.publication_date,
            d.ai_analysis_status,
            d.analyzed_at,
            d.metadata_collected_at
        FROM joradp_documents d
        LEFT JOIN document_ai_metadata dam ON dam.document_id = d.id AND dam.corpus = 'joradp'
        WHERE d.ai_analysis_status = 'success'
          AND dam.id IS NULL
        ORDER BY d.id
        LIMIT 20
    """)

    false_positives = cur.fetchall()

    if false_positives:
        print(f"❌ {len(false_positives)} faux positifs détectés !\n")
        for row in false_positives:
            print(f"  ID {row['id']:4d} | {row['url'][:60]:60s} | Status: {row['ai_analysis_status']:10s} | Date: {row['publication_date']}")
        print()
    else:
        print("✅ Aucun faux positif trouvé\n")

    # 2. Documents avec métadonnées IA mais ai_analysis_status != 'success'
    print("\n2️⃣ Documents AVEC métadonnées IA mais statut != 'success' :")
    print("-" * 100)

    cur.execute("""
        SELECT
            d.id,
            d.url,
            d.publication_date,
            d.ai_analysis_status,
            d.analyzed_at,
            d.metadata_collected_at,
            dam.title,
            dam.created_at
        FROM joradp_documents d
        INNER JOIN document_ai_metadata dam ON dam.document_id = d.id AND dam.corpus = 'joradp'
        WHERE d.ai_analysis_status != 'success' OR d.ai_analysis_status IS NULL
        ORDER BY d.id
        LIMIT 20
    """)

    false_negatives = cur.fetchall()

    if false_negatives:
        print(f"⚠️  {len(false_negatives)} faux négatifs détectés !\n")
        for row in false_negatives:
            print(f"  ID {row['id']:4d} | {row['url'][:60]:60s} | Status: {str(row['ai_analysis_status'] or 'NULL'):10s} | Metadata: ✓")
        print()
    else:
        print("✅ Aucun faux négatif trouvé\n")

    # 3. Statistiques globales
    print("\n3️⃣ STATISTIQUES GLOBALES :")
    print("-" * 100)

    cur.execute("""
        SELECT
            COUNT(*) as total_docs,
            SUM(CASE WHEN d.ai_analysis_status = 'success' THEN 1 ELSE 0 END) as status_success,
            SUM(CASE WHEN dam.id IS NOT NULL THEN 1 ELSE 0 END) as has_metadata,
            SUM(CASE WHEN d.ai_analysis_status = 'success' AND dam.id IS NOT NULL THEN 1 ELSE 0 END) as both_ok,
            SUM(CASE WHEN d.ai_analysis_status = 'success' AND dam.id IS NULL THEN 1 ELSE 0 END) as false_positives,
            SUM(CASE WHEN (d.ai_analysis_status != 'success' OR d.ai_analysis_status IS NULL) AND dam.id IS NOT NULL THEN 1 ELSE 0 END) as false_negatives
        FROM joradp_documents d
        LEFT JOIN document_ai_metadata dam ON dam.document_id = d.id AND dam.corpus = 'joradp'
    """)

    stats = cur.fetchone()

    print(f"  Total documents                    : {stats['total_docs']}")
    print(f"  Statut 'success'                   : {stats['status_success']}")
    print(f"  Avec métadonnées réelles           : {stats['has_metadata']}")
    print(f"  Cohérents (status + metadata)      : {stats['both_ok']} ✅")
    print(f"  Faux positifs (status sans meta)   : {stats['false_positives']} {'❌' if stats['false_positives'] > 0 else '✅'}")
    print(f"  Faux négatifs (meta sans status)   : {stats['false_negatives']} {'⚠️' if stats['false_negatives'] > 0 else '✅'}")

    cur.close()
    conn.close()

    print("\n" + "="*100 + "\n")

    return {
        'false_positives': stats['false_positives'],
        'false_negatives': stats['false_negatives']
    }

if __name__ == '__main__':
    result = check_status_inconsistency()

    if result['false_positives'] > 0 or result['false_negatives'] > 0:
        print("💡 RECOMMANDATION : Corriger la logique du statut 'analyzed' pour vérifier l'existence réelle des métadonnées.")
        sys.exit(1)
    else:
        print("✨ Tout est cohérent !")
        sys.exit(0)
