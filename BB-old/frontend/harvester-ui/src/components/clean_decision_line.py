with open('CoursSupremeViewer.jsx', 'r') as f:
    content = f.read()

old_decision_display = '''                              <div key={decision.id} className="py-3 border-b last:border-b-0 flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-blue-600">{decision.decision_number}</span>
                                    <span className="text-sm text-gray-500">{decision.decision_date}</span>
                                  </div>
                                  {decision.object_ar && <p className="text-sm text-gray-700" dir="rtl">{decision.object_ar}</p>}
                                </div>'''

new_decision_display = '''                              <div key={decision.id} className="py-2 border-b last:border-b-0 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-blue-600 text-base">{decision.decision_number}</span>
                                  <span className="text-sm text-gray-500">{decision.decision_date}</span>
                                </div>'''

content = content.replace(old_decision_display, new_decision_display)

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("Ligne nettoyee : Numero - Date - Boutons uniquement")
