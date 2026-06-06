if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
    .then(() => caches.keys())
    .then(keys => Promise.all(keys.map(key => caches.delete(key))))
    .catch(error => console.warn('[sw-cleanup] impossible de nettoyer le service worker', error));
}
