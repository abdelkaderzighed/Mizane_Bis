const fs = require('fs');

let content = fs.readFileSync('CoursSupremeViewer.jsx', 'utf8');

// 1. Ajouter état de chargement
const newStates = `  const [metadataModalOpen, setMetadataModalOpen] = useState(false);
  const [selectedMetadata, setSelectedMetadata] = useState(null);
  const [metadataLang, setMetadataLang] = useState('ar');
  const [loadingSelection, setLoadingSelection] = useState(false);`;

content = content.replace(
  /const \[metadataModalOpen, setMetadataModalOpen\] = useState\(false\);\s*const \[selectedMetadata, setSelectedMetadata\] = useState\(null\);\s*const \[metadataLang, setMetadataLang\] = useState\('ar'\);/,
  newStates
);

// 2. Remplacer selectAllVisible pour charger TOUS les IDs
const newSelectAllVisible = `  const selectAllVisible = async () => {
    setLoadingSelection(true);
    try {
      // Récupérer TOUS les IDs de décisions via API
      const response = await fetch('http://localhost:5001/api/coursupreme/all-decision-ids');
      const data = await response.json();
      
      const allDecisionIds = new Set(data.decision_ids);
      
      // Créer les sets pour thèmes et chambres
      const newSelectedThemes = new Set();
      const newSelectedChambers = new Set();
      
      // Marquer tous les thèmes et chambres comme sélectionnés
      chambers.forEach(chamber => {
        newSelectedChambers.add(chamber.id);
        const chamberThemes = themes[chamber.id] || [];
        chamberThemes.forEach(theme => {
          newSelectedThemes.add(theme.id);
        });
      });
      
      setSelectedDecisions(allDecisionIds);
      setSelectedThemes(newSelectedThemes);
      setSelectedChambers(newSelectedChambers);
      
      setLoadingSelection(false);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la sélection globale');
      setLoadingSelection(false);
    }
  };`;

content = content.replace(
  /const selectAllVisible = \(\) => \{[\s\S]*?\n  \};/,
  newSelectAllVisible
);

// 3. Remplacer toggleChamberSelection pour charger les IDs via API
const newToggleChamber = `  const toggleChamberSelection = async (chamberId, event) => {
    event.stopPropagation();
    
    const isCurrentlySelected = selectedChambers.has(chamberId);
    
    if (isCurrentlySelected) {
      // Désélection simple
      const newSelectedDecisions = new Set(selectedDecisions);
      const newSelectedThemes = new Set(selectedThemes);
      const newSelectedChambers = new Set(selectedChambers);
      
      const chamberThemes = themes[chamberId] || [];
      
      // Récupérer toutes les décisions de cette chambre (même non chargées)
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
      // Sélection : charger TOUS les IDs via API
      setLoadingSelection(true);
      try {
        const response = await fetch(\`http://localhost:5001/api/coursupreme/chambers/\${chamberId}/all-decision-ids\`);
        const data = await response.json();
        
        const newSelectedDecisions = new Set(selectedDecisions);
        const newSelectedThemes = new Set(selectedThemes);
        const newSelectedChambers = new Set(selectedChambers);
        
        // Ajouter tous les IDs
        data.decision_ids.forEach(id => newSelectedDecisions.add(id));
        
        // Marquer tous les thèmes comme sélectionnés
        const chamberThemes = themes[chamberId] || [];
        chamberThemes.forEach(theme => newSelectedThemes.add(theme.id));
        
        newSelectedChambers.add(chamberId);
        
        setSelectedDecisions(newSelectedDecisions);
        setSelectedThemes(newSelectedThemes);
        setSelectedChambers(newSelectedChambers);
        
        setLoadingSelection(false);
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la sélection de la chambre');
        setLoadingSelection(false);
      }
    }
  };`;

content = content.replace(
  /const toggleChamberSelection = [\s\S]*?(?=\n  const toggleThemeSelection)/,
  newToggleChamber + '\n'
);

// 4. Remplacer toggleThemeSelection
const newToggleTheme = `  const toggleThemeSelection = async (themeId, chamberId, event) => {
    event.stopPropagation();
    
    const isCurrentlySelected = selectedThemes.has(themeId);
    
    if (isCurrentlySelected) {
      // Désélection simple
      const newSelectedDecisions = new Set(selectedDecisions);
      const newSelectedThemes = new Set(selectedThemes);
      
      const themeDecisions = decisions[themeId] || [];
      themeDecisions.forEach(d => newSelectedDecisions.delete(d.id));
      newSelectedThemes.delete(themeId);
      
      setSelectedDecisions(newSelectedDecisions);
      setSelectedThemes(newSelectedThemes);
      
      // Mettre à jour l'état de la chambre parent
      updateChamberState(chamberId, newSelectedDecisions);
    } else {
      // Sélection : charger TOUS les IDs via API
      setLoadingSelection(true);
      try {
        const response = await fetch(\`http://localhost:5001/api/coursupreme/themes/\${themeId}/all-decision-ids\`);
        const data = await response.json();
        
        const newSelectedDecisions = new Set(selectedDecisions);
        const newSelectedThemes = new Set(selectedThemes);
        
        // Ajouter tous les IDs
        data.decision_ids.forEach(id => newSelectedDecisions.add(id));
        newSelectedThemes.add(themeId);
        
        setSelectedDecisions(newSelectedDecisions);
        setSelectedThemes(newSelectedThemes);
        
        // Mettre à jour l'état de la chambre parent
        updateChamberState(chamberId, newSelectedDecisions);
        
        setLoadingSelection(false);
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la sélection du thème');
        setLoadingSelection(false);
      }
    }
  };`;

content = content.replace(
  /const toggleThemeSelection = [\s\S]*?(?=\n  const updateParentStates)/,
  newToggleTheme + '\n'
);

// 5. Ajouter indicateur de chargement dans la barre d'actions
const oldActionBar = /\{\/\* BARRE D'ACTIONS - TOUJOURS VISIBLE APRÈS LE PANNEAU DE RECHERCHE \*\/\}[\s\S]*?<\/div>\n        <\/div>/;

const newActionBar = `{/* BARRE D'ACTIONS - TOUJOURS VISIBLE APRÈS LE PANNEAU DE RECHERCHE */}
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
                  {loadingSelection ? 'Chargement...' : 'Tout sélectionner'}
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
                title="Télécharger les décisions sélectionnées"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 flex items-center gap-2"
              >
                📥 Télécharger
              </button>
              <button 
                onClick={() => handleBatchAction('translate')} 
                disabled={batchProcessing || selectedDecisions.size === 0 || loadingSelection}
                title="Traduire les décisions sélectionnées"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 flex items-center gap-2"
              >
                🌐 Traduire
              </button>
              <button 
                onClick={() => handleBatchAction('analyze')} 
                disabled={batchProcessing || selectedDecisions.size === 0 || loadingSelection}
                title="Analyser avec IA les décisions sélectionnées"
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 flex items-center gap-2"
              >
                🤖 Analyser
              </button>
              <button 
                onClick={() => handleBatchAction('embed')} 
                disabled={batchProcessing || selectedDecisions.size === 0 || loadingSelection}
                title="Créer les embeddings des décisions sélectionnées"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 flex items-center gap-2"
              >
                🧬 Embeddings
              </button>
            </div>
          </div>
        </div>`;

content = content.replace(oldActionBar, newActionBar);

fs.writeFileSync('CoursSupremeViewer.jsx', content);
console.log('✅ Sélection en cascade avec API implémentée');
