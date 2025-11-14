import re

with open('CoursSupremeViewer.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

print("Correction de handleBatchAction pour afficher les bons nombres...")

# Trouver handleBatchAction
old_handler = re.search(r'const handleBatchAction = async \(action, force = false\) => \{.*?\n  \};', content, re.DOTALL)

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
      
      // Si besoin de confirmation
      if (data.needs_confirmation) {
        setBatchProcessing(false);
        
        let actionName = '';
        let alreadyDoneCount = 0;
        let toDoCount = 0;
        
        if (data.already_downloaded_count !== undefined) {
          actionName = 'téléchargées';
          alreadyDoneCount = data.already_downloaded_count;
          toDoCount = data.to_download_count || 0;
        } else if (data.already_translated_count !== undefined) {
          actionName = 'traduites';
          alreadyDoneCount = data.already_translated_count;
          toDoCount = data.to_translate_count || 0;
        } else if (data.already_analyzed_count !== undefined) {
          actionName = 'analysées';
          alreadyDoneCount = data.already_analyzed_count;
          toDoCount = data.to_analyze_count || 0;
        } else if (data.already_embedded_count !== undefined) {
          actionName = 'avec embeddings';
          alreadyDoneCount = data.already_embedded_count;
          toDoCount = data.to_embed_count || 0;
        }
        
        const confirmMsg = `${alreadyDoneCount} décisions déjà ${actionName}.\\n${toDoCount} nouvelles à traiter.\\n\\nVoulez-vous re-traiter les décisions existantes ?`;
        
        if (window.confirm(confirmMsg)) {
          await handleBatchAction(action, true);
        } else {
          alert('Opération annulée');
        }
        return;
      }
      
      // Succès
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
    
    with open('CoursSupremeViewer.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Correction appliquée - les nombres s'afficheront correctement")
else:
    print("❌ handleBatchAction non trouvée")
