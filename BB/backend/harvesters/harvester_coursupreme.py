"""
Harvester pour la Cour Suprême d'Algérie
Site: https://coursupreme.dz
Mode: Découverte automatique + Validation manuelle
"""
import requests
from bs4 import BeautifulSoup
import sqlite3
from datetime import datetime
import time
import re
from urllib.parse import urljoin, unquote

class HarvesterCourSupreme:
    def __init__(self, db_path='harvester.db'):
        self.db_path = db_path
        self.base_url = 'https://coursupreme.dz'
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
    
    def get_conn(self):
        """Connexion à la base de données"""
        return sqlite3.connect(self.db_path)
    
    def discover_chambers(self, auto_add=True):
        """
        DÉCOUVERTE AUTOMATIQUE des chambres
        Scanne la page principale et détecte les nouvelles chambres
        
        Args:
            auto_add: Si True, ajoute automatiquement avec active=0
        
        Returns:
            dict: {'existing': [], 'new': [], 'added': []}
        """
        print(f"\n{'='*60}")
        print(f"🔍 DÉCOUVERTE AUTOMATIQUE DES CHAMBRES")
        print(f"{'='*60}")
        
        conn = self.get_conn()
        cursor = conn.cursor()
        
        # Récupérer les chambres existantes
        cursor.execute("SELECT url FROM supreme_court_chambers")
        existing_urls = set(row[0] for row in cursor.fetchall())
        
        print(f"📊 Chambres en BDD: {len(existing_urls)}")
        
        results = {
            'existing': list(existing_urls),
            'new': [],
            'added': []
        }
        
        try:
            # Scanner la page principale
            print(f"\n📡 Scan de {self.base_url}...")
            response = self.session.get(self.base_url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Chercher les liens de menu (à adapter selon la structure réelle)
            # On cherche des patterns typiques de menus de chambres
            potential_chambers = []
            
            # Pattern 1: Liens dans le menu principal
            nav_links = soup.find_all('a', href=re.compile(r'/(الغرف|غرف|لجنة|استثناء)'))
            
            for link in nav_links:
                url = urljoin(self.base_url, link.get('href'))
                text_ar = link.get_text(strip=True)
                
                if url not in existing_urls and url not in [c['url'] for c in potential_chambers]:
                    potential_chambers.append({
                        'url': url,
                        'name_ar': text_ar,
                        'name_fr': text_ar  # À traduire manuellement après
                    })
            
            print(f"\n🆕 Nouvelles chambres détectées: {len(potential_chambers)}")
            
            if potential_chambers:
                for chamber in potential_chambers:
                    print(f"\n   ⚠️  NOUVELLE CHAMBRE DÉTECTÉE:")
                    print(f"      URL: {chamber['url']}")
                    print(f"      Nom (AR): {chamber['name_ar']}")
                    
                    results['new'].append(chamber)
                    
                    if auto_add:
                        # Ajouter automatiquement avec active=0 (désactivé)
                        cursor.execute("""
                            INSERT OR IGNORE INTO supreme_court_chambers 
                            (name_ar, name_fr, url, active)
                            VALUES (?, ?, ?, 0)
                        """, (chamber['name_ar'], chamber['name_fr'], chamber['url']))
                        
                        if cursor.rowcount > 0:
                            print(f"      ✅ Ajoutée en BDD (DÉSACTIVÉE)")
                            print(f"      ℹ️  À valider manuellement avant activation")
                            results['added'].append(chamber['url'])
                        else:
                            print(f"      ℹ️  Déjà en BDD")
                
                conn.commit()
            else:
                print(f"\n✅ Aucune nouvelle chambre détectée")
            
        except Exception as e:
            print(f"\n❌ Erreur lors de la découverte: {e}")
        
        finally:
            conn.close()
        
        print(f"\n{'='*60}")
        return results
    
    def list_chambers(self):
        """Liste toutes les chambres avec leur statut"""
        conn = self.get_conn()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, name_fr, url, active, created_at 
            FROM supreme_court_chambers 
            ORDER BY id
        """)
        
        print(f"\n{'='*60}")
        print(f"📋 CHAMBRES DE LA COUR SUPRÊME")
        print(f"{'='*60}\n")
        
        for row in cursor.fetchall():
            chamber_id, name_fr, url, active, created_at = row
            status = "✅ ACTIVE" if active == 1 else "⏸️  DÉSACTIVÉE"
            print(f"{chamber_id}. {name_fr}")
            print(f"   {status}")
            print(f"   {url}")
            print()
        
        conn.close()
    
    def activate_chamber(self, chamber_id):
        """Active une chambre après validation manuelle"""
        conn = self.get_conn()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE supreme_court_chambers 
            SET active = 1 
            WHERE id = ?
        """, (chamber_id,))
        
        conn.commit()
        conn.close()
        
        print(f"✅ Chambre {chamber_id} activée")
    
    def discover_themes(self, chamber_id):
        """
        Découvre les thèmes d'une chambre (UNIQUEMENT SI ACTIVE)
        """
        conn = self.get_conn()
        cursor = conn.cursor()
        
        # Vérifier que la chambre est active
        cursor.execute("""
            SELECT url, name_fr, active 
            FROM supreme_court_chambers 
            WHERE id = ?
        """, (chamber_id,))
        result = cursor.fetchone()
        
        if not result:
            print(f"❌ Chambre {chamber_id} introuvable")
            return []
        
        chamber_url, chamber_name, active = result
        
        if active == 0:
            print(f"⏸️  Chambre {chamber_id} désactivée - Ignorée")
            return []
        
        print(f"\n🔍 Découverte des thèmes pour: {chamber_name}")
        print(f"   URL: {chamber_url}")
        
        try:
            response = self.session.get(chamber_url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Trouver tous les liens de décisions
            decision_links = soup.find_all('a', href=re.compile(r'/decision/'))
            
            print(f"   Trouvé {len(decision_links)} liens de décisions")
            
            themes_found = []
            for link in decision_links[:5]:  # POC: Limiter à 5 pour tester
                url = urljoin(self.base_url, link.get('href'))
                title = link.get_text(strip=True)
                
                if url and title:
                    themes_found.append({
                        'url': url,
                        'title_ar': title,
                        'title_fr': title
                    })
            
            print(f"   ✅ {len(themes_found)} décisions identifiées")
            return themes_found
            
        except Exception as e:
            print(f"   ❌ Erreur: {e}")
            return []
        finally:
            conn.close()
    
    def download_decision(self, decision_url):
        """Télécharge et parse une décision"""
        print(f"\n📥 Téléchargement: {decision_url}")
        
        try:
            response = self.session.get(decision_url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extraire le contenu principal
            content = soup.find('article') or soup.find('main') or soup.find('div', class_='content')
            
            if content:
                html_content = str(content)
                text_content = content.get_text(strip=True, separator='\n')
                
                # Extraire le numéro de dossier (regex)
                decision_number = 'N/A'
                number_match = re.search(r'(?:Dossier|ملف)\s*(?:n°|رقم)\s*(\d+)', text_content)
                if number_match:
                    decision_number = number_match.group(1)
                
                # Extraire la date
                decision_date = None
                date_match = re.search(r'(\d{2}[-/]\d{2}[-/]\d{4})', text_content)
                if date_match:
                    decision_date = date_match.group(1)
                
                print(f"   ✅ Numéro: {decision_number}")
                print(f"   ✅ Date: {decision_date}")
                print(f"   ✅ Contenu: {len(html_content)} caractères")
                
                return {
                    'decision_number': decision_number,
                    'decision_date': decision_date,
                    'html_content_ar': html_content,
                    'text_preview': text_content[:500]
                }
            else:
                print(f"   ⚠️  Pas de contenu trouvé")
                return None
                
        except Exception as e:
            print(f"   ❌ Erreur: {e}")
            return None
    
    def test_chamber(self, chamber_id=1):
        """Test sur une chambre"""
        print(f"\n{'='*60}")
        print(f"🧪 TEST POC - Chambre {chamber_id}")
        print(f"{'='*60}")
        
        # Découvrir les thèmes
        themes = self.discover_themes(chamber_id)
        
        if not themes:
            print("Aucun thème trouvé")
            return
        
        # Tester le téléchargement de la première décision
        if themes:
            first_decision = themes[0]
            print(f"\n📝 Test téléchargement première décision:")
            print(f"   Titre: {first_decision['title_fr'][:100]}...")
            
            result = self.download_decision(first_decision['url'])
            
            if result:
                print(f"\n✅ Extraction réussie!")
                print(f"   Aperçu: {result['text_preview'][:200]}...")
            else:
                print(f"\n❌ Échec extraction")
        
        print(f"\n{'='*60}")

if __name__ == '__main__':
    harvester = HarvesterCourSupreme()
    
    # 1. Découverte automatique des chambres
    harvester.discover_chambers(auto_add=True)
    
    # 2. Lister toutes les chambres
    harvester.list_chambers()
    
    # 3. Test sur une chambre active
    # harvester.test_chamber(1)
