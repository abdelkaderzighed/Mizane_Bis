"""
Auto-découverte des sections depuis le menu du site
"""
import requests
from bs4 import BeautifulSoup
import sqlite3
import re

def discover_sections():
    """Découvre automatiquement toutes les sections depuis le menu"""
    
    print("\n" + "="*70)
    print("🔍 AUTO-DÉCOUVERTE DES SECTIONS")
    print("="*70 + "\n")
    
    url = 'https://coursupreme.dz/'
    
    try:
        response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=30)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Chercher le menu "من قرارات المحكمة العليا"
        # Typiquement dans un <ul> ou <nav>
        
        sections_found = []
        
        # Méthode 1 : Chercher tous les liens contenant les patterns connus
        links = soup.find_all('a', href=True)
        
        for link in links:
            href = link.get('href')
            text = link.get_text(strip=True)
            
            # Patterns de sections connues
            if any(pattern in str(href) for pattern in [
                'قرارات-مصنفة',
                'الغرف-الجزائية',
                'الغرف-المدنية',
                'لجنة-التعويض',
                'الغرف-المجتمعة',
                'قرارات-مهمة'
            ]):
                full_url = href if href.startswith('http') else f'https://coursupreme.dz{href}'
                sections_found.append({
                    'name_ar': text,
                    'url': full_url
                })
        
        # Dédupliquer
        sections_unique = {}
        for section in sections_found:
            url_clean = section['url'].rstrip('/')
            if url_clean not in sections_unique:
                sections_unique[url_clean] = section
        
        sections_list = list(sections_unique.values())
        
        print(f"✅ {len(sections_list)} sections découvertes sur le site\n")
        
        for i, section in enumerate(sections_list, 1):
            print(f"{i}. {section['name_ar']}")
            print(f"   URL: {section['url']}\n")
        
        return sections_list
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return []

def sync_sections_to_db(sections):
    """Synchronise les sections découvertes avec la BDD"""
    
    print("\n" + "="*70)
    print("💾 SYNCHRONISATION AVEC LA BASE DE DONNÉES")
    print("="*70 + "\n")
    
    conn = sqlite3.connect('../../harvester.db')
    cursor = conn.cursor()
    
    # Récupérer sections existantes
    cursor.execute("SELECT url, name_ar FROM supreme_court_chambers")
    existing = {row[0]: row[1] for row in cursor.fetchall()}
    
    added = 0
    updated = 0
    
    for section in sections:
        url = section['url'].rstrip('/')
        
        if url not in existing:
            # Nouvelle section
            cursor.execute("""
                INSERT INTO supreme_court_chambers (name_ar, name_fr, url, active)
                VALUES (?, ?, ?, 1)
            """, (section['name_ar'], section['name_ar'], url))
            added += 1
            print(f"➕ Ajoutée : {section['name_ar']}")
        else:
            # Vérifier si le nom a changé
            if existing[url] != section['name_ar']:
                cursor.execute("""
                    UPDATE supreme_court_chambers 
                    SET name_ar = ?, name_fr = ?
                    WHERE url = ?
                """, (section['name_ar'], section['name_ar'], url))
                updated += 1
                print(f"🔄 Mise à jour : {section['name_ar']}")
    
    conn.commit()
    
    # Afficher résumé
    cursor.execute("SELECT COUNT(*) FROM supreme_court_chambers WHERE active = 1")
    total = cursor.fetchone()[0]
    
    conn.close()
    
    print(f"\n{'='*70}")
    print(f"✅ SYNCHRONISATION TERMINÉE")
    print(f"   Nouvelles sections : {added}")
    print(f"   Mises à jour       : {updated}")
    print(f"   Total en BDD       : {total}")
    print(f"{'='*70}\n")
    
    return total

if __name__ == '__main__':
    sections = discover_sections()
    
    if sections:
        sync_sections_to_db(sections)
        
        print("\n" + "="*70)
        print("📋 SECTIONS ACTIVES EN BASE DE DONNÉES")
        print("="*70 + "\n")
        
        conn = sqlite3.connect('../../harvester.db')
        cursor = conn.cursor()
        
        cursor.execute("SELECT id, name_ar, url FROM supreme_court_chambers WHERE active = 1 ORDER BY id")
        
        for row in cursor.fetchall():
            print(f"{row[0]}. {row[1]}")
            print(f"   {row[2]}\n")
        
        conn.close()
