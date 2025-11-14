import re

with open('CoursSupremeViewer.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Ajouter loadingSelection dans les states
content = content.replace(
    "const [metadataLang, setMetadataLang] = useState('ar');",
    "const [metadataLang, setMetadataLang] = useState('ar');\n  const [loadingSelection, setLoadingSelection] = useState(false);"
)

# 2. Remplacer la fonction selectAllVisible
old_select_all = re.search(r'const selectAllVisible = \(\) => \{.*?\n  \};', content, re.DOTALL)
if old_select_all:
    new_select_all = '''const selectAllVisible = async () => {
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
  };'''
    content = content.replace(old_select_all.group(0), new_select_all)

# 3. Remplacer toggleChamberSelection
old_toggle_chamber = re.search(r'const toggleChamberSelection = .*?\n  \};', content, re.DOTALL)
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

# 4. Remplacer toggleThemeSelection
old_toggle_theme = re.search(r'const toggleThemeSelection = .*?\n  \};', content, re.DOTALL)
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

# 5. Ajouter disabled={loadingSelection} dans la barre d'actions
content = content.replace(
    'checked={selectedDecisions.size > 0}',
    'checked={selectedDecisions.size > 0}\n                  disabled={loadingSelection}'
)

content = content.replace(
    '{loadingSelection ? \'Chargement...\' : \'Tout sélectionner\'}',
    'Tout sélectionner'
)

content = content.replace(
    '<span className="font-semibold text-blue-800">',
    '<span className="font-semibold text-blue-800">\n                  {loadingSelection ? \'⏳ Chargement...\' : \''
)

# Corriger la ligne qui suit
content = re.sub(
    r'<span className="font-semibold text-blue-800">\n\s+\{loadingSelection \? \'⏳ Chargement\.\.\.\' : \'\'\n\s+Tout sélectionner',
    '<span className="font-semibold text-blue-800">\n                  {loadingSelection ? \'⏳ Chargement...\' : \'Tout sélectionner\'}',
    content
)

# Ajouter disabled dans les boutons d'action
for btn in ['download', 'translate', 'analyze', 'embed']:
    content = re.sub(
        rf"disabled={{batchProcessing \|\| selectedDecisions\.size === 0}}",
        f"disabled={{batchProcessing || selectedDecisions.size === 0 || loadingSelection}}",
        content,
        count=1
    )

with open('CoursSupremeViewer.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('✅ Correctif appliqué avec succès')
