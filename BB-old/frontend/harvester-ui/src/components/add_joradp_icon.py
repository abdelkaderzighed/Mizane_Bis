with open('HierarchicalView.jsx', 'r') as f:
    content = f.read()

old_structure = '''                <div className="flex items-center gap-3">
                  {expandedSites.has(site.id) ? 
                    <ChevronDown size={20} /> : 
                    <ChevronRight size={20} />
                  }
                  <div>
                    <h3 className="text-lg font-bold">{site.name}</h3>'''

new_structure = '''                <div className="flex items-center gap-3">
                  {expandedSites.has(site.id) ? 
                    <ChevronDown size={20} /> : 
                    <ChevronRight size={20} />
                  }
                  <div className="w-10 h-10 bg-green-600 rounded flex items-center justify-center text-white text-xl">
                    📰
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{site.name}</h3>'''

content = content.replace(old_structure, new_structure)

with open('HierarchicalView.jsx', 'w') as f:
    f.write(content)

print("Icone JORADP ajoutee")
