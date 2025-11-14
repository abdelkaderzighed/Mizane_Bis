with open('HierarchicalView.jsx', 'r') as f:
    lines = f.readlines()

new_lines = []
import_added = False

for i, line in enumerate(lines):
    if not import_added and 'import React' in line:
        new_lines.append('import CoursSupremeViewer from "./CoursSupremeViewer";\n')
        import_added = True
    
    if 'sites.filter(s => s.id !== 2).map' in line:
        line = line.replace('sites.filter(s => s.id !== 2).map', 'sites.map')
    
    if '{expandedSite === site.id && (' in line and 'site.id === 2' not in line:
        new_lines.append(line)
        new_lines.append('                {expandedSite === site.id && site.id === 2 && (\n')
        new_lines.append('                  <div className="p-4">\n')
        new_lines.append('                    <CoursSupremeViewer embedded={true} />\n')
        new_lines.append('                  </div>\n')
        new_lines.append('                )}\n')
        new_lines.append('                \n')
        line = line.replace('{expandedSite === site.id && (', '{expandedSite === site.id && site.id !== 2 && (')
    
    new_lines.append(line)

with open('HierarchicalView.jsx', 'w') as f:
    f.writelines(new_lines)

print("Integration terminee")
