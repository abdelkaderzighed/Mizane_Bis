with open('HierarchicalView.jsx', 'r') as f:
    content = f.read()

# Ajouter le state
content = content.replace(
    'const filteredSites = sites.filter(site => site.id !== 2);',
    '''const filteredSites = sites.filter(site => site.id !== 2);
  const [coursupremeExpanded, setCoursupremeExpanded] = useState(false);'''
)

# Remplacer le bloc statique par un accordéon
old_block = '''      {/* Cour Suprême - Affichage séparé */}
      <div className="mt-8">
        <CoursSupremeViewer />
      </div>'''

new_block = '''      {/* Cour Suprême - Accordéon */}
      <div className="mt-4">
        <div className="bg-white rounded-lg shadow">
          <div 
            onClick={() => setCoursupremeExpanded(!coursupremeExpanded)}
            className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50"
          >
            {coursupremeExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-blue-500 rounded flex items-center justify-center text-white text-xl">
                ⚖️
              </div>
              <div>
                <div className="font-bold">Cour Suprême d'Algérie</div>
                <div className="text-xs text-gray-500">6 chambres - Décisions de jurisprudence</div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm">1245 décisions</span>
            </div>
          </div>
          
          {coursupremeExpanded && (
            <div className="border-t">
              <CoursSupremeViewer embedded={true} />
            </div>
          )}
        </div>
      </div>'''

content = content.replace(old_block, new_block)

with open('HierarchicalView.jsx', 'w') as f:
    f.write(content)

print("Accordeon cree")
