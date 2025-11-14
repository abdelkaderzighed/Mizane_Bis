with open('CoursSupremeViewer.jsx', 'r') as f:
    content = f.read()

# Remplacer l'affichage des résultats de recherche
old_results = """              {searchResults.map((decision) => (
                <div key={decision.id} className="border-b pb-3 flex justify-between">
                  <div>
                    <span className="font-bold">{decision.decision_number}</span>
                    <span className="text-sm text-gray-500 ml-2">{decision.decision_date}</span>
                  </div>
                  <button onClick={() => fetchDecisionDetail(decision.id, searchResults)} className="p-2 text-blue-600">
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
              ))}"""

new_results = """              {searchResults.map((decision) => (
                <div key={decision.id} className="border-b pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="font-bold text-blue-600">{decision.decision_number}</span>
                    <span className="text-sm text-gray-500">{decision.decision_date}</span>
                    {decision.object_ar && (
                      <span className="text-sm text-gray-700 flex-1" dir="rtl">{decision.object_ar}</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleDownloadDecision(decision.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Télécharger">
                      <Download className="w-4 h-4" />
                    </button>
                    <button onClick={() => fetchDecisionDetail(decision.id, searchResults)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Voir">
                      <Eye className="w-4 h-4" />
                    </button>
                    <a href={decision.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-purple-600 hover:bg-purple-50 rounded" title="Site">
                      <Globe className="w-4 h-4" />
                    </a>
                    <button onClick={() => handleShowMetadata(decision.id)} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded" title="Métadonnées IA">
                      <Database className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteDecision(decision.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Supprimer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}"""

content = content.replace(old_results, new_results)

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("5 boutons ajoutes aux resultats de recherche")
