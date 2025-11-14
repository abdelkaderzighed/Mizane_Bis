import json
from datetime import datetime
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed


class JORADPDirectHarvester:
    """Moissonneur JORADP par scan direct des URLs (sans calendrier)"""
    
    def __init__(self, year=2025):
        self.year = year
        self.documents = []
        
    def build_pdf_url(self, number):
        """Construit l'URL du PDF"""
        padded_number = str(number).zfill(3)
        url = f"https://www.joradp.dz/FTP/JO-FRANCAIS/{self.year}/F{self.year}{padded_number}.pdf"
        return url
    
    def format_file_size(self, size_bytes):
        """Formate la taille du fichier"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} TB"
    
    def check_pdf_exists(self, number):
        """Vérifie si un PDF existe et récupère ses métadonnées"""
        url = self.build_pdf_url(number)
        
        try:
            # Utiliser HEAD pour vérifier sans télécharger
            response = requests.head(url, timeout=10, allow_redirects=True)
            
            if response.status_code == 200:
                metadata = {
                    'url': url,
                    'number': str(number).zfill(3),
                    'title': f"Journal Officiel N°{str(number).zfill(3)} - {self.year}",
                    'year': self.year,
                    'file_type': 'pdf',
                    'accessible': True,
                    'status_code': response.status_code
                }
                
                # Métadonnées supplémentaires
                if 'content-length' in response.headers:
                    size_bytes = int(response.headers['content-length'])
                    metadata['file_size'] = self.format_file_size(size_bytes)
                
                if 'last-modified' in response.headers:
                    metadata['last_modified'] = response.headers['last-modified']
                
                return metadata
            else:
                return None
                
        except Exception as e:
            return None
    
    def harvest(self, start=1, end=100, max_results=None, max_workers=10):
        """
        Scanne une plage de numéros pour trouver les PDF existants
        
        Args:
            start: Numéro de départ
            end: Numéro de fin
            max_results: Nombre maximum de résultats (None = illimité)
            max_workers: Nombre de threads parallèles
        """
        print("=" * 70)
        print("🌾 MOISSONNEUR JORADP - Scan Direct")
        print("=" * 70)
        print(f"Année: {self.year}")
        print(f"Plage: N°{str(start).zfill(3)} à N°{str(end).zfill(3)}")
        print(f"Threads parallèles: {max_workers}")
        print()
        print("🔍 Scan en cours...")
        print("-" * 70)
        
        found_count = 0
        checked_count = 0
        
        # Scanner en parallèle pour aller plus vite
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Soumettre toutes les tâches
            future_to_number = {
                executor.submit(self.check_pdf_exists, num): num 
                for num in range(start, end + 1)
            }
            
            # Traiter les résultats au fur et à mesure
            for future in as_completed(future_to_number):
                number = future_to_number[future]
                checked_count += 1
                
                try:
                    result = future.result()
                    
                    if result:
                        found_count += 1
                        self.documents.append(result)
                        
                        print(f"✓ N°{result['number']} - {result.get('file_size', 'N/A'):>10} - {result['url']}")
                        
                        # Arrêter si on a atteint max_results
                        if max_results and found_count >= max_results:
                            print(f"\n⚠️  Limite de {max_results} documents atteinte, arrêt du scan...")
                            # Annuler les tâches restantes
                            for f in future_to_number:
                                f.cancel()
                            break
                    
                    # Afficher la progression tous les 10 documents
                    if checked_count % 10 == 0:
                        print(f"   ... progression: {checked_count}/{end - start + 1} vérifiés, {found_count} trouvés")
                        
                except Exception as e:
                    pass
        
        # Trier par numéro
        self.documents.sort(key=lambda x: x['number'])
        
        print("-" * 70)
        print(f"✅ Scan terminé:")
        print(f"   • Documents vérifiés: {checked_count}")
        print(f"   • Documents trouvés: {len(self.documents)}")
        
        return self.documents
    
    def to_json(self, indent=2):
        """Retourne les résultats en JSON"""
        result = {
            'source': 'Journal Officiel de la République Algérienne (JORADP)',
            'base_url': 'https://www.joradp.dz',
            'year': self.year,
            'harvest_date': datetime.now().isoformat(),
            'harvest_method': 'direct_scan',
            'document_count': len(self.documents),
            'documents': self.documents
        }
        return json.dumps(result, indent=indent, ensure_ascii=False)
    
    def save_to_file(self, filename=None):
        """Sauvegarde dans un fichier JSON"""
        if filename is None:
            filename = f'joradp_{self.year}.json'
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(self.to_json())
        
        print(f"\n💾 Résultats sauvegardés dans: {filename}")


def main():
    """Fonction principale"""
    print()
    
    # CONFIGURATION
    year = 2025  # Année à scanner
    start_number = 1  # Premier numéro à vérifier
    end_number = 100  # Dernier numéro à vérifier
    max_results = 10  # Nombre maximum de documents (None = tous)
    
    # Note: Si vous voulez scanner TOUS les documents de l'année, mettez:
    # end_number = 999 et max_results = None
    
    print(f"📋 Configuration:")
    print(f"   • Année: {year}")
    print(f"   • Plage: {start_number} à {end_number}")
    print(f"   • Limite: {max_results if max_results else 'Aucune'}")
    print()
    
    # Créer le moissonneur
    harvester = JORADPDirectHarvester(year=year)
    
    # Lancer le scan
    documents = harvester.harvest(
        start=start_number,
        end=end_number,
        max_results=max_results,
        max_workers=20  # Nombre de vérifications en parallèle
    )
    
    # Afficher les résultats
    print()
    print("=" * 70)
    print("📊 RÉSULTATS JSON")
    print("=" * 70)
    print(harvester.to_json())
    
    # Sauvegarder
    harvester.save_to_file()
    
    print()
    print("✨ Terminé!")
    
    # Afficher quelques exemples
    if documents:
        print()
        print("📑 Exemples de documents trouvés:")
        for doc in documents[:3]:
            print(f"   • {doc['title']}")
            print(f"     {doc['url']}")
            print(f"     Taille: {doc.get('file_size', 'N/A')}")
            print()


if __name__ == "__main__":
    main()

