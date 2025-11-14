import re

with open('CoursSupremeViewer.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

print("Ajout de la gestion de confirmation pour le téléchargement...")

# Remplacer handleBatchAction
old_handler = r'const handleBatchAction = async \(action\) => \{.*?\n  \};'

new_handler = '''const handleBatchAction = async (action, force = false) => {
    const ids = Array.from(selectedDecisions);
    if (ids.length === 0) {
      alert('Aucune décision sélectionnée');
      return;
    }
    
    setBatchProcessing(true);
    
    try {
      const response = await fetch(`http://localhost:5001/api/coursupreme/batch/${action}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({decision_ids: ids, force: force})
      });
      
      const data = await response.json();
      
      // Si besoin de confirmation
      if (data.needs_confirmation) {
        const confirmMsg = `${data.already_downloaded_count} décisions déjà téléchargées.\\n${data.to_download_count} nouvelles à télécharger.\\n\\nVoulez-vous re-télécharger les décisions existantes ?`;
        if (window.confirm(confirmMsg)) {
          // Relancer avec force=true
          setBatchProcessing(false);
          await handleBatchAction(action, true);
        } else {
          setBatchProcessing(false);
          alert('Opération annulée');
        }
        return;
      }
      
      // Succès
      alert(data.message);
      setBatchProcessing(false);
      setSelectedDecisions(new Set());
      setSelectedChambers(new Set());
      setSelectedThemes(new Set());
      fetchChambers();
      
    } catch (error) {
      alert('Erreur: ' + error.message);
      setBatchProcessing(false);
    }
  };'''

content = re.sub(old_handler, new_handler, content, flags=re.DOTALL)

with open('CoursSupremeViewer.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Gestion de confirmation ajoutée au téléchargement")
