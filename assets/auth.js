// ─────────────────────────────────────────────────────────────────
// Liberação do aparelho — CNR
//
// A regra combinada: o Yuri NÃO digita senha. Nunca. Ele abre um link
// uma vez em cada aparelho e aquele aparelho fica liberado para sempre.
//
// Por que não editar as ~100 chamadas de fetch das 13 telas: basta
// esquecer uma para ela quebrar em silêncio, e o jeito de descobrir
// seria uma venda não salvando no meio do negócio. Envolvendo o fetch
// num lugar só, não existe chamada esquecida.
//
// Este script NÃO pode ter defer: script inline no fim do <body> roda
// ANTES de script com defer, e várias telas disparam fetch já na carga.
// Com defer, a primeira chamada de cada tela sairia sem a chave.
// ─────────────────────────────────────────────────────────────────
(function () {
  'use strict';

  var GUARDA = 'cnr_chave';
  // Fase 1: entrar por telefone. A sessão vive ao lado da chave, não no
  // lugar dela — quem já está liberado continua liberado, e a troca
  // acontece no tempo de cada aparelho. Ver FASE1-ENTRAR.md §5.
  var GUARDA_SESSAO = 'cnr_sessao';

  function ler() {
    try { return localStorage.getItem(GUARDA) || ''; } catch (e) { return ''; }
  }

  function lerSessao() {
    try { return localStorage.getItem(GUARDA_SESSAO) || ''; } catch (e) { return ''; }
  }

  // A chave chega pelo fragmento (#), nunca pela query (?). Fragmento não
  // é enviado ao servidor, então a chave não aparece nos logs de acesso da
  // Vercel nem no Referer para terceiros.
  (function receberDoLink() {
    var h = (location.hash || '').replace(/^#/, '');
    if (!h) return;
    var m = /(?:^|&)chave=([^&]+)/.exec(h) || (/^[A-Za-z0-9_-]{16,}$/.test(h) ? [null, h] : null);
    if (!m) return;
    try {
      localStorage.setItem(GUARDA, decodeURIComponent(m[1]));
      // Tira da barra de endereço para não ficar em print, histórico ou
      // aba compartilhada.
      history.replaceState(null, '', location.pathname + location.search);
    } catch (e) { /* modo privado: segue sem guardar */ }
  })();

  // Gavetas antigas, de quando cada tela guardava a própria chave. Um valor
  // esquecido nelas vencia a chave certa — a página punha o header primeiro e
  // o envelope, por desenho, não sobrescreve. Resultado em 03/set: entrar.html
  // dizia "liberado" e vendas.html dizia "não liberado", no mesmo navegador.
  // O código que as lia já saiu; apagar o valor evita que volte a assombrar.
  try {
    localStorage.removeItem('cnr_vendas_key');
    localStorage.removeItem('cnr_catalogo_key');
  } catch (e) { /* modo privado */ }

  // ── A sessão também num lugar que o service worker alcance ──────
  // O aviso no celular chega quando o app está FECHADO, e quem monta o
  // texto ("Polo 2022, R$ 70.990, 7,5% abaixo da FIPE") é o service
  // worker. Ele não enxerga o localStorage — só IndexedDB e Cache.
  //
  // Sem este espelho, o aviso só poderia dizer "você tem novidade", e aí
  // a pessoa abre o app para descobrir que não era para ela. O objetivo
  // da tela 3 do desenho era o contrário: decidir SEM abrir.
  //
  // Falha aqui não pode derrubar nada: o localStorage continua sendo a
  // fonte para as telas; isto é cópia.
  function espelharNoIDB(valor) {
    try {
      var req = indexedDB.open('cnr', 1);
      req.onupgradeneeded = function () { req.result.createObjectStore('sessao'); };
      req.onsuccess = function () {
        try {
          var tx = req.result.transaction('sessao', 'readwrite');
          if (valor) tx.objectStore('sessao').put(valor, 'token');
          else tx.objectStore('sessao').delete('token');
        } catch (e) { /* modo privado, cota, etc. */ }
      };
    } catch (e) { /* sem IndexedDB: o aviso fica genérico, nada quebra */ }
  }

  // Quem já entrou antes desta mudança não tem o espelho. Copia na
  // primeira carga, em vez de exigir sair e entrar de novo.
  (function () { var t = lerSessao(); if (t) espelharNoIDB(t); })();

  // ── Envelopa o fetch ────────────────────────────────────────────
  var original = window.fetch.bind(window);

  function ehDaNossaApi(entrada) {
    var u;
    try {
      u = new URL(typeof entrada === 'string' ? entrada : (entrada && entrada.url) || '',
                  location.href);
    } catch (e) { return false; }
    return u.origin === location.origin && u.pathname.indexOf('/api/') === 0;
  }

  window.fetch = function (entrada, init) {
    if (!ehDaNossaApi(entrada)) return original(entrada, init);

    var chave = ler();
    var sessao = lerSessao();
    if (chave || sessao) {
      init = init || {};
      var h = new Headers(init.headers || (entrada && entrada.headers) || {});
      if (chave && !h.has('x-cnr-key')) h.set('x-cnr-key', chave);
      // Os dois vão juntos de propósito: se a sessão vencer, a chave ainda
      // abre a porta e a operação não para no meio.
      if (sessao && !h.has('x-cnr-sessao')) h.set('x-cnr-sessao', sessao);
      init = Object.assign({}, init, { headers: h });
    }

    return original(entrada, init).then(function (r) {
      if (r.status === 401) avisar();
      return r;
    });
  };

  // ── Aviso de aparelho não liberado ──────────────────────────────
  // Sem isto, cada tela falharia do seu jeito — uma com lista vazia,
  // outra com tarja genérica — e "não liberado" ficaria parecido com
  // "não tem nada cadastrado". Já custou caro aqui confundir os dois.
  var jaAvisou = false;
  function avisar() {
    if (jaAvisou) return;
    // Na própria tela de entrar, não. Ela JÁ é o lugar de resolver isso, e
    // ela própria pergunta ao servidor para saber o que mostrar. O aviso
    // cobria a tela inteira e mandava "abrir o link de liberação" bem em
    // cima do campo de telefone — visto na captura em 27/set, num aparelho
    // sem chave. Antes ninguém chegava aqui sem chave; com entrada por
    // telefone, é a primeira tela de todo cliente novo.
    if (/\/entrar(\.html)?$/.test(location.pathname)) return;
    jaAvisou = true;

    var box = document.createElement('div');
    box.setAttribute('role', 'alert');
    box.style.cssText =
      'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;' +
      'justify-content:center;padding:1.2rem;background:rgba(0,0,0,.72);' +
      "font-family:'DM Sans',system-ui,sans-serif";
    box.innerHTML =
      '<div style="background:var(--surface-raise,#fff);color:var(--text,#111);' +
        'border-radius:var(--r-lg, 16px);padding:1.6rem;max-width:26rem;line-height:1.55">' +
        '<div style="font-size:1.15rem;font-weight:700;margin-bottom:.7rem">' +
          'Este aparelho ainda não foi liberado</div>' +
        '<p style="font-size:.92rem;margin:0 0 .9rem">' +
          'Os dados estão salvos e intactos — este navegador é que não tem ' +
          'a liberação ainda.</p>' +
        '<p style="font-size:.92rem;margin:0 0 1.2rem">' +
          'Entre com o seu <strong>telefone</strong> uma vez neste aparelho. ' +
          'Depois disso ele não pergunta mais nada.</p>' +
        '<div style="display:flex;gap:.6rem;flex-wrap:wrap">' +
        '<a href="/entrar.html" style="font:inherit;font-size:.9rem;font-weight:700;' +
          'padding:.65rem 1.2rem;border-radius:var(--r-md, 12px);text-decoration:none;' +
          'background:var(--text,#111);color:var(--surface,#fff)">Entrar</a>' +
        '<button id="cnr-auth-ok" style="font:inherit;font-size:.9rem;' +
          'font-weight:500;padding:.65rem 1.2rem;border:1px solid var(--line,#ccc);' +
          'border-radius:var(--r-md, 12px);background:none;color:var(--text-mid,#555);' +
          'cursor:pointer">Agora não</button></div>' +
      '</div>';

    function montar() {
      document.body.appendChild(box);
      document.getElementById('cnr-auth-ok')
        .addEventListener('click', function () { box.remove(); });
    }
    if (document.body) montar();
    else document.addEventListener('DOMContentLoaded', montar);
  }

  // Exposto para a tela de liberação.
  window.CNR_AUTH = {
    guardar: function (v) { localStorage.setItem(GUARDA, v); },
    ler: ler,
    esquecer: function () { localStorage.removeItem(GUARDA); },
    guardarSessao: function (v) {
      try { localStorage.setItem(GUARDA_SESSAO, v); } catch (e) {}
      espelharNoIDB(v);
    },
    lerSessao: lerSessao,
    sair: function () {
      try { localStorage.removeItem(GUARDA_SESSAO); } catch (e) {}
      espelharNoIDB(null);
    },
  };
})();
