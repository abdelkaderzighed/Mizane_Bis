"""
Harvester V2 pour la Cour Suprême d'Algérie
Structure: Sections → Thèmes → Décisions
"""
import requests
from bs4 import BeautifulSoup
import sqlite3
from datetime import datetime
import time
import re
from urllib.parse import urljoin

class HarvesterCourSupremeV2:
    def __init__(self, db_path='../../harvester.db'):
        self.db_path = db_path
        self.base_url = 'https://coursupreme.dz'
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
    
    def get_conn(self):
        """Connexion à la base de données"""
        return sqlite3.connect(self.db_path)
    
    def harvest_section(self, chamber_id, max_pages=None):
        """
        Moissonne toutes les décisions d'une section
        
        Args:
            chamber_id: ID de la section en BDD
            max_pages: Nombre max de pages (None = toutes)
        """
        conn = self.get_conn()
        cursor = conn.cursor()
        
        # Récupérer les infos de la section
        cursor.execute("SELECT name_fr, url FROM supreme_court_chambers WHERE id = ?", (chamber_id,))
        result = cursor.fetchone()
        
        if not result:
            print(f"Section {chamber_id} introuvable")
            return
        
        section_name, base_url = result
        
        print(f"\n{'='*60}")
        print(f"🔍 MOISSONNAGE: {section_name}")
        print(f"{'='*60}\n")
        
        page_num = 1
        total_themes = 0
        total_decisions = 0
        empty_pages = 0
        
        while True:
            if max_pages and page_num > max_pages:
                break
            
            # Construire l'URL de la page
            if page_num == 1:
                url = base_url
            else:
                url = f"{base_url}page/{page_num}/"
            
            print(f"📄 Page {page_num}: {url}")
            
            try:
                response = self.session.get(url, timeout=30)
                
                # Si 404, fin de pagination
                if response.status_code == 404:
                    print(f"   ✓ Fin de pagination (404)")
                    break
                
                response.raise_for_status()
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Trouver les thèmes (h4)
                h4_tags = soup.find_all('h4')
                

                
                page_themes = 0
                page_decisions = 0
                
                # Chercher les accordéons
                accordions = soup.find_all('div', class_='accordion-header')
                
                for accordion in accordions:
                    h4 = accordion.find('h4')
                    if not h4:
                        continue
                    
                    theme_name = h4.get_text(strip=True)
                    
                    if not theme_name or len(theme_name) < 3:
                        continue
                    
                    # Insérer ou récupérer le thème
                    cursor.execute("""
                        INSERT OR IGNORE INTO supreme_court_themes 
                        (chamber_id, name_ar, name_fr, url)
                        VALUES (?, ?, ?, ?)
                    """, (chamber_id, theme_name, theme_name, url))
                    
                    cursor.execute("""
                        SELECT id FROM supreme_court_themes 
                        WHERE chamber_id = ? AND name_ar = ?
                    """, (chamber_id, theme_name))
                    
                    result = cursor.fetchone()
                    theme_id = result[0] if result else None
                    
                    if not theme_id:
                        continue
                    
                    # Trouver le div.accordion-content qui suit
                    content_div = accordion.find_next_sibling('div', class_='accordion-content')
                    theme_decisions = 0
                    
                    if content_div:
                        links = content_div.find_all('a', href=lambda h: h and '/decision/' in str(h))
                        
                        for link in links:
                            decision_url = urljoin(self.base_url, link.get('href'))
                            decision_title = link.get_text(strip=True)
                            
                            # Extraire le numéro de dossier
                            number_match = re.search(r'(\d{5,7})', decision_title)
                            decision_number = number_match.group(1) if number_match else 'N/A'
                            
                            # Extraire la date
                            date_match = re.search(r'(\d{2}[-/]\d{2}[-/]\d{4})', decision_title)
                            decision_date = date_match.group(1) if date_match else None
                            
                            # Insérer la décision
                            cursor.execute("""
                                INSERT OR IGNORE INTO supreme_court_decisions
                                (chamber_id, theme_id, decision_number, decision_date, url, download_status)
                                VALUES (?, ?, ?, ?, ?, 'pending')
                            """, (chamber_id, theme_id, decision_number, decision_date, decision_url))
                            
                            if cursor.rowcount > 0:
                                theme_decisions += 1
                        
                    
                    # Compter le thème même si décisions déjà en BDD
                    page_themes += 1
                    if theme_decisions > 0:
                        page_decisions += theme_decisions
                
                print(f"   ✅ {page_themes} thèmes, {page_decisions} décisions")
                
                # Détecter pages vides après comptage
                if page_themes == 0 and page_decisions == 0:
                    empty_pages += 1
                    print(f"   ⚠️  Page vide ({empty_pages}/3)")
                    if empty_pages >= 3:
                        print(f"   ✓ 3 pages vides - Arrêt")
                        break
                else:
                    empty_pages = 0
                
                total_themes += page_themes
                total_decisions += page_decisions
                
                conn.commit()
                
                # Pagination suivante
                page_num += 1
                time.sleep(1)  # Délai entre pages
                
            except Exception as e:
                print(f"   ❌ Erreur: {e}")
                break
        
        conn.close()
        
        print(f"\n{'='*60}")
        print(f"✅ TERMINÉ")
        print(f"   Pages: {page_num - 1}")
        print(f"   Thèmes: {total_themes}")
        print(f"   Décisions: {total_decisions}")
        print(f"{'='*60}\n")
        
        return {
            'pages': page_num - 1,
            'themes': total_themes,
            'decisions': total_decisions
        }

if __name__ == '__main__':
    harvester = HarvesterCourSupremeV2()
    
    # Test sur la section 1 (3 premières pages)
    print("🧪 TEST - Section 1 (3 pages)")
    harvester.harvest_section(chamber_id=1, max_pages=3)
