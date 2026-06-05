import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { initSentry } from './lib/sentry';
import App from './App';

// Sentry doit être initialisé avant le rendu React
initSentry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
