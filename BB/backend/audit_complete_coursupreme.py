#!/usr/bin/env python3
"""
Audit complet détaillé des décisions de la Cour Suprême
Vérifie : fichiers locaux, analyses complètes, embeddings
"""

import sqlite3
import os

DB_PATH = 'harvester.db'

def audit_complete():
    """Audit complet des décisions"""

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            id,
            decision_number,
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
            embedding_ar,
            embedding_fr
        FROM supreme_court_decisions
        ORDER BY id
    """)

    decisions = cursor.fetchall()
    conn.close()

    total = len(decisions)

    print("="*80)
    print(f"📊 AUDIT COMPLET - COUR SUPRÊME")
    print("="*80)
    print(f"\n📋 Total de décisions: {total}\n")

    # Statistiques détaillées
    stats = {
        'has_file_ar': 0,
        'has_file_fr': 0,
        'has_both_files': 0,
        'file_ar_exists': 0,
        'file_fr_exists': 0,
        'both_files_exist': 0,
        'has_title_ar': 0,
        'has_title_fr': 0,
        'has_summary_ar': 0,
        'has_summary_fr': 0,
        'has_keywords_ar': 0,
        'has_keywords_fr': 0,
        'has_entities_ar': 0,
        'has_entities_fr': 0,
        'has_embedding': 0,
        'analysis_complete_ar': 0,
        'analysis_complete_fr': 0,
        'analysis_complete_both': 0,
        'fully_complete': 0,
        'missing_files': [],
        'missing_analysis': [],
        'missing_embedding': []
    }

    for dec in decisions:
        dec_id = dec['id']

        # 1. Fichiers locaux
        has_path_ar = dec['file_path_ar'] is not None and dec['file_path_ar'] != ''
        has_path_fr = dec['file_path_fr'] is not None and dec['file_path_fr'] != ''

        if has_path_ar:
            stats['has_file_ar'] += 1
        if has_path_fr:
            stats['has_file_fr'] += 1
        if has_path_ar and has_path_fr:
            stats['has_both_files'] += 1

        # Vérifier si les fichiers existent réellement
        file_ar_exists = has_path_ar and os.path.exists(dec['file_path_ar'])
        file_fr_exists = has_path_fr and os.path.exists(dec['file_path_fr'])

        if file_ar_exists:
            stats['file_ar_exists'] += 1
        if file_fr_exists:
            stats['file_fr_exists'] += 1
        if file_ar_exists and file_fr_exists:
            stats['both_files_exist'] += 1

        if has_path_ar and not file_ar_exists:
            stats['missing_files'].append((dec_id, 'AR', dec['file_path_ar']))
        if has_path_fr and not file_fr_exists:
            stats['missing_files'].append((dec_id, 'FR', dec['file_path_fr']))

        # 2. Analyses
        has_title_ar = dec['title_ar'] is not None and dec['title_ar'] != ''
        has_title_fr = dec['title_fr'] is not None and dec['title_fr'] != ''
        has_summary_ar = dec['summary_ar'] is not None and dec['summary_ar'] != ''
        has_summary_fr = dec['summary_fr'] is not None and dec['summary_fr'] != ''
        has_keywords_ar = dec['keywords_ar'] is not None and dec['keywords_ar'] != ''
        has_keywords_fr = dec['keywords_fr'] is not None and dec['keywords_fr'] != ''
        has_entities_ar = dec['entities_ar'] is not None and dec['entities_ar'] != ''
        has_entities_fr = dec['entities_fr'] is not None and dec['entities_fr'] != ''

        if has_title_ar: stats['has_title_ar'] += 1
        if has_title_fr: stats['has_title_fr'] += 1
        if has_summary_ar: stats['has_summary_ar'] += 1
        if has_summary_fr: stats['has_summary_fr'] += 1
        if has_keywords_ar: stats['has_keywords_ar'] += 1
        if has_keywords_fr: stats['has_keywords_fr'] += 1
        if has_entities_ar: stats['has_entities_ar'] += 1
        if has_entities_fr: stats['has_entities_fr'] += 1

        # Analyse complète par langue
        analysis_ar_complete = has_title_ar and has_summary_ar and has_keywords_ar and has_entities_ar
        analysis_fr_complete = has_title_fr and has_summary_fr and has_keywords_fr and has_entities_fr

        if analysis_ar_complete:
            stats['analysis_complete_ar'] += 1
        if analysis_fr_complete:
            stats['analysis_complete_fr'] += 1
        if analysis_ar_complete and analysis_fr_complete:
            stats['analysis_complete_both'] += 1
        elif file_ar_exists and file_fr_exists:
            stats['missing_analysis'].append(dec_id)

        # 3. Embeddings
        has_embedding_ar = dec['embedding_ar'] is not None and len(dec['embedding_ar']) > 0
        has_embedding_fr = dec['embedding_fr'] is not None and len(dec['embedding_fr']) > 0
        has_both_embeddings = has_embedding_ar and has_embedding_fr

        if has_both_embeddings:
            stats['has_embedding'] += 1
        elif file_ar_exists or file_fr_exists:
            stats['missing_embedding'].append(dec_id)

        # 4. Tout complet
        if file_ar_exists and file_fr_exists and analysis_ar_complete and analysis_fr_complete and has_both_embeddings:
            stats['fully_complete'] += 1

    # Afficher les résultats
    print("📁 FICHIERS LOCAUX:")
    print(f"   Chemins AR enregistrés:      {stats['has_file_ar']:4d} / {total} ({stats['has_file_ar']/total*100:5.1f}%)")
    print(f"   Chemins FR enregistrés:      {stats['has_file_fr']:4d} / {total} ({stats['has_file_fr']/total*100:5.1f}%)")
    print(f"   Les deux chemins:            {stats['has_both_files']:4d} / {total} ({stats['has_both_files']/total*100:5.1f}%)")
    print()
    print(f"   ✅ Fichiers AR existants:     {stats['file_ar_exists']:4d} / {total} ({stats['file_ar_exists']/total*100:5.1f}%)")
    print(f"   ✅ Fichiers FR existants:     {stats['file_fr_exists']:4d} / {total} ({stats['file_fr_exists']/total*100:5.1f}%)")
    print(f"   ✅ Les deux existent:         {stats['both_files_exist']:4d} / {total} ({stats['both_files_exist']/total*100:5.1f}%)")
    if stats['missing_files']:
        print(f"   ⚠️  Fichiers manquants:       {len(stats['missing_files'])}")

    print("\n🤖 ANALYSES IA:")
    print(f"   Titres AR:                   {stats['has_title_ar']:4d} / {total} ({stats['has_title_ar']/total*100:5.1f}%)")
    print(f"   Titres FR:                   {stats['has_title_fr']:4d} / {total} ({stats['has_title_fr']/total*100:5.1f}%)")
    print(f"   Résumés AR:                  {stats['has_summary_ar']:4d} / {total} ({stats['has_summary_ar']/total*100:5.1f}%)")
    print(f"   Résumés FR:                  {stats['has_summary_fr']:4d} / {total} ({stats['has_summary_fr']/total*100:5.1f}%)")
    print(f"   Mots-clés AR:                {stats['has_keywords_ar']:4d} / {total} ({stats['has_keywords_ar']/total*100:5.1f}%)")
    print(f"   Mots-clés FR:                {stats['has_keywords_fr']:4d} / {total} ({stats['has_keywords_fr']/total*100:5.1f}%)")
    print(f"   Entités AR:                  {stats['has_entities_ar']:4d} / {total} ({stats['has_entities_ar']/total*100:5.1f}%)")
    print(f"   Entités FR:                  {stats['has_entities_fr']:4d} / {total} ({stats['has_entities_fr']/total*100:5.1f}%)")
    print()
    print(f"   ✅ Analyse AR complète:       {stats['analysis_complete_ar']:4d} / {total} ({stats['analysis_complete_ar']/total*100:5.1f}%)")
    print(f"   ✅ Analyse FR complète:       {stats['analysis_complete_fr']:4d} / {total} ({stats['analysis_complete_fr']/total*100:5.1f}%)")
    print(f"   ✅ Analyses bilingues OK:     {stats['analysis_complete_both']:4d} / {total} ({stats['analysis_complete_both']/total*100:5.1f}%)")
    if stats['missing_analysis']:
        print(f"   ⚠️  Analyses manquantes:      {len(stats['missing_analysis'])}")

    print("\n🧬 EMBEDDINGS:")
    print(f"   ✅ Embeddings AR+FR calculés: {stats['has_embedding']:4d} / {total} ({stats['has_embedding']/total*100:5.1f}%)")
    if stats['missing_embedding']:
        print(f"   ⚠️  Embeddings manquants:     {len(stats['missing_embedding'])}")

    print("\n" + "="*80)
    print("✅ DÉCISIONS 100% COMPLÈTES")
    print("="*80)
    print(f"   (Fichiers AR+FR + Analyses AR+FR + Embeddings AR+FR)")
    print(f"   {stats['fully_complete']:4d} / {total} ({stats['fully_complete']/total*100:5.1f}%)")

    remaining = total - stats['fully_complete']
    if remaining > 0:
        print(f"\n   ⚠️  Encore {remaining} décisions à compléter")
    else:
        print(f"\n   🎉 Toutes les décisions sont complètes !")

    print("\n" + "="*80 + "\n")

    return stats

if __name__ == '__main__':
    audit_complete()
