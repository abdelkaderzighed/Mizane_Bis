with open('HierarchicalView.jsx', 'r') as f:
    content = f.read()

content = content.replace(
    "import CoursSupremeView from './CoursSupremeView';",
    "import CoursSupremeViewer from './CoursSupremeViewer';"
)

content = content.replace(
    '<CoursSupremeView siteId={2} />',
    '<CoursSupremeViewer />'
)

with open('HierarchicalView.jsx', 'w') as f:
    f.write(content)

print("Composant remplace par le bon")
