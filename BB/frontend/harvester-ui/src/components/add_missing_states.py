with open('CoursSupremeViewer.jsx', 'r') as f:
    content = f.read()

print("Ajout des 3 états manquants...")

# Ajouter après selectedDecisions
old_line = "const [selectedDecisions, setSelectedDecisions] = useState(new Set());"
new_lines = """const [selectedDecisions, setSelectedDecisions] = useState(new Set());
  const [selectedChambers, setSelectedChambers] = useState(new Set());
  const [selectedThemes, setSelectedThemes] = useState(new Set());"""

content = content.replace(old_line, new_lines)

# Ajouter loadingSelection après metadataLang
old_line2 = "const [metadataLang, setMetadataLang] = useState('ar');"
new_lines2 = """const [metadataLang, setMetadataLang] = useState('ar');
  const [loadingSelection, setLoadingSelection] = useState(false);"""

content = content.replace(old_line2, new_lines2)

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("✅ États ajoutés : selectedChambers, selectedThemes, loadingSelection")
