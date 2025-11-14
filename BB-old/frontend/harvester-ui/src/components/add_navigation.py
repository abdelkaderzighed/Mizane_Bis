with open('CoursSupremeViewer.jsx', 'r') as f:
    content = f.read()

old_modal_header = '''                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">Décision {selectedDecision.decision_number}</h2>
                    <p className="text-gray-600">{selectedDecision.decision_date}</p>
                  </div>
                  <button onClick={() => setModalOpen(false)} className="text-2xl">×</button>
                </div>'''

new_modal_header = '''                <div className="flex justify-between items-center mb-4">
                  <button 
                    onClick={() => navigateDecision('prev')}
                    className="p-2 hover:bg-gray-100 rounded"
                    title="Décision précédente"
                  >
                    ← Précédent
                  </button>
                  
                  <div className="text-center">
                    <h2 className="text-2xl font-bold">Décision {selectedDecision.decision_number}</h2>
                    <p className="text-gray-600">{selectedDecision.decision_date}</p>
                  </div>
                  
                  <button 
                    onClick={() => navigateDecision('next')}
                    className="p-2 hover:bg-gray-100 rounded"
                    title="Décision suivante"
                  >
                    Suivant →
                  </button>
                  
                  <button onClick={() => setModalOpen(false)} className="text-2xl ml-4">×</button>
                </div>'''

content = content.replace(old_modal_header, new_modal_header)

old_state = '''const [selectedLang, setSelectedLang] = useState('ar');'''

new_state = '''const [selectedLang, setSelectedLang] = useState('ar');
  const [currentDecisionList, setCurrentDecisionList] = useState([]);
  const [currentDecisionIndex, setCurrentDecisionIndex] = useState(0);'''

content = content.replace(old_state, new_state)

new_function = '''  const navigateDecision = (direction) => {
    const newIndex = direction === 'next' ? currentDecisionIndex + 1 : currentDecisionIndex - 1;
    if (newIndex >= 0 && newIndex < currentDecisionList.length) {
      setCurrentDecisionIndex(newIndex);
      fetchDecisionDetail(currentDecisionList[newIndex].id);
    }
  };

  const handleDeleteDecision'''

content = content.replace('  const handleDeleteDecision', new_function)

old_fetch_detail = '''  const fetchDecisionDetail = async (id) => {
    try {
      const response = await fetch(`http://localhost:5001/api/coursupreme/decisions/${id}`);
      const data = await response.json();
      setSelectedDecision(data);
      setModalOpen(true);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };'''

new_fetch_detail = '''  const fetchDecisionDetail = async (id, decisionsList = null) => {
    try {
      const response = await fetch(`http://localhost:5001/api/coursupreme/decisions/${id}`);
      const data = await response.json();
      setSelectedDecision(data);
      setModalOpen(true);
      
      if (decisionsList) {
        setCurrentDecisionList(decisionsList);
        const index = decisionsList.findIndex(d => d.id === id);
        setCurrentDecisionIndex(index);
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };'''

content = content.replace(old_fetch_detail, new_fetch_detail)

old_decision_button = '''onClick={() => fetchDecisionDetail(decision.id)}'''
new_decision_button = '''onClick={() => fetchDecisionDetail(decision.id, decisions[theme.id])}'''

content = content.replace(old_decision_button, new_decision_button)

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("Navigation Precedent/Suivant ajoutee")
