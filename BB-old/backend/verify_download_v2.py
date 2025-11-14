import sqlite3
import re

conn = sqlite3.connect('harvester.db')
cursor = conn.cursor()

print("=" * 80)
print("📊 ANALYSE COMPLÈTE DU TÉLÉCHARGEMENT")
print("=" * 80)

# 1. Statistiques globales
cursor.execute("""
    SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN download_status = 'success' THEN 1 ELSE 0 END) as downloaded,
        SUM(CASE WHEN download_status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM documents WHERE session_id = 14
""")
stats = cursor.fetchone()
print(f"\n📈 GLOBAL: {stats[1]}/{stats[0]} téléchargés, {stats[2]} échecs")

# 2. Documents par année
print(f"\n📅 ANALYSE PAR ANNÉE:")
print(f"{'Année':<8} {'Total':<8} {'Téléchargés':<12} {'Max N°':<10} {'Statut'}")
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
anomalies = []

for year in sorted(docs_by_year.keys()):
    data = docs_by_year[year]
    nums = sorted(data['nums'])
    
    max_num = max(nums)
    total = len(nums)
    downloaded = data['downloaded']
    
    # Vérifier de 1 à max_num (tous les numéros attendus)
    expected = set(range(1, max_num + 1))
    actual = set(nums)
    missing = expected - actual
    
    # Statut
    if not missing and downloaded == total:
        status = "✅ Complet"
    else:
        issues = []
        if missing:
            issues.append(f"{len(missing)} manquant(s)")
        if downloaded < total:
            issues.append(f"{total - downloaded} non téléchargés")
        status = "⚠️ " + ", ".join(issues)
        
        # Enregistrer l'anomalie
        anomalies.append({
            'year': year,
            'missing': sorted(missing),
            'total': total,
            'max': max_num,
            'downloaded': downloaded
        })
    
    print(f"{year:<8} {total:<8} {downloaded:<12} {max_num:<10} {status}")

# 3. Détails des anomalies
if anomalies:
    print(f"\n🔍 DÉTAILS DES ANOMALIES:")
    print("=" * 80)
    for a in anomalies:
        print(f"\n📌 Année {a['year']}:")
        print(f"   Total présents  : {a['total']}")
        print(f"   Max numéro      : {a['max']}")
        print(f"   Attendus        : {a['max']} (de 001 à {a['max']:03d})")
        print(f"   Manquants       : {len(a['missing'])}")
        
        if len(a['missing']) <= 20:
            print(f"   Numéros absents : {', '.join([f'{n:03d}' for n in a['missing']])}")
        else:
            print(f"   Premiers absents: {', '.join([f'{n:03d}' for n in a['missing'][:20]])}...")

# 4. Échecs de téléchargement
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

conn.close()
print("\n" + "=" * 80)
