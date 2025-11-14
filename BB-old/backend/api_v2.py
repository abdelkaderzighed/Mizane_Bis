#!/usr/bin/env python3
"""API v2 - Version propre avec nouveaux modèles"""

from flask import Flask, jsonify
from flask_cors import CORS
from models import Site, HarvestingSession

app = Flask(__name__)
CORS(app)

@app.route('/api/sites', methods=['GET'])
def get_sites():
    """Liste tous les sites"""
    sites = Site.get_all()
    return jsonify({'success': True, 'sites': sites})

@app.route('/api/sites/<name>', methods=['GET'])
def get_site(name):
    """Récupère un site par nom"""
    site = Site.get_by_name(name)
    if site:
        return jsonify({'success': True, 'site': site})
    return jsonify({'success': False, 'error': 'Site non trouvé'}), 404

@app.route('/api/sessions', methods=['GET'])
def get_sessions():
    """Liste toutes les sessions"""
    sessions = HarvestingSession.get_all()
    return jsonify({'success': True, 'sessions': sessions})

if __name__ == '__main__':
    print("\n🚀 API v2 - Test des nouveaux modèles")
    print("="*50)
    app.run(host='0.0.0.0', port=5002, debug=True)
