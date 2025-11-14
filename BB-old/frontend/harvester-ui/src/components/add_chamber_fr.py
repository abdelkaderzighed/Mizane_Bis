with open('CoursSupremeViewer.jsx', 'r') as f:
    content = f.read()

old_chamber = """<h2 className="font-bold" dir="rtl">{chamber.name_ar}</h2>"""

new_chamber = """<div>
                      <h2 className="font-bold" dir="rtl">{chamber.name_ar}</h2>
                      {chamber.name_fr && <p className="text-sm text-gray-500">{chamber.name_fr}</p>}
                    </div>"""

content = content.replace(old_chamber, new_chamber)

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("Noms francais ajoutes")
