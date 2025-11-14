# ⚡ DÉMARRAGE RAPIDE (mise à jour R2)

> Ce guide décrivait l’ancien “Document Viewer” local basé sur `document_routes.py`, un dossier `backend/downloads` et les scripts `install_document_viewer.py/.sh`.  
> Depuis novembre 2025, **tous les PDF/TXT sont servis directement depuis Cloudflare R2**. Les scripts et le package ZIP ont été retirés pour éviter toute confusion.

## ✅ Ce qu’il faut faire maintenant

1. **Charger la configuration R2**
   ```bash
   cd /path/to/harvester-imac
   source backend/env.sh    # exporte HARVESTER_R2_*
   ```
   Les helpers `backend/shared/r2_storage.py` utilisent ces variables pour signer les URL et téléverser les documents.

2. **Redémarrer l’API**
   ```bash
   cd backend
   python3 api.py
   ```
   Lorsque `modules/joradp/routes.py` ou `modules/coursupreme/routes.py` renvoient une URL `...r2.cloudflarestorage.com`, le frontend peut la consommer directement.

3. **Vérifier la redirection**
   ```bash
   curl -I http://localhost:5001/api/joradp/documents/<ID>/view
   # HTTP/1.1 302 FOUND
   # location: https://7400…r2.cloudflarestorage.com/textes-juridiques/...
   ```
   Le même principe s’applique aux endpoints Cour Suprême (voir `modules/coursupreme/routes.py`).

4. **Frontend**
   - Lance `npm start` depuis `frontend/harvester-ui`.
   - Les boutons “Voir”/“Source” utilisent les URL que renvoie l’API : aucun téléchargement local n’est requis.

## ℹ️ Besoin de détails ?

- Documentation complète : README (`☁️ Stockage R2`).
- Fonction utilitaire : `backend/shared/r2_storage.py`.
- Migration historique : scripts d’alignement conservés dans `harvester-new/` (dossier d’archives).

---

Ce fichier reste en place pour signaler que **l’installation locale n’est plus nécessaire**. Toute réactivation de l’ancien module se ferait en dehors du code principal.
