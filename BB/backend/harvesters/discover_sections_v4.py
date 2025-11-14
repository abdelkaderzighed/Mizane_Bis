"""
Auto-découverte des sections - Version 4
Décodage des URLs encodées
"""
import requests
from bs4 import BeautifulSoup
import sqlite3
from urllib.parse import urljoin, unquote

def discover_sections():
    print("\n" + "="*70)
    print("🔍 AUTO-DÉCOUVERTE DES SECTIONS V4 (URLs décodées)")
    print("="*70 + "\n")
    
    url = 'https://coursupreme.dz/'
    response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=30)
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # PATTERNS STRICTS
    section_patterns = [
        'قرارات-مصنفة',
        'الغرف-الجزائية',
        'الغرف-المدنية',
        'لجنة-التعويض',
        'الغرف-المجتمعة',
        'قرارات-مهمة'
    ]
    
    sections_found = []
    all_links = soup.find_all('a', href=True)
    
    for link in all_links:
        text = link.get_text(strip=True)
        href = link.get('href')
        
        if not href or href == '#':
            continue
        
        # Décoder l'URL
        href_decoded = unquote(href)
        
        # Vérifier patterns
        if not any(pattern in href_decoded for pattern in section_patterns):
            continue
        
        full_url = urljoin('https://coursupreme.dz', href).rstrip('/')
        
        if '/decision/' in full_url:
            continue
        
        sections_found.append({
            'name_ar': text,
            'url': full_url
        })
    
    # Dédupliquer
    sections_unique = {}
    for section in sections_found:
        if section['url'] not in sections_unique:
            sections_unique[section['url']] = section
    
    sections_list = list(sections_unique.values())
    
    print(f"✅ {len(sections_list)} sections découvertes\n")
    
    for i, section in enumerate(sections_list, 1):
        print(f"{i}. {section['name_ar']}")
        print(f"   {section['url']}\n")
    
    return sections_list

def sync_to_db(sections):
    print("="*70)
    print("💾 SYNCHRONISATION")
    print("="*70 + "\n")
    
    conn = sqlite3.connect('../../harvester.db')
    cursor = conn.cursor()
    
    # Désactiver anciennes
    cursor.execute("UPDATE supreme_court_chambers SET active = 0")
    
    for section in sections:
        cursor.execute("SELECT id FROM supreme_court_chambers WHERE url = ?", (section['url'],))
        
        if cursor.fetchone():
            cursor.execute("UPDATE supreme_court_chambers SET active = 1 WHERE url = ?", (section['url'],))
            print(f"✅ {section['name_ar']}")
        else:
            cursor.execute("""
                INSERT INTO supreme_court_chambers (name_ar, name_fr, url, active)
                VALUES (?, ?, ?, 1)
            """, (section['name_ar'], section['name_ar'], section['url']))
            print(f"➕ {section['name_ar']}")
    
    conn.commit()
    cursor.execute("SELECT COUNT(*) FROM supreme_court_chambers WHERE active = 1")
    total = cursor.fetchone()[0]
    conn.close()
    
    print(f"\n✅ Total actives : {total}\n")

if __name__ == '__main__':
    sections = discover_sections()
    if sections:
        sync_to_db(sections)
