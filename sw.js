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
//
// Lê OS DOIS: a sessão (entrar por telefone) e a chave de aparelho. Na
// primeira tentativa real, em 27/set, só a sessão era lida — e o celular
// do Yuri está liberado por chave. O pedido voltava 401, o `catch` engolia,
// e o aviso chegava dizendo só "você tem novidade". Chegava sem o carro,
// que é justamente a razão de ele existir.
function lerCredenciais() {
  return new Promise((resolve) => {
    const vazio = { sessao: null, chave: null };
    try {
      const req = indexedDB.open('cnr', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('sessao');
      req.onerror = () => resolve(vazio);
      req.onsuccess = () => {
        try {
          const loja = req.result.transaction('sessao', 'readonly').objectStore('sessao');
          const out = { sessao: null, chave: null };
          let faltam = 2;
          const pronto = () => { if (--faltam === 0) resolve(out); };
          const pega = (qual, campo) => {
            const p = loja.get(qual);
            p.onsuccess = () => { out[campo] = p.result || null; pronto(); };
            p.onerror = () => pronto();
          };
          pega('token', 'sessao');
          pega('chave', 'chave');
        } catch (e) { resolve(vazio); }
      };
    } catch (e) { resolve(vazio); }
  });
}

self.addEventListener('push', (e) => {
  e.waitUntil((async () => {
    let titulo = 'Carro na Rede';
    let corpo = 'Você tem novidade na rede.';
    let url = '/rede.html';
    // "Não consegui ver o que é" NÃO é a mesma coisa que "chegou algo".
    // Quando o texto não pôde ser montado, o aviso diz o motivo em vez de
    // fingir que a mensagem genérica era a resposta certa — foi por dizer
    // as duas coisas igual que o primeiro teste real (27/set) não explicou
    // nada, e o mesmo engano já custou caro na tarja da caixa de entrada
    // em 02/set.
    let motivo = '';
    try {
      const { sessao, chave } = await lerCredenciais();
      if (!sessao && !chave) motivo = 'abra o app uma vez para eu poder ler as novidades';
      if (sessao || chave) {
        // Os dois vão juntos, como no envelope de `assets/auth.js`: na
        // transição da fase 1 há aparelho só com chave, só com sessão, e
        // aparelho com as duas.
        const cab = {};
        if (sessao) cab['x-cnr-sessao'] = sessao;
        if (chave)  cab['x-cnr-key']    = chave;
        const r = await fetch('/api/fetch-anuncio?rede=novidades', { headers: cab });
        if (r.ok) {
          const d = await r.json();
          if (d.titulo) { titulo = d.titulo; corpo = d.corpo || corpo; url = d.url || url; }
          else motivo = 'o servidor respondeu sem texto';
        } else {
          motivo = `o servidor recusou (${r.status})`;
        }
      }
    } catch (err) {
      // Sem rede: avisa assim mesmo. Aviso genérico é pior que aviso
      // completo, e MUITO melhor que aviso nenhum — a pessoa perderia o
      // carro sem saber que ele existiu. Mas diz que foi falha, não que
      // não havia nada.
      motivo = 'não consegui falar com o Gerador';
    }
    if (motivo) corpo = `Toque para ver — ${motivo}.`;
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
