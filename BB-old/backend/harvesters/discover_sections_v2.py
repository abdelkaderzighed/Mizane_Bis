"""
Auto-découverte des sections - Version 2
Basée sur le texte des liens, pas les URLs
"""
import requests
from bs4 import BeautifulSoup
import sqlite3
from urllib.parse import urljoin

def discover_sections():
    print("\n" + "="*70)
    print("🔍 AUTO-DÉCOUVERTE DES SECTIONS V2")
    print("="*70 + "\n")
    
    url = 'https://coursupreme.dz/'
    
    response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=30)
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Mots-clés pour identifier les sections de décisions
    keywords = ['قرارات', 'الغرف', 'لجنة']
    
    # Exclure certains liens non pertinents
    exclude_keywords = ['تعلن', 'إستشارة', 'إعلان']
    
    sections_found = []
    all_links = soup.find_all('a', href=True)
    
    for link in all_links:
        text = link.get_text(strip=True)
        href = link.get('href')
        
        # Doit contenir un mot-clé
        if not any(keyword in text for keyword in keywords):
            continue
        
        # Ne doit pas contenir de mots exclus
        if any(exclude in text for exclude in exclude_keywords):
            continue
        
        # Ignorer le lien parent "من قرارات المحكمة العليا"
        if href == '#':
            continue
        
        # Ignorer les URLs relatives incomplètes
        if href.startswith('/') and len(href) < 10:
            continue
        
        # Construire l'URL complète
        full_url = urljoin('https://coursupreme.dz', href).rstrip('/')
        
        # Vérifier que c'est une URL de section (pas une décision individuelle)
        if '/decision/' in full_url:
            continue
        
        sections_found.append({
            'name_ar': text,
            'url': full_url
        })
    
    # Dédupliquer par URL
    sections_unique = {}
    for section in sections_found:
        url_clean = section['url']
        if url_clean not in sections_unique:
            sections_unique[url_clean] = section
    
    sections_list = list(sections_unique.values())
    
    print(f"✅ {len(sections_list)} sections découvertes\n")
    
    for i, section in enumerate(sections_list, 1):
        print(f"{i}. {section['name_ar']}")
        print(f"   {section['url']}\n")
    
    return sections_list

def sync_to_db(sections):
    print("="*70)
    print("💾 SYNCHRONISATION BASE DE DONNÉES")
    print("="*70 + "\n")
    
    conn = sqlite3.connect('../../harvester.db')
    cursor = conn.cursor()
    
    # Récupérer existantes
    cursor.execute("SELECT url FROM supreme_court_chambers")
    existing_urls = {row[0] for row in cursor.fetchall()}
    
    added = 0
    
    for section in sections:
        if section['url'] not in existing_urls:
            cursor.execute("""
                INSERT INTO supreme_court_chambers (name_ar, name_fr, url, active)
                VALUES (?, ?, ?, 1)
            """, (section['name_ar'], section['name_ar'], section['url']))
            added += 1
            print(f"➕ {section['name_ar']}")
    
    conn.commit()
    
    cursor.execute("SELECT COUNT(*) FROM supreme_court_chambers WHERE active = 1")
    total = cursor.fetchone()[0]
    
    conn.close()
    
    print(f"\n✅ Nouvelles : {added}")
    print(f"✅ Total BDD : {total}\n")
    
    return total

if __name__ == '__main__':
    sections = discover_sections()
    
    if sections:
        sync_to_db(sections)
