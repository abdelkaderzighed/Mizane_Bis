#!/usr/bin/env python3
"""
Script d'audit pour les décisions de la Cour Suprême
Identifie les traitements manquants (téléchargement, traduction, analyse, embeddings)
"""

import sqlite3
from collections import defaultdict

DB_PATH = 'harvester.db'

def audit_decisions():
    """Auditer l'état des décisions de la Cour Suprême"""

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Récupérer toutes les décisions
    cursor.execute("""
        SELECT
            id,
            decision_number,
            decision_date,
            download_status,
            file_path_ar,
            file_path_fr,
            title_ar,
            title_fr,
            summary_ar,
            summary_fr,
            keywords_ar,
            keywords_fr,
            entities_ar,
            entities_fr,
            embedding
        FROM supreme_court_decisions
        ORDER BY id
    """)

    decisions = cursor.fetchall()
    total = len(decisions)

    print("="*80)
    print(f"📊 AUDIT DES DÉCISIONS DE LA COUR SUPRÊME")
    print("="*80)
    print(f"\n📋 Total de décisions: {total}\n")

    # Statistiques
    stats = {
        'downloaded_ar': 0,
        'downloaded_fr': 0,
        'translated': 0,  # A les 2 versions
        'analyzed_ar': 0,
        'analyzed_fr': 0,
        'analyzed_complete': 0,  # A tout (titre, résumé, mots-clés, entités)
        'has_embedding': 0,
        'complete': 0,  # Tout est fait
        'missing_download': [],
        'missing_translation': [],
        'missing_analysis': [],
        'missing_embedding': [],
        'incomplete_analysis_ar': [],
        'incomplete_analysis_fr': []
    }

    for decision in decisions:
        dec_id = decision['id']
        dec_num = decision['decision_number']

        # 1. Téléchargement
        has_ar = decision['file_path_ar'] is not None and decision['file_path_ar'] != ''
        has_fr = decision['file_path_fr'] is not None and decision['file_path_fr'] != ''

        if has_ar:
            stats['downloaded_ar'] += 1
        if has_fr:
            stats['downloaded_fr'] += 1

        if has_ar and has_fr:
            stats['translated'] += 1
        elif not has_ar and not has_fr:
            stats['missing_download'].append((dec_id, dec_num))
        elif not has_fr:
            stats['missing_translation'].append((dec_id, dec_num))

        # 2. Analyse IA - Arabe
        has_title_ar = decision['title_ar'] is not None and decision['title_ar'] != ''
        has_summary_ar = decision['summary_ar'] is not None and decision['summary_ar'] != ''
        has_keywords_ar = decision['keywords_ar'] is not None and decision['keywords_ar'] != ''
        has_entities_ar = decision['entities_ar'] is not None and decision['entities_ar'] != ''

        analysis_ar_complete = has_title_ar and has_summary_ar and has_keywords_ar and has_entities_ar

        if analysis_ar_complete:
            stats['analyzed_ar'] += 1
        elif has_ar:  # Seulement si le fichier arabe existe
            stats['incomplete_analysis_ar'].append((dec_id, dec_num))

        # 3. Analyse IA - Français
        has_title_fr = decision['title_fr'] is not None and decision['title_fr'] != ''
        has_summary_fr = decision['summary_fr'] is not None and decision['summary_fr'] != ''
        has_keywords_fr = decision['keywords_fr'] is not None and decision['keywords_fr'] != ''
        has_entities_fr = decision['entities_fr'] is not None and decision['entities_fr'] != ''

        analysis_fr_complete = has_title_fr and has_summary_fr and has_keywords_fr and has_entities_fr

        if analysis_fr_complete:
            stats['analyzed_fr'] += 1
        elif has_fr:  # Seulement si le fichier français existe
            stats['incomplete_analysis_fr'].append((dec_id, dec_num))

        # Analyse complète (les 2 langues)
        if analysis_ar_complete and analysis_fr_complete:
            stats['analyzed_complete'] += 1
        elif has_ar and has_fr and not (analysis_ar_complete and analysis_fr_complete):
            stats['missing_analysis'].append((dec_id, dec_num))

        # 4. Embedding
        has_embedding = decision['embedding'] is not None and len(decision['embedding']) > 0

        if has_embedding:
            stats['has_embedding'] += 1
        elif has_ar or has_fr:  # Seulement si au moins un fichier existe
            stats['missing_embedding'].append((dec_id, dec_num))

        # 5. Complet (tout est fait)
        if has_ar and has_fr and analysis_ar_complete and analysis_fr_complete and has_embedding:
            stats['complete'] += 1

    conn.close()

    # Afficher les résultats
    print("📥 TÉLÉCHARGEMENT:")
    print(f"   Fichiers AR téléchargés:     {stats['downloaded_ar']:4d} / {total} ({stats['downloaded_ar']/total*100:5.1f}%)")
    print(f"   Fichiers FR téléchargés:     {stats['downloaded_fr']:4d} / {total} ({stats['downloaded_fr']/total*100:5.1f}%)")
    print(f"   Traduction complète (AR+FR): {stats['translated']:4d} / {total} ({stats['translated']/total*100:5.1f}%)")
    print(f"   ⚠️  Manque téléchargement:     {len(stats['missing_download']):4d}")
    print(f"   ⚠️  Manque traduction FR:       {len(stats['missing_translation']):4d}")

    print("\n🤖 ANALYSE IA:")
    print(f"   Analyses AR complètes:       {stats['analyzed_ar']:4d} / {total} ({stats['analyzed_ar']/total*100:5.1f}%)")
    print(f"   Analyses FR complètes:       {stats['analyzed_fr']:4d} / {total} ({stats['analyzed_fr']/total*100:5.1f}%)")
    print(f"   Analyses bilingues OK:       {stats['analyzed_complete']:4d} / {total} ({stats['analyzed_complete']/total*100:5.1f}%)")
    print(f"   ⚠️  Analyses AR incomplètes:   {len(stats['incomplete_analysis_ar']):4d}")
    print(f"   ⚠️  Analyses FR incomplètes:   {len(stats['incomplete_analysis_fr']):4d}")
    print(f"   ⚠️  Manque analyse complète:   {len(stats['missing_analysis']):4d}")

    print("\n🧬 EMBEDDINGS:")
    print(f"   Embeddings calculés:         {stats['has_embedding']:4d} / {total} ({stats['has_embedding']/total*100:5.1f}%)")
    print(f"   ⚠️  Manque embeddings:         {len(stats['missing_embedding']):4d}")

    print("\n✅ TRAITEMENT COMPLET:")
    print(f"   Décisions 100% complètes:    {stats['complete']:4d} / {total} ({stats['complete']/total*100:5.1f}%)")
    print(f"   ⚠️  Décisions incomplètes:     {total - stats['complete']:4d}")

    print("\n" + "="*80)
    print("📝 RÉSUMÉ DES ACTIONS NÉCESSAIRES")
    print("="*80)

    total_actions = (
        len(stats['missing_download']) +
        len(stats['missing_translation']) +
        len(stats['incomplete_analysis_ar']) +
        len(stats['incomplete_analysis_fr']) +
        len(stats['missing_analysis']) +
        len(stats['missing_embedding'])
    )

    if total_actions == 0:
        print("✅ Toutes les décisions sont complètes !")
    else:
        print(f"\n🔧 {total_actions} actions à effectuer:\n")

        if stats['missing_download']:
            print(f"   📥 {len(stats['missing_download'])} décisions à télécharger")
            print(f"      Exemples: {', '.join(str(d[0]) for d in stats['missing_download'][:5])}")

        if stats['missing_translation']:
            print(f"   🌐 {len(stats['missing_translation'])} décisions à traduire en FR")
            print(f"      Exemples: {', '.join(str(d[0]) for d in stats['missing_translation'][:5])}")

        if stats['incomplete_analysis_ar']:
            print(f"   🤖 {len(stats['incomplete_analysis_ar'])} analyses AR à compléter")
            print(f"      Exemples: {', '.join(str(d[0]) for d in stats['incomplete_analysis_ar'][:5])}")

        if stats['incomplete_analysis_fr']:
            print(f"   🤖 {len(stats['incomplete_analysis_fr'])} analyses FR à compléter")
            print(f"      Exemples: {', '.join(str(d[0]) for d in stats['incomplete_analysis_fr'][:5])}")

        if stats['missing_analysis']:
            print(f"   🤖 {len(stats['missing_analysis'])} décisions à analyser complètement")
            print(f"      Exemples: {', '.join(str(d[0]) for d in stats['missing_analysis'][:5])}")

        if stats['missing_embedding']:
            print(f"   🧬 {len(stats['missing_embedding'])} embeddings à calculer")
            print(f"      Exemples: {', '.join(str(d[0]) for d in stats['missing_embedding'][:5])}")

    print("\n" + "="*80 + "\n")

    return stats

if __name__ == '__main__':
    audit_decisions()
