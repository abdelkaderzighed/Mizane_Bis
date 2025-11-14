#!/bin/bash

echo "🔐 Ajout sécurisé de la route Assistant dans api.py"
echo ""

API_FILE="$HOME/doc_harvester/backend/api.py"

# Vérifier que le fichier existe
if [ ! -f "$API_FILE" ]; then
    echo "❌ Erreur : api.py introuvable"
    exit 1
fi

# 1. Sauvegarde de sécurité
BACKUP_FILE="${API_FILE}.backup-$(date +%Y%m%d-%H%M%S)"
cp "$API_FILE" "$BACKUP_FILE"
echo "✅ Sauvegarde créée : $BACKUP_FILE"

# 2. Créer le code à insérer
cat > /tmp/assistant_route.py << 'ENDOFCODE'

# ==========================================
# ASSISTANT IA - Route pour le chat
# ==========================================

@app.route('/api/assistant/chat', methods=['POST'])
def assistant_chat():
    """Route pour dialoguer avec l'assistant de configuration"""
    import requests
    
    try:
        data = request.json
        messages = data.get('messages', [])
        system_prompt = data.get('system', '')
        
        # Appel à l'API Claude via requests
        api_response = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers={
                'Content-Type': 'application/json',
                'x-api-key': os.environ.get('ANTHROPIC_API_KEY', ''),
                'anthropic-version': '2023-06-01'
            },
            json={
                'model': 'claude-sonnet-4-20250514',
                'max_tokens': 2000,
                'messages': messages,
                'system': system_prompt
            },
            timeout=30
        )
        
        if api_response.status_code == 200:
            return jsonify(api_response.json())
        else:
            error_msg = f'API error: {api_response.status_code}'
            print(error_msg)
            return jsonify({'error': error_msg}), api_response.status_code
            
    except requests.exceptions.Timeout:
        print("Timeout lors de l'appel à l'API Claude")
        return jsonify({'error': 'Request timeout'}), 408
    except Exception as e:
        print(f"Erreur assistant: {e}")
        return jsonify({'error': str(e)}), 500

ENDOFCODE

# 3. Trouver la ligne avec "if __name__ == '__main__':" et insérer AVANT
LINE_NUMBER=$(grep -n "if __name__ == '__main__':" "$API_FILE" | head -1 | cut -d: -f1)

if [ -z "$LINE_NUMBER" ]; then
    echo "❌ Impossible de trouver 'if __name__ == '__main__':' dans api.py"
    exit 1
fi

echo "📍 Insertion à la ligne $LINE_NUMBER"

# 4. Insérer le code
head -n $((LINE_NUMBER - 1)) "$API_FILE" > /tmp/api_new.py
cat /tmp/assistant_route.py >> /tmp/api_new.py
tail -n +$LINE_NUMBER "$API_FILE" >> /tmp/api_new.py

# 5. Remplacer le fichier
mv /tmp/api_new.py "$API_FILE"

echo "✅ Route /api/assistant/chat ajoutée"
echo ""
echo "📋 Vérification (dernières lignes avant if __name__) :"
grep -B 5 "if __name__ == '__main__':" "$API_FILE" | head -10
echo ""
echo "🎉 Ajout terminé !"
echo ""
echo "🔄 Redémarrez le backend pour appliquer les changements"
echo "🔙 Pour annuler : cp $BACKUP_FILE $API_FILE"
