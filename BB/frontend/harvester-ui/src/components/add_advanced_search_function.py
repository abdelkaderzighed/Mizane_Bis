with open('CoursSupremeViewer.jsx', 'r') as f:
    content = f.read()

# Trouver handleSearch et ajouter handleAdvancedSearch juste après
search_pos = content.find('  const handleSearch = async () => {')
if search_pos > 0:
    # Trouver la fin de handleSearch (le }; qui suit)
    end_pos = content.find('  };', search_pos)
    end_pos = content.find('\n', end_pos) + 1
    
    # Insérer handleAdvancedSearch
    new_function = '''
  const handleAdvancedSearch = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.keywordsInclusive) params.append('keywords_inc', filters.keywordsInclusive);
      if (filters.keywordsExclusive) params.append('keywords_exc', filters.keywordsExclusive);
      if (filters.decisionNumber) params.append('decision_number', filters.decisionNumber);
      if (filters.dateFrom) params.append('date_from', filters.dateFrom);
      if (filters.dateTo) params.append('date_to', filters.dateTo);
      
      const response = await fetch(`http://localhost:5001/api/coursupreme/search/advanced?${params}`);
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Erreur recherche avancée:', error);
    }
  };
'''
    
    content = content[:end_pos] + new_function + content[end_pos:]

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("Fonction handleAdvancedSearch ajoutee")
