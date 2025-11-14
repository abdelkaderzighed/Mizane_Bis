#!/usr/bin/env python3

API_FILE = "/Users/djamel/doc_harvester/backend/api.py"

print("🔄 Ajout de la route /api/harvest/<job_id>/stop")

# Lire le fichier
with open(API_FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Vérifier si la route existe déjà
route_exists = any("@app.route('/api/harvest/<job_id>/stop'" in line for line in lines)

if route_exists:
    print("⚠️ La route /stop existe déjà")
    exit(0)

# Trouver la ligne après la dernière route /api/harvest (ligne 1270)
# On cherche la fin de cette fonction (return jsonify)
insert_line = None
for i in range(1270, len(lines)):
    if lines[i].strip().startswith('return jsonify') or lines[i].strip().startswith('return'):
        # Trouver la ligne vide suivante
        for j in range(i+1, len(lines)):
            if lines[j].strip() == '':
                insert_line = j + 1
                break
        break

if not insert_line:
    print("❌ Impossible de trouver où insérer la route")
    exit(1)

# Code de la nouvelle route
new_route = '''
@app.route('/api/harvest/<job_id>/stop', methods=['POST'])
def stop_harvest(job_id):
    """Arrête un moissonnage en cours"""
    if job_id not in active_jobs:
        return jsonify({'error': 'Job non trouvé'}), 404
    
    job = active_jobs[job_id]
    
    if job['status'] != 'running':
        return jsonify({'error': 'Le job n\\'est pas en cours'}), 400
    
    # Marquer le job comme devant être arrêté
    active_jobs[job_id]['stop_requested'] = True
    
    print(f"⏹️ Demande d'arrêt du job {job_id}")
    
    return jsonify({
        'message': 'Demande d\\'arrêt envoyée',
        'job_id': job_id
    })

'''

# Insérer la route
lines.insert(insert_line, new_route)

# Écrire le fichier
with open(API_FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"✅ Route ajoutée à la ligne {insert_line}")
print("")
print("📋 Vérification :")
print("Recherche de la nouvelle route...")

# Vérifier
with open(API_FILE, 'r', encoding='utf-8') as f:
    content = f.read()
    if "/api/harvest/<job_id>/stop" in content:
        print("✅ Route /stop trouvée dans le fichier")
    else:
        print("❌ Route non trouvée")

