import requests
from bs4 import BeautifulSoup
import sqlite3
import re
from urllib.parse import urljoin

url = 'https://coursupreme.dz/الغرف-المجتمعة/'
response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
soup = BeautifulSoup(response.content, 'html.parser')

conn = sqlite3.connect('../../harvester.db')
cursor = conn.cursor()

# Trouver premier thème
accordions = soup.find_all('div', class_='accordion-header')
first_accordion = accordions[0]
h4 = first_accordion.find('h4')
theme_name = h4.get_text(strip=True)

print(f"Thème: {theme_name}")

# Récupérer theme_id
cursor.execute("SELECT id FROM supreme_court_themes WHERE chamber_id = 5 AND name_ar = ?", (theme_name,))
result = cursor.fetchone()
theme_id = result[0] if result else None

print(f"Theme ID: {theme_id}")

# Trouver décisions
content_div = first_accordion.find_next_sibling('div', class_='accordion-content')
if content_div:
    links = content_div.find_all('a', href=lambda h: h and '/decision/' in str(h))
    
    print(f"Liens trouvés: {len(links)}")
    
    for link in links:
        decision_url = urljoin('https://coursupreme.dz', link.get('href'))
        decision_title = link.get_text(strip=True)
        
        print(f"\nDécision: {decision_title}")
        print(f"URL: {decision_url}")
        
        # Extraire numéro
        number_match = re.search(r'(\d{5,7})', decision_title)
        decision_number = number_match.group(1) if number_match else 'N/A'
        print(f"Numéro extrait: {decision_number}")
        
        # Extraire date
        date_match = re.search(r'(\d{2}[-/]\d{2}[-/]\d{4})', decision_title)
        decision_date = date_match.group(1) if date_match else None
        print(f"Date extraite: {decision_date}")
        
        # Tenter insertion
        try:
            cursor.execute("""
                INSERT OR IGNORE INTO supreme_court_decisions
                (chamber_id, theme_id, decision_number, decision_date, url, download_status)
                VALUES (?, ?, ?, ?, ?, 'pending')
            """, (5, theme_id, decision_number, decision_date, decision_url))
            
            print(f"Insertion: rowcount = {cursor.rowcount}")
            conn.commit()
        except Exception as e:
            print(f"ERREUR: {e}")
else:
    print("Pas de content_div trouvé")

conn.close()
