with open('CoursSupremeViewer.jsx', 'r') as f:
    content = f.read()

# Améliorer le conteneur du modal
old_modal_container = '''          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">'''

new_modal_container = '''          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">'''

content = content.replace(old_modal_container, new_modal_container)

# Améliorer l'en-tête
old_modal_header = '''              <div className="sticky top-0 bg-white border-b p-6">'''

new_modal_header = '''              <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 p-6 shadow-sm">'''

content = content.replace(old_modal_header, new_modal_header)

# Améliorer les boutons de langue avec fond distinct
old_lang_buttons = '''                  <div className="flex gap-2">
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
                  </div>'''

new_lang_buttons = '''                  <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm">
                    <button
                      onClick={() => setSelectedLang('ar')}
                      className={`px-6 py-2 rounded-md font-medium transition-all ${selectedLang === 'ar' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      العربية
                    </button>
                    <button
                      onClick={() => setSelectedLang('fr')}
                      className={`px-6 py-2 rounded-md font-medium transition-all ${selectedLang === 'fr' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      Français
                    </button>
                  </div>'''

content = content.replace(old_lang_buttons, new_lang_buttons)

# Améliorer la zone de contenu
old_content_area = '''              <div className="p-6">
                {selectedLang === 'ar' && selectedDecision.content_ar && (
                  <pre className="whitespace-pre-wrap font-sans text-right" dir="rtl">
                    {selectedDecision.content_ar}
                  </pre>
                )}
                {selectedLang === 'fr' && selectedDecision.content_fr && (
                  <pre className="whitespace-pre-wrap font-sans text-left">
                    {selectedDecision.content_fr}
                  </pre>
                )}'''

new_content_area = '''              <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
                {selectedLang === 'ar' && selectedDecision.content_ar && (
                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <pre className="whitespace-pre-wrap font-sans text-right leading-relaxed text-gray-800" dir="rtl" style={{fontSize: '15px', lineHeight: '1.8'}}>
                      {selectedDecision.content_ar}
                    </pre>
                  </div>
                )}
                {selectedLang === 'fr' && selectedDecision.content_fr && (
                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <pre className="whitespace-pre-wrap font-sans text-left leading-relaxed text-gray-800" style={{fontSize: '15px', lineHeight: '1.8'}}>
                      {selectedDecision.content_fr}
                    </pre>
                  </div>
                )}'''

content = content.replace(old_content_area, new_content_area)

# Améliorer le message "contenu non disponible"
old_no_content = '''                {!selectedDecision.content_ar && !selectedDecision.content_fr && (
                  <p className="text-gray-500 text-center py-8">Contenu non disponible</p>
                )}'''

new_no_content = '''                {!selectedDecision.content_ar && !selectedDecision.content_fr && (
                  <div className="text-center py-16">
                    <div className="text-gray-400 text-6xl mb-4">📄</div>
                    <p className="text-gray-500 text-lg">Contenu en cours de traitement...</p>
                    <p className="text-gray-400 text-sm mt-2">Utilisez le bouton 📥 pour télécharger cette décision</p>
                  </div>
                )}'''

content = content.replace(old_no_content, new_no_content)

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("Modal ameliore avec nouveau style")
