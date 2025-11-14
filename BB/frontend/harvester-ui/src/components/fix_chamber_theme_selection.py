import re

with open('CoursSupremeViewer.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

print("Correction de toggleChamberSelection pour sélectionner aussi les thèmes...")

# Trouver et remplacer toggleChamberSelection
old_pattern = r'const toggleChamberSelection = async \(chamberId, event\) => \{.*?\n  \};'

new_function = '''const toggleChamberSelection = async (chamberId, event) => {
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
        
        // Ajouter tous les IDs de décisions
        data.decision_ids.forEach(id => newSelectedDecisions.add(id));
        
        // Ajouter tous les IDs de thèmes
        data.theme_ids.forEach(id => newSelectedThemes.add(id));
        
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

content = re.sub(old_pattern, new_function, content, flags=re.DOTALL)

# Aussi corriger la désélection pour bien enlever les thèmes
print("Correction de la désélection des thèmes...")

with open('CoursSupremeViewer.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Correction appliquée : les thèmes sont maintenant sélectionnés avec la chambre")
