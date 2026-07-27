// CNR Sidebar — componente compartilhado de navegação
(function () {
  var PAGES = [
    { href: '/home.html',        emoji: '🏠', label: 'Painel' },
    { href: '/index.html',       emoji: '📝', label: 'Gerador' },
    { href: '/catalogo.html',    emoji: '📂', label: 'Catálogo' },
    { href: '/compradores.html', emoji: '👥', label: 'Compradores' },
    { href: '/vendas.html',      emoji: '📋', label: 'Vendas' },
    { href: '/negociacoes.html', emoji: '🤝', label: 'Negociações' },
    { href: '/consultas.html',   emoji: '🔍', label: 'Consulta' },
    { href: '/busca.html',       emoji: '🔎', label: 'Busca' },
    { href: '/foto.html',        emoji: '📸', label: 'Foto' },
  ];

  function paginaAtiva(href) {
    var path = window.location.pathname;
    if (href === '/home.html' && (path === '/' || path === '/home.html')) return true;
    return path === href || path.endsWith(href);
  }

  function copiarDados(btn) {
    var D = { nome: 'Yuri Pellegrinelli', banco: 'Itaú', agencia: '5799', conta: '03048-6', pix: '17996670304' };
    var d;
    try { d = JSON.parse(localStorage.getItem('cnr_meus_dados')) || D; } catch (e) { d = D; }
    var txt = [d.nome, '', 'Banco: ' + d.banco, 'Ag: ' + d.agencia + ' / C/C: ' + d.conta, 'Pix: ' + d.pix].join('\n');
    navigator.clipboard.writeText(txt).then(function () {
      var orig = btn.textContent;
      btn.textContent = '✓ Copiado!';
      setTimeout(function () { btn.textContent = orig; }, 1800);
    }).catch(function () {});
  }

  function buildHTML() {
    var links = PAGES.map(function (p) {
      var cls = 'cnr-sb-link' + (paginaAtiva(p.href) ? ' ativo' : '');
      return '<a class="' + cls + '" href="' + p.href + '"><span class="cnr-sb-emoji">' + p.emoji + '</span>' + p.label + '</a>';
    }).join('');

    return '<div class="cnr-sb-logo">'
      + '<div class="cnr-sb-logo-name">Carro na Rede</div>'
      + '<div class="cnr-sb-logo-sub">Repasses</div>'
      + '</div>'
      + '<nav class="cnr-sb-nav">' + links + '</nav>'
      + '<div class="cnr-sb-footer">'
      + '<button class="cnr-sb-dados" id="cnr-sb-dados-btn">📋&nbsp; Meus dados</button>'
      + '</div>';
  }

  function init() {
    // Sidebar
    var aside = document.createElement('aside');
    aside.id = 'cnr-sidebar';
    aside.innerHTML = buildHTML();
    document.body.prepend(aside);

    // Botão meus dados
    var dadosBtn = document.getElementById('cnr-sb-dados-btn');
    if (dadosBtn) {
      dadosBtn.addEventListener('click', function () { copiarDados(dadosBtn); });
    }

    // Hamburger
    var ham = document.createElement('button');
    ham.id = 'cnr-ham';
    ham.setAttribute('aria-label', 'Menu');
    ham.textContent = '☰';
    document.body.prepend(ham);

    // Backdrop
    var backdrop = document.createElement('div');
    backdrop.id = 'cnr-backdrop';
    document.body.appendChild(backdrop);

    function abrir() {
      aside.classList.add('open');
      backdrop.classList.add('open');
      ham.textContent = '✕';
    }
    function fechar() {
      aside.classList.remove('open');
      backdrop.classList.remove('open');
      ham.textContent = '☰';
    }

    ham.addEventListener('click', function () {
      aside.classList.contains('open') ? fechar() : abrir();
    });
    backdrop.addEventListener('click', fechar);

    // Fecha ao navegar (link clicado no mobile)
    aside.querySelectorAll('.cnr-sb-link').forEach(function (a) {
      a.addEventListener('click', fechar);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
