#!/bin/bash

API_FILE="$HOME/doc_harvester/backend/api.py"

echo "🔄 Remplacement de la classe JORADPHarvester"

# Créer la nouvelle classe
cat > /tmp/joradp_new_class.py << 'ENDOFCLASS'
class JORADPHarvester(BaseHarvester):
    def __init__(self, base_url, profile=None, year=2025, config=None, job_id=None):
        super().__init__(base_url, profile)
        self.year = year
        self.job_id = job_id
        self.config = config or {
            'workers': 2,
            'timeout': 60,
            'retry_count': 3,
            'delay_between': 0.5
        }
    
    def build_pdf_urls(self, number):
        """Retourne les deux variantes d'URL (majuscules et minuscules)"""
        padded_number = str(number).zfill(3)
        filename = f"F{self.year}{padded_number}.pdf"
        
        return [
            f"https://www.joradp.dz/FTP/JO-FRANCAIS/{self.year}/{filename}",  # Majuscules
            f"https://www.joradp.dz/FTP/jo-francais/{self.year}/{filename}"   # Minuscules
        ]
    
    def check_pdf_exists(self, number):
        """Vérifie l'existence du PDF en testant les deux variantes de casse"""
        urls = self.build_pdf_urls(number)
        
        max_retries = self.config.get('retry_count', 3)
        timeout = self.config.get('timeout', 60)
        retry_delay = 2
        
        # Essayer chaque variante d'URL
        for url in urls:
            for attempt in range(max_retries):
                try:
                    response = requests.head(url, timeout=timeout, allow_redirects=True)
                    if response.status_code == 200:
                        metadata = {
                            'url': url,
                            'number': str(number).zfill(3),
                            'title': f"Journal Officiel N°{str(number).zfill(3)} - {self.year}",
                            'filename': f"F{self.year}{str(number).zfill(3)}.pdf",
                            'year': self.year,
                            'file_type': 'pdf',
                            'accessible': True
                        }
                        
                        if 'content-length' in response.headers:
                            size_bytes = int(response.headers['content-length'])
                            metadata['file_size'] = self.format_file_size(size_bytes)
                        
                        if 'last-modified' in response.headers:
                            metadata['last_modified'] = response.headers['last-modified']
                        
                        return metadata
                    elif response.status_code == 404:
                        # 404 pour cette URL, essayer la suivante
                        break
                    else:
                        # Autre erreur, réessayer
                        if attempt < max_retries - 1:
                            time.sleep(retry_delay)
                            continue
                        break
                        
                except requests.exceptions.Timeout:
                    if attempt < max_retries - 1:
                        time.sleep(retry_delay)
                        continue
                    break
                except Exception as e:
                    if attempt < max_retries - 1:
                        time.sleep(retry_delay)
                        continue
                    break
        
        # Aucune des URLs n'a fonctionné
        return None
    
    def harvest(self, max_results=10, start=1, end=100):
        """Moissonne les documents avec support d'interruption"""
        found_count = 0
        workers = self.config.get('workers', 2)
        delay = self.config.get('delay_between', 0.5)
        
        if workers == 1:
            print(f"🔄 Mode séquentiel activé pour N°{start} à {end}")
            for num in range(start, end + 1):
                # Vérifier si interruption demandée
                if self.job_id and active_jobs.get(self.job_id, {}).get('stop_requested'):
                    print(f"⏹️ Moissonnage interrompu par l'utilisateur")
                    break
                
                if max_results and found_count >= max_results:
                    break
                
                result = self.check_pdf_exists(num)
                if result:
                    found_count += 1
                    self.documents.append(result)
                    print(f"✓ Trouvé: N°{result['number']}")
                else:
                    print(f"✗ Absent: N°{str(num).zfill(3)}")
                
                time.sleep(delay)
        else:
            print(f"⚡ Mode parallèle activé ({workers} workers)")
            with ThreadPoolExecutor(max_workers=workers) as executor:
                future_to_number = {
                    executor.submit(self.check_pdf_exists, num): num
                    for num in range(start, end + 1)
                }
                
                for future in as_completed(future_to_number):
                    # Vérifier si interruption demandée
                    if self.job_id and active_jobs.get(self.job_id, {}).get('stop_requested'):
                        print(f"⏹️ Moissonnage interrompu par l'utilisateur")
                        # Annuler les tâches restantes
                        for f in future_to_number:
                            f.cancel()
                        break
                    
                    result = future.result()
                    if result:
                        found_count += 1
                        self.documents.append(result)
                        
                        if max_results and found_count >= max_results:
                            for f in future_to_number:
                                f.cancel()
                            break
                    
                    time.sleep(delay)
        
        self.documents.sort(key=lambda x: x['number'])
        return self.documents

ENDOFCLASS

# Remplacer les lignes 607-716
head -n 606 "$API_FILE" > /tmp/api_new.py
cat /tmp/joradp_new_class.py >> /tmp/api_new.py
echo "" >> /tmp/api_new.py
tail -n +717 "$API_FILE" >> /tmp/api_new.py

# Remplacer le fichier
mv /tmp/api_new.py "$API_FILE"

echo "✅ Classe JORADPHarvester remplacée"
echo ""
echo "📋 Vérification (nouvelles méthodes) :"
grep -n "def build_pdf_urls\|def check_pdf_exists\|def harvest" "$API_FILE" | grep -A2 "607:"

