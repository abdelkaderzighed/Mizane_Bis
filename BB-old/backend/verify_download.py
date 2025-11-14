import sqlite3
import re

conn = sqlite3.connect('harvester.db')
cursor = conn.cursor()

print("=" * 80)
print("📊 ANALYSE DU TÉLÉCHARGEMENT")
print("=" * 80)

# 1. Statistiques globales
cursor.execute("""
    SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN download_status = 'success' THEN 1 ELSE 0 END) as downloaded,
        SUM(CASE WHEN download_status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN download_status = 'pending' THEN 1 ELSE 0 END) as pending
    FROM documents WHERE session_id = 14
""")
stats = cursor.fetchone()
print(f"\n📈 STATISTIQUES GLOBALES:")
print(f"   Total documents    : {stats[0]}")
print(f"   ✅ Téléchargés     : {stats[1]}")
print(f"   ❌ Échecs          : {stats[2]}")
print(f"   ⏳ En attente      : {stats[3]}")

# 2. Documents par année
print(f"\n📅 DOCUMENTS PAR ANNÉE:")
print(f"{'Année':<8} {'Total':<8} {'Téléchargés':<15} {'Min N°':<10} {'Max N°':<10} {'Manquants'}")
print("-" * 80)

cursor.execute("""
    SELECT url, download_status 
    FROM documents 
    WHERE session_id = 14
    ORDER BY url
""")

docs_by_year = {}
for row in cursor.fetchall():
    url = row[0]
    status = row[1]
    
    # Extraire année et numéro depuis URL (ex: F1962001.pdf)
    match = re.search(r'F(\d{4})(\d{3})\.pdf', url)
    if match:
        year = match.group(1)
        num = int(match.group(2))
        
        if year not in docs_by_year:
            docs_by_year[year] = {'nums': [], 'downloaded': 0}
        
        docs_by_year[year]['nums'].append(num)
        if status == 'success':
            docs_by_year[year]['downloaded'] += 1

# Analyser chaque année
for year in sorted(docs_by_year.keys()):
    data = docs_by_year[year]
    nums = sorted(data['nums'])
    
    min_num = min(nums)
    max_num = max(nums)
    total = len(nums)
    downloaded = data['downloaded']
    
    # Détecter les trous
    expected = set(range(min_num, max_num + 1))
    actual = set(nums)
    missing = expected - actual
    
    missing_str = f"{len(missing)} manquant(s)" if missing else "✓ Complet"
    if missing and len(missing) <= 10:
        missing_str += f" [{','.join(map(str, sorted(missing)))}]"
    
    print(f"{year:<8} {total:<8} {downloaded:<15} {min_num:<10} {max_num:<10} {missing_str}")

# 3. Vérifications spécifiques
print(f"\n🔍 VÉRIFICATIONS:")

# Vérifier 1962 commence au n°1
cursor.execute("""
    SELECT url FROM documents 
    WHERE session_id = 14 AND url LIKE '%F1962001.pdf%'
""")
if cursor.fetchone():
    print("   ✅ 1962 commence bien au numéro 001")
else:
    print("   ❌ 1962 ne commence PAS au numéro 001")

# Vérifier année actuelle
cursor.execute("""
    SELECT url FROM documents 
    WHERE session_id = 14 AND url LIKE '%F2025%'
    ORDER BY url DESC LIMIT 1
""")
last = cursor.fetchone()
if last:
    match = re.search(r'F2025(\d{3})\.pdf', last[0])
    if match:
        print(f"   ✅ 2025 va jusqu'au numéro {match.group(1)}")

# Documents avec échec de téléchargement
cursor.execute("""
    SELECT COUNT(*) FROM documents 
    WHERE session_id = 14 AND download_status = 'failed'
""")
failed_count = cursor.fetchone()[0]
if failed_count > 0:
    print(f"\n❌ ÉCHECS DE TÉLÉCHARGEMENT ({failed_count} documents):")
    cursor.execute("""
        SELECT url FROM documents 
        WHERE session_id = 14 AND download_status = 'failed'
        LIMIT 20
    """)
    for row in cursor.fetchall():
        print(f"   - {row[0]}")
    if failed_count > 20:
        print(f"   ... et {failed_count - 20} autres")

conn.close()
print("\n" + "=" * 80)
