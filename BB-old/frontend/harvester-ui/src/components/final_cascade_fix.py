import re

with open('CoursSupremeViewer.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

print("Étape 1: Ajout des states manquants...")
# Ajouter selectedChambers et selectedThemes après selectedDecisions
content = content.replace(
    "const [selectedDecisions, setSelectedDecisions] = useState(new Set());",
    """const [selectedDecisions, setSelectedDecisions] = useState(new Set());
  const [selectedChambers, setSelectedChambers] = useState(new Set());
  const [selectedThemes, setSelectedThemes] = useState(new Set());"""
)

# Ajouter loadingSelection
content = content.replace(
    "const [metadataLang, setMetadataLang] = useState('ar');",
    """const [metadataLang, setMetadataLang] = useState('ar');
  const [loadingSelection, setLoadingSelection] = useState(false);"""
)

print("Étape 2: Remplacement de toggleDecisionSelection...")
# Trouver et remplacer toggleDecisionSelection
old_toggle_decision = re.search(
    r'const toggleDecisionSelection = \(decisionId, event\) => \{[^}]*\};',
    content,
    re.DOTALL
)
if old_toggle_decision:
    new_toggle_decision = '''const toggleDecisionSelection = (decisionId, event) => {
    event.stopPropagation();
    const newSelected = new Set(selectedDecisions);
    if (newSelected.has(decisionId)) {
      newSelected.delete(decisionId);
    } else {
      newSelected.add(decisionId);
    }
    setSelectedDecisions(newSelected);
    updateParentStates(newSelected);
  };'''
    content = content.replace(old_toggle_decision.group(0), new_toggle_decision)
    print("  ✓ toggleDecisionSelection remplacée")

print("Étape 3: Remplacement de toggleThemeSelection...")
old_toggle_theme = re.search(
    r'const toggleThemeSelection = \(themeId, event\) => \{.*?\n  \};',
    content,
    re.DOTALL
)
if old_toggle_theme:
    new_toggle_theme = '''const toggleThemeSelection = async (themeId, chamberId, event) => {
    event.stopPropagation();
    const isCurrentlySelected = selectedThemes.has(themeId);
    
    if (isCurrentlySelected) {
      const newSelectedDecisions = new Set(selectedDecisions);
      const newSelectedThemes = new Set(selectedThemes);
      const themeDecisions = decisions[themeId] || [];
      themeDecisions.forEach(d => newSelectedDecisions.delete(d.id));
      newSelectedThemes.delete(themeId);
      setSelectedDecisions(newSelectedDecisions);
      setSelectedThemes(newSelectedThemes);
      updateChamberState(chamberId, newSelectedDecisions);
    } else {
      setLoadingSelection(true);
      try {
        const response = await fetch(`http://localhost:5001/api/coursupreme/themes/${themeId}/all-decision-ids`);
        const data = await response.json();
        const newSelectedDecisions = new Set(selectedDecisions);
        const newSelectedThemes = new Set(selectedThemes);
        data.decision_ids.forEach(id => newSelectedDecisions.add(id));
        newSelectedThemes.add(themeId);
        setSelectedDecisions(newSelectedDecisions);
        setSelectedThemes(newSelectedThemes);
        updateChamberState(chamberId, newSelectedDecisions);
        setLoadingSelection(false);
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la sélection du thème');
        setLoadingSelection(false);
      }
    }
  };'''
    content = content.replace(old_toggle_theme.group(0), new_toggle_theme)
    print("  ✓ toggleThemeSelection remplacée")

print("Étape 4: Remplacement de toggleChamberSelection...")
old_toggle_chamber = re.search(
    r'const toggleChamberSelection = \(chamberId, event\) => \{.*?\n  \};',
    content,
    re.DOTALL
)
if old_toggle_chamber:
    new_toggle_chamber = '''const toggleChamberSelection = async (chamberId, event) => {
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
        const response = await fetch(`http://localhost:5001/api/coursupreme/chambers/${chamberId}/all-decision-ids`);
        const data = await response.json();
        const newSelectedDecisions = new Set(selectedDecisions);
        const newSelectedThemes = new Set(selectedThemes);
        const newSelectedChambers = new Set(selectedChambers);
        data.decision_ids.forEach(id => newSelectedDecisions.add(id));
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
  };'''
    content = content.replace(old_toggle_chamber.group(0), new_toggle_chamber)
    print("  ✓ toggleChamberSelection remplacée")

print("Étape 5: Ajout des fonctions helper...")
# Ajouter les fonctions helper après handleBatchAction
helper_functions = '''
  const updateParentStates = (selectedDecisionSet) => {
    const newSelectedThemes = new Set();
    const newSelectedChambers = new Set();
    
    chambers.forEach(chamber => {
      const chamberThemes = themes[chamber.id] || [];
      let chamberFullySelected = chamberThemes.length > 0;
      
      chamberThemes.forEach(theme => {
        const themeDecisions = decisions[theme.id] || [];
        if (themeDecisions.length > 0) {
          const allSelected = themeDecisions.every(d => selectedDecisionSet.has(d.id));
          if (allSelected) {
            newSelectedThemes.add(theme.id);
          } else {
            chamberFullySelected = false;
          }
        } else {
          chamberFullySelected = false;
        }
      });
      
      if (chamberFullySelected) {
        newSelectedChambers.add(chamber.id);
      }
    });
    
    setSelectedThemes(newSelectedThemes);
    setSelectedChambers(newSelectedChambers);
  };

  const updateChamberState = (chamberId, selectedDecisionSet) => {
    const newSelectedChambers = new Set(selectedChambers);
    const chamberThemes = themes[chamberId] || [];
    const allDecisions = chamberThemes.flatMap(theme => decisions[theme.id] || []);
    
    if (allDecisions.length > 0 && allDecisions.every(d => selectedDecisionSet.has(d.id))) {
      newSelectedChambers.add(chamberId);
    } else {
      newSelectedChambers.delete(chamberId);
    }
    
    setSelectedChambers(newSelectedChambers);
  };

  const selectAllVisible = async () => {
    setLoadingSelection(true);
    try {
      const response = await fetch('http://localhost:5001/api/coursupreme/all-decision-ids');
      const data = await response.json();
      const allDecisionIds = new Set(data.decision_ids);
      const newSelectedThemes = new Set();
      const newSelectedChambers = new Set();
      
      chambers.forEach(chamber => {
        newSelectedChambers.add(chamber.id);
        const chamberThemes = themes[chamber.id] || [];
        chamberThemes.forEach(theme => newSelectedThemes.add(theme.id));
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
  };

  const deselectAll = () => {
    setSelectedDecisions(new Set());
    setSelectedChambers(new Set());
    setSelectedThemes(new Set());
  };

  const isThemePartiallySelected = (themeId) => {
    const themeDecisions = decisions[themeId] || [];
    if (themeDecisions.length === 0) return false;
    const selectedCount = themeDecisions.filter(d => selectedDecisions.has(d.id)).length;
    return selectedCount > 0 && selectedCount < themeDecisions.length;
  };

  const isChamberPartiallySelected = (chamberId) => {
    const chamberThemes = themes[chamberId] || [];
    const allDecisions = chamberThemes.flatMap(theme => decisions[theme.id] || []);
    if (allDecisions.length === 0) return false;
    const selectedCount = allDecisions.filter(d => selectedDecisions.has(d.id)).length;
    return selectedCount > 0 && selectedCount < allDecisions.length;
  };
'''

# Insérer avant handleDownloadDecision
insert_pos = content.find('  const handleDownloadDecision')
if insert_pos > 0:
    content = content[:insert_pos] + helper_functions + '\n' + content[insert_pos:]
    print("  ✓ Fonctions helper ajoutées")

print("Étape 6: Mise à jour de la barre d'actions...")
# Mettre à jour le checkbox "Tout sélectionner"
content = re.sub(
    r'<input \s+type="checkbox"\s+checked=\{selectedDecisions\.size > 0\}',
    '''<input 
                  type="checkbox"
                  checked={selectedDecisions.size > 0}
                  disabled={loadingSelection}''',
    content,
    flags=re.MULTILINE
)

# Mettre à jour le label
content = content.replace(
    '<span className="font-semibold text-blue-800">\n                  Tout sélectionner',
    '''<span className="font-semibold text-blue-800">
                  {loadingSelection ? '⏳ Chargement...' : 'Tout sélectionner'}'''
)

# Ajouter disabled aux boutons d'action
content = re.sub(
    r'disabled=\{batchProcessing \|\| selectedDecisions\.size === 0\}',
    'disabled={batchProcessing || selectedDecisions.size === 0 || loadingSelection}',
    content
)

print("Étape 7: Mise à jour des checkboxes dans le JSX...")
# Checkbox chambre avec checked et indeterminate
content = re.sub(
    r'<input \s+type="checkbox" \s+onChange=\{\(e\) => toggleChamberSelection\(chamber\.id, e\)\}',
    '''<input 
                      type="checkbox"
                      checked={selectedChambers.has(chamber.id)}
                      ref={(el) => {
                        if (el) {
                          el.indeterminate = isChamberPartiallySelected(chamber.id);
                        }
                      }}
                      onChange={(e) => toggleChamberSelection(chamber.id, e)}''',
    content,
    flags=re.MULTILINE
)

# Checkbox thème avec checked et indeterminate  
content = re.sub(
    r'<input \s+type="checkbox" \s+onChange=\{\(e\) => toggleThemeSelection\(theme\.id, e\)\}',
    '''<input 
                              type="checkbox"
                              checked={selectedThemes.has(theme.id)}
                              ref={(el) => {
                                if (el) {
                                  el.indeterminate = isThemePartiallySelected(theme.id);
                                }
                              }}
                              onChange={(e) => toggleThemeSelection(theme.id, chamber.id, e)}''',
    content,
    flags=re.MULTILINE
)

with open('CoursSupremeViewer.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✅ Toutes les modifications appliquées avec succès!")
