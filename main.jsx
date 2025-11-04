import React from 'react';
import ReactDOM from 'react-dom/client';
// Import your main LMS component
import App from './App.jsx';

// Get the root element from index.html
const rootElement = document.getElementById('root');

// Render the App component into the root element
ReactDOM.createRoot(rootElement).render(
  // React.StrictMode runs checks and warnings in development mode
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
