# 📐 Schéma visuel (archive)

Le schéma initial décrivait l’installation d’un “Document Viewer” local : copie de `document_routes.py`, création d’un dossier `backend/downloads`, ajout d’un composant React spécifique, etc.  
Depuis que toute la chaîne s’appuie sur Cloudflare R2 :

- Les PDF/TXT ne résident plus dans le dépôt.
- Les routes `document_routes.py` et les scripts `install_document_viewer.*` ont été supprimés.
- Les interactions (upload, lecture, suppression) passent par `backend/shared/r2_storage.py`.

👉 Pour comprendre le flux actuel :
1. Lire le README (section `☁️ Stockage R2`).
2. Parcourir `backend/modules/joradp/routes.py` et `backend/modules/coursupreme/routes.py` pour voir comment les URL R2 sont construites.
3. Vérifier côté frontend que les boutons “Voir” / “Source” utilisent les URL renvoyées par l’API.

Ce fichier est conservé uniquement pour mémoire ; aucun schéma n’est maintenu tant que l’ancien module n’est pas réintroduit.
