"""
Harvester V5 Final - Cour Suprême d'Algérie
Stratégie exhaustive avec auto-découverte
"""
import requests
from bs4 import BeautifulSoup
import sqlite3
from datetime import datetime
import time
import re
from urllib.parse import urljoin, unquote

class HarvesterCourSupremeV5:
    def __init__(self, db_path='../../harvester.db'):
        self.db_path = db_path
        self.base_url = 'https://coursupreme.dz'
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
    
    def get_conn(self):
        return sqlite3.connect(self.db_path)
    
    def discover_and_sync_sections(self):
        """Auto-découverte et synchronisation des sections"""
        print("\n" + "="*70)
        print("🔍 AUTO-DÉCOUVERTE DES SECTIONS")
        print("="*70 + "\n")
        
        try:
            response = self.session.get(self.base_url, timeout=30)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            section_patterns = [
                'قرارات-مصنفة',
                'الغرف-الجزائية',
                'الغرف-المدنية',
                'لجنة-التعويض',
                'الغرف-المجتمعة',
                'قرارات-مهمة'
            ]
            
            sections_found = []
            
            for link in soup.find_all('a', href=True):
                href = link.get('href')
                text = link.get_text(strip=True)
                
                if not href or href == '#':
                    continue
                
                href_decoded = unquote(href)
                
                if not any(pattern in href_decoded for pattern in section_patterns):
                    continue
                
                full_url = urljoin(self.base_url, href).rstrip('/')
                
                if '/decision/' not in full_url:
                    sections_found.append({'name_ar': text, 'url': full_url})
            
            # Dédupliquer
            sections_unique = {}
            for s in sections_found:
                if s['url'] not in sections_unique:
                    sections_unique[s['url']] = s
            
            sections = list(sections_unique.values())
            
            print(f"✅ {len(sections)} sections découvertes\n")
            
            # Synchroniser avec BDD
            conn = self.get_conn()
            cursor = conn.cursor()
            
            cursor.execute("UPDATE supreme_court_chambers SET active = 0")
            
            for section in sections:
                cursor.execute("SELECT id FROM supreme_court_chambers WHERE url = ?", (section['url'],))
                exists = cursor.fetchone()
                
                if exists:
                    cursor.execute("UPDATE supreme_court_chambers SET active = 1, name_ar = ? WHERE url = ?",
                                 (section['name_ar'], section['url']))
                else:
                    cursor.execute("""
                        INSERT INTO supreme_court_chambers (name_ar, name_fr, url, active)
                        VALUES (?, ?, ?, 1)
                    """, (section['name_ar'], section['name_ar'], section['url']))
            
            conn.commit()
            
            cursor.execute("SELECT id, name_ar FROM supreme_court_chambers WHERE active = 1 ORDER BY id")
            active_sections = cursor.fetchall()
            
            conn.close()
            
            for section_id, name in active_sections:
                print(f"  {section_id}. {name}")
            
            print()
            
            return [s[0] for s in active_sections]
            
        except Exception as e:
            print(f"❌ Erreur découverte: {e}")
            return []
    
    def harvest_all_exhaustive(self):
        """Moissonnage exhaustif de toutes les sections"""
        
        # ÉTAPE 1: Découvrir les sections
        section_ids = self.discover_and_sync_sections()
        
        if not section_ids:
            print("❌ Aucune section à moissonner")
            return
        
        # ÉTAPE 2: Compter avant
        conn = self.get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM supreme_court_decisions")
        decisions_avant = cursor.fetchone()[0]
        conn.close()
        
        print("="*70)
        print(f"🚀 MOISSONNAGE EXHAUSTIF - {len(section_ids)} SECTIONS")
        print("="*70)
        print(f"Décisions avant : {decisions_avant}\n")
        
        # ÉTAPE 3: Moissonner chaque section
        total_nouvelles = 0
        
        for section_id in section_ids:
            conn = self.get_conn()
            cursor = conn.cursor()
            cursor.execute("SELECT name_ar FROM supreme_court_chambers WHERE id = ?", (section_id,))
            section_name = cursor.fetchone()[0]
            conn.close()
            
            print(f"\n{'='*70}")
            print(f"📂 SECTION {section_id}: {section_name}")
            print(f"{'='*70}\n")
            
            result = self.harvest_section(chamber_id=section_id)
            total_nouvelles += result['decisions']
            
            print(f"\n✅ Section {section_id} : {result['decisions']} nouvelles décisions")
            
            time.sleep(2)
        
        # ÉTAPE 4: Stats finales
        conn = self.get_conn()
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM supreme_court_decisions")
        decisions_apres = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM supreme_court_decision_classifications")
        total_classifications = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(DISTINCT theme_id) FROM supreme_court_decision_classifications")
        total_themes = cursor.fetchone()[0]
        
        conn.close()
        
        print(f"\n{'='*70}")
        print("🎉 MOISSONNAGE EXHAUSTIF TERMINÉ")
        print(f"{'='*70}")
        print(f"Décisions avant        : {decisions_avant}")
        print(f"Décisions après        : {decisions_apres}")
        print(f"Nouvelles décisions    : {decisions_apres - decisions_avant}")
        print(f"Classifications totales: {total_classifications}")
        print(f"Thèmes uniques         : {total_themes}")
        print(f"{'='*70}\n")
    
    def harvest_section(self, chamber_id):
        """Moissonne une section complètement"""
        conn = self.get_conn()
        cursor = conn.cursor()
        
        cursor.execute("SELECT url FROM supreme_court_chambers WHERE id = ?", (chamber_id,))
        result = cursor.fetchone()
        
        if not result:
            conn.close()
            return {'pages': 0, 'themes': 0, 'decisions': 0}
        
        base_url = result[0]
        
        page_num = 1
        total_decisions = 0
        empty_pages = 0
        
        while True:
            url = base_url if page_num == 1 else f"{base_url}/page/{page_num}/"
            
            print(f"📄 Page {page_num}")
            
            try:
                response = self.session.get(url, timeout=30)
                
                if response.status_code == 404:
                    break
                
                response.raise_for_status()
                soup = BeautifulSoup(response.content, 'html.parser')
                
                accordions = soup.find_all('div', class_='accordion-header')
                page_decisions = 0
                
                for accordion in accordions:
                    h4 = accordion.find('h4')
                    if not h4:
                        continue
                    
                    theme_name = h4.get_text(strip=True)
                    
                    if not theme_name or len(theme_name) < 3:
                        continue
                    
                    # Thème
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
                    
                    # Décisions
                    content_div = accordion.find_next_sibling('div', class_='accordion-content')
                    
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
                            
                            # Insérer décision
                            cursor.execute("""
                                INSERT OR IGNORE INTO supreme_court_decisions
                                (decision_number, decision_date, url, download_status)
                                VALUES (?, ?, ?, 'pending')
                            """, (decision_number, decision_date, decision_url))
                            
                            # Récupérer ID
                            cursor.execute("""
                                SELECT id FROM supreme_court_decisions 
                                WHERE decision_number = ?
                            """, (decision_number,))
                            
                            decision_id = cursor.fetchone()[0]
                            
                            # Classification
                            cursor.execute("""
                                INSERT OR IGNORE INTO supreme_court_decision_classifications
                                (decision_id, chamber_id, theme_id)
                                VALUES (?, ?, ?)
                            """, (decision_id, chamber_id, theme_id))
                            
                            if cursor.rowcount > 0:
                                page_decisions += 1
                
                print(f"   ✅ {page_decisions} nouvelles décisions")
                
                # Détection pages vides
                if page_decisions == 0:
                    empty_pages += 1
                    print(f"   ⚠️  Page sans nouvelles décisions ({empty_pages}/2)")
                    if empty_pages >= 2:
                        print(f"   ✓ 2 pages consécutives vides - Arrêt")
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
        
        return {'pages': page_num - 1, 'decisions': total_decisions}

if __name__ == '__main__':
    harvester = HarvesterCourSupremeV5()
    harvester.harvest_all_exhaustive()
