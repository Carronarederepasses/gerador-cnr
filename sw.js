// Service worker mínimo — habilita "instalar como app" (PWA).
// PROPOSITALMENTE NÃO faz cache: passa tudo direto pra rede, pra nunca servir
// versão velha (evita o problema de cache que já enfrentamos no celular).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  // POST/PUT/DELETE para /api/ vão direto pra rede sem passar pelo SW —
  // evita problema de body consumido duas vezes em uploads no mobile.
  if (e.request.method !== 'GET') return;
  // GET: rede sempre, sem cache.
  e.respondWith(fetch(e.request));
});
