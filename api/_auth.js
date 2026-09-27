// ─────────────────────────────────────────────────────────────────
// Portão único da API — CNR
//
// Por que existe
// --------------
// Até 03/set/2026 qualquer pessoa com a URL baixava, sem pedir nada:
// placa, renavam e chassi dos carros, valores de compra e lucro, e o
// cadastro dos compradores com telefone, CPF e dados bancários. Os
// dados dos compradores são de terceiros — não eram do Yuri para
// deixar abertos.
//
// Cada endpoint tinha seu próprio guarda, com regra diferente:
//   vendas.js      → protegia só POST/PATCH/DELETE
//   catalogo.js    → protegia tudo, se CATALOGO_KEY existisse
//   fetch-anuncio  → protegia alguns modos, com RADAR_KEY
//   compradores.js → não protegia nada, nem escrita
// Quatro regras é o mesmo que nenhuma: sobra sempre um caminho aberto.
//
// O arquivo começa com "_" de propósito: a Vercel não roteia esses,
// então isto NÃO consome uma das 12 funções do plano Hobby.
//
// Como é usado
// ------------
//   const { exigirChave } = require('./_auth');
//   if (exigirChave(req, res)) return;   // já respondeu 401
//
// Ligar e desligar
// ----------------
// Sem a variável CNR_KEY definida na Vercel, o portão fica ABERTO e
// nada muda. Isso é deliberado: permite subir o código, liberar os
// aparelhos e só então ligar o portão — sem existir um minuto em que o
// operador esteja trancado do lado de fora. Já aconteceu (01/set: a
// venda do Renegade não salvava no celular por causa de um 401 mudo).
// ─────────────────────────────────────────────────────────────────

const crypto = require('crypto');

const CNR_KEY = process.env.CNR_KEY;

// Chaves antigas continuam valendo. Sem isto, a extensão instalada nas
// máquinas — que guarda `radar_key` no storage local — pararia de captar
// no instante em que o portão ligasse, e o Yuri descobriria pelo silêncio.
const LEGADAS = [
  process.env.RADAR_KEY,
  process.env.VENDAS_KEY,
  process.env.CATALOGO_KEY,
].filter(Boolean);

// ── Uma chave por pessoa ──────────────────────────────────────────
// A partir de setembro/2026 são duas pessoas abordando anúncios. Chave
// compartilhada tem dois defeitos: cortar o acesso de uma derruba as duas,
// e o sistema não tem como saber quem fez o quê.
//
// Como acrescentar alguém, sem tocar em código:
//   Vercel → Environment Variables → CNR_KEY_2 = "Mãe:<chave>"
//   (CNR_KEY_2 até CNR_KEY_9; o nome antes dos dois-pontos é o que aparece
//    no card. A chave é base64url e nunca contém ":", então a divisão é no
//    PRIMEIRO dois-pontos e o resto é chave.)
//
// Apagar a variável corta só aquela pessoa. A CNR_KEY principal segue de pé.
const OPERADORES = [];
if (CNR_KEY) OPERADORES.push({ nome: process.env.CNR_OPERADOR || 'Yuri', chave: CNR_KEY });
for (let i = 2; i <= 9; i++) {
  const bruto = process.env[`CNR_KEY_${i}`];
  if (!bruto) continue;
  const corte = bruto.indexOf(':');
  // Sem ":" a variável é só uma chave — vale, mas fica sem nome. Aceitar em
  // vez de ignorar: chave que não abre a porta é o pior dos dois erros.
  const nome  = corte > 0 ? bruto.slice(0, corte).trim() : `operador ${i}`;
  const chave = corte > 0 ? bruto.slice(corte + 1).trim() : bruto.trim();
  if (chave) OPERADORES.push({ nome, chave });
}

// Comparação de tempo constante. Pela rede a diferença é indetectável na
// prática, mas custa quatro linhas fazer certo.
function igual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function autorizado(req) {
  if (!CNR_KEY) return true; // portão desligado
  // Sessão já conferida neste pedido (ver `comSessao` abaixo) também abre.
  if (req.cnrSessao) return true;
  const enviada = req.headers['x-cnr-key'];
  if (!enviada) return false;
  if (OPERADORES.some((o) => igual(enviada, o.chave))) return true;
  return LEGADAS.some((k) => igual(enviada, k));
}

// ── Entrar por telefone, sem derrubar quem entra por chave ────────
// A fase 1 troca a chave por aparelho por sessão de pessoa. A troca NÃO
// pode ser de uma vez: Yuri e mãe usam isto todo dia, e em 03/set eu
// fechei a API e quebrei o backup das vendas por não perguntar quem mais
// usava. Então aqui os dois valem ao mesmo tempo.
//
// `comSessao` lê a sessão (se houver) e a pendura no pedido. Chamar isto
// é opcional: endpoint que não chamar continua funcionando exatamente
// como hoje, pela chave.
//
// Carregado por dentro da função de propósito: assim um endpoint que
// nunca usa sessão não paga o custo de abrir o arquivo.
async function comSessao(req) {
  if (req.cnrSessao !== undefined) return req.cnrSessao;   // já resolvido
  if (!req.headers['x-cnr-sessao']) { req.cnrSessao = null; return null; }
  try {
    const { sessaoDoPedido } = require('./_sessao');
    req.cnrSessao = await sessaoDoPedido(req);
  } catch (e) {
    // Banco fora, tabela ainda não criada, token estragado: cai para o
    // caminho da chave em vez de derrubar o pedido. Falha de login novo
    // não pode parar a operação que já funciona.
    console.error('[auth] sessão não pôde ser lida:', e.message);
    req.cnrSessao = null;
  }
  return req.cnrSessao;
}

// Quem está mandando, pelo que a chave diz. Devolve null quando não dá para
// afirmar — portão desligado, chave legada (a extensão e o script da planilha
// usam essas, e não são pessoa nenhuma) ou chave desconhecida.
//
// Devolver null em vez de chutar "Yuri" é de propósito: um registro que diz
// quem foi está certo ou está vazio, nunca inventado.
function operadorDe(req) {
  // Sessão sabe o nome pelo cadastro, não por prefixo de variável de
  // ambiente — é o que acaba com o "operador 2" de 08/set.
  if (req.cnrSessao && req.cnrSessao.nome) return req.cnrSessao.nome;
  if (!CNR_KEY) return null;
  const enviada = req.headers['x-cnr-key'];
  if (!enviada) return null;
  const achado = OPERADORES.find((o) => igual(enviada, o.chave));
  return achado ? achado.nome : null;
}

// Devolve true quando JÁ respondeu — quem chama deve dar `return`.
function exigirChave(req, res) {
  if (autorizado(req)) return false;
  res.status(401).json({
    error: 'Aparelho não liberado.',
    // A tela lê este campo para mostrar a instrução certa em vez de um
    // erro genérico. Falha muda foi o defeito que mais custou aqui.
    codigo: 'sem_chave',
  });
  return true;
}

module.exports = {
  exigirChave,
  autorizado,
  operadorDe,
  comSessao,
  portaoLigado: () => Boolean(CNR_KEY),
};
