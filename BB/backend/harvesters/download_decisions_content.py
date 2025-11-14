"""
Téléchargement du contenu des décisions
"""
import requests
from bs4 import BeautifulSoup
import sqlite3
import time

class DecisionDownloader:
    def __init__(self, db_path='../../harvester.db'):
        self.db_path = db_path
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
        })
    
    def get_conn(self):
        return sqlite3.connect(self.db_path)
    
    def download_decision_content(self, decision_id, url):
        """Télécharge et parse le contenu d'une décision"""
        try:
            response = self.session.get(url, timeout=30)
            
            if response.status_code != 200:
                return None, f"HTTP {response.status_code}"
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Trouver l'article principal
            article = soup.find('article')
            
            if not article:
                return None, "Article non trouvé"
            
            # Extraire données structurées
            data = {
                'decision_number': None,
                'decision_date': None,
                'object_ar': None,
                'parties_ar': None,
                'legal_reference_ar': None,
                'arguments_ar': None,
                # 'html_content_ar': str(article)  # Supprimé - stocké dans fichier
            }
            
            # Parser les champs
            labels = article.find_all('span', class_='decision-label')
            
            for label in labels:
                text = label.get_text(strip=True)
                
                if 'رقم القرار' in text:
                    data['decision_number'] = text.replace('رقم القرار:', '').strip()
                elif 'تاريخ القرار' in text:
                    data['decision_date'] = text.replace('تاريخ القرار:', '').strip()
                elif 'الموضوع' in text:
                    data['object_ar'] = text.replace('الموضوع:', '').strip()
                elif 'الأطراف' in text:
                    data['parties_ar'] = text.replace('الأطراف:', '').strip()
                elif 'المرجع القانوني' in text:
                    data['legal_reference_ar'] = text.replace('المرجع القانوني:', '').strip()
            
            # Arguments (dans les <p> après <h5>)
            h5_defense = article.find('h5', string=lambda s: s and 'أوجه الدفع' in s)
            if h5_defense:
                arguments = []
                for p in h5_defense.find_next_siblings('p'):
                    arguments.append(p.get_text(strip=True))
                data['arguments_ar'] = '\n'.join(arguments)
            
            return data, None
            
        except Exception as e:
            return None, str(e)
    
    def download_batch(self, limit=10):
        """Télécharge un lot de décisions"""
        conn = self.get_conn()
        cursor = conn.cursor()
        
        # Récupérer décisions en attente
        cursor.execute("""
            SELECT id, decision_number, url 
            FROM supreme_court_decisions 
            WHERE download_status = 'pending'
            LIMIT ?
        """, (limit,))
        
        pending = cursor.fetchall()
        
        print(f"\n{'='*70}")
        print(f"📥 TÉLÉCHARGEMENT CONTENU - {len(pending)} décisions")
        print(f"{'='*70}\n")
        
        success = 0
        failed = 0
        
        for decision_id, decision_number, url in pending:
            print(f"📄 {decision_number}... ", end='', flush=True)
            
            data, error = self.download_decision_content(decision_id, url)
            
            if data:
                # Mettre à jour BDD
                cursor.execute("""
                    UPDATE supreme_court_decisions 
                    SET 
                        object_ar = ?,
                        parties_ar = ?,
                        legal_reference_ar = ?,
                        arguments_ar = ?,
                        # html_content_ar = ?,  # Supprimé
                        download_status = 'downloaded'
                    WHERE id = ?
                """, (
                    data['object_ar'],
                    data['parties_ar'],
                    data['legal_reference_ar'],
                    data['arguments_ar'],
                    # data['html_content_ar'],  # Supprimé
                    decision_id
                ))
                
                conn.commit()
                success += 1
                print("✅")
            else:
                cursor.execute("""
                    UPDATE supreme_court_decisions 
                    SET download_status = 'error'
                    WHERE id = ?
                """, (decision_id,))
                
                conn.commit()
                failed += 1
                print(f"❌ {error}")
            
            time.sleep(0.5)
        
        conn.close()
        
        print(f"\n{'='*70}")
        print(f"✅ Succès  : {success}")
        print(f"❌ Échecs  : {failed}")
        print(f"{'='*70}\n")
        
        return success, failed

if __name__ == '__main__':
    downloader = DecisionDownloader()
    
    # Test avec 10 décisions
    print("🧪 TEST - 10 premières décisions")
    downloader.download_batch(limit=10)
    
    # Stats
    conn = sqlite3.connect('../../harvester.db')
    cursor = conn.cursor()
    
    cursor.execute("SELECT download_status, COUNT(*) FROM supreme_court_decisions GROUP BY download_status")
    
    print("\n📊 STATS TÉLÉCHARGEMENT:")
    for status, count in cursor.fetchall():
        print(f"   {status}: {count}")
    
    conn.close()
