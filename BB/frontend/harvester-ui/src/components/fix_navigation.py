with open('CoursSupremeViewer.jsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    # Dans les résultats de recherche, garder sans theme
    if 'searchResults.map' in lines[i-10:i] if i >= 10 else False:
        if 'onClick={() => fetchDecisionDetail(decision.id, decisions[theme.id])}' in line:
            lines[i] = line.replace('decisions[theme.id]', 'searchResults')
    
    # Dans la liste normale, utiliser decisions[expandedTheme]
    if 'decisions[theme.id].map' in lines[i-5:i] if i >= 5 else False:
        if 'onClick={() => fetchDecisionDetail(decision.id, decisions[theme.id])}' in line:
            lines[i] = line.replace('decisions[theme.id]', 'decisions[expandedTheme]')

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.writelines(lines)

print("Navigation corrigee")
