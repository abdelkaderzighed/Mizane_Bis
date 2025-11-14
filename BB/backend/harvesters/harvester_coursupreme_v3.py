"""
Harvester V3 pour la Cour Suprême d'Algérie
Structure Many-to-Many: Une décision peut être dans plusieurs sections/thèmes
"""
import requests
from bs4 import BeautifulSoup
import sqlite3
from datetime import datetime
import time
import re
from urllib.parse import urljoin
class HarvesterCourSupremeV3:
    def __init__(self, db_path='../../harvester.db'):
        self.db_path = db_path
        self.base_url = 'https://coursupreme.dz'
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
    def get_conn(self):
        return sqlite3.connect(self.db_path)
    def harvest_section(self, chamber_id, max_pages=None):
        """Moissonne une section avec structure Many-to-Many"""
        conn = self.get_conn()
        cursor = conn.cursor()
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
            url = base_url if page_num == 1 else f"{base_url}page/{page_num}/"
            print(f"📄 Page {page_num}: {url}")
            try:
                response = self.session.get(url, timeout=30)
                if response.status_code == 404:
                    print(f"   ✓ 404 - Fin")
                    break
                response.raise_for_status()
                soup = BeautifulSoup(response.content, 'html.parser')
                accordions = soup.find_all('div', class_='accordion-header')
                page_themes = 0
                page_decisions = 0
                for accordion in accordions:
                    h4 = accordion.find('h4')
                    if not h4:
                        continue
                    theme_name = h4.get_text(strip=True)
                    if not theme_name or len(theme_name) < 3:
                        continue
                    # Insérer/récupérer thème
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
                    page_themes += 1
                    # Trouver décisions
                    content_div = accordion.find_next_sibling('div', class_='accordion-content')
                    theme_decisions = 0
                    if content_div:
                        links = content_div.find_all('a', href=lambda h: h and '/decision/' in str(h))
                        for link in links:
                            decision_url = urljoin(self.base_url, link.get('href'))
                            decision_title = link.get_text(strip=True)
                            # Extraire numéro
                            number_match = re.search(r'(\d{5,7})', decision_title)
                            decision_number = number_match.group(1) if number_match else f"NUM_{hash(decision_url) % 1000000}"
                            # Extraire date
                            date_match = re.search(r'(\d{2}[-/]\d{2}[-/]\d{4})', decision_title)
                            decision_date = date_match.group(1) if date_match else None
                            # Insérer décision (unique)
                            cursor.execute("""
                                INSERT OR IGNORE INTO supreme_court_decisions
                                (decision_number, decision_date, url, download_status)
                                VALUES (?, ?, ?, 'pending')
                            """, (decision_number, decision_date, decision_url))
                            # Récupérer decision_id
                            cursor.execute("""
                                SELECT id FROM supreme_court_decisions 
                                WHERE decision_number = ?
                            """, (decision_number,))
                            decision_id = cursor.fetchone()[0]
                            # Insérer classification
                            cursor.execute("""
                                INSERT OR IGNORE INTO supreme_court_decision_classifications
                                (decision_id, chamber_id, theme_id)
                                VALUES (?, ?, ?)
                            """, (decision_id, chamber_id, theme_id))
                            if cursor.rowcount > 0:
                                theme_decisions += 1
                        page_decisions += theme_decisions
                print(f"   ✅ {page_themes} thèmes, {page_decisions} décisions")
                # Détecter pages vides (0 décisions = vide)
                if page_decisions == 0:
                    empty_pages += 1
                    print(f'   ⚠️  Aucune nouvelle décision ({empty_pages}/2)')
                    if empty_pages >= 2:
                        print(f'   ✓ 2 pages consécutives vides - Arrêt')
                        break
                else:
                    empty_pages = 0
                total_decisions += page_decisions
                conn.commit()
                page_num += 1
                time.sleep(1)
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
        return {'pages': page_num - 1, 'themes': total_themes, 'decisions': total_decisions}
if __name__ == '__main__':
    harvester = HarvesterCourSupremeV3()
    print("🧪 TEST V3 - Section 5")
    harvester.harvest_section(chamber_id=5, max_pages=2)
