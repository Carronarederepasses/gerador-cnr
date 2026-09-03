// CNR Sidebar — componente compartilhado de navegação
(function () {
  // Treze itens em lista única não diziam o que era o quê: os seis usados todo
  // dia ficavam misturados com os de vez em quando. Os grupos são as duas
  // metades reais da operação, na ordem em que acontecem — o carro entra em
  // Captar e sai em Vender. Nenhum endereço mudou; só ganharam título.
  //
  // "Foto" virou "Arte" porque o nome colidia três vezes: item da lateral,
  // aba FOTO do Gerador (o mesmo editor, duplicado) e aba FOTOS (as fotos do
  // veículo, que é outra coisa).
  var PAGES = [
    { href: '/home.html',        emoji: '🏠', label: 'Painel' },

    { grupo: 'Captar' },
    { href: '/radar.html',       emoji: '🎯', label: 'Radar' },
    { href: '/anuncios.html',    emoji: '📡', label: 'Anúncios' },
    { href: '/conversas.html',   emoji: '💬', label: 'Conversas' },
    { href: '/index.html',       emoji: '📝', label: 'Gerador' },

    { grupo: 'Vender' },
    { href: '/catalogo.html',    emoji: '📂', label: 'Catálogo' },
    { href: '/compradores.html', emoji: '👥', label: 'Clientes' },
    { href: '/negociacoes.html', emoji: '🤝', label: 'Negociações' },
    { href: '/vendas.html',      emoji: '📋', label: 'Vendas' },

    { grupo: 'Apoio' },
    { href: '/consultas.html',   emoji: '🔍', label: 'Consulta' },
    { href: '/busca.html',       emoji: '🔎', label: 'Busca' },
    { href: '/foto.html',        emoji: '🎨', label: 'Arte' },
    { href: '/ideias.html',      emoji: '💡', label: 'Ideias' },
  ];

  function paginaAtiva(href) {
    var path = window.location.pathname;
    if (href === '/home.html' && (path === '/' || path === '/home.html')) return true;
    return path === href || path.endsWith(href);
  }

  // ── Meus dados bancários ────────────────────────────────────────────
  var MD_DEFAULT = { nome: 'Yuri Pellegrinelli', banco: 'Itaú', agencia: '5799', conta: '03048-6', pix: '17996670304' };

  function getMeusDados() {
    try { return JSON.parse(localStorage.getItem('cnr_meus_dados')) || MD_DEFAULT; } catch (e) { return MD_DEFAULT; }
  }

  function mdTexto(d) {
    return [d.nome, '', 'Banco: ' + d.banco, 'Ag: ' + d.agencia + ' / C/C: ' + d.conta, 'Pix: ' + d.pix].join('\n');
  }

  function abrirMeusDados() {
    var d = getMeusDados();
    document.getElementById('cnr-md-preview').textContent = mdTexto(d);
    document.getElementById('cnr-md-form').style.display = 'none';
    document.getElementById('cnr-md-bg').style.display = 'flex';
  }

  function fecharMeusDados() {
    document.getElementById('cnr-md-bg').style.display = 'none';
  }

  function copiarMeusDados() {
    var texto = document.getElementById('cnr-md-preview').textContent;
    var btn = document.getElementById('cnr-md-copiar');
    navigator.clipboard.writeText(texto).then(function () {
      btn.textContent = '✓ Copiado!';
      setTimeout(function () { btn.textContent = '📋 Copiar'; }, 1800);
    }).catch(function () {});
  }

  function editarMeusDados() {
    var form = document.getElementById('cnr-md-form');
    if (form.style.display === 'flex') { form.style.display = 'none'; return; }
    var d = getMeusDados();
    document.getElementById('cnr-mdf-nome').value    = d.nome;
    document.getElementById('cnr-mdf-banco').value   = d.banco;
    document.getElementById('cnr-mdf-agencia').value = d.agencia;
    document.getElementById('cnr-mdf-conta').value   = d.conta;
    document.getElementById('cnr-mdf-pix').value     = d.pix;
    form.style.display = 'flex';
    form.style.flexDirection = 'column';
  }

  function salvarMeusDados() {
    var d = {
      nome:    document.getElementById('cnr-mdf-nome').value.trim(),
      banco:   document.getElementById('cnr-mdf-banco').value.trim(),
      agencia: document.getElementById('cnr-mdf-agencia').value.trim(),
      conta:   document.getElementById('cnr-mdf-conta').value.trim(),
      pix:     document.getElementById('cnr-mdf-pix').value.trim(),
    };
    localStorage.setItem('cnr_meus_dados', JSON.stringify(d));
    document.getElementById('cnr-md-preview').textContent = mdTexto(d);
    document.getElementById('cnr-md-form').style.display = 'none';
  }

  function buildModal() {
    var inp = 'width:100%;margin-top:.2rem;padding:.45rem .6rem;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--text);font-family:\'DM Sans\',sans-serif;font-size:.82rem;box-sizing:border-box';
    var lbl = 'font-size:.68rem;color:var(--text-mid)';
    var el = document.createElement('div');
    el.id = 'cnr-md-bg';
    el.setAttribute('style', 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;align-items:center;justify-content:center;padding:1rem');
    el.innerHTML =
      '<div style="background:var(--surface-raise);border:1px solid var(--line);border-radius:16px;padding:1.4rem;width:100%;max-width:380px;display:flex;flex-direction:column;gap:.9rem">'
      + '<div style="font-size:.62rem;text-transform:uppercase;letter-spacing:.12em;color:var(--text-mid);font-weight:700">Meus dados bancários</div>'
      + '<pre id="cnr-md-preview" style="font-family:\'DM Sans\',sans-serif;font-size:.85rem;line-height:1.6;white-space:pre-wrap;background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:.9rem;margin:0"></pre>'
      + '<div style="display:flex;gap:.5rem">'
      +   '<button id="cnr-md-copiar" style="flex:1;font-family:\'DM Sans\',sans-serif;font-size:.85rem;font-weight:700;padding:.65rem;border-radius:10px;border:none;background:var(--text);color:var(--surface);cursor:pointer">📋 Copiar</button>'
      +   '<button id="cnr-md-editar" style="font-family:\'DM Sans\',sans-serif;font-size:.85rem;padding:.65rem .9rem;border-radius:10px;border:1px solid var(--line);background:none;color:var(--text);cursor:pointer">✏️ Editar</button>'
      +   '<button id="cnr-md-fechar" style="font-family:\'DM Sans\',sans-serif;font-size:.85rem;padding:.65rem .9rem;border-radius:10px;border:1px solid var(--line);background:none;color:var(--text);cursor:pointer">✕</button>'
      + '</div>'
      + '<div id="cnr-md-form" style="display:none;flex-direction:column;gap:.6rem">'
      +   '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem">'
      +     '<div><label style="' + lbl + '">Nome</label><input id="cnr-mdf-nome" type="text" style="' + inp + '"></div>'
      +     '<div><label style="' + lbl + '">Banco</label><input id="cnr-mdf-banco" type="text" style="' + inp + '"></div>'
      +     '<div><label style="' + lbl + '">Agência</label><input id="cnr-mdf-agencia" type="text" style="' + inp + '"></div>'
      +     '<div><label style="' + lbl + '">Conta (C/C)</label><input id="cnr-mdf-conta" type="text" style="' + inp + '"></div>'
      +   '</div>'
      +   '<div><label style="' + lbl + '">Chave Pix</label><input id="cnr-mdf-pix" type="text" style="' + inp + '"></div>'
      +   '<div style="display:flex;gap:.5rem;margin-top:.2rem">'
      +     '<button id="cnr-md-salvar" style="flex:1;font-family:\'DM Sans\',sans-serif;font-size:.82rem;font-weight:700;padding:.55rem;border-radius:8px;border:none;background:var(--text);color:var(--surface);cursor:pointer">Salvar</button>'
      +     '<button id="cnr-md-cancelar" style="font-family:\'DM Sans\',sans-serif;font-size:.82rem;padding:.55rem .8rem;border-radius:8px;border:1px solid var(--line);background:none;color:var(--text);cursor:pointer">Cancelar</button>'
      +   '</div>'
      + '</div>'
      + '</div>';
    el.addEventListener('click', function (e) { if (e.target === el) fecharMeusDados(); });
    document.body.appendChild(el);
    document.getElementById('cnr-md-copiar').addEventListener('click', copiarMeusDados);
    document.getElementById('cnr-md-editar').addEventListener('click', editarMeusDados);
    document.getElementById('cnr-md-fechar').addEventListener('click', fecharMeusDados);
    document.getElementById('cnr-md-salvar').addEventListener('click', salvarMeusDados);
    document.getElementById('cnr-md-cancelar').addEventListener('click', editarMeusDados);
  }

  function buildHTML() {
    var links = PAGES.map(function (p) {
      if (p.grupo) return '<div class="cnr-sb-grupo">' + p.grupo + '</div>';
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

    // Modal meus dados
    buildModal();
    document.getElementById('cnr-sb-dados-btn').addEventListener('click', abrirMeusDados);

    // Marca no topo — só aparece no celular (ver sidebar.css).
    //
    // No celular a barra lateral vira gaveta, então o nome "Carro na Rede" só
    // aparecia depois de abrir o menu: no aparelho onde o Yuri mais trabalha,
    // a marca não estava em lugar nenhum. A marca d'água do fundo não resolve
    // isso — medido em 03/set: com os cartões ocupando a largura toda, 0% dela
    // fica descoberta no celular, contra 83% no notebook.
    //
    // Vai na faixa de 3,6rem que o próprio sidebar.css já reserva no topo para
    // o botão de menu, então não empurra conteúdo nenhum.
    //
    // Texto e não a silhueta: o desenho do logo é malha de linhas finas e vira
    // borrão nesse tamanho. O nome lê nítido.
    var marca = document.createElement('div');
    marca.id = 'cnr-marca-topo';
    marca.setAttribute('aria-hidden', 'true'); // decorativo: o nome já está na gaveta
    marca.innerHTML = '<span class="cnr-mt-nome">Carro na Rede</span>'
                    + '<span class="cnr-mt-sub">Repasses</span>';
    document.body.prepend(marca);

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
