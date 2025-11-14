# 📚 Doc Harvester V1.0

Application de moissonnage et gestion de documents juridiques algériens (JORADP).

## ✨ Fonctionnalités

- 🌾 **Moissonnage exhaustif** : Récupération complète d'une année
- 🔄 **Moissonnage incrémental** : Mise à jour automatique
- 📥 **Téléchargement automatique** des PDFs
- 👁️ **Visualisation** : locale ou en ligne
- 🗑️ **Suppression** de documents
- 📊 **Interface hiérarchique** : Sites > Sessions > Documents

## 🚀 Installation

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 api.py
```

### Frontend
```bash
cd frontend/harvester-ui
npm install
npm start
```

## ☁️ Stockage R2 (Cloudflare)

L'application ne lit plus aucun fichier local. Pour servir les PDF/TXT :

1. **Configurer l'accès R2**  
   Renseigne les variables dans `backend/env.sh` (`HARVESTER_R2_BASE_URL`, `HARVESTER_R2_ACCOUNT_ID`, `HARVESTER_R2_ACCESS_KEY_ID`, `HARVESTER_R2_SECRET_ACCESS_KEY`) puis recharge-les :  
   `cd backend && source env.sh && source venv/bin/activate`.

2. **Convertir les chemins existants**  
   ```bash
   cd harvester-new
   source backend/env.sh
   python migrate_paths_to_r2.py                # documents JORADP
   python migrate_coursupreme_paths_to_r2.py    # décisions Cour Suprême
   ```

3. **Valider**  
   - `curl -I http://localhost:5001/api/joradp/documents/<id>/view` doit répondre `302` vers une URL `https://…r2.cloudflarestorage.com`.
   - Dans le front, l'ouverture d'un document Cour Suprême affiche toujours les contenus AR/FR (stream depuis R2).

## 📦 Version 1.0

Date : 25 octobre 2025  
Statut : ✅ Stable et fonctionnelle

## 🚧 Roadmap V2

- Ajout de nouveaux sites à moissonner
- Analyse IA améliorée
- Recherche sémantique avancée
