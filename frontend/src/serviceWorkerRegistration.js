/**
 * Business Vahi Service Worker Registration
 * Enables offline support and "Add to Home Screen" on iOS and Android
 */

export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then(reg => {

          // Check for updates every hour
          setInterval(() => reg.update(), 60 * 60 * 1000);

          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available — show refresh prompt
                if (window.confirm('New version of Business Vahi available! Refresh to update?')) {
                  window.location.reload();
                }
              }
            });
          });
        })
        .catch(err => {
        });
    });
  }
}

export function unregisterSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => reg.unregister());
  }
}
