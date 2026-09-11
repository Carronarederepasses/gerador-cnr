// ─────────────────────────────────────────────────────────────────
// CNR — mensagem de abordagem, fonte única
//
// POR QUE SAIU DE DENTRO DA EXTENSÃO
//
// O texto vivia em DOIS lugares: `anuncios.html` (compositor no card) e
// `content/olx-chat.js` (preenchimento direto na página da OLX). Mudar o
// texto exigia editar os dois E recarregar a extensão em cada máquina — um
// passo manual que ninguém lembra de fazer, e que falha em silêncio: a
// máquina não recarregada continua mandando o texto velho.
//
// Com a mãe do Yuri entrando, seriam duas máquinas. Na linha de venda do
// Gerador, seria uma por cliente — e, pior, **cada cliente tem a própria
// mensagem**. Texto dentro da extensão significaria um pacote por cliente.
//
// Agora o servidor é a fonte e a extensão pergunta, como já faz com as
// buscas do Radar. A cópia que sobra nos dois lados é **bote salva-vidas**,
// não fonte: só é usada quando o Gerador está fora do ar.
//
// LINHA DE VENDA (decisão do Yuri, 11/set): são duas linhas paralelas — a
// operação dele e o Gerador como produto. As funções são as mesmas; o que
// muda por cliente é o conteúdo. Esta mensagem é a primeira peça desse tipo,
// e por isso nasce aqui, no servidor: quando houver tenant, este arquivo
// deixa de devolver uma constante e passa a ler a mensagem daquele cliente,
// sem tocar na extensão.
//
// O nome começa com `_`: a Vercel não roteia, então não consome nada do teto
// de 12 funções. Quem expõe é `utils.js?type=abordagem`.
// ─────────────────────────────────────────────────────────────────

// ⚠️ A PRIMEIRA FRASE NÃO PODE MUDAR.
// 'Olá! Tudo bem? Meu nome é Yuri' é a ÂNCORA que olx-chat-monitor.js usa
// para reconhecer a mensagem do operador dentro do chat e separá-la do que o
// vendedor escreveu. Mudar aqui sem mudar lá quebra o espelho das conversas.
//
// O texto é do Yuri, escrito por ele em 09/set — não é sugestão aceita. Ver
// o checkpoint daquele dia para o porquê de cada corte.
const MSG_ABORDAGEM =
  'Olá! Tudo bem? Meu nome é Yuri, sou de Garopaba e vi seu anúncio. ' +
  'Trabalho com carros aqui na região e tenho um Instagram chamado Carro na Rede ' +
  '(@carronarederepasses), onde conectamos vendedores a possíveis compradores. ' +
  'Acredito que consigo encontrar um comprador para o seu. ' +
  'Ele ainda está disponível?';

// A âncora é derivada do próprio texto, e não escrita de novo: duas
// declarações da mesma coisa é como elas divergem.
const ANCORA = MSG_ABORDAGEM.slice(0, 'Olá! Tudo bem? Meu nome é Yuri'.length);

module.exports = { MSG_ABORDAGEM, ANCORA };
