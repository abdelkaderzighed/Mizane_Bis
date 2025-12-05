"""
Script pour identifier les documents sans embeddings.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from dotenv import load_dotenv
load_dotenv()

from shared.postgres import get_connection_simple

conn = get_connection_simple()
cur = conn.cursor()

# Trouver les documents analysés mais sans embeddings
cur.execute("""
    SELECT
        id,
        url,
        ai_analysis_status,
        embedding_status,
        analyzed_at
    FROM joradp_documents
    WHERE ai_analysis_status = 'success'
      AND (embeddings_r2 IS NULL OR embedding_status != 'success')
    ORDER BY id
""")

docs = cur.fetchall()

if not docs:
    print("✅ Tous les documents analysés ont des embeddings!")
else:
    print(f"⚠️  Trouvé {len(docs)} document(s) sans embeddings:\n")
    for doc in docs:
        print(f"  ID {doc['id']:5d} | {doc['url'].split('/')[-1]}")
        print(f"           AI: {doc['ai_analysis_status']} | Embedding: {doc['embedding_status'] or 'NULL'}")
        print()

cur.close()
conn.close()
