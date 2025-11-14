with open('HierarchicalView.jsx', 'r') as f:
    lines = f.readlines()

with open('HierarchicalView.jsx', 'w') as f:
    for line in lines:
        if 'await fetch`${API_URL}/documents/${doc.id}/metadata`)' in line:
            line = line.replace('await fetch`${API_URL}/documents/${doc.id}/metadata`)', 
                              'await fetch(`${API_URL}/documents/${doc.id}/metadata`)')
        f.write(line)

print("Backtick corrige")
