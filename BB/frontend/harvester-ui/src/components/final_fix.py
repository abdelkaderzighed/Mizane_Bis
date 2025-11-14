with open('CoursSupremeViewer.jsx', 'r') as f:
    content = f.read()

# Ligne 320 - dans searchResults
content = content.replace(
    '''                    <button
                      onClick={() => fetchDecisionDetail(decision.id, decisions[theme.id])}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Eye className="w-5 h-5" />
                    </button>''',
    '''                    <button
                      onClick={() => fetchDecisionDetail(decision.id, searchResults)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Eye className="w-5 h-5" />
                    </button>'''
)

# Ligne 379 - dans decisions[theme.id].map
content = content.replace(
    '''                                  <button 
                                    onClick={() => fetchDecisionDetail(decision.id, decisions[theme.id])} 
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" 
                                    title="Voir local (AR/FR)"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>''',
    '''                                  <button 
                                    onClick={() => fetchDecisionDetail(decision.id, decisions[expandedTheme])} 
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" 
                                    title="Voir local (AR/FR)"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>'''
)

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("Navigation corrigee - compilation devrait passer")
