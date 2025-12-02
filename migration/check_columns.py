import os
import psycopg2
from dotenv import load_dotenv

load_dotenv('../BB/backend/.env')

DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://postgres:Piano_2025_Sup@db.pxcwsfnuvmowlvtycslc.supabase.co:5432/postgres'
)

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

print('JORADP_DOCUMENTS:')
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='joradp_documents' ORDER BY column_name")
for row in cur.fetchall():
    print(f'  - {row[0]}')

print('\nJORADP_METADATA:')
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='joradp_metadata' ORDER BY column_name")
for row in cur.fetchall():
    print(f'  - {row[0]}')

print('\nFRENCH_DOCUMENTS:')
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='french_documents' ORDER BY column_name")
for row in cur.fetchall():
    print(f'  - {row[0]}')

print('\nFRENCH_METADATA:')
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='french_metadata' ORDER BY column_name")
for row in cur.fetchall():
    print(f'  - {row[0]}')

conn.close()
