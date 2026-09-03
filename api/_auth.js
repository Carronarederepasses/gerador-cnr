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
  const enviada = req.headers['x-cnr-key'];
  if (!enviada) return false;
  if (igual(enviada, CNR_KEY)) return true;
  return LEGADAS.some((k) => igual(enviada, k));
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

module.exports = { exigirChave, autorizado, portaoLigado: () => Boolean(CNR_KEY) };
