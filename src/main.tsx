import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { initSentry } from './lib/sentry';
import App from './App';

// Sentry doit être initialisé avant le rendu React
initSentry();

// Ancienne PWA : certains navigateurs, surtout Safari, peuvent garder un
// service worker qui sert un vieux bundle et intercepte les pages.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations()
      .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
      .then(() => caches.keys())
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .catch(error => console.warn('[sw-cleanup] impossible de nettoyer le service worker', error));
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
