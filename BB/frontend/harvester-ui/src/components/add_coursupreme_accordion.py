with open('HierarchicalView.jsx', 'r') as f:
    lines = f.readlines()

# 1. Ajouter le state pour l'accordéon Cour Suprême
for i, line in enumerate(lines):
    if 'const [sites, setSites] = useState([]);' in line:
        lines.insert(i+1, '  const [coursupremeExpanded, setCoursupremeExpanded] = useState(false);\n')
        break

# 2. Trouver la fin de la boucle des sites et ajouter le panneau Cour Suprême
for i, line in enumerate(lines):
    if '          ))}\n' in line and 'filteredSites.map' in ''.join(lines[max(0,i-50):i]):
        # Insérer après la fin de la boucle
        accordion_panel = '''
          {/* Panneau Cour Suprême d'Algérie */}
          <div className="bg-white rounded-lg shadow">
            <div 
              onClick={() => setCoursupremeExpanded(!coursupremeExpanded)}
              className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50"
            >
              {coursupremeExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 bg-blue-500 rounded flex items-center justify-center text-white font-bold">
                  ⚖️
                </div>
                <div>
                  <div className="font-bold">Cour Suprême d'Algérie</div>
                  <div className="text-xs text-gray-500">https://coursupreme.dz</div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm">0 sessions</span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm">1245 décisions</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm flex items-center gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  Inactif
                </span>
              </div>
            </div>
            
            {coursupremeExpanded && (
              <div className="border-t p-4">
                <CoursSupremeViewer embedded={true} />
              </div>
            )}
          </div>
'''
        lines.insert(i+1, accordion_panel)
        break

with open('HierarchicalView.jsx', 'w') as f:
    f.writelines(lines)

print("Panneau accordeon Cour Supreme ajoute")
