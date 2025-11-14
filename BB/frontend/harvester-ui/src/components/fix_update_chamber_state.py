import re

with open('CoursSupremeViewer.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

print("Correction de updateChamberState...")

# Trouver et remplacer updateChamberState
old_pattern = r'const updateChamberState = \(chamberId, selectedDecisionSet\) => \{.*?\n  \};'

new_function = '''const updateChamberState = (chamberId, selectedDecisionSet) => {
    const newSelectedChambers = new Set(selectedChambers);
    const newSelectedThemes = new Set(selectedThemes);
    
    const chamberThemes = themes[chamberId] || [];
    
    if (chamberThemes.length === 0) {
      newSelectedChambers.delete(chamberId);
      setSelectedChambers(newSelectedChambers);
      return;
    }
    
    let allThemesFullySelected = true;
    let hasAnySelection = false;
    
    // Vérifier chaque thème
    chamberThemes.forEach(theme => {
      const themeDecisions = decisions[theme.id] || [];
      if (themeDecisions.length > 0) {
        const allDecisionsSelected = themeDecisions.every(d => selectedDecisionSet.has(d.id));
        const someDecisionsSelected = themeDecisions.some(d => selectedDecisionSet.has(d.id));
        
        if (allDecisionsSelected) {
          newSelectedThemes.add(theme.id);
          hasAnySelection = true;
        } else {
          newSelectedThemes.delete(theme.id);
          allThemesFullySelected = false;
        }
        
        if (someDecisionsSelected) {
          hasAnySelection = true;
        }
      }
    });
    
    // Mettre à jour l'état de la chambre
    if (allThemesFullySelected && hasAnySelection) {
      newSelectedChambers.add(chamberId);
    } else {
      newSelectedChambers.delete(chamberId);
    }
    
    setSelectedThemes(newSelectedThemes);
    setSelectedChambers(newSelectedChambers);
  };'''

content = re.sub(old_pattern, new_function, content, flags=re.DOTALL)

with open('CoursSupremeViewer.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ updateChamberState corrigée : la chambre reste cochée si d'autres thèmes sont sélectionnés")
