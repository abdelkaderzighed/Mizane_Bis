#!/usr/bin/env python3
"""Check download_status of documents with inconsistent dates."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from dotenv import load_dotenv
load_dotenv()

from shared.postgres import get_connection_simple
import re

conn = get_connection_simple()
cur = conn.cursor()

# Get first 10 inconsistent document IDs
cur.execute('''
    SELECT id, url, publication_date, download_status, ai_analysis_status
    FROM joradp_documents
    WHERE publication_date IS NOT NULL
    AND ai_analysis_status = 'success'
    ORDER BY id
    LIMIT 200
''')

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
        print(f"ID {doc['id']:5d}: download_status={doc['download_status']:<10} ai_status={doc['ai_analysis_status']:<10} URL_year={annee_url} pub_year={annee_pub}")
        inconsistent.append(doc['id'])
        if len(inconsistent) >= 10:
            break

cur.close()
conn.close()

print(f"\nTotal found: {len(inconsistent)}")
