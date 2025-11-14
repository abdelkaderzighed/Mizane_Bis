"""
Moissonnage incrémental JORADP
Modes: depuis_dernier, entre_dates, depuis_numero
"""
from harvester_joradp_exhaustive import JORADPExhaustiveHarvester
from models import get_db_connection
from datetime import datetime

class JORADPIncrementalHarvester(JORADPExhaustiveHarvester):
    """Moissonnage incrémental avec plusieurs modes"""
    
    def harvest_depuis_dernier(self):
        """Moissonne depuis le dernier document collecté"""
        print("🔄 Mode: Depuis le dernier document")
        
        # Trouver le dernier document
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT url, publication_date 
                FROM documents 
                WHERE session_id = ?
                ORDER BY publication_date DESC, url DESC
                LIMIT 1
            """, (self.session_id,))
            
            last_doc = cursor.fetchone()
        
        if not last_doc:
            print("❌ Aucun document existant, utilisez harvest_all")
            self.last_doc_info = None
            return
        
        # Stocker les infos du dernier document
        self.last_doc_info = {
            'url': last_doc['url'],
            'date': last_doc['publication_date']
        }
        
        # Extraire année et numéro
        last_url = last_doc['url']
        # Format: https://www.joradp.dz/FTP/JO-FRANCAIS/2024/F2024088.pdf
        parts = last_url.split('/')
        filename = parts[-1]  # F2024088.pdf
        year = int(filename[1:5])  # 2024
        num = int(filename[5:8])   # 088
        
        print(f"   Dernier doc: {filename} ({last_doc['publication_date']})")
        print(f"   Reprise depuis: année {year}, numéro {num + 1}")
        
        # Continuer depuis ce point
        current_year = datetime.now().year
        
        # Finir l'année en cours
        if num < 999:
            self.harvest_year(year, start_num=num + 1)
        
        # Puis années suivantes
        if year < current_year:
            self.harvest_all(start_year=year + 1, end_year=current_year)
    
    def harvest_entre_dates(self, date_debut, date_fin):
        """Moissonne/remoissonne entre deux dates"""
        print(f"🔄 Mode: Entre dates {date_debut} et {date_fin}")
        
        # Extraire les années
        year_debut = int(date_debut[:4])
        year_fin = int(date_fin[:4])
        
        print(f"   Années à traiter: {year_debut} à {year_fin}")
        
        # Moissonner toutes les années concernées
        self.harvest_all(start_year=year_debut, end_year=year_fin)
    
    def harvest_depuis_numero(self, year, start_num, max_docs=100):
        """Moissonne X documents depuis un numéro dans une année"""
        print(f"🔄 Mode: Depuis numéro {start_num} en {year}")
        print(f"   Maximum: {max_docs} documents")
        
        end_num = min(start_num + max_docs - 1, 999)
        self.harvest_year(year, start_num=start_num, max_num=end_num)


def test_incremental():
    """Test des différents modes"""
    print("🧪 Test moissonnage incrémental\n")
    
    harvester = JORADPIncrementalHarvester(session_id=14)
    
    # Mode 1: Depuis le dernier
    harvester.harvest_depuis_dernier()


if __name__ == "__main__":
    test_incremental()
