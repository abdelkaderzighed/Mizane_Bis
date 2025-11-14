from datetime import datetime
from flask import request, jsonify
import requests

def register_collections_routes(app):
    
    @app.route('/api/collections/<collection_name>/harvest', methods=['POST'])
    def harvest_collection(collection_name):
        """
        Endpoint unifié : crée session auto + lance moissonnage
        """
        # 1. Créer nom de session automatique
        timestamp = datetime.now().strftime("%Y-%m-%d_%Hh%M")
        session_name = f"harvest_{collection_name}_{timestamp}"
        
        # 2. Créer la session
        session_data = {
            "name": session_name,
            "collection": collection_name,
            "mode": "auto"
        }
        
        try:
            # Créer session via l'endpoint existant
            session_response = requests.post(
                'http://localhost:5000/api/sessions',
                json=session_data
            )
            
            if session_response.status_code != 200:
                return jsonify({"error": "Erreur création session"}), 500
            
            session_id = session_response.json().get('id')
            
            # 3. Lancer le moissonnage immédiatement
            harvest_response = requests.post(
                f'http://localhost:5000/api/sessions/{session_id}/harvest'
            )
            
            if harvest_response.status_code != 200:
                return jsonify({"error": "Erreur lancement moissonnage"}), 500
            
            # 4. Retourner résultat complet
            return jsonify({
                "success": True,
                "session_id": session_id,
                "session_name": session_name,
                "collection": collection_name,
                "harvest_status": harvest_response.json()
            }), 200
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500
