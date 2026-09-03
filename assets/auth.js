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

  function ler() {
    try { return localStorage.getItem(GUARDA) || ''; } catch (e) { return ''; }
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
    if (chave) {
      init = init || {};
      var h = new Headers(init.headers || (entrada && entrada.headers) || {});
      if (!h.has('x-cnr-key')) h.set('x-cnr-key', chave);
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
    jaAvisou = true;

    var box = document.createElement('div');
    box.setAttribute('role', 'alert');
    box.style.cssText =
      'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;' +
      'justify-content:center;padding:1.2rem;background:rgba(0,0,0,.72);' +
      "font-family:'DM Sans',system-ui,sans-serif";
    box.innerHTML =
      '<div style="background:var(--surface-raise,#fff);color:var(--text,#111);' +
        'border-radius:16px;padding:1.6rem;max-width:26rem;line-height:1.55">' +
        '<div style="font-size:1.15rem;font-weight:700;margin-bottom:.7rem">' +
          'Este aparelho ainda não foi liberado</div>' +
        '<p style="font-size:.92rem;margin:0 0 .9rem">' +
          'Os dados estão salvos e intactos — este navegador é que não tem ' +
          'a liberação ainda.</p>' +
        '<p style="font-size:.92rem;margin:0 0 1.2rem">' +
          'Abra o <strong>link de liberação</strong> uma vez neste aparelho. ' +
          'Depois disso ele não pergunta mais nada.</p>' +
        '<button id="cnr-auth-ok" style="font:inherit;font-size:.9rem;' +
          'font-weight:700;padding:.65rem 1.2rem;border:none;border-radius:10px;' +
          'background:var(--text,#111);color:var(--surface,#fff);cursor:pointer">' +
          'Entendi</button>' +
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
  };
})();
