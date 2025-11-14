import json
from datetime import datetime
import time
from urllib.parse import urljoin, urlparse

try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.common.exceptions import TimeoutException, NoSuchElementException
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False
    print("❌ Selenium non installé")

import requests


class JORADPHarvester:
    """Moissonneur spécialisé pour le site JORADP"""
    
    DOCUMENT_EXTENSIONS = {'.pdf', '.doc', '.docx'}
    
    def __init__(self, base_url, profile=None):
        self.base_url = base_url
        self.profile = profile or {}
        self.documents = []
        self.driver = None
        
    def setup_selenium(self):
        """Configure Selenium"""
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--window-size=1920,1080')
        
        self.driver = webdriver.Chrome(options=chrome_options)
        print("✓ Navigateur initialisé")
    
    def close_selenium(self):
        if self.driver:
            self.driver.quit()
    
    def format_file_size(self, size_bytes):
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} TB"
    
    def get_document_info(self, url):
        """Récupère infos via HEAD request"""
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
    
    def explore_calendar_dates(self, max_clicks=10):
        """Explore le calendrier en cliquant sur les dates"""
        print("🗓️  Exploration du calendrier...")
        
        found_links = set()
        
        try:
            # Attendre que le calendrier se charge
            time.sleep(3)
            
            # Chercher tous les éléments cliquables qui pourraient être des dates
            # Adapter les sélecteurs selon la structure réelle du site
            possible_selectors = [
                "td.calendarday",
                "td.day",
                "a.date",
                "td[onclick]",
                "div.calendar-date",
                "td > a",
                "//td[contains(@class, 'calendar')]",
                "//a[contains(@href, 'pdf')]"
            ]
            
            for selector in possible_selectors:
                try:
                    if selector.startswith("//"):
                        elements = self.driver.find_elements(By.XPATH, selector)
                    else:
                        elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    
                    if elements:
                        print(f"✓ Trouvé {len(elements)} éléments avec: {selector}")
                        
                        # Cliquer sur quelques éléments
                        for i, element in enumerate(elements[:max_clicks]):
                            try:
                                # Faire défiler jusqu'à l'élément
                                self.driver.execute_script("arguments[0].scrollIntoView(true);", element)
                                time.sleep(0.5)
                                
                                # Cliquer
                                element.click()
                                print(f"   📍 Clic #{i+1}")
                                time.sleep(2)
                                
                                # Chercher les nouveaux liens PDF
                                links = self.driver.find_elements(By.TAG_NAME, "a")
                                for link in links:
                                    href = link.get_attribute('href')
                                    if href and '.pdf' in href.lower():
                                        found_links.add(href)
                                        print(f"      📄 PDF trouvé: {href}")
                                
                            except Exception as e:
                                continue
                        
                        break  # Sortir si on a trouvé des éléments cliquables
                        
                except Exception as e:
                    continue
            
            return found_links
            
        except Exception as e:
            print(f"⚠️  Erreur lors de l'exploration: {e}")
            return found_links
    
    def scan_page_source(self):
        """Analyse le code source pour trouver des patterns d'URLs"""
        print("🔍 Analyse du code source de la page...")
        
        page_source = self.driver.page_source
        found_urls = set()
        
        # Chercher des patterns d'URLs de PDF
        import re
        
        patterns = [
            r'href=["\']([^"\']*\.pdf[^"\']*)["\']',
            r'src=["\']([^"\']*\.pdf[^"\']*)["\']',
            r'https?://[^\s<>"]+\.pdf',
            r'/[^\s<>"]+\.pdf'
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, page_source, re.IGNORECASE)
            for match in matches:
                full_url = urljoin(self.base_url, match)
                found_urls.add(full_url)
                print(f"   📄 Pattern trouvé: {full_url}")
        
        return found_urls
    
    def harvest(self, max_results=10, explore_clicks=5):
        """Lance le moissonnage"""
        print("=" * 60)
        print("🔍 MOISSONNAGE JORADP")
        print("=" * 60)
        print(f"URL: {self.base_url}")
        print()
        
        if not SELENIUM_AVAILABLE:
            print("❌ Selenium requis pour ce site")
            return []
        
        self.setup_selenium()
        
        try:
            # Charger la page
            print("🌐 Chargement de la page...")
            self.driver.get(self.base_url)
            time.sleep(5)
            
            print(f"✓ Page chargée: {self.driver.title}")
            print()
            
            # Stratégie 1: Scanner le code source
            found_urls = self.scan_page_source()
            
            # Stratégie 2: Explorer le calendrier
            calendar_urls = self.explore_calendar_dates(max_clicks=explore_clicks)
            found_urls.update(calendar_urls)
            
            # Stratégie 3: Chercher tous les liens directs
            print()
            print("🔗 Recherche de liens directs...")
            all_links = self.driver.find_elements(By.TAG_NAME, "a")
            for link in all_links:
                try:
                    href = link.get_attribute('href')
                    if href and any(ext in href.lower() for ext in self.DOCUMENT_EXTENSIONS):
                        found_urls.add(href)
                        print(f"   📄 Lien direct: {href}")
                except:
                    continue
            
            print()
            print("-" * 60)
            print(f"📊 Total d'URLs uniques trouvées: {len(found_urls)}")
            print("-" * 60)
            
            # Créer les métadonnées pour chaque document
            for url in list(found_urls)[:max_results]:
                metadata = {
                    'url': url,
                    'title': url.split('/')[-1],
                    'file_type': 'pdf',
                    'date': None,
                    'file_size': None
                }
                
                # Récupérer infos supplémentaires
                doc_info = self.get_document_info(url)
                metadata.update(doc_info)
                
                self.documents.append(metadata)
            
            return self.documents
            
        finally:
            self.close_selenium()
    
    def to_json(self, indent=2):
        result = {
            'base_url': self.base_url,
            'profile': self.profile,
            'harvest_date': datetime.now().isoformat(),
            'document_count': len(self.documents),
            'documents': self.documents
        }
        return json.dumps(result, indent=indent, ensure_ascii=False)
    
    def save_to_file(self, filename='documents.json'):
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(self.to_json())
        print(f"💾 Résultats sauvegardés: {filename}")


if __name__ == "__main__":
    url = "https://www.joradp.dz/HFR/Index.htm"
    
    profile = {
        'extensions': ['.pdf']
    }
    
    harvester = JORADPHarvester(url, profile)
    
    # Explorer 10 dates du calendrier
    documents = harvester.harvest(max_results=10, explore_clicks=10)
    
    print()
    print("=" * 60)
    print("📊 RÉSULTATS")
    print("=" * 60)
    print(harvester.to_json())
    print()
    
    harvester.save_to_file('documents_joradp.json')
    
    print("✨ Terminé!")
    print()
    print("💡 Conseil: Si aucun document n'est trouvé, le site utilise")
    print("   peut-être une API ou requiert une authentification.")