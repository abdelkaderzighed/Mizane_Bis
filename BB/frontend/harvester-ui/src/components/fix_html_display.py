with open('CoursSupremeViewer.jsx', 'r') as f:
    content = f.read()

# Remplacer l'affichage texte par dangerouslySetInnerHTML
old_ar = """                {selectedLang === 'ar' && selectedDecision.content_ar && (
                  <div className="bg-white rounded-lg p-6">
                    <pre className="whitespace-pre-wrap font-sans" dir="rtl" style={{fontSize: '15px', lineHeight: '1.8'}}>
                      {selectedDecision.content_ar}
                    </pre>
                  </div>
                )}"""

new_ar = """                {selectedLang === 'ar' && selectedDecision.content_ar && (
                  <div className="bg-white rounded-lg p-6" dir="rtl">
                    <div 
                      className="prose prose-sm max-w-none"
                      style={{fontSize: '15px', lineHeight: '1.8'}}
                      dangerouslySetInnerHTML={{__html: selectedDecision.content_ar}}
                    />
                  </div>
                )}"""

old_fr = """                {selectedLang === 'fr' && selectedDecision.content_fr && (
                  <div className="bg-white rounded-lg p-6">
                    <pre className="whitespace-pre-wrap font-sans" style={{fontSize: '15px', lineHeight: '1.8'}}>
                      {selectedDecision.content_fr}
                    </pre>
                  </div>
                )}"""

new_fr = """                {selectedLang === 'fr' && selectedDecision.content_fr && (
                  <div className="bg-white rounded-lg p-6">
                    <div 
                      className="prose prose-sm max-w-none"
                      style={{fontSize: '15px', lineHeight: '1.8'}}
                      dangerouslySetInnerHTML={{__html: selectedDecision.content_fr}}
                    />
                  </div>
                )}"""

content = content.replace(old_ar, new_ar)
content = content.replace(old_fr, new_fr)

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("Affichage HTML corrige")
