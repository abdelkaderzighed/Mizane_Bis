"""
Harvester V4 Intelligent pour la Cour Suprême d'Algérie
Stratégie optimisée : Section 1 = master, autres = index
"""
import requests
from bs4 import BeautifulSoup
import sqlite3
from datetime import datetime
import time
import re
from urllib.parse import urljoin

class HarvesterCourSupremeV4Intelligent:
    def __init__(self, db_path='harvester.db'):
        self.db_path = db_path
        self.base_url = 'https://coursupreme.dz'
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
    
    def get_conn(self):
        return sqlite3.connect(self.db_path)
    
    def harvest_incremental(self):
        """
        Moissonnage incrémental intelligent :
        1. Moissonner Section 1 (exhaustive)
        2. Détecter nouvelles décisions
        3. Si nouvelles → parser sections 2-6 pour rattachements
        """
        conn = self.get_conn()
        cursor = conn.cursor()
        
        print("\n" + "="*70)
        print("🧠 MOISSONNAGE INTELLIGENT - STRATÉGIE OPTIMISÉE")
        print("="*70 + "\n")
        
        # ÉTAPE 1 : Compter décisions avant
        cursor.execute("SELECT COUNT(*) FROM supreme_court_decisions")
        decisions_avant = cursor.fetchone()[0]
        
        print(f"📊 Décisions avant moissonnage : {decisions_avant}")
        print(f"\n{'='*70}")
        print("ÉTAPE 1 : Moissonnage Section 1 (Base exhaustive)")
        print(f"{'='*70}\n")
        
        # Moissonner Section 1
        result_s1 = self.harvest_section(chamber_id=1, max_pages=None)
        
        # Compter nouvelles décisions
        cursor.execute("SELECT COUNT(*) FROM supreme_court_decisions")
        decisions_apres = cursor.fetchone()[0]
        nouvelles_decisions = decisions_apres - decisions_avant
        
        print(f"\n✅ Section 1 terminée : {nouvelles_decisions} nouvelles décisions")
        
        # ÉTAPE 2 : Si nouvelles décisions → parser autres sections
        if nouvelles_decisions > 0:
            print(f"\n{'='*70}")
            print(f"ÉTAPE 2 : {nouvelles_decisions} nouvelles décisions détectées")
            print("          Moissonnage sections 2-6 pour rattachements...")
            print(f"{'='*70}\n")
            
            sections = [
                (2, "Chambres pénales"),
                (3, "Chambres civiles"),
                (4, "Commission d'indemnisation"),
                (5, "Chambres réunies"),
                (6, "Décisions importantes")
            ]
            
            for section_id, section_name in sections:
                print(f"\n📂 Section {section_id}: {section_name}")
                result = self.harvest_section(chamber_id=section_id, max_pages=None)
                print(f"   ✅ {result['decisions']} nouvelles classifications")
                time.sleep(2)
        else:
            print(f"\n✅ Aucune nouvelle décision - Sections 2-6 non moissonnées")
        
        # ÉTAPE 3 : Stats finales
        cursor.execute("""
            SELECT 
                COUNT(*) as total_decisions,
                (SELECT COUNT(*) FROM supreme_court_decision_classifications) as total_classifications,
                (SELECT COUNT(DISTINCT theme_id) FROM supreme_court_decision_classifications) as total_themes
            FROM supreme_court_decisions
        """)
        
        total_dec, total_class, total_themes = cursor.fetchone()
        
        # Marquer dernière mise à jour
        cursor.execute("UPDATE supreme_court_chambers SET last_harvested_at = ? WHERE id = 1", 
                      (datetime.now().isoformat(),))
        conn.commit()
        conn.close()
        
        print(f"\n{'='*70}")
        print("🎉 MOISSONNAGE INTELLIGENT TERMINÉ")
        print(f"{'='*70}")
        print(f"Décisions totales    : {total_dec}")
        print(f"Classifications      : {total_class}")
        print(f"Thèmes               : {total_themes}")
        print(f"Nouvelles décisions  : {nouvelles_decisions}")
        print(f"{'='*70}\n")
        
        return {
            'nouvelles_decisions': nouvelles_decisions,
            'total_decisions': total_dec,
            'total_classifications': total_class
        }
    
    def harvest_section(self, chamber_id, max_pages=None):
        """Moissonne une section (code existant V3)"""
        conn = self.get_conn()
        cursor = conn.cursor()
        
        cursor.execute("SELECT name_fr, url FROM supreme_court_chambers WHERE id = ?", (chamber_id,))
        result = cursor.fetchone()
        
        if not result:
            return {'pages': 0, 'themes': 0, 'decisions': 0}
        
        section_name, base_url = result
        
        page_num = 1
        total_themes = 0
        total_decisions = 0
        empty_pages = 0
        
        while True:
            if max_pages and page_num > max_pages:
                break
            
            url = base_url if page_num == 1 else f"{base_url}page/{page_num}/"
            
            if chamber_id == 1:  # Seulement pour Section 1
                print(f"📄 Page {page_num}: {url}")
            
            try:
                response = self.session.get(url, timeout=30)
                
                if response.status_code == 404:
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
                
                if chamber_id == 1:  # Affichage détaillé Section 1
                    print(f"   ✅ {page_themes} thèmes, {page_decisions} décisions")
                
                # Détecter pages vides
                if page_decisions == 0:
                    empty_pages += 1
                    if chamber_id == 1:
                        print(f"   ⚠️  Aucune nouvelle décision ({empty_pages}/2)")
                    if empty_pages >= 2:
                        if chamber_id == 1:
                            print(f"   ✓ 2 pages consécutives vides - Arrêt")
                        break
                else:
                    empty_pages = 0
                
                total_themes += page_themes
                total_decisions += page_decisions
                
                conn.commit()
                page_num += 1
                time.sleep(1)
                
            except Exception as e:
                if chamber_id == 1:
                    print(f"   ❌ Erreur: {e}")
                break
        
        conn.close()
        
        return {'pages': page_num - 1, 'themes': total_themes, 'decisions': total_decisions}

if __name__ == '__main__':
    harvester = HarvesterCourSupremeV4Intelligent()
    harvester.harvest_incremental()
