import re

with open('CoursSupremeViewer.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

print("1. Correction du checkbox 'Tout sélectionner'...")

# Le checkbox global doit vérifier si TOUTES les décisions sont sélectionnées
# Trouver et remplacer dans la barre d'actions
old_checkbox_global = r'<input \s+type="checkbox"\s+checked=\{selectedDecisions\.size > 0\}'

new_checkbox_global = '''<input 
                  type="checkbox"
                  checked={chambers.every(c => selectedChambers.has(c.id))}
                  ref={(el) => {
                    if (el) {
                      const hasAnySelection = selectedDecisions.size > 0;
                      const allSelected = chambers.length > 0 && chambers.every(c => selectedChambers.has(c.id));
                      el.indeterminate = hasAnySelection && !allSelected;
                    }
                  }}'''

content = re.sub(old_checkbox_global, new_checkbox_global, content, flags=re.MULTILINE)

print("2. Correction de isChamberPartiallySelected...")

# Remplacer isChamberPartiallySelected
old_is_chamber_partial = r'const isChamberPartiallySelected = \(chamberId\) => \{.*?\n  \};'

new_is_chamber_partial = '''const isChamberPartiallySelected = (chamberId) => {
    const chamberThemes = themes[chamberId] || [];
    if (chamberThemes.length === 0) return false;
    
    // Vérifier les thèmes chargés
    const loadedThemes = chamberThemes.filter(t => decisions[t.id] && decisions[t.id].length > 0);
    if (loadedThemes.length === 0) return false;
    
    const allThemesSelected = loadedThemes.every(t => selectedThemes.has(t.id));
    const someThemesSelected = loadedThemes.some(t => selectedThemes.has(t.id));
    
    // Si tous sélectionnés, pas partiel
    if (allThemesSelected) return false;
    
    // Si aucun sélectionné mais des décisions sélectionnées, c'est partiel
    if (!someThemesSelected) {
      const allDecisions = loadedThemes.flatMap(t => decisions[t.id] || []);
      const someDecisionsSelected = allDecisions.some(d => selectedDecisions.has(d.id));
      return someDecisionsSelected;
    }
    
    // Sinon c'est partiel
    return true;
  };'''

content = re.sub(old_is_chamber_partial, new_is_chamber_partial, content, flags=re.DOTALL)

print("3. Correction de updateChamberState pour gérer l'état indeterminate...")

old_update_chamber = r'const updateChamberState = \(chamberId, selectedDecisionSet\) => \{.*?\n  \};'

new_update_chamber = '''const updateChamberState = (chamberId, selectedDecisionSet) => {
    const newSelectedChambers = new Set(selectedChambers);
    const newSelectedThemes = new Set(selectedThemes);
    
    const chamberThemes = themes[chamberId] || [];
    
    if (chamberThemes.length === 0) {
      newSelectedChambers.delete(chamberId);
      setSelectedChambers(newSelectedChambers);
      setSelectedThemes(newSelectedThemes);
      return;
    }
    
    // Ne vérifier que les thèmes chargés
    const loadedThemes = chamberThemes.filter(t => decisions[t.id] && decisions[t.id].length > 0);
    
    if (loadedThemes.length === 0) {
      newSelectedChambers.delete(chamberId);
      setSelectedChambers(newSelectedChambers);
      setSelectedThemes(newSelectedThemes);
      return;
    }
    
    let allThemesFullySelected = true;
    let hasAnyThemeSelected = false;
    
    // Mettre à jour l'état de chaque thème
    loadedThemes.forEach(theme => {
      const themeDecisions = decisions[theme.id] || [];
      const allDecisionsSelected = themeDecisions.every(d => selectedDecisionSet.has(d.id));
      const someDecisionsSelected = themeDecisions.some(d => selectedDecisionSet.has(d.id));
      
      if (allDecisionsSelected) {
        newSelectedThemes.add(theme.id);
        hasAnyThemeSelected = true;
      } else {
        newSelectedThemes.delete(theme.id);
        allThemesFullySelected = false;
      }
      
      if (someDecisionsSelected) {
        hasAnyThemeSelected = true;
      }
    });
    
    // La chambre n'est cochée QUE si TOUS les thèmes chargés sont complètement sélectionnés
    if (allThemesFullySelected && hasAnyThemeSelected) {
      newSelectedChambers.add(chamberId);
    } else {
      // Sinon on décoche (l'indeterminate sera géré par isChamberPartiallySelected)
      newSelectedChambers.delete(chamberId);
    }
    
    setSelectedThemes(newSelectedThemes);
    setSelectedChambers(newSelectedChambers);
  };'''

content = re.sub(old_update_chamber, new_update_chamber, content, flags=re.DOTALL)

with open('CoursSupremeViewer.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✅ Corrections appliquées :")
print("  1. Checkbox global : coché uniquement si TOUT est sélectionné")
print("  2. isChamberPartiallySelected : logique améliorée")
print("  3. updateChamberState : chambre en mode indeterminate si partiel")
