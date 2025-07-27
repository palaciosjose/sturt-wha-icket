export function register() {
  console.log("Registrando service worker", navigator)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

      navigator.serviceWorker.register(swUrl)
        .then((registration) => {
          console.log('Service worker registrado com sucesso!', registration);
          
          // Agregar manejo de errores más robusto
          registration.addEventListener('error', (event) => {
            console.warn('Service Worker error:', event);
          });
          
          registration.addEventListener('message', (event) => {
            console.log('Service Worker message:', event.data);
          });
        })
        .catch((error) => {
          console.error('Erro durante o registro do service worker:', error);
        });
    });
  }
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error('Erro durante o desregistro do service worker:', error);
      });
  }
}
