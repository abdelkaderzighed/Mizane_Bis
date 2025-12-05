#!/usr/bin/env python3
"""Analyser les documents qui ont échoué lors de la correction par lots."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from dotenv import load_dotenv
load_dotenv()

from shared.postgres import get_connection_simple
import re

conn = get_connection_simple()
cur = conn.cursor()

# Récupérer quelques documents incohérents pour analyse
cur.execute("""
    SELECT
        id,
        url,
        publication_date,
        text_extraction_status,
        text_path_r2,
        ai_analysis_status,
        error_log
    FROM joradp_documents
    WHERE publication_date IS NOT NULL
    AND ai_analysis_status = 'success'
    ORDER BY id
    LIMIT 500
""")

results = cur.fetchall()
inconsistent = []

for doc in results:
    url = doc['url']
    pub_date = doc['publication_date']

    match = re.search(r'/F(\d{4})\d{3}\.pdf$', url)
    if not match:
        continue

    annee_url = int(match.group(1))
    annee_pub = pub_date.year

    if abs(annee_url - annee_pub) > 1:
        inconsistent.append(doc)
        if len(inconsistent) >= 10:
            break

print(f"Analyse de {len(inconsistent)} documents incohérents:\n")
print("=" * 100)

for doc in inconsistent:
    url = doc['url']
    pub_date = doc['publication_date']

    match = re.search(r'/F(\d{4})\d{3}\.pdf$', url)
    annee_url = match.group(1) if match else "???"

    print(f"\n📄 Document ID {doc['id']}")
    print(f"   URL: {url.split('/')[-1]}")
    print(f"   Année URL: {annee_url} | Année pub_date: {pub_date.year}")
    print(f"   Texte extrait: {doc['text_extraction_status']}")
    print(f"   Text path R2: {'✅' if doc['text_path_r2'] else '❌'}")
    print(f"   Erreur: {doc['error_log'][:100] if doc['error_log'] else 'None'}")

    # Vérifier si le texte existe
    if doc['text_path_r2']:
        try:
            from shared.r2 import download_from_r2
            text = download_from_r2(doc['text_path_r2'])
            if text:
                text_str = text.decode('utf-8') if isinstance(text, bytes) else text
                print(f"   Longueur texte: {len(text_str)} caractères")
                print(f"   Premier 200 chars: {text_str[:200]}")
            else:
                print(f"   ⚠️  Texte vide ou non récupérable")
        except Exception as e:
            print(f"   ⚠️  Erreur lecture texte: {e}")
    else:
        print(f"   ⚠️  Pas de texte extrait")

cur.close()
conn.close()
