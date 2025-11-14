import re

with open('CoursSupremeViewer.jsx', 'r') as f:
    content = f.read()

print("Remplacement des fonctions de sélection...")

# 1. Remplacer toggleChamberSelection
old_toggle_chamber = re.search(r'const toggleChamberSelection = \(chamberId, event\) => \{.*?\n  \};', content, re.DOTALL)
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
    content = content.replace(old_toggle_chamber.group(0), new_toggle_chamber)
    print("✅ toggleChamberSelection remplacée")

# 2. Ajouter les fonctions helper avant handleBatchAction
insert_pos = content.find('  const handleBatchAction')
if insert_pos > 0:
    helper_functions = '''
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
    content = content[:insert_pos] + helper_functions + content[insert_pos:]
    print("✅ Fonctions helper ajoutées")

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("✅ Fonctions de sélection mises à jour")
