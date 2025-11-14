"""
Moissonneur exhaustif JORADP (1962-2025)
Collecte TOUTES les métadonnées sans télécharger les PDFs
"""
import requests
from datetime import datetime
import time
from models import get_db_connection

R2_PREFIX = "Textes_juridiques_DZ/joradp.dz"

class JORADPExhaustiveHarvester:
    """Moissonne tous les JO depuis 1962 en récupérant les métadonnées"""
    
    BASE_URL = "https://www.joradp.dz/FTP/JO-FRANCAIS"
    
    def __init__(self, session_id):
        self.session_id = session_id
        self.stats = {
            'total_found': 0,
            'total_404': 0,
            'years_processed': 0
        }
    
    def build_url(self, year, num):
        """Construit l'URL d'un document"""
        return f"{self.BASE_URL}/{year}/F{year}{str(num).zfill(3)}.pdf"
    
    def get_metadata(self, url):
        """Récupère les métadonnées via requête HEAD"""
        try:
            response = requests.head(url, timeout=10, allow_redirects=True)
            
            if response.status_code == 200:
                metadata = {
                    'exists': True,
                    'size_bytes': int(response.headers.get('content-length', 0)),
                    'last_modified': response.headers.get('last-modified'),
                    'content_type': response.headers.get('content-type', 'application/pdf')
                }
                
                # Parser la date Last-Modified
                if metadata['last_modified']:
                    try:
                        # Format: 'Wed, 15 Nov 2023 10:30:45 GMT'
                        dt = datetime.strptime(metadata['last_modified'], '%a, %d %b %Y %H:%M:%S %Z')
                        metadata['publication_date'] = dt.strftime('%Y-%m-%d')
                    except:
                        metadata['publication_date'] = None
                
                return metadata
            
            elif response.status_code == 404:
                return {'exists': False, '404': True}
            
            else:
                return {'exists': False, 'error': response.status_code}
                
        except requests.Timeout:
            return {'exists': False, 'error': 'timeout'}
        except Exception as e:
            return {'exists': False, 'error': str(e)}
    
    def harvest_year(self, year, start_num=1, max_num=999):
        """Moissonne une année complète"""
        print(f"\n📅 Année {year}")
        print(f"   Numéros: {start_num} à {max_num}")
        
        found_count = 0
        consecutive_404 = 0
        
        for num in range(start_num, max_num + 1):
            url = self.build_url(year, num)
            
            # Récupérer métadonnées
            metadata = self.get_metadata(url)
            
            if metadata.get('exists'):
                # Document existe !
                consecutive_404 = 0
                found_count += 1
                self.stats['total_found'] += 1
                
                size_kb = metadata['size_bytes'] / 1024
                date_str = metadata.get('publication_date', 'inconnue')
                
                print(f"   ✅ [{num:03d}] {size_kb:.1f} KB - {date_str}")
                
                # Sauvegarder dans la BD
                self.save_document(url, year, num, metadata)
                
            elif metadata.get('404'):
                consecutive_404 += 1
                self.stats['total_404'] += 1
                
                # Arrêt après 5 × 404 consécutifs
                if consecutive_404 >= 5:
                    print(f"   ⏹️  5 documents absents consécutifs - fin de {year}")
                    break
            
            else:
                # Erreur réseau
                print(f"   ⚠️  [{num:03d}] Erreur: {metadata.get('error')}")
            
            # Pause pour ne pas surcharger le serveur
            time.sleep(0.1)
        
        self.stats['years_processed'] += 1
        print(f"   📊 {found_count} documents trouvés pour {year}")
        
        return found_count
    
    def save_document(self, url, year, num, metadata):
        """Sauvegarde les métadonnées du document dans la BD"""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            filename = f"F{year}{str(num).zfill(3)}.pdf"
            file_path = f"{R2_PREFIX}/{year}/{filename}"
            
            cursor.execute("""
                INSERT OR IGNORE INTO documents 
                (session_id, url, file_path, file_extension, 
                 publication_date, file_size_bytes, 
                 metadata_collection_status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 'success', CURRENT_TIMESTAMP)
            """, (
                self.session_id,
                url,
                file_path,
                '.pdf',
                metadata.get('publication_date'),
                metadata.get('size_bytes')
            ))
            
            conn.commit()
    
    def harvest_all(self, start_year=1962, end_year=None):
        """Moissonne toutes les années depuis 1962"""
        if end_year is None:
            end_year = datetime.now().year
        
        print(f"🚀 Moissonnage exhaustif JORADP")
        print(f"   Période: {start_year} - {end_year}")
        print(f"   Session ID: {self.session_id}")
        print("=" * 60)
        
        for year in range(start_year, end_year + 1):
            self.harvest_year(year)
        
        print("\n" + "=" * 60)
        print(f"✅ Moissonnage terminé !")
        print(f"   📚 {self.stats['total_found']} documents trouvés")
        print(f"   📅 {self.stats['years_processed']} années traitées")
        print(f"   ⊗ {self.stats['total_404']} erreurs 404")


def test_exhaustive():
    """Test sur quelques années"""
    print("🧪 Test moissonnage exhaustif (2023-2024)")
    
    # Créer une session test avec timestamp
    from datetime import datetime
    session_name = f"exhaustive_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO harvesting_sessions (site_id, session_name, status)
            VALUES (1, ?, 'running')
        """, (session_name,))
        session_id = cursor.lastrowid
        conn.commit()
    
    # Lancer le moissonnage
    harvester = JORADPExhaustiveHarvester(session_id)
    harvester.harvest_all(start_year=2023, end_year=2024)


if __name__ == "__main__":
    test_exhaustive()
