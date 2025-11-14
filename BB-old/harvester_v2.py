import json
from datetime import datetime
import re
from urllib.parse import urljoin, urlparse
import time

# Import conditionnel de Selenium
try:
    from selenium import webdriver
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False
    print("⚠️  Selenium n'est pas installé. Utilisez: pip install selenium")

# Import pour le mode sans JavaScript
import requests
from bs4 import BeautifulSoup


class DocumentHarvester:
    """Moissonneur de documents sur le web avec support JavaScript"""
    
    DOCUMENT_EXTENSIONS = {
        '.pdf', '.docx', '.doc', '.xlsx', '.xls', 
        '.pptx', '.ppt', '.png', '.jpg', '.jpeg', 
        '.gif', '.txt', '.csv', '.zip'
    }
    
    def __init__(self, base_url, profile=None, use_javascript=False):
        """
        Args:
            base_url: URL de départ
            profile: Dictionnaire avec les critères de filtrage
            use_javascript: Si True, utilise Selenium pour les sites dynamiques
        """
        self.base_url = base_url
        self.profile = profile or {}
        self.use_javascript = use_javascript
        self.visited_urls = set()
        self.documents = []
        self.driver = None
        
    def setup_selenium(self):
        """Configure Selenium avec Chrome en mode headless"""
        if not SELENIUM_AVAILABLE:
            raise ImportError("Selenium n'est pas installé. Installez-le avec: pip install selenium")
        
        chrome_options = Options()
        chrome_options.add_argument('--headless')  # Mode sans interface
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument('user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
        
        try:
            self.driver = webdriver.Chrome(options=chrome_options)
            print("✓ Navigateur Chrome initialisé (mode headless)")
        except Exception as e:
            print(f"❌ Erreur lors de l'initialisation de Chrome: {e}")
            print("💡 Assurez-vous que ChromeDriver est installé.")
            print("   Sur macOS: brew install chromedriver")
            raise
    
    def close_selenium(self):
        """Ferme le navigateur Selenium"""
        if self.driver:
            self.driver.quit()
            print("✓ Navigateur fermé")
    
    def extract_metadata_from_link(self, link_element, url, is_selenium=False):
        """Extrait les métadonnées d'un lien"""
        metadata = {
            'url': url,
            'title': None,
            'author': None,
            'date': None,
            'file_type': None,
            'file_size': None
        }
        
        # Titre
        if is_selenium:
            metadata['title'] = link_element.get_attribute('title') or link_element.text.strip()
        else:
            metadata['title'] = link_element.get('title') or link_element.get_text(strip=True)
        
        # Type de fichier
        parsed_url = urlparse(url)
        path = parsed_url.path.lower()
        for ext in self.DOCUMENT_EXTENSIONS:
            if path.endswith(ext):
                metadata['file_type'] = ext.replace('.', '')
                break
        
        # Extraction de date
        try:
            if is_selenium:
                parent_text = link_element.find_element(By.XPATH, "..").text
            else:
                parent = link_element.parent
                parent_text = parent.get_text() if parent else ""
            
            date_patterns = [
                r'\d{4}-\d{2}-\d{2}',
                r'\d{2}/\d{2}/\d{4}',
                r'\d{2}-\d{2}-\d{4}'
            ]
            for pattern in date_patterns:
                match = re.search(pattern, parent_text)
                if match:
                    metadata['date'] = match.group()
                    break
        except:
            pass
        
        return metadata
    
    def get_document_info(self, url):
        """Récupère les informations via requête HEAD"""
        try:
            response = requests.head(url, timeout=5, allow_redirects=True)
            info = {}
            
            if 'content-length' in response.headers:
                size_bytes = int(response.headers['content-length'])
                info['file_size'] = self.format_file_size(size_bytes)
            
            if 'last-modified' in response.headers:
                info['last_modified'] = response.headers['last-modified']
            
            return info
        except:
            return {}
    
    def format_file_size(self, size_bytes):
        """Formate la taille du fichier"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} TB"
    
    def matches_profile(self, metadata):
        """Vérifie si un document correspond au profil"""
        if 'extensions' in self.profile:
            ext = f".{metadata['file_type']}"
            if ext not in self.profile['extensions']:
                return False
        
        if 'topics' in self.profile and metadata['title']:
            title_lower = metadata['title'].lower()
            if not any(topic.lower() in title_lower for topic in self.profile['topics']):
                return False
        
        return True
    
    def harvest_with_selenium(self, max_results=10, wait_time=5):
        """Moissonne avec Selenium (pour sites JavaScript)"""
        print(f"🌐 Chargement de la page avec JavaScript...")
        
        self.setup_selenium()
        
        try:
            # Charger la page
            self.driver.get(self.base_url)
            
            # Attendre que le JavaScript se charge
            print(f"⏳ Attente du chargement ({wait_time}s)...")
            time.sleep(wait_time)
            
            # Essayer d'attendre des éléments spécifiques (optionnel)
            try:
                WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.TAG_NAME, "a"))
                )
            except:
                pass
            
            # Extraire tous les liens
            links = self.driver.find_elements(By.TAG_NAME, "a")
            print(f"✓ Trouvé {len(links)} liens après exécution JavaScript")
            
            for link in links:
                if len(self.documents) >= max_results:
                    break
                
                try:
                    href = link.get_attribute('href')
                    if not href:
                        continue
                    
                    full_url = urljoin(self.base_url, href)
                    parsed_url = urlparse(full_url)
                    path_lower = parsed_url.path.lower()
                    
                    is_document = any(path_lower.endswith(ext) for ext in self.DOCUMENT_EXTENSIONS)
                    
                    if is_document and full_url not in self.visited_urls:
                        self.visited_urls.add(full_url)
                        print(f"📄 Document trouvé: {full_url}")
                        
                        metadata = self.extract_metadata_from_link(link, full_url, is_selenium=True)
                        
                        if self.matches_profile(metadata):
                            doc_info = self.get_document_info(full_url)
                            metadata.update(doc_info)
                            self.documents.append(metadata)
                            print(f"   ✓ Ajouté: {metadata['title']}")
                except Exception as e:
                    # Ignorer les erreurs sur des liens individuels
                    continue
            
            return self.documents
            
        finally:
            self.close_selenium()
    
    def harvest_without_javascript(self, max_results=10):
        """Moissonne sans JavaScript (mode classique)"""
        try:
            response = requests.get(self.base_url, timeout=10)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            links = soup.find_all('a', href=True)
            print(f"✓ Trouvé {len(links)} liens en HTML statique")
            
            for link in links:
                if len(self.documents) >= max_results:
                    break
                
                href = link['href']
                full_url = urljoin(self.base_url, href)
                
                parsed_url = urlparse(full_url)
                path_lower = parsed_url.path.lower()
                
                is_document = any(path_lower.endswith(ext) for ext in self.DOCUMENT_EXTENSIONS)
                
                if is_document and full_url not in self.visited_urls:
                    self.visited_urls.add(full_url)
                    print(f"📄 Document trouvé: {full_url}")
                    
                    metadata = self.extract_metadata_from_link(link, full_url, is_selenium=False)
                    
                    if self.matches_profile(metadata):
                        doc_info = self.get_document_info(full_url)
                        metadata.update(doc_info)
                        self.documents.append(metadata)
                        print(f"   ✓ Ajouté: {metadata['title']}")
            
            return self.documents
            
        except Exception as e:
            print(f"❌ Erreur: {e}")
            return []
    
    def harvest(self, max_results=10, wait_time=5):
        """Lance la recherche de documents"""
        print(f"🔍 Démarrage du moissonnage sur: {self.base_url}")
        print(f"📋 Profil: {self.profile if self.profile else 'Aucun filtre'}")
        print(f"🔧 Mode: {'JavaScript activé (Selenium)' if self.use_javascript else 'HTML statique'}")
        print("-" * 60)
        
        if self.use_javascript:
            self.harvest_with_selenium(max_results, wait_time)
        else:
            self.harvest_without_javascript(max_results)
        
        print("-" * 60)
        print(f"✅ Moissonnage terminé: {len(self.documents)} documents trouvés")
        return self.documents
    
    def to_json(self, indent=2):
        """Retourne les résultats en JSON"""
        result = {
            'base_url': self.base_url,
            'profile': self.profile,
            'harvest_date': datetime.now().isoformat(),
            'javascript_enabled': self.use_javascript,
            'document_count': len(self.documents),
            'documents': self.documents
        }
        return json.dumps(result, indent=indent, ensure_ascii=False)
    
    def save_to_file(self, filename='documents.json'):
        """Sauvegarde dans un fichier JSON"""
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(self.to_json())
        print(f"💾 Résultats sauvegardés dans: {filename}")


# Script de test
if __name__ == "__main__":
    print("=" * 60)
    print("🌾 MOISSONNEUR DE DOCUMENTS WEB - POC")
    print("=" * 60)
    print()
    
    # CONFIGURATION
    url = "https://www.joradp.dz/HFR/Index.htm"
    
    profile = {
        'extensions': ['.pdf']
    }
    
    print(f"URL cible: {url}")
    print(f"Profil: {profile}")
    print()
    
    # Créer le moissonneur avec JavaScript activé
    harvester = DocumentHarvester(url, profile, use_javascript=True)
    
    # Lancer la recherche (attendre 10s pour le chargement JS)
    documents = harvester.harvest(max_results=10, wait_time=10)
    
    print()
    print("=" * 60)
    print("📊 RÉSULTATS")
    print("=" * 60)
    print(harvester.to_json())
    
    harvester.save_to_file('documents.json')
    
    print()
    print("✨ Terminé!")