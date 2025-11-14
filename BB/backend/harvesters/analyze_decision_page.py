"""
Analyse de la structure d'une page de décision
"""
import requests
from bs4 import BeautifulSoup
import sqlite3

# Récupérer une décision exemple depuis la BDD
conn = sqlite3.connect('../../harvester.db')
cursor = conn.cursor()

cursor.execute("""
    SELECT decision_number, url 
    FROM supreme_court_decisions 
    WHERE download_status = 'pending'
    LIMIT 1
""")

result = cursor.fetchone()
conn.close()

if not result:
    print("❌ Aucune décision en attente")
    exit()

decision_number, url = result

print(f"🔍 ANALYSE DÉCISION: {decision_number}")
print(f"URL: {url}\n")

response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=30)
soup = BeautifulSoup(response.content, 'html.parser')

print("="*70)
print("STRUCTURE HTML")
print("="*70 + "\n")

# Chercher le contenu principal
article = soup.find('article') or soup.find('main')

if article:
    print("✅ Élément principal trouvé\n")
    
    # Chercher les sections de contenu
    print("1️⃣  Titres et headers:")
    headers = article.find_all(['h1', 'h2', 'h3', 'h4'])
    for i, h in enumerate(headers[:5]):
        print(f"   {h.name}: {h.get_text(strip=True)[:60]}")
    
    print("\n2️⃣  Paragraphes:")
    paragraphs = article.find_all('p')
    print(f"   {len(paragraphs)} paragraphes trouvés")
    if paragraphs:
        print(f"   Premier: {paragraphs[0].get_text(strip=True)[:80]}")
    
    print("\n3️⃣  Divs avec classes:")
    divs = article.find_all('div', class_=True)
    classes_found = set()
    for div in divs:
        classes = div.get('class', [])
        classes_found.update(classes)
    
    for cls in list(classes_found)[:10]:
        print(f"   - {cls}")
    
    print("\n4️⃣  Recherche contenu AR/FR:")
    
    # Chercher patterns AR
    text_all = article.get_text()
    has_arabic = bool([c for c in text_all if '\u0600' <= c <= '\u06FF'][:10])
    has_french = bool([word for word in text_all.split() if word.lower() in ['le', 'la', 'de', 'et', 'pour']][:5])
    
    print(f"   Contenu arabe: {'✅' if has_arabic else '❌'}")
    print(f"   Contenu français: {'✅' if has_french else '❌'}")
    
    print("\n5️⃣  HTML complet (premiers 2000 car):")
    print(article.prettify()[:2000])
    
else:
    print("❌ Pas d'élément article/main trouvé")
    print("\n5️⃣  HTML brut body:")
    body = soup.find('body')
    if body:
        print(body.prettify()[:2000])

