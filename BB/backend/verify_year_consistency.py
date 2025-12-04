"""
Vérifier la cohérence entre l'année dans l'URL et l'année de publication_date.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from dotenv import load_dotenv
load_dotenv()

from shared.postgres import get_connection_simple
import re

conn = get_connection_simple()
cur = conn.cursor()

# Trouver les documents où l'année dans l'URL != année de publication
cur.execute("""
    SELECT
        id,
        url,
        publication_date
    FROM joradp_documents
    WHERE publication_date IS NOT NULL
    ORDER BY id
""")

results = cur.fetchall()
print(f'Analyse de {len(results)} documents...\n')

divergents = []
concordants = 0

for doc in results:
    url = doc['url']
    pub_date = doc['publication_date']

    # Extraire l'année depuis l'URL (FYYYYNNN.pdf)
    match = re.search(r'/F(\d{4})\d{3}\.pdf$', url)
    if not match:
        continue

    annee_url = match.group(1)
    annee_pub = str(pub_date.year)

    if annee_url != annee_pub:
        divergents.append({
            'id': doc['id'],
            'url': url,
            'annee_url': annee_url,
            'annee_pub': annee_pub,
            'pub_date': pub_date
        })
    else:
        concordants += 1

print(f'Documents avec incohérence année URL vs publication_date: {len(divergents)}\n')

if divergents:
    print('Exemples d\'incohérences trouvées:')
    print('-' * 80)
    for doc in divergents[:15]:
        print(f'ID {doc["id"]:5d} | URL année: {doc["annee_url"]} | Pub année: {doc["annee_pub"]} | Date: {doc["pub_date"]}')
        filename = doc['url'].split('/')[-1]
        print(f'         {filename}')
        print()
else:
    print('✅ Aucune incohérence trouvée !')

total = concordants + len(divergents)
print('=' * 80)
print('Statistiques:')
print(f'  Total documents analysés: {total}')
print(f'  ✅ Concordants (URL = publication): {concordants} ({100*concordants/total:.1f}%)')
print(f'  ⚠️  Divergents (URL ≠ publication): {len(divergents)} ({100*len(divergents)/total:.1f}%)')

cur.close()
conn.close()
