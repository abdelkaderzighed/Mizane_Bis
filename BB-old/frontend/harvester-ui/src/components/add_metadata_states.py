with open('CoursSupremeViewer.jsx', 'r') as f:
    content = f.read()

# Trouver après les autres states et ajouter
old_line = "const [currentDecisionIndex, setCurrentDecisionIndex] = useState(0);"
new_lines = """const [currentDecisionIndex, setCurrentDecisionIndex] = useState(0);
  const [metadataModalOpen, setMetadataModalOpen] = useState(false);
  const [selectedMetadata, setSelectedMetadata] = useState(null);
  const [metadataLang, setMetadataLang] = useState('ar');"""

content = content.replace(old_line, new_lines)

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("States metadata ajoutes")
