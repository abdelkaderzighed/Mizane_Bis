import re

with open('CoursSupremeViewer.jsx', 'r') as f:
    content = f.read()

print("Amélioration de handleBatchAction avec confirmations...")

old_handler = re.search(r'const handleBatchAction = async \(action\) => \{.*?\n  \};', content, re.DOTALL)

if old_handler:
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
      
      if (data.needs_confirmation) {
        setBatchProcessing(false);
        let actionName = '';
        let alreadyDoneCount = 0;
        
        if (data.already_downloaded_count !== undefined) {
          actionName = 'téléchargées';
          alreadyDoneCount = data.already_downloaded_count;
        } else if (data.already_translated_count !== undefined) {
          actionName = 'traduites';
          alreadyDoneCount = data.already_translated_count;
        } else if (data.already_analyzed_count !== undefined) {
          actionName = 'analysées';
          alreadyDoneCount = data.already_analyzed_count;
        } else if (data.already_embedded_count !== undefined) {
          actionName = 'avec embeddings';
          alreadyDoneCount = data.already_embedded_count;
        }
        
        if (window.confirm(`${alreadyDoneCount} décisions déjà ${actionName}.\\n\\nVoulez-vous les re-traiter ?`)) {
          await handleBatchAction(action, true);
        }
        return;
      }
      
      alert(data.message || 'Opération terminée');
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
    
    content = content.replace(old_handler.group(0), new_handler)
    print("✅ handleBatchAction améliorée")

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("✅ Gestion des confirmations ajoutée")
