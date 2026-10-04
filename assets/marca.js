// Marca do site, do lado da tela. A fonte é api/_marca.js (variáveis de
// ambiente da Vercel); aqui só se lê e se aplica.
//
// Por que não está escrita no HTML: o mesmo código publica o site do Yuri e o
// do lojista piloto. Ver o comentário de api/_marca.js.
//
// Carregado SEM defer, logo depois de auth.js: story, anúncio e contrato leem
// window.cnrMarca na hora do clique, e ele precisa já existir. O valor sai da
// última resposta guardada (ou do padrão) e é conferido com o servidor em
// seguida — se mudar, avisa com o evento 'cnr-marca'.
(function () {
  var PADRAO = {
    nome: 'Carro na Rede', subtitulo: 'Repasses',
    instagram: 'carronarederepasses', email: 'carronarederepasses@gmail.com',
    logo: '', icone: '', esconder: [], propria: false,
    // repassador | lojista | null. Nulo = ainda não escolheu — e isso é
    // diferente de ser repassador. Ver api/_marca.js.
    tipo: null,
    // É a loja dona desta instalação? Só ela vê o "Ver como" da barra.
    casa: false,
  };
  var GAVETA = 'cnr_marca';
  // Troca de VISUALIZAÇÃO, não de conta. Mora só neste aparelho: o banco
  // não muda, e a conta da mãe do Yuri não é afetada. Pedido dele em
  // 04/out: "sempre vamos mexer em algo e eu vou querer ver como está".
  var VER_COMO = 'cnr_ver_como';
  function verComo() {
    try { return localStorage.getItem(VER_COMO) || ''; } catch (e) { return ''; }
  }

  function montar(dados) {
    var m = {};
    for (var k in PADRAO) m[k] = (dados && dados[k] !== undefined) ? dados[k] : PADRAO[k];
    if (!Array.isArray(m.esconder)) m.esconder = [];
    // Nome por extenso (título, contrato, PDF). Na Carro na Rede o
    // "Repasses" faz parte do nome; em marca própria o subtítulo é slogan
    // e não entra — "Nome Fantasia: BHM AUTOS COMPRA, VENDA E..." no contrato.
    m.completo = (!m.propria && m.subtitulo) ? m.nome + ' ' + m.subtitulo : m.nome;
    m.arroba   = m.instagram ? '@' + m.instagram : '';
    m.linkInstagram = m.instagram ? 'https://instagram.com/' + m.instagram : '';
    // Tela escondida neste site? `href` pode vir como '/radar.html' ou 'radar'.
    m.esconde = function (href) {
      var nome = String(href || '').replace(/^\//, '').replace(/\.html.*$/, '').toLowerCase();
      return m.esconder.indexOf(nome) !== -1;
    };
    // Preparação é coisa de quem tem pátio. Repassador não tem: o carro
    // nunca entra no estoque dele. Explícito, não `!== 'repassador'` —
    // senão quem ainda não escolheu passaria a ver a tela de lojista.
    // O "Ver como" vence o tipo real — mas SÓ para a casa. Numa loja
    // cliente, uma chave esquecida no armazenamento não pode mudar o que
    // ela vê. E `tipoReal` fica guardado para a barra poder dizer a
    // verdade e para a volta ser exata.
    m.tipoReal = m.tipo;
    m.vendoComo = '';
    var vc = verComo();
    if (m.casa && (vc === 'lojista' || vc === 'repassador')) {
      m.vendoComo = vc;
      m.tipo = vc;
    }
    m.eLojista = (m.tipo === 'lojista');
    return m;
  }

  var guardada = null;
  try { guardada = JSON.parse(localStorage.getItem(GAVETA) || 'null'); } catch (e) {}
  window.cnrMarca = montar(guardada);

  // O nome da Carro na Rede escrito no título e em [data-marca] vira o do site.
  function aplicar() {
    var m = window.cnrMarca;
    if (m.propria) {
      document.title = document.title.replace(/Carro na Rede( Repasses)?/g, m.completo);
    }
    var els = document.querySelectorAll('[data-marca]');
    for (var i = 0; i < els.length; i++) {
      var campo = els[i].getAttribute('data-marca') || 'completo';
      els[i].textContent = m[campo] || '';
    }
    // Atalhos para telas que este site não usa (ex.: Radar sem extensão).
    var links = document.querySelectorAll('a[href]');
    for (var j = 0; j < links.length; j++) {
      if (m.esconde(links[j].getAttribute('href'))) links[j].style.display = 'none';
    }
    // Marca d'água: a arte da Carro na Rede só no site dela. Com logo
    // próprio, entra o logo; sem logo, nada — melhor vazio que a marca de
    // outra loja atrás da tela do cliente.
    var raiz = document.documentElement;
    raiz.classList.toggle('marca-propria', !!m.propria);
    if (m.propria && m.logo) raiz.style.setProperty('--marca-logo', 'url("' + m.logo.replace(/"/g, '') + '")');
    else raiz.style.removeProperty('--marca-logo');
    // Ícone da aba e o do iPhone na tela inicial (o iPhone ignora o
    // manifesto e usa o apple-touch-icon).
    // Prefere o ícone quadrado, que existe justamente porque o logo
    // retangular vira mancha no quadrado do telefone. Sem ele, cai no logo.
    var arte = m.icone || m.logo;
    if (m.propria && arte) {
      var icones = document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]');
      for (var k = 0; k < icones.length; k++) { icones[k].href = arte; icones[k].removeAttribute('type'); }
    }
  }

  // Classe já no <html> antes de pintar, para a marca d'água da Carro na
  // Rede não piscar no site piloto.
  if (window.cnrMarca.propria) document.documentElement.classList.add('marca-propria');

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aplicar);
  else aplicar();

  fetch('/api/utils?type=marca', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (dados) {
      if (!dados || typeof dados.nome !== 'string') return;
      var antes = JSON.stringify(guardada);
      try { localStorage.setItem(GAVETA, JSON.stringify(dados)); } catch (e) {}
      if (JSON.stringify(dados) === antes) return;
      window.cnrMarca = montar(dados);
      if (document.readyState === 'loading') return; // aplicar() ainda vai rodar
      aplicar();
      document.dispatchEvent(new CustomEvent('cnr-marca'));
    })
    .catch(function () { /* sem rede: fica a última marca conhecida */ });
})();
