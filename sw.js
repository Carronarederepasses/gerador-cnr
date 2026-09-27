// Service worker mínimo — habilita "instalar como app" (PWA).
// PROPOSITALMENTE NÃO faz cache: passa tudo direto pra rede, pra nunca servir
// versão velha (evita o problema de cache que já enfrentamos no celular).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
// ── Aviso no celular ────────────────────────────────────────────────
// O aviso chega SEM conteúdo, de propósito: mandar o texto dentro dele
// exigiria criptografar o pacote (aes128gcm), e este projeto não tem
// biblioteca nenhuma instalada — escrever essa parte à mão é onde se
// erra. Então o servidor só cutuca, e quem monta o texto é aqui,
// perguntando ao Gerador o que há de novo.
//
// Para perguntar é preciso a sessão, e o service worker não enxerga o
// localStorage. Ela é espelhada no IndexedDB por `assets/auth.js`.
function lerSessao() {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('cnr', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('sessao');
      req.onerror = () => resolve(null);
      req.onsuccess = () => {
        try {
          const p = req.result.transaction('sessao', 'readonly').objectStore('sessao').get('token');
          p.onsuccess = () => resolve(p.result || null);
          p.onerror = () => resolve(null);
        } catch (e) { resolve(null); }
      };
    } catch (e) { resolve(null); }
  });
}

self.addEventListener('push', (e) => {
  e.waitUntil((async () => {
    let titulo = 'Carro na Rede';
    let corpo = 'Você tem novidade na rede.';
    let url = '/rede.html';
    try {
      const token = await lerSessao();
      if (token) {
        const r = await fetch('/api/fetch-anuncio?rede=novidades', { headers: { 'x-cnr-sessao': token } });
        if (r.ok) {
          const d = await r.json();
          if (d.titulo) { titulo = d.titulo; corpo = d.corpo || corpo; url = d.url || url; }
        }
      }
    } catch (err) {
      // Sem rede ou sessão vencida: avisa assim mesmo. Aviso genérico é
      // pior que aviso completo, e MUITO melhor que aviso nenhum — a
      // pessoa perderia o carro sem saber que ele existiu.
    }
    await self.registration.showNotification(titulo, {
      body: corpo,
      icon: '/assets/icon-512.png',
      badge: '/assets/icon-512.png',
      // Id fixo: o aviso novo substitui o anterior em vez de empilhar.
      // Mesma decisão do Radar em 04/set — depois de uma tarde fora,
      // seis balões em fila não é notícia, é bagunça.
      tag: 'cnr-rede',
      data: { url },
    });
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const destino = (e.notification.data && e.notification.data.url) || '/rede.html';
  e.waitUntil((async () => {
    // Se o app já está aberto, leva a aba existente para lá em vez de
    // abrir outra — o mesmo problema das abas da OLX, de 10/set.
    const abas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const aba of abas) {
      if (aba.url.includes('/rede.html')) return aba.focus();
    }
    return self.clients.openWindow(destino);
  })());
});

self.addEventListener('fetch', (e) => {
  // POST/PUT/DELETE para /api/ vão direto pra rede sem passar pelo SW —
  // evita problema de body consumido duas vezes em uploads no mobile.
  if (e.request.method !== 'GET') return;
  // GET: rede sempre, sem cache.
  e.respondWith(fetch(e.request));
});
