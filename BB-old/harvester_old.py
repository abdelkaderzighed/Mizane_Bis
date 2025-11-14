import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import json
from datetime import datetime
import re

class DocumentHarvester:
    """Moissonneur de documents sur le web"""
    
    DOCUMENT_EXTENSIONS = {
        '.pdf', '.docx', '.doc', '.xlsx', '.xls', 
        '.pptx', '.ppt', '.png', '.jpg', '.jpeg', 
        '.gif', '.txt', '.csv', '.zip'
    }
    
    def __init__(self, base_url, profile=None):
        self.base_url = base_url
        self.profile = profile or {}
        self.visited_urls = set()
        self.documents = []
        
    def extract_metadata_from_link(self, link_tag, url):
        """Extrait les métadonnées d'un lien vers un document"""
        metadata = {
            'url': url,
            'title': None,
            'author': None,
            'date': None,
            'file_type': None,
            'file_size': None
        }
        
        # Titre depuis le texte du lien ou l'attribut title
        metadata['title'] = link_tag.get('title') or link_tag.get_text(strip=True)
        
        # Type de fichier depuis l'extension
        parsed_url = urlparse(url)
        path = parsed_url.path.lower()
        for ext in self.DOCUMENT_EXTENSIONS:
            if path.endswith(ext):
                metadata['file_type'] = ext.replace('.', '')
                break
        
        # Tentative d'extraction de date depuis le texte adjacent
        parent = link_tag.parent
        if parent:
            text = parent.get_text()
            date_patterns = [
                r'\d{4}-\d{2}-\d{2}',
                r'\d{2}/\d{2}/\d{4}'
            ]
            for pattern in date_patterns:
                match = re.search(pattern, text)
                if match:
                    metadata['date'] = match.group()
                    break
        
        return metadata
    
    def get_document_info(self, url):
        """Récupère les informations d'un document via requête HEAD"""
        try:
            response = requests.head(url, timeout=5, allow_redirects=True)
            info = {}
            
            if 'content-length' in response.headers:
                size_bytes = int(response.headers['content-length'])
                info['file_size'] = self.format_file_size(size_bytes)
            
            if 'last-modified' in response.headers:
                info['last_modified'] = response.headers['last-modified']
            
            return info
        except Exception as e:
            print(f"Avertissement: Impossible de récupérer les infos pour {url}: {e}")
            return {}
    
    def format_file_size(self, size_bytes):
        """Formate la taille du fichier en format lisible"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} TB"
    
    def matches_profile(self, metadata):
        """Vérifie si un document correspond au profil recherché"""
        if 'extensions' in self.profile:
            ext = f".{metadata['file_type']}"
            if ext not in self.profile['extensions']:
                return False
        
        if 'topics' in self.profile and metadata['title']:
            title_lower = metadata['title'].lower()
            if not any(topic.lower() in title_lower for topic in self.profile['topics']):
                return False
        
        return True
    
    def harvest(self, max_results=10):
        """Lance la recherche de documents"""
        print(f"🔍 Démarrage du moissonnage sur: {self.base_url}")
        print(f"📋 Profil: {self.profile if self.profile else 'Aucun filtre'}")
        print("-" * 60)
        
        try:
            response = requests.get(self.base_url, timeout=10)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            links = soup.find_all('a', href=True)
            print(f"✓ Trouvé {len(links)} liens à analyser")
            
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
                    
                    metadata = self.extract_metadata_from_link(link, full_url)
                    
                    if self.matches_profile(metadata):
                        doc_info = self.get_document_info(full_url)
                        metadata.update(doc_info)
                        self.documents.append(metadata)
                        print(f"   ✓ Ajouté: {metadata['title']}")
            
            print("-" * 60)
            print(f"✅ Moissonnage terminé: {len(self.documents)} documents trouvés")
            return self.documents
            
        except Exception as e:
            print(f"❌ Erreur lors du moissonnage: {e}")
            return []
    
    def to_json(self, indent=2):
        """Retourne les résultats en format JSON"""
        result = {
            'base_url': self.base_url,
            'profile': self.profile,
            'harvest_date': datetime.now().isoformat(),
            'document_count': len(self.documents),
            'documents': self.documents
        }
        return json.dumps(result, indent=indent, ensure_ascii=False)
    
    def save_to_file(self, filename='documents.json'):
        """Sauvegarde les résultats dans un fichier JSON"""
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(self.to_json())
        print(f"💾 Résultats sauvegardés dans: {filename}")


# Script de test
if __name__ == "__main__":
    print("=" * 60)
    print("🌾 MOISSONNEUR DE DOCUMENTS WEB - POC")
    print("=" * 60)
    print()
    
    # CONFIGURATION - Modifiez ces valeurs selon vos besoins
    
    # Exemple 1: Site avec des PDF (UNESCO)
    # url = "https://en.unesco.org/themes/education-policy-planning"
    
    # Exemple 2: Site gouvernemental français
    # url = "https://www.data.gouv.fr/fr/datasets/"
    
    # Exemple 4: Journaux officiels algérie
    url = "https://www.joradp.dz/HFR/Index.htm"

    # Profil de recherche (optionnel)
    profile = {
        'extensions': ['.pdf'],  # Seulement les PDF
         'topics': ['lois', 'droit', 'journaux officiels']  # Décommentez pour filtrer par mots-clés
    }
    
    # Ou sans filtre:
    # profile = {}
    
    print(f"URL cible: {url}")
    print(f"Profil: {profile}")
    print()
    
    # Création et exécution du moissonneur
    harvester = DocumentHarvester(url, profile)
    documents = harvester.harvest(max_results=10)
    
    print()
    print("=" * 60)
    print("📊 RÉSULTATS")
    print("=" * 60)
    
    # Affichage du JSON
    print(harvester.to_json())
    
    # Sauvegarde dans un fichier
    harvester.save_to_file('documents.json')
    
    print()
    print("✨ Terminé! Consultez le fichier documents.json pour voir les résultats.")

