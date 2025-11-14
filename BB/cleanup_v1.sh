#!/bin/bash
echo "🧹 Nettoyage de la V1..."

# 1. Supprimer les fichiers .bak et .backup
echo "📦 Suppression des fichiers de sauvegarde..."
find . -name "*.bak" -o -name "*.backup*" | grep -v node_modules | grep -v venv | while read file; do
    echo "  ❌ $file"
    rm "$file"
done

# 2. Supprimer les scripts temporaires dans backend (hors venv)
echo "🔧 Suppression des scripts temporaires backend..."
rm -f backend/add_delete_endpoint.py
rm -f backend/add_single_download.py
rm -f backend/fix_downloads_path.py
rm -f backend/repair_sites_routes.py
rm -f backend/fix_file_path_json.py
rm -f backend/add_year_info_route.py
rm -f backend/fix_joradp_robust.py
rm -f backend/add_stop_route.py

# 3. Supprimer les scripts temporaires dans frontend
echo "🎨 Suppression des scripts temporaires frontend..."
rm -f frontend/harvester-ui/src/add_stop_button.py
rm -f frontend/harvester-ui/src/components/add_delete_endpoint.py
rm -f frontend/harvester-ui/src/components/fix_inline_buttons.py
rm -f frontend/harvester-ui/src/components/fix_all_buttons.py
rm -f frontend/harvester-ui/src/components/fix_interface.py
rm -f frontend/harvester-ui/src/components/fix_buttons.py
rm -f frontend/harvester-ui/src/components/fix_download_function.py
rm -f frontend/harvester-ui/src/components/add_debug_logs.py
rm -f frontend/harvester-ui/src/components/fix_ui_clean.py
rm -f frontend/harvester-ui/src/components/add_download_function.py
rm -f frontend/harvester-ui/src/components/fix_file_path.py
rm -f frontend/harvester-ui/src/components/add_import.py
rm -f frontend/harvester-ui/src/components/fix_view_document.py
rm -f frontend/harvester-ui/src/components/add_doc_log.py
rm -f frontend/harvester-ui/src/components/show_full_doc.py
rm -f frontend/harvester-ui/src/components/show_full_document.py
rm -f frontend/harvester-ui/src/components/remove_*.py
rm -f frontend/harvester-ui/src/remove_*.py

echo "✅ Nettoyage terminé!"
