#!/usr/bin/env python3

API_FILE = "/Users/djamel/doc_harvester/backend/api.py"

print("🔄 Ajout de la route /api/joradp/year-info/<year>")

# Lire le fichier
with open(API_FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Vérifier si déjà ajouté
if any('get_joradp_year_info' in line for line in lines):
    print("⚠️ La route year-info existe déjà")
    exit(0)

# Trouver où insérer (après la route stop_harvest, ligne ~1279)
insert_line = None
for i in range(1279, len(lines)):
    if '@app.route' in lines[i]:
        # Insérer avant cette route
        insert_line = i
        break

if not insert_line:
    # Sinon, insérer avant la dernière route
    insert_line = 1279

# Code de la nouvelle route
new_route = '''
@app.route('/api/joradp/year-info/<int:year>', methods=['GET'])
def get_joradp_year_info(year):
    """Obtient le nombre min/max de journaux pour une année JORADP donnée"""
    try:
        print(f"🔍 Recherche du max pour l'année {year}...")
        
        # Tester d'abord si le N°1 existe
        test_url = f"https://www.joradp.dz/FTP/JO-FRANCAIS/{year}/F{year}001.pdf"
        try:
            response = requests.head(test_url, timeout=5, allow_redirects=True)
            if response.status_code != 200:
                # Essayer avec minuscules
                test_url = f"https://www.joradp.dz/FTP/jo-francais/{year}/F{year}001.pdf"
                response = requests.head(test_url, timeout=5, allow_redirects=True)
                if response.status_code != 200:
                    return jsonify({'error': f'Aucun journal trouvé pour l\\'année {year}'}), 404
        except:
            return jsonify({'error': f'Impossible de vérifier l\\'année {year}'}), 500
        
        # Le N°1 existe, maintenant trouvons le max par recherche binaire
        def check_number_exists(num):
            """Vérifie si un numéro existe"""
            padded = str(num).zfill(3)
            urls = [
                f"https://www.joradp.dz/FTP/JO-FRANCAIS/{year}/F{year}{padded}.pdf",
                f"https://www.joradp.dz/FTP/jo-francais/{year}/F{year}{padded}.pdf"
            ]
            for url in urls:
                try:
                    r = requests.head(url, timeout=3, allow_redirects=True)
                    if r.status_code == 200:
                        return True
                except:
                    continue
            return False
        
        # Recherche binaire pour trouver le dernier numéro
        left, right = 1, 200
        last_found = 1
        
        while left <= right:
            mid = (left + right) // 2
            if check_number_exists(mid):
                last_found = mid
                left = mid + 1
            else:
                right = mid - 1
        
        print(f"✅ Année {year} : N°1 à N°{last_found}")
        
        return jsonify({
            'year': year,
            'min': 1,
            'max': last_found,
            'total': last_found,
            'message': f'Journaux disponibles : N°1 à N°{last_found}'
        })
        
    except Exception as e:
        print(f"❌ Erreur : {e}")
        return jsonify({'error': str(e)}), 500

'''

# Insérer la route
lines.insert(insert_line, new_route)

# Écrire le fichier
with open(API_FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"✅ Route ajoutée à la ligne {insert_line}")
print("")
print("🔄 Redémarrez le backend pour activer la route")

