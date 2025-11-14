# 📘 Guide rapide (statut : obsolète)

Ce guide détaillait l’installation du “Document Viewer” local (`document_routes.py`, scripts `install_document_viewer.*`, dossier `backend/downloads`).  
La chaîne complète bascule désormais sur Cloudflare R2 :

- Les PDF/TXT sont envoyés et servis via `shared/r2_storage.py`.
- Aucun fichier n’est copié dans le dépôt, aucun script d’installation n’est requis.
- Les boutons “Voir”/“Source” du frontend consomment directement les URL renvoyées par l’API.

## 🔁 Nouveau flux

1. **Configurer l’accès R2**
   ```bash
   cd /path/to/harvester-imac
   source backend/env.sh    # définit HARVESTER_R2_BUCKET, _BASE_URL, _ACCOUNT_ID, ...
   ```

2. **Vérifier le backend**
   - Les endpoints `modules/joradp/routes.py` et `modules/coursupreme/routes.py` utilisent `r2_storage`.
   - Redémarre `python3 backend/api.py` après toute mise à jour d’ENV.

3. **Contrôler les URLs renvoyées**
   ```bash
   curl -I http://localhost:5001/api/joradp/documents/<ID>/view
   # location: https://…r2.cloudflarestorage.com/…
   ```

4. **Frontend**
   - `npm start` dans `frontend/harvester-ui`.
   - Les boutons “Voir” doivent ouvrir les URLs R2, “Source” pointe vers l’URL d’origine en base.

## 📚 Où trouver les infos à jour ?

- README (`☁️ Stockage R2`) pour la procédure complète.
- `backend/shared/r2_storage.py` pour le helper de stockage.
- Dossier `harvester-new/` pour les scripts de migration utilisés lors du basculement.

---

Les anciennes sections (copier `document_routes.py`, créer `backend/downloads`, etc.) ont été supprimées pour empêcher toute régression. Conserve ce fichier uniquement comme note historique.
