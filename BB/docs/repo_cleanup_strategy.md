# Phase 1 – Gouvernance dépôt & sauvegardes

## 1. Périmètre code vs artefacts générés
- **Code source** : `backend/` (API, services, modules), `frontend/harvester-ui/src`, `docs/`, scripts CLI à conserver.
- **Données générées** : `backend/downloads/`, fichiers `.pdf/.txt` collectés, logs (`*.log`, `*.pid`), exports (`*.json` hors référence).
- **Environnements** : `venv/`, `backend/backend/venv/`, `frontend/harvester-ui/node_modules/`.
- **Sauvegardes volumineuses** : `doc_harvester_backup_*.tar.gz`, `backups/*.tar.gz`, `harvester_backup_*.db`, `harvester.db.backup*`.
- **Scripts legacy** (à archiver) : racine `harvester_old*.py`, `harvester_v*.py`, `frontend/.../add_*.py`, `backend/modules/coursupreme/fix_*.py`, `backend/api_v2.py`, `backend/routes_coursupreme.py` (les scripts `install_document_viewer.*` et les copies `document_routes.py` ont été supprimés en 2025-02).

## 2. Arborescence recommandée
```
backend/
  app/                # Flask app + blueprints
  services/           # logique métier (harvest, analysis, storage)
  workers/            # jobs asynchrones
  scripts/legacy/     # anciennes versions & patchs archivés
  tests/              # tests backend
frontend/harvester-ui/
  src/
    modules/          # vues JORADP / CourSuprême
    components/
    api/
    hooks/
  tests/
legacy/               # archives historiques (scripts Python, installateurs)
archives/             # backups déplacés hors racine (non suivis git)
```

## 3. Politique de sauvegarde
- **Stockage** : dossiers `archives/` (non versionnés) ou stockage externe (S3/Drive). Aucune archive >100 Mo dans Git.
- **Fréquence** :
  - Sauvegarde incrémentale quotidienne (documents + DB) conservée 7 jours.
  - Sauvegarde complète hebdomadaire (code + données) conservée 4 semaines.
  - Snapshot manuel avant toute refonte majeure (comme fait `doc_harvester_backup_YYYYMMDD-HHMMSS.tar.gz`) mais déplacé hors repo.
- **Procédure** :
  1. `tar` + checksum (`shasum`) pour vérifier l’intégrité.
  2. Transfert vers stockage sécurisé (chiffré si externe).
  3. Journal de sauvegarde (`docs/backup_log.md`) mis à jour (date, périmètre, emplacement).
- **Restauration** : script `scripts/restore_backup.sh` à prévoir, capable de restaurer DB + fichiers dans un environnement isolé.

## 4. Hygiène Git
- `.gitignore` élargi pour exclure environnements/sauvegardes (déjà appliqué).
- Nettoyage cible : `git rm -r --cached backend/downloads ...` après déplacement vers `archives/`.
- Branches :
  - `main` / `production` protégées, merge via PR + CI.
  - Branches de feature petites, rebase avant merge.
- Checks avant commit : `pre-commit` (Black/Flake8/ESLint), script `bin/check-clean-tree.sh` pour vérifier qu’aucun fichier généré n’est suivi.
- Documentation workflow dans `docs/contributing.md` à enrichir.

## 5. Étapes suivantes
1. Déplacer archives/DB existantes hors repo (`archives/2025-11-03/…`).
2. Purger l’index (`git rm --cached` des fichiers désormais ignorés).
3. Commiter `.gitignore` + doc governance.
4. Ouvrir PR “Phase 1 Cleanup” pour validation.
5. Enchaîner avec réorganisation des répertoires (Phase 2).
