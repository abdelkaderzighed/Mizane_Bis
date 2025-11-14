"""Harvester Pattern-based pour sites comme JORADP"""

import requests
import os
from models import Site, HarvestingSession, Document, get_db_connection
from datetime import datetime

class PatternHarvester:
    """Harvester basé sur des patterns d'URL"""
    
    def __init__(self, session_id):
        self.session_id = session_id
        self.session = HarvestingSession.get_by_id(session_id)
        if not self.session:
            raise ValueError(f"Session {session_id} non trouvée")
        
        self.site = Site.get_by_name(self.session['site_name'])
        if not self.site:
            raise ValueError(f"Site {self.session['site_name']} non trouvé")
        
        self.params = self.site['type_specific_params']
        self.base_dir = os.path.join('downloads', self.site['name'], self.session['session_name'])
        os.makedirs(self.base_dir, exist_ok=True)
    
    def build_url(self, year, number):
        """Construire l'URL selon le pattern"""
        # Pattern JORADP: /FTP/JO-FRANCAIS/YYYY/FYYYYNNN.pdf
        base = self.params['base_url_fixed_part']
        lang = self.params['language_path']
        
        # Padding du numéro sur 3 chiffres
        num_padded = str(number).zfill(3)
        
        # Construire l'URL
        url = f"{base}{lang}/{year}/F{year}{num_padded}.pdf"
        return url
    
    def harvest(self, year, start_num=1, end_num=999):
        """Moissonner les documents d'une année"""
        print(f"\n🚀 Démarrage moissonnage JORADP {year}")
        print(f"   Numéros: {start_num} à {end_num}")
        print(f"   Répertoire: {self.base_dir}\n")
        
        success_count = 0
        failed_count = 0
        consecutive_404 = 0  # Arrêter après 3 404 consécutifs
        
        for num in range(start_num, end_num + 1):
            url = self.build_url(year, num)
            filename = f"F{year}{str(num).zfill(3)}.pdf"
            filepath = os.path.join(self.base_dir, filename)
            
            try:
                # Télécharger le fichier
                print(f"📥 [{num:03d}] {url}", end=" ... ")
                response = requests.get(url, timeout=30)
                
                if response.status_code == 200:
                    consecutive_404 = 0  # Reset compteur
                    # Sauvegarder le fichier
                    with open(filepath, 'wb') as f:
                        f.write(response.content)
                    
                    # Enregistrer en BD
                    Document.create(
                        session_id=self.session_id,
                        url=url,
                        file_extension='.pdf',
                        file_path=filepath
                    )
                    
                    size_kb = len(response.content) / 1024
                    print(f"✅ {size_kb:.1f} KB")
                    success_count += 1
                
                elif response.status_code == 404:
                    print("⊗ Absent (404)")
                    consecutive_404 += 1
                    if consecutive_404 >= 3:
                        print("   ℹ️  3 documents absents consécutifs - fin probable")
                        break  # Arrêt soft
                
                else:
                    print(f"❌ Erreur {response.status_code}")
                    failed_count += 1
            
            except Exception as e:
                print(f"❌ Erreur: {str(e)[:50]}")
                failed_count += 1
        
        print(f"\n📊 Résumé:")
        print(f"   ✅ Réussis: {success_count}")
        print(f"   ❌ Échecs: {failed_count}")
        print(f"   📁 Dossier: {self.base_dir}\n")
        
        return success_count, failed_count

def test_joradp():
    """Test rapide avec 5 documents"""
    print("🧪 Test JORADP - Moissonnage de 5 documents")
    
    # Récupérer la session test
    harvester = PatternHarvester(session_id=1)
    
    # Moissonner 2025, numéros 1 à 5
    success, failed = harvester.harvest(year=2025, start_num=1, end_num=5)
    
    print("✅ Test terminé !")
    return success, failed

if __name__ == '__main__':
    test_joradp()
