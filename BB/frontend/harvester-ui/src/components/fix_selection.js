const fs = require('fs');

let content = fs.readFileSync('CoursSupremeViewer.jsx', 'utf8');

// 1. Ajouter fonction de sélection globale après updateChamberState
const globalSelectFunction = `
  const selectAllVisible = () => {
    const newSelectedDecisions = new Set();
    const newSelectedThemes = new Set();
    const newSelectedChambers = new Set();
    
    // Parcourir toutes les chambres
    chambers.forEach(chamber => {
      const chamberThemes = themes[chamber.id] || [];
      if (chamberThemes.length > 0) {
        let allThemesLoaded = true;
        chamberThemes.forEach(theme => {
          const themeDecisions = decisions[theme.id] || [];
          if (themeDecisions.length > 0) {
            themeDecisions.forEach(d => newSelectedDecisions.add(d.id));
            newSelectedThemes.add(theme.id);
          } else {
            allThemesLoaded = false;
          }
        });
        if (allThemesLoaded && chamberThemes.length > 0) {
          newSelectedChambers.add(chamber.id);
        }
      }
    });
    
    setSelectedDecisions(newSelectedDecisions);
    setSelectedThemes(newSelectedThemes);
    setSelectedChambers(newSelectedChambers);
  };

  const deselectAll = () => {
    setSelectedDecisions(new Set());
    setSelectedChambers(new Set());
    setSelectedThemes(new Set());
  };
`;

// Trouver où insérer (après updateChamberState)
content = content.replace(
  /const isThemePartiallySelected/,
  globalSelectFunction + '\n  const isThemePartiallySelected'
);

// 2. Remplacer la barre d'actions avec le checkbox global
const oldActionBar = /\{\/\* BARRE D'ACTIONS - TOUJOURS VISIBLE APRÈS LE PANNEAU DE RECHERCHE \*\/\}[\s\S]*?<\/div>\n        <\/div>/;

const newActionBar = `{/* BARRE D'ACTIONS - TOUJOURS VISIBLE APRÈS LE PANNEAU DE RECHERCHE */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={selectedDecisions.size > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      selectAllVisible();
                    } else {
                      deselectAll();
                    }
                  }}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <span className="font-semibold text-blue-800">
                  Tout sélectionner
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
                disabled={batchProcessing || selectedDecisions.size === 0}
                title="Télécharger les décisions sélectionnées"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 flex items-center gap-2"
              >
                📥 Télécharger
              </button>
              <button 
                onClick={() => handleBatchAction('translate')} 
                disabled={batchProcessing || selectedDecisions.size === 0}
                title="Traduire les décisions sélectionnées"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 flex items-center gap-2"
              >
                🌐 Traduire
              </button>
              <button 
                onClick={() => handleBatchAction('analyze')} 
                disabled={batchProcessing || selectedDecisions.size === 0}
                title="Analyser avec IA les décisions sélectionnées"
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 flex items-center gap-2"
              >
                🤖 Analyser
              </button>
              <button 
                onClick={() => handleBatchAction('embed')} 
                disabled={batchProcessing || selectedDecisions.size === 0}
                title="Créer les embeddings des décisions sélectionnées"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 flex items-center gap-2"
              >
                🧬 Embeddings
              </button>
            </div>
          </div>
        </div>`;

content = content.replace(oldActionBar, newActionBar);

// 3. Corriger toggleChamberSelection pour ne sélectionner que ce qui est chargé
const oldToggleChamber = /const toggleChamberSelection = \(chamberId, event\) => \{[\s\S]*?\n  \};/;

const newToggleChamber = `const toggleChamberSelection = (chamberId, event) => {
    event.stopPropagation();
    const newSelectedDecisions = new Set(selectedDecisions);
    const newSelectedThemes = new Set(selectedThemes);
    const newSelectedChambers = new Set(selectedChambers);
    
    const chamberThemes = themes[chamberId] || [];
    
    // Ne traiter que les thèmes chargés
    const loadedThemes = chamberThemes.filter(t => decisions[t.id]);
    const allDecisions = loadedThemes.flatMap(theme => decisions[theme.id] || []);
    
    if (allDecisions.length === 0) {
      alert('Veuillez d\\'abord ouvrir la chambre pour charger les thèmes et décisions');
      return;
    }
    
    // Vérifier si toutes les décisions chargées sont sélectionnées
    const allSelected = allDecisions.every(d => newSelectedDecisions.has(d.id));
    
    if (allSelected) {
      // Désélectionner tout
      allDecisions.forEach(d => newSelectedDecisions.delete(d.id));
      loadedThemes.forEach(t => newSelectedThemes.delete(t.id));
      newSelectedChambers.delete(chamberId);
    } else {
      // Sélectionner tout
      allDecisions.forEach(d => newSelectedDecisions.add(d.id));
      loadedThemes.forEach(t => newSelectedThemes.add(t.id));
      newSelectedChambers.add(chamberId);
    }
    
    setSelectedDecisions(newSelectedDecisions);
    setSelectedThemes(newSelectedThemes);
    setSelectedChambers(newSelectedChambers);
  };`;

content = content.replace(oldToggleChamber, newToggleChamber);

// 4. Corriger toggleThemeSelection
const oldToggleTheme = /const toggleThemeSelection = \(themeId, chamberId, event\) => \{[\s\S]*?\n  \};/;

const newToggleTheme = `const toggleThemeSelection = (themeId, chamberId, event) => {
    event.stopPropagation();
    const newSelectedDecisions = new Set(selectedDecisions);
    const newSelectedThemes = new Set(selectedThemes);
    const themeDecisions = decisions[themeId] || [];
    
    if (themeDecisions.length === 0) {
      alert('Veuillez d\\'abord ouvrir le thème pour charger les décisions');
      return;
    }
    
    // Vérifier si toutes les décisions du thème sont sélectionnées
    const allSelected = themeDecisions.every(d => newSelectedDecisions.has(d.id));
    
    if (allSelected) {
      // Désélectionner toutes les décisions du thème
      themeDecisions.forEach(d => newSelectedDecisions.delete(d.id));
      newSelectedThemes.delete(themeId);
    } else {
      // Sélectionner toutes les décisions du thème
      themeDecisions.forEach(d => newSelectedDecisions.add(d.id));
      newSelectedThemes.add(themeId);
    }
    
    setSelectedDecisions(newSelectedDecisions);
    setSelectedThemes(newSelectedThemes);
    
    // Mettre à jour l'état de la chambre parent
    updateChamberState(chamberId, newSelectedDecisions);
  };`;

content = content.replace(oldToggleTheme, newToggleTheme);

fs.writeFileSync('CoursSupremeViewer.jsx', content);
console.log('✅ Corrections appliquées');
