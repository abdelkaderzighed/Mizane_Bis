with open('CoursSupremeViewer.jsx', 'r') as f:
    lines = f.readlines()

insert_at = None
for i, line in enumerate(lines):
    if 'const [modalOpen, setModalOpen] = useState(false);' in line:
        insert_at = i + 1
        break

if insert_at:
    lines.insert(insert_at, '\n')
    lines.insert(insert_at + 1, '  const translations = {\n')
    lines.insert(insert_at + 2, '    "قرارات مصنفة حسب المواضيع": "Décisions par sujets",\n')
    lines.insert(insert_at + 3, '    "الغرف الجزائية": "Chambres pénales",\n')
    lines.insert(insert_at + 4, '    "الغرف المدنية": "Chambres civiles",\n')
    lines.insert(insert_at + 5, '    "لجنة التعويض": "Commission d\'indemnisation",\n')
    lines.insert(insert_at + 6, '    "الغرف المجتمعة": "Chambres réunies",\n')
    lines.insert(insert_at + 7, '    "قرارات مهمة": "Décisions importantes"\n')
    lines.insert(insert_at + 8, '  };\n')

for i, line in enumerate(lines):
    if '<h2 className="text-lg font-bold" dir="rtl">{chamber.name_ar}</h2>' in line:
        lines[i] = '                  <div className="text-left">\n'
        lines.insert(i + 1, '                    <h2 className="text-lg font-bold" dir="rtl">{chamber.name_ar}</h2>\n')
        lines.insert(i + 2, '                    <p className="text-sm text-purple-600">{translations[chamber.name_ar]}</p>\n')
        lines.insert(i + 3, '                  </div>\n')
        break

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.writelines(lines)

print("Traductions ajoutees")
