#!/usr/bin/env python3
import sqlite3

db_path = '/Users/djamel/Sites/Mizane_Bis/C=A+B/BB/harvester.db'

print("📊 Analyse de harvester.db\n")
print("=" * 60)

conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Tables à analyser
tables = [
    ('sites', 'Sites de moissonnage'),
    ('harvesting_sessions', 'Sessions de moissonnage'),
    ('session_statistics', 'Statistiques de sessions'),
    ('site_archive', 'Archives multi-corpus'),
    ('site_archive_scans', 'Scans d\'archives'),
    ('documents', 'Documents JORADP'),
    ('document_metadata', 'Métadonnées JORADP'),
    ('document_ai_analysis', 'Analyses AI (→ R2)'),
    ('document_embeddings', 'Embeddings (→ R2)'),
    ('joradp_keyword_index', 'Index mots-clés JORADP'),
    ('supreme_court_chambers', 'Chambres Cour Suprême'),
    ('supreme_court_themes', 'Thèmes juridiques'),
    ('supreme_court_decisions', 'Décisions Cour Suprême'),
    ('supreme_court_decision_classifications', 'Classifications'),
    ('french_keyword_index', 'Index mots-clés français'),
]

total_rows = 0

for table, desc in tables:
    try:
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        count = cur.fetchone()[0]
        total_rows += count
        
        if count > 0:
            print(f"✓ {desc:40s} : {count:6d} lignes")
        else:
            print(f"  {desc:40s} : {count:6d} lignes")
    except sqlite3.OperationalError:
        print(f"✗ {desc:40s} : table inexistante")

print("=" * 60)
print(f"TOTAL : {total_rows} lignes à migrer\n")

# Estimer la taille des données volumineuses
print("📦 Estimation données volumineuses (→ R2) :\n")

# Embeddings
try:
    cur.execute("SELECT COUNT(*), SUM(LENGTH(embedding)) FROM document_embeddings")
    count, size = cur.fetchone()
    if count and size:
        print(f"   Embeddings JORADP : {count} vecteurs, ~{size/1024/1024:.1f} MB")
except:
    pass

# AI Analysis
try:
    cur.execute("SELECT COUNT(*), SUM(LENGTH(summary) + LENGTH(keywords) + LENGTH(named_entities)) FROM document_ai_analysis WHERE summary IS NOT NULL")
    count, size = cur.fetchone()
    if count and size:
        print(f"   Analyses AI JORADP : {count} analyses, ~{size/1024/1024:.1f} MB")
except:
    pass

# Supreme Court HTML
try:
    cur.execute("SELECT COUNT(*), SUM(LENGTH(COALESCE(html_content_ar, '')) + LENGTH(COALESCE(html_content_fr, ''))) FROM supreme_court_decisions")
    count, size = cur.fetchone()
    if count and size:
        print(f"   HTML Cour Suprême : {count} décisions, ~{size/1024/1024:.1f} MB")
except:
    pass

# Supreme Court Embeddings
try:
    cur.execute("SELECT COUNT(*), SUM(LENGTH(COALESCE(embedding_ar, '')) + LENGTH(COALESCE(embedding_fr, ''))) FROM supreme_court_decisions WHERE embedding_ar IS NOT NULL OR embedding_fr IS NOT NULL")
    count, size = cur.fetchone()
    if count and size:
        print(f"   Embeddings Cour Suprême : {count} vecteurs, ~{size/1024/1024:.1f} MB")
except:
    pass

conn.close()

print("\n✅ Analyse terminée")
