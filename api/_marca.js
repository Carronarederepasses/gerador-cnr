// Marca do site — nome, Instagram, e-mail, logo e telas que não se aplicam.
//
// Existe porque o mesmo repositório publica DOIS sites (gerador-cnr e
// cnr-piloto) e cada push vai para os dois. Marca escrita no código sairia
// igual nos dois: o cliente do lojista piloto receberia anúncio com link do
// Instagram da Carro na Rede. Então a marca é variável de ambiente, lida aqui
// e em nenhum outro lugar do servidor.
//
// Sem variável nenhuma, tudo é Carro na Rede — o site do Yuri não muda nada.
//
// Prefixo `_`: a Vercel não roteia, não consome função (teto de 12).

const PADRAO = {
  nome:      'Carro na Rede',
  subtitulo: 'Repasses',
  instagram: 'carronarederepasses',
  email:     'carronarederepasses@gmail.com',
  logo:      '',        // vazio = arte da Carro na Rede (assets/logo.svg)
  esconder:  [],        // hrefs sem barra nem .html: 'radar', 'anuncios'...
};

function limpo(v) { return typeof v === 'string' ? v.trim() : ''; }

function marca(env = process.env) {
  const nome = limpo(env.MARCA_NOME);
  // Só o nome muda tudo: quem configurou um nome próprio não herda o
  // subtítulo, o Instagram e o e-mail da Carro na Rede por esquecimento.
  // Herdar seria pior que ficar vazio — é o link errado indo para o cliente.
  const propria = !!nome;
  const vazioOu = (v, def) => limpo(v) || (propria ? '' : def);

  return {
    nome:      nome || PADRAO.nome,
    subtitulo: vazioOu(env.MARCA_SUBTITULO, PADRAO.subtitulo),
    instagram: vazioOu(env.MARCA_INSTAGRAM, PADRAO.instagram).replace(/^@+/, ''),
    email:     vazioOu(env.MARCA_EMAIL, PADRAO.email),
    logo:      limpo(env.MARCA_LOGO),
    esconder:  limpo(env.MARCA_ESCONDER).split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
    propria,
  };
}

/**
 * A marca da LOJA, a partir da linha de `contas`.
 *
 * A fase 1 fez a conta vir de quem entrou; esta função faz a marca vir da
 * conta. Enquanto ela não existir, o lojista precisa de um site próprio
 * só para o logo dele aparecer — os dados a sessão já separava.
 *
 * `propria` é true para qualquer loja que não seja a Carro na Rede: é o
 * que faz o subtítulo virar slogan (e sair do título) e impede herdar o
 * Instagram e o e-mail da CNR por esquecimento. Mesma regra de antes, só
 * que decidida pelo dono em vez de pela presença de uma variável.
 *
 * @param {object} conta linha de `contas`
 * @param {string} cnrId id da conta da Carro na Rede
 */
function marcaDaConta(conta, cnrId) {
  const limpa = (v) => (typeof v === 'string' ? v.trim() : '');
  const propria = String(conta.id) !== String(cnrId);
  const nome = limpa(conta.nome) || PADRAO.nome;
  const vazioOu = (v, def) => limpa(v) || (propria ? '' : def);

  return {
    nome,
    subtitulo: vazioOu(conta.subtitulo, PADRAO.subtitulo),
    instagram: vazioOu(conta.instagram, PADRAO.instagram).replace(/^@+/, ''),
    email:     vazioOu(conta.email,     PADRAO.email),
    logo:      limpa(conta.logo),
    // Mesmo formato do MARCA_ESCONDER, e cortado pelo mesmo código: duas
    // regras de leitura para a mesma coisa é como elas divergem.
    esconder:  limpa(conta.esconder).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
    propria,
  };
}

// Manifesto do app instalado na tela inicial. Arquivo estático sairia com
// nome e ícone da Carro na Rede nos dois sites — e é a primeira coisa que o
// lojista vê no celular. Sem marca própria, devolve o mesmo do arquivo.
function manifesto(env = process.env) {
  const m = marca(env);
  const icone = limpo(env.MARCA_ICONE) || m.logo;
  const icones = (m.propria && icone)
    ? [{ src: icone, sizes: '512x512', purpose: 'any' }]
    : [
        { src: '/assets/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/assets/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ];
  return {
    name:        m.propria ? m.nome : 'Carro na Rede — Gerador',
    short_name:  m.nome,
    description: m.propria ? 'Gerador de anúncios e estoque — ' + m.nome
                           : 'Gerador de anúncios e catálogo de oportunidades — Carro na Rede Repasses',
    start_url: '/home.html', scope: '/', display: 'standalone', orientation: 'portrait',
    lang: 'pt-BR', background_color: '#0a0a0a', theme_color: '#0a0a0a',
    icons: icones,
  };
}

module.exports = { marca, marcaDaConta, manifesto, PADRAO };
