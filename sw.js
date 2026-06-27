// Service worker mínimo — habilita "instalar como app" (PWA).
// PROPOSITALMENTE NÃO faz cache: passa tudo direto pra rede, pra nunca servir
// versão velha (evita o problema de cache que já enfrentamos no celular).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  // Rede sempre; sem cache. (handler presente só pra tornar o app instalável)
  e.respondWith(fetch(e.request));
});
