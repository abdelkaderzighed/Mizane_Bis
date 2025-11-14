from flask import Flask, jsonify
from flask_cors import CORS

# Import des modules
from modules.joradp.routes import joradp_bp
from modules.coursupreme.routes import coursupreme_bp

# Import des anciennes routes (harvest, sites, etc.)
from collections_api import register_collections_routes
from harvest_routes import register_harvest_routes
from sites_routes import register_sites_routes

app = Flask(__name__)
CORS(app)

# Enregistrer les modules avec préfixes
app.register_blueprint(joradp_bp, url_prefix='/api/joradp')
app.register_blueprint(coursupreme_bp, url_prefix='/api/coursupreme')

# Anciennes routes (à garder pour l'instant)
register_collections_routes(app)
register_harvest_routes(app)
register_sites_routes(app)

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'modules': ['joradp', 'coursupreme']})

if __name__ == '__main__':
    print("🚀 Démarrage avec 2 modules :")
    print("   📰 JORADP:        /api/joradp/*")
    print("   ⚖️  Cour Suprême: /api/coursupreme/*")
    app.run(host='0.0.0.0', port=5001, debug=True)
