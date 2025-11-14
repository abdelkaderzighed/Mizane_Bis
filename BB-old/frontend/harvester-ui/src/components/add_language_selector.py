with open('CoursSupremeViewer.jsx', 'r') as f:
    content = f.read()

old_modal_state = 'const [modalOpen, setModalOpen] = useState(false);'
new_modal_state = '''const [modalOpen, setModalOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState('ar');'''

content = content.replace(old_modal_state, new_modal_state)

old_modal_header = '''<div className="sticky top-0 bg-white border-b p-6 flex justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Décision {selectedDecision.decision_number}</h2>
                  <p className="text-gray-600">{selectedDecision.decision_date}</p>
                </div>
                <button onClick={() => setModalOpen(false)} className="text-2xl">×</button>
              </div>'''

new_modal_header = '''<div className="sticky top-0 bg-white border-b p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">Décision {selectedDecision.decision_number}</h2>
                    <p className="text-gray-600">{selectedDecision.decision_date}</p>
                  </div>
                  <button onClick={() => setModalOpen(false)} className="text-2xl">×</button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedLang('ar')}
                    className={`px-4 py-2 rounded ${selectedLang === 'ar' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                  >
                    العربية (AR)
                  </button>
                  <button
                    onClick={() => setSelectedLang('fr')}
                    className={`px-4 py-2 rounded ${selectedLang === 'fr' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                  >
                    Français (FR)
                  </button>
                </div>
              </div>'''

content = content.replace(old_modal_header, new_modal_header)

old_modal_content = '''<div className="p-6 space-y-4" dir="rtl">
                {selectedDecision.object_ar && (
                  <div>
                    <h3 className="font-bold mb-2">الموضوع</h3>
                    <p>{selectedDecision.object_ar}</p>
                  </div>
                )}
                {selectedDecision.parties_ar && (
                  <div>
                    <h3 className="font-bold mb-2">الأطراف</h3>
                    <p>{selectedDecision.parties_ar}</p>
                  </div>
                )}
                {selectedDecision.legal_reference_ar && (
                  <div>
                    <h3 className="font-bold mb-2">المرجع القانوني</h3>
                    <p>{selectedDecision.legal_reference_ar}</p>
                  </div>
                )}
                {selectedDecision.arguments_ar && (
                  <div>
                    <h3 className="font-bold mb-2">أوجه الدفع</h3>
                    <div className="whitespace-pre-wrap">{selectedDecision.arguments_ar}</div>
                  </div>
                )}
              </div>'''

new_modal_content = '''<div className="p-6">
                {selectedLang === 'ar' && selectedDecision.content_ar && (
                  <pre className="whitespace-pre-wrap font-sans text-right" dir="rtl">
                    {selectedDecision.content_ar}
                  </pre>
                )}
                {selectedLang === 'fr' && selectedDecision.content_fr && (
                  <pre className="whitespace-pre-wrap font-sans text-left">
                    {selectedDecision.content_fr}
                  </pre>
                )}
                {!selectedDecision.content_ar && !selectedDecision.content_fr && (
                  <p className="text-gray-500 text-center py-8">Contenu non disponible</p>
                )}
              </div>'''

content = content.replace(old_modal_content, new_modal_content)

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("Selecteur AR/FR ajoute")
