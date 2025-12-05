#!/usr/bin/env python3
"""
Investiguer les décisions de la Cour Suprême qui ne sont pas accessibles.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from dotenv import load_dotenv
load_dotenv()

from shared.postgres import get_connection_simple
from shared.r2_storage import get_r2_client, normalize_key, get_bucket_name

def check_decision_accessibility(decision_ids):
    """Vérifier l'accessibilité des décisions spécifiques."""
    conn = get_connection_simple()
    cur = conn.cursor()

    print("=" * 100)
    print("🔍 Investigation : Accessibilité des décisions Cour Suprême")
    print("=" * 100)
    print()

    # Chercher les décisions dans la base de données
    cur.execute("""
        SELECT
            id,
            decision_number,
            decision_date,
            url,
            file_path_ar_r2,
            file_path_fr_r2,
            download_status
        FROM supreme_court_decisions
        WHERE decision_number = ANY(%s)
        ORDER BY decision_number
    """, (decision_ids,))

    decisions = cur.fetchall()

    if not decisions:
        print(f"❌ Aucune décision trouvée pour les numéros : {decision_ids}")
        cur.close()
        conn.close()
        return

    print(f"📊 Trouvé {len(decisions)} décisions\n")

    r2_client = get_r2_client()
    bucket = get_bucket_name()

    for dec in decisions:
        print("=" * 100)
        print(f"📄 Décision #{dec['decision_number']}")
        print("=" * 100)
        print(f"ID : {dec['id']}")
        print(f"Date : {dec['decision_date']}")
        print(f"URL : {dec['url']}")
        print()

        # Statuts
        print("📊 Statut :")
        print(f"   - Download : {dec['download_status']}")
        print()

        # Vérifier PDF FR dans R2
        pdf_path_fr = dec['file_path_fr_r2']
        if pdf_path_fr:
            print(f"📑 PDF FR R2 : {pdf_path_fr}")
            try:
                pdf_key = normalize_key(pdf_path_fr)
                r2_client.head_object(Bucket=bucket, Key=pdf_key)
                print(f"   ✅ PDF FR existe dans R2")
            except Exception as e:
                print(f"   ❌ PDF FR n'existe PAS dans R2 : {e}")
        else:
            print(f"   ❌ Pas de file_path_fr_r2 dans la base")
        print()

        # Vérifier PDF AR dans R2
        pdf_path_ar = dec['file_path_ar_r2']
        if pdf_path_ar:
            print(f"📑 PDF AR R2 : {pdf_path_ar}")
            try:
                pdf_key = normalize_key(pdf_path_ar)
                r2_client.head_object(Bucket=bucket, Key=pdf_key)
                print(f"   ✅ PDF AR existe dans R2")
            except Exception as e:
                print(f"   ❌ PDF AR n'existe PAS dans R2 : {e}")
        else:
            print(f"   ℹ️  Pas de file_path_ar_r2 dans la base")

        print()

    # Résumé
    print("=" * 100)
    print("💡 Diagnostic :")
    print("=" * 100)

    issues = []
    for dec in decisions:
        dec_issues = []
        if not dec['file_path_fr_r2']:
            dec_issues.append("file_path_fr_r2 manquant")
        if dec['download_status'] != 'success':
            dec_issues.append(f"download_status={dec['download_status']}")

        if dec_issues:
            issues.append(f"Décision {dec['decision_number']}: {', '.join(dec_issues)}")

    if issues:
        print("\n⚠️  Problèmes détectés :")
        for issue in issues:
            print(f"   - {issue}")
    else:
        print("\n✅ Toutes les décisions ont les champs R2 renseignés et les statuts corrects.")
        print("\n💡 Si le bouton œil ne fonctionne pas, le problème est probablement :")
        print("   1. Dans le frontend (URL générée incorrecte)")
        print("   2. Dans l'API (endpoint qui récupère le PDF)")
        print("   3. Dans les permissions R2")

    cur.close()
    conn.close()


if __name__ == '__main__':
    # Décisions problématiques mentionnées par l'utilisateur
    decision_ids = ['1426493', '009536', '009083']

    if len(sys.argv) > 1:
        decision_ids = sys.argv[1:]

    check_decision_accessibility(decision_ids)
