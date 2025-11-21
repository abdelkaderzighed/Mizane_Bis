# Changelog

## 1.1 - 2025-11-21
- Export Cours Suprême: fallback sur R2 (file_path_ar/fr) lorsque les colonnes HTML en base sont vides, évite les exports “contenu indisponible”.
- UI: confirmation de succès après export des décisions sélectionnées.
- Maintenance: archives des anciens backups/migrations dans `archives-moissonneur.zip`, ajout de `gunicorn` dans `requirements.txt`.

## 1.0 - 2025-10-25
- Première version stable : moissonnage exhaustif/incrémental JORADP, stockage R2, visualisation et gestion des documents.
