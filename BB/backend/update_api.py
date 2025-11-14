#!/usr/bin/env python3
"""Script pour adapter api.py automatiquement"""

import re

print("\n" + "="*70)
print("ADAPTATION AUTOMATIQUE DE api.py")
print("="*70 + "\n")

# Lire api.py
with open('api.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Ajouter les imports des modèles
print("📝 Ajout des imports...")
if 'from models import' not in content:
    # Trouver la position après les imports existants
    import_pos = content.find('app = Flask(__name__)')
    if import_pos > 0:
        new_import = '\n# Nouveaux modèles\nfrom models import Site, HarvestingSession, Document\n\n'
        content = content[:import_pos] + new_import + content[import_pos:]
        print("   ✅ Imports ajoutés")
else:
    print("   ℹ️  Imports déjà présents")

# 2. Ajouter endpoint pour lister les sites
print("📝 Ajout de l'endpoint /api/sites...")
sites_endpoint = '''
# ============================================================================
# NOUVEAUX ENDPOINTS - Utilisant la nouvelle structure BD
# ============================================================================

@app.route('/api/sites', methods=['GET'])
def get_sites():
    """Liste tous les sites configurés"""
    try:
        sites = Site.get_all()
        return jsonify({
            'success': True,
            'sites': sites
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/sites/<name>', methods=['GET'])
def get_site_by_name(name):
    """Récupérer un site par son nom"""
    try:
        site = Site.get_by_name(name)
        if site:
            return jsonify({
                'success': True,
                'site': site
            })
        return jsonify({
            'success': False,
            'error': 'Site non trouvé'
        }), 404
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/sessions', methods=['GET'])
def get_sessions():
    """Liste toutes les sessions de moissonnage"""
    try:
        include_test = request.args.get('include_test', 'false').lower() == 'true'
        sessions = HarvestingSession.get_all(include_test=include_test)
        return jsonify({
            'success': True,
            'sessions': sessions
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/sessions', methods=['POST'])
def create_session():
    """Créer une nouvelle session de moissonnage"""
    try:
        data = request.json
        
        # Récupérer le site
        site = Site.get_by_name(data.get('site_name'))
        if not site:
            return jsonify({
                'success': False,
                'error': 'Site non trouvé'
            }), 404
        
        # Créer la session
        session_id = HarvestingSession.create(
            site_id=site['id'],
            session_name=data.get('session_name', 'default'),
            is_test=data.get('is_test', False),
            status='pending'
        )
        
        return jsonify({
            'success': True,
            'session_id': session_id
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

'''

if '/api/sites' not in content:
    # Ajouter avant le if __name__ == '__main__'
    main_pos = content.find("if __name__ == '__main__':")
    if main_pos > 0:
        content = content[:main_pos] + sites_endpoint + '\n' + content[main_pos:]
        print("   ✅ Endpoints ajoutés")
else:
    print("   ℹ️  Endpoints déjà présents")

# 3. Sauvegarder
with open('api.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n" + "="*70)
print("✅ api.py MODIFIÉ AVEC SUCCÈS")
print("="*70)
print("\n📋 Nouveaux endpoints ajoutés:")
print("   GET  /api/sites           - Liste tous les sites")
print("   GET  /api/sites/<name>    - Récupérer un site")
print("   GET  /api/sessions        - Liste toutes les sessions")
print("   POST /api/sessions        - Créer une session")
print("\n🔧 Redémarrez le backend pour tester:")
print("   python3 api.py\n")

