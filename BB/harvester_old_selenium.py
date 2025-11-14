import json
from datetime import datetime
import time
import re
from urllib.parse import urljoin

try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False
    print("❌ Selenium non installé")

import requests


class JORADPHarvester:
    """Moissonneur spécialisé pour JORADP (Journal Officiel Algérie)"""
    
    def __init__(self, base_url="https://www.joradp.dz/HFR/Index.htm", year=2025):
        self.base_url = base_url
        self.year = year
        self.documents = []
        self.driver = None
        
    def setup_selenium(self):
        """Configure Selenium"""
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        
        self.driver = webdriver.Chrome(options=chrome_options)
        print("✓ Navigateur Chrome initialisé")
    
    def close_selenium(self):
        if self.driver:
            self.driver.quit()
            print("✓ Navigateur fermé")
    
    def format_file_size(self, size_bytes):
        """Formate la taille du fichier"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} TB"
    
    def get_document_info(self, url):
        """Récupère les métadonnées du PDF"""
        try:
            response = requests.head(url, timeout=10, allow_redirects=True)
            info = {}
            
            if response.status_code == 200:
                if 'content-length' in response.headers:
                    size_bytes = int(response.headers['content-length'])
                    info['file_size'] = self.format_file_size(size_bytes)
                
                if 'last-modified' in response.headers:
                    info['last_modified'] = response.headers['last-modified']
                
                info['accessible'] = True
            else:
                info['accessible'] = False
            
            return info
        except Exception as e:
            return {'accessible': False, 'error': str(e)}
    
    def extract_maxwin_numbers(self):
        """Extrait les numéros depuis les appels javascript:MaxWin('xxx')"""
        print("🔍 Recherche des appels MaxWin dans le code source...")
        
        page_source = self.driver.page_source
        
        # Pattern pour trouver MaxWin('xxx') ou MaxWin("xxx")
        pattern = r"MaxWin\(['\"](\d+)['\"]\)"
        matches = re.findall(pattern, page_source)
        
        # Dédupliquer et trier
        numbers = sorted(set(matches))
        
        print(f"✓ Trouvé {len(numbers)} numéros uniques: {numbers[:10]}{'...' if len(numbers) > 10 else ''}")
        
        return numbers
    
    def build_pdf_url(self, number):
        """Construit l'URL du PDF selon le pattern JORADP"""
        # Pattern: https://www.joradp.dz/FTP/JO-FRANCAIS/2025/F2025001.pdf
        # Le numéro doit être formaté sur 3 chiffres
        padded_number = number.zfill(3)
        url = f"https://www.joradp.dz/FTP/JO-FRANCAIS/{self.year}/F{self.year}{padded_number}.pdf"
        return url
    
    def extract_date_from_calendar(self, element):
        """Essaie d'extraire la date associée à un élément du calendrier"""
        try:
            # Chercher dans le texte de l'élément et ses parents
            text = element.text
            parent = element.find_element(By.XPATH, "..")
            parent_text = parent.text if parent else ""
            
            # Pattern de date simple (jour du mois)
            date_match = re.search(r'\b(\d{1,2})\b', text or parent_text)
            if date_match:
                return date_match.group(1)
        except:
            pass
        return None
    
    def harvest(self, max_results=10):
        """Lance le moissonnage"""
        print("=" * 70)
        print("🌾 MOISSONNEUR JORADP - Journal Officiel de la République Algérienne")
        print("=" * 70)
        print(f"URL: {self.base_url}")
        print(f"Année: {self.year}")
        print()
        
        if not SELENIUM_AVAILABLE:
            print("❌ Selenium requis. Installez avec: pip install selenium")
            return []
        
        self.setup_selenium()
        
        try:
            # Charger la page
            print("🌐 Chargement de la page du calendrier...")
            self.driver.get(self.base_url)
            time.sleep(5)  # Attendre le chargement du JavaScript
            
            print(f"✓ Page chargée: {self.driver.title}")
            print()
            
            # Extraire les numéros depuis MaxWin
            numbers = self.extract_maxwin_numbers()
            
            if not numbers:
                print("⚠️  Aucun numéro trouvé dans les appels MaxWin")
                print("💡 Le site a peut-être changé sa structure")
                return []
            
            print()
            print("🔨 Construction des URLs des PDF...")
            print("-" * 70)
            
            # Construire les URLs et vérifier leur accessibilité
            for i, number in enumerate(numbers[:max_results]):
                pdf_url = self.build_pdf_url(number)
                
                print(f"\n📄 Document #{i+1}: {pdf_url}")
                
                # Récupérer les métadonnées
                doc_info = self.get_document_info(pdf_url)
                
                metadata = {
                    'url': pdf_url,
                    'number': number,
                    'title': f"Journal Officiel N°{number} - {self.year}",
                    'year': self.year,
                    'file_type': 'pdf',
                    'date': None
                }
                
                metadata.update(doc_info)
                
                if metadata.get('accessible', False):
                    print(f"   ✓ Accessible - Taille: {metadata.get('file_size', 'N/A')}")
                    self.documents.append(metadata)
                else:
                    print(f"   ⚠️  Non accessible ou erreur")
                    # On l'ajoute quand même avec le statut
                    self.documents.append(metadata)
            
            print()
            print("-" * 70)
            print(f"✅ Moissonnage terminé: {len(self.documents)} documents trouvés")
            print(f"   Documents accessibles: {sum(1 for d in self.documents if d.get('accessible', False))}")
            
            return self.documents
            
        except Exception as e:
            print(f"❌ Erreur: {e}")
            import traceback
            traceback.print_exc()
            return []
            
        finally:
            self.close_selenium()
    
    def to_json(self, indent=2):
        """Retourne les résultats en JSON"""
        result = {
            'source': 'Journal Officiel de la République Algérienne',
            'base_url': self.base_url,
            'year': self.year,
            'harvest_date': datetime.now().isoformat(),
            'document_count': len(self.documents),
            'accessible_count': sum(1 for d in self.documents if d.get('accessible', False)),
            'documents': self.documents
        }
        return json.dumps(result, indent=indent, ensure_ascii=False)
    
    def save_to_file(self, filename='joradp_documents.json'):
        """Sauvegarde dans un fichier JSON"""
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(self.to_json())
        print(f"\n💾 Résultats sauvegardés dans: {filename}")


def main():
    """Fonction principale"""
    print()
    
    # CONFIGURATION
    year = 2025  # Année à moissonner
    max_documents = 10  # Nombre maximum de documents
    
    # Créer le moissonneur
    harvester = JORADPHarvester(year=year)
    
    # Lancer le moissonnage
    documents = harvester.harvest(max_results=max_documents)
    
    # Afficher les résultats
    print()
    print("=" * 70)
    print("📊 RÉSULTATS JSON")
    print("=" * 70)
    print(harvester.to_json())
    
    # Sauvegarder
    harvester.save_to_file(f'joradp_{year}.json')
    
    print()
    print("✨ Terminé!")
    print()
    
    # Résumé
    if documents:
        print("📋 Résumé:")
        print(f"   • Total de documents: {len(documents)}")
        accessible = sum(1 for d in documents if d.get('accessible', False))
        print(f"   • Documents accessibles: {accessible}")
        print(f"   • Documents inaccessibles: {len(documents) - accessible}")
        
        if accessible > 0:
            print(f"\n✅ Exemple de document accessible:")
            for doc in documents:
                if doc.get('accessible'):
                    print(f"   {doc['title']}")
                    print(f"   {doc['url']}")
                    break


if __name__ == "__main__":
    main()