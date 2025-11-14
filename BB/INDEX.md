# 📦 Package de visualisation de documents – (archive)

> Depuis la migration vers Cloudflare R2, ce “package” et ses scripts d’installation ne sont plus utilisés. Les sections ci-dessous rappellent l’historique mais n’ont plus vocation à être suivies en production.

## ✅ Procédure actuelle (R2)

1. **Configurer l’accès R2**
   ```bash
   cd /path/to/harvester-imac
   source backend/env.sh    # exporte HARVESTER_R2_*
   ```
2. **Redémarrer l’API**
   ```bash
   cd backend
   python3 api.py
   ```
   Les modules `backend/modules/joradp/routes.py` et `backend/modules/coursupreme/routes.py` utilisent `shared/r2_storage.py` pour générer des URL temporaires.
3. **Vérifier**
   ```bash
   curl -I http://localhost:5001/api/joradp/documents/<ID>/view
   # location: https://…r2.cloudflarestorage.com/…
   ```
4. **Frontend**
   - `npm start` dans `frontend/harvester-ui`.
   - Les boutons “Voir” et “Source” consomment directement les URL renvoyées par l’API (plus de copie locale).

## 📚 Ressources utiles

| Fichier | Description |
|---------|-------------|
| **README.md** | Documentation complète (section `☁️ Stockage R2`). |
| **backend/shared/r2_storage.py** | Helper utilisé par toutes les routes de documents. |
| **harvester-new/** | Dossier d’archives contenant les scripts de migration vers R2. |

## 🗂️ Archives conservées (pour mémoire)

- `GUIDE_RAPIDE_FR.md`, `DEMARRAGE_RAPIDE.md`, `SCHEMA_VISUEL.md` : conservés comme notes historiques (chacun rappelle désormais que tout passe par R2).
- Les anciens artefacts (`DocumentViewerButtons.jsx`, `document-viewer-package.zip`, dossier `files-harvester/`) ont été retirés du dépôt. Restaure un commit antérieur si tu dois consulter le package complet.

---

Si tu dois absolument réactiver l’ancien “Document Viewer” local, utilise une branche dédiée ou restaure un commit antérieur. Le dépôt principal ne contient plus `install_document_viewer.py`, `install_document_viewer.sh` ni `document_routes.py`.
