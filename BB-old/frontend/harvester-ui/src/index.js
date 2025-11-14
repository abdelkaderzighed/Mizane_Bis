import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const urlParams = new URLSearchParams(window.location.search);
const isLibraryMode = urlParams.get('mode') === 'library';
window.isLibraryMode = isLibraryMode;

if (isLibraryMode && window.fetch) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (resource, init = {}) => {
    const headers = new Headers(init.headers || {});
    headers.set('X-Library-Mode', '1');

    if (resource instanceof Request) {
      const newHeaders = new Headers(resource.headers);
      newHeaders.set('X-Library-Mode', '1');
      resource = new Request(resource, { headers: newHeaders });
      return originalFetch(resource, init);
    }

    return originalFetch(resource, { ...init, headers });
  };
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
