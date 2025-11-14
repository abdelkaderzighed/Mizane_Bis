with open('CoursSupremeViewer.jsx', 'r') as f:
    content = f.read()

old_line = '''                              <div key={decision.id} className="py-2 border-b last:border-b-0 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-blue-600 text-base">{decision.decision_number}</span>
                                  <span className="text-sm text-gray-500">{decision.decision_date}</span>
                                </div>'''

new_line = '''                              <div key={decision.id} className="py-3 border-b last:border-b-0 flex items-center justify-between gap-4">
                                <div className="flex-1 flex items-center gap-3">
                                  <span className="font-bold text-blue-600 text-base min-w-[80px]">{decision.decision_number}</span>
                                  <span className="text-sm text-gray-500 min-w-[100px]">{decision.decision_date}</span>
                                  {decision.object_ar && (
                                    <span className="text-sm text-gray-700 flex-1" dir="rtl">{decision.object_ar}</span>
                                  )}
                                </div>'''

content = content.replace(old_line, new_line)

old_buttons = '''                                <div className="flex gap-1">
                                  <button onClick={() => fetchDecisionDetail(decision.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Détails">
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <a href={decision.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-600 hover:bg-gray-50 rounded" title="Site">
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                </div>'''

new_buttons = '''                                <div className="flex gap-1 ml-2">
                                  <button 
                                    onClick={() => handleDownloadDecision(decision.id)} 
                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded" 
                                    title="Télécharger + Traduire"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => fetchDecisionDetail(decision.id)} 
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" 
                                    title="Voir local (AR/FR)"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <a 
                                    href={decision.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="p-1.5 text-purple-600 hover:bg-purple-50 rounded" 
                                    title="Voir sur site"
                                  >
                                    <Globe className="w-4 h-4" />
                                  </a>
                                  <button 
                                    onClick={() => handleShowMetadata(decision.id)} 
                                    className="p-1.5 text-orange-600 hover:bg-orange-50 rounded" 
                                    title="Métadonnées IA"
                                  >
                                    <Database className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteDecision(decision.id)} 
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded" 
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>'''

content = content.replace(old_buttons, new_buttons)

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("Ligne finale : Numero - Date - Titre - 5 boutons")
