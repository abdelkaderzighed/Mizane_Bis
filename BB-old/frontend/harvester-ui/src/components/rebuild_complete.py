with open('CoursSupremeViewer.jsx', 'r') as f:
    lines = f.readlines()

import_line_idx = None
for i, line in enumerate(lines):
    if "import {" in line and "lucide-react" in line:
        import_line_idx = i
        break

if import_line_idx:
    lines[import_line_idx] = "import { ChevronDown, ChevronRight, FolderOpen, Tag, Eye, Globe, Download, Database, Trash2, Search } from 'lucide-react';\n"

fetchChambers_idx = None
for i, line in enumerate(lines):
    if 'const fetchChambers = async' in line:
        fetchChambers_idx = i
        break

if fetchChambers_idx:
    functions = """
  const handleDownloadDecision = async (id) => {
    try {
      const response = await fetch(`http://localhost:5001/api/coursupreme/download/${id}`, {method: 'POST'});
      const data = await response.json();
      alert(data.message || 'Téléchargement lancé');
    } catch (error) {
      alert('Erreur téléchargement');
    }
  };

  const handleShowMetadata = async (id) => {
    alert('Métadonnées IA - À venir');
  };

  const handleDeleteDecision = async (id) => {
    if (!confirm('Supprimer cette décision ?')) return;
    try {
      const response = await fetch(`http://localhost:5001/api/coursupreme/decisions/${id}`, {method: 'DELETE'});
      alert('Décision supprimée');
      fetchChambers();
    } catch (error) {
      alert('Erreur suppression');
    }
  };

"""
    lines.insert(fetchChambers_idx, functions)

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.writelines(lines)

print("Imports et fonctions ajoutes")
