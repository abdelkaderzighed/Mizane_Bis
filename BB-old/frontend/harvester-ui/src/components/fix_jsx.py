with open('CoursSupremeViewer.jsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if i == 201 and 'href={decision.url}' in line:
        lines[i] = '                                  <a\n'

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.writelines(lines)

print("Balise a ajoutee ligne 202")
