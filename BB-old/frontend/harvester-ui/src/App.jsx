import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HierarchicalView from './components/HierarchicalView';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HierarchicalView />} />
        <Route path="/sources" element={<HierarchicalView />} />
        <Route path="/coursupreme" element={<HierarchicalView />} />
      </Routes>
    </Router>
  );
}

export default App;
