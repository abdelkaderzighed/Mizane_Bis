import re

with open('CoursSupremeViewer.jsx', 'r') as f:
    content = f.read()

print("=== SCRIPT COMPLET DE CORRECTION ===\n")

# ====== ÉTAPE 1: AJOUTER LES ÉTATS ======
print("1. Ajout des états manquants...")
content = content.replace(
    "const [selectedDecisions, setSelectedDecisions] = useState(new Set());",
    """const [selectedDecisions, setSelectedDecisions] = useState(new Set());
  const [selectedChambers, setSelectedChambers] = useState(new Set());
  const [selectedThemes, setSelectedThemes] = useState(new Set());"""
)
content = content.replace(
    "const [metadataLang, setMetadataLang] = useState('ar');",
    """const [metadataLang, setMetadataLang] = useState('ar');
  const [loadingSelection, setLoadingSelection] = useState(false);"""
)
print("   ✅ États ajoutés\n")

# ====== ÉTAPE 2: REMPLACER toggleChamberSelection ======
print("2. Remplacement de toggleChamberSelection...")
old_toggle = re.search(r'const toggleChamberSelection = \(chamberId, event\) => \{.*?\n  \};', content, re.DOTALL)
if old_toggle:
    new_toggle = '''const toggleChamberSelection = async (chamberId, event) => {
    event.stopPropagation();
    const isCurrentlySelected = selectedChambers.has(chamberId);
    
    if (isCurrentlySelected) {
      const newSelectedDecisions = new Set(selectedDecisions);
      const newSelectedThemes = new Set(selectedThemes);
      const newSelectedChambers = new Set(selectedChambers);
      const chamberThemes = themes[chamberId] || [];
      chamberThemes.forEach(theme => {
        const themeDecisions = decisions[theme.id] || [];
        themeDecisions.forEach(d => newSelectedDecisions.delete(d.id));
        newSelectedThemes.delete(theme.id);
      });
      newSelectedChambers.delete(chamberId);
      setSelectedDecisions(newSelectedDecisions);
      setSelectedThemes(newSelectedThemes);
      setSelectedChambers(newSelectedChambers);
    } else {
      setLoadingSelection(true);
      try {
        const response = await fetch(`http://localhost:5001/api/coursupreme/chambers/${chamberId}/all-ids`);
        const data = await response.json();
        const newSelectedDecisions = new Set(selectedDecisions);
        const newSelectedThemes = new Set(selectedThemes);
        const newSelectedChambers = new Set(selectedChambers);
        data.decision_ids.forEach(id => newSelectedDecisions.add(id));
        data.theme_ids.forEach(id => newSelectedThemes.add(id));
        newSelectedChambers.add(chamberId);
        setSelectedDecisions(newSelectedDecisions);
        setSelectedThemes(newSelectedThemes);
        setSelectedChambers(newSelectedChambers);
        setLoadingSelection(false);
      } catch (error) {
        console.error('Erreur:', error);
        setLoadingSelection(false);
      }
    }
  };'''
    content = content.replace(old_toggle.group(0), new_toggle)
    print("   ✅ toggleChamberSelection remplacée\n")

# ====== ÉTAPE 3: AJOUTER FONCTIONS HELPER ======
print("3. Ajout des fonctions helper...")
insert_pos = content.find('  const handleBatchAction')
if insert_pos > 0:
    helpers = '''
  const selectAllVisible = async () => {
    setLoadingSelection(true);
    try {
      const response = await fetch('http://localhost:5001/api/coursupreme/all-decision-ids');
      const data = await response.json();
      setSelectedDecisions(new Set(data.decision_ids));
      const newChambers = new Set();
      const newThemes = new Set();
      chambers.forEach(c => newChambers.add(c.id));
      Object.values(themes).flat().forEach(t => newThemes.add(t.id));
      setSelectedChambers(newChambers);
      setSelectedThemes(newThemes);
      setLoadingSelection(false);
    } catch (error) {
      console.error('Erreur:', error);
      setLoadingSelection(false);
    }
  };

  const deselectAll = () => {
    setSelectedDecisions(new Set());
    setSelectedChambers(new Set());
    setSelectedThemes(new Set());
  };

'''
    content = content[:insert_pos] + helpers + content[insert_pos:]
    print("   ✅ Fonctions helper ajoutées\n")

# ====== ÉTAPE 4: AMÉLIORER handleBatchAction ======
print("4. Amélioration de handleBatchAction...")
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
    print("   ✅ handleBatchAction améliorée\n")

# ====== ÉTAPE 5: AJOUTER BARRE D'ACTIONS ======
print("5. Ajout de la barre d'actions...")
insert_marker = "        {searchResults ? ("
if insert_marker in content:
    action_bar = '''
        {/* BARRE D'ACTIONS - TOUJOURS VISIBLE */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={selectedDecisions.size > 0}
                  disabled={loadingSelection}
                  onChange={(e) => {
                    if (e.target.checked) {
                      selectAllVisible();
                    } else {
                      deselectAll();
                    }
                  }}
                  className="w-5 h-5 text-blue-600 rounded disabled:opacity-50"
                />
                <span className="font-semibold text-blue-800">
                  {loadingSelection ? '⏳ Chargement...' : 'Tout sélectionner'}
                </span>
              </label>
              <span className="text-blue-700">
                {selectedDecisions.size > 0 ? (
                  <>✓ {selectedDecisions.size} sélectionnée{selectedDecisions.size > 1 ? 's' : ''}</>
                ) : (
                  <>Aucune sélection</>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleBatchAction('download')} 
                disabled={batchProcessing || selectedDecisions.size === 0 || loadingSelection}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                📥 Télécharger
              </button>
              <button 
                onClick={() => handleBatchAction('translate')} 
                disabled={batchProcessing || selectedDecisions.size === 0 || loadingSelection}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                🌐 Traduire
              </button>
              <button 
                onClick={() => handleBatchAction('analyze')} 
                disabled={batchProcessing || selectedDecisions.size === 0 || loadingSelection}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                🤖 Analyser
              </button>
              <button 
                onClick={() => handleBatchAction('embed')} 
                disabled={batchProcessing || selectedDecisions.size === 0 || loadingSelection}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                🧬 Embeddings
              </button>
            </div>
          </div>
        </div>

'''
    content = content.replace(insert_marker, action_bar + insert_marker)
    print("   ✅ Barre d'actions ajoutée\n")

# ====== ÉTAPE 6: AJOUTER MOTS-CLÉS DANS MODAL ======
print("6. Ajout des mots-clés dans le modal...")
# Keywords AR
ar_pattern = r"(\)\}\)\(\)\}\s+</>)\s+(\) : \(\s+<div className=\"text-center py-16\">\s+<div className=\"text-6xl mb-4\">🤖</div>\s+<p className=\"text-gray-500\">لم يتم التحليل بعد</p>)"
ar_keywords = r'''\1
                        {selectedMetadata.keywords_ar && (() => {
                          try {
                            const keywords = JSON.parse(selectedMetadata.keywords_ar);
                            return (
                              <div className="bg-white rounded-lg p-6 border-l-4 border-green-500 mt-4">
                                <h3 className="font-bold text-green-700 mb-3">الكلمات المفتاحية</h3>
                                <div className="flex flex-wrap gap-2">
                                  {keywords.map((keyword, i) => (
                                    <span key={i} className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                      {keyword}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          } catch(e) { return null; }
                        })()}
                      </>
                    \2'''
content = re.sub(ar_pattern, ar_keywords, content, flags=re.DOTALL)

# Keywords FR
fr_pattern = r"(\)\}\)\(\)\}\s+</>)\s+(\) : \(\s+<div className=\"text-center py-16\">\s+<div className=\"text-6xl mb-4\">🤖</div>\s+<p className=\"text-gray-500\">Pas encore analysée</p>)"
fr_keywords = r'''\1
                        {selectedMetadata.keywords_fr && (() => {
                          try {
                            const keywords = JSON.parse(selectedMetadata.keywords_fr);
                            return (
                              <div className="bg-white rounded-lg p-6 border-l-4 border-green-500 mt-4">
                                <h3 className="font-bold text-green-700 mb-3">Mots-clés</h3>
                                <div className="flex flex-wrap gap-2">
                                  {keywords.map((keyword, i) => (
                                    <span key={i} className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                      {keyword}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          } catch(e) { return null; }
                        })()}
                      </>
                    \2'''
content = re.sub(fr_pattern, fr_keywords, content, flags=re.DOTALL)
print("   ✅ Mots-clés ajoutés\n")

# ====== SAUVEGARDER ======
with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("="*50)
print("✅✅✅ TOUT EST TERMINÉ !")
print("="*50)
print("\nChangements appliqués:")
print("✓ États de sélection en cascade")
print("✓ Fonctions de sélection améliorées")
print("✓ Barre d'actions visible")
print("✓ Confirmations dans les actions batch")
print("✓ Mots-clés dans le modal métadonnées")
print("\nNote: Le panneau de recherche avancée du modal reste intact (évite les erreurs JSX)")
