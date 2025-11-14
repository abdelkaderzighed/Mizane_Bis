import React, { useState } from 'react';

export default function CollapsibleSection({ 
  title, 
  bgColor = 'bg-gray-50',
  defaultOpen = false,
  children 
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-lg mt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-4 ${bgColor} hover:opacity-90 rounded-t-lg flex items-center justify-between transition-colors`}
      >
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <span className="text-gray-500">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
}
