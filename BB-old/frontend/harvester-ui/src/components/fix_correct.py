with open('HierarchicalView.jsx', 'r') as f:
    content = f.read()

content = content.replace(
    'const [sites, setSites] = useState([]);',
    'const [sites, setSites] = useState([]);\n  const filteredSites = sites.filter(site => site.id !== 2);'
)

content = content.replace(
    '{sites.map((site) => (',
    '{filteredSites.map((site) => ('
)

with open('HierarchicalView.jsx', 'w') as f:
    f.write(content)

print("Site Cour Supreme filtre de la liste")
