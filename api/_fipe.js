// ─────────────────────────────────────────────────────────────────
// CNR — acesso à tabela FIPE, fonte única
//
// POR QUE ESTE ARQUIVO EXISTE
// Em 10/set a Parallelum começou a responder:
//
//   HTTP 429  retry-after: 85111
//   {"error":"limite de taxa excedido. ... visite https://fipe.api.br
//             para obter um token"}
//
// 85.111 s é quase 24 h — é cota diária, não pausa curta.
//
// Ao ir olhar, o quadro era o de sempre neste projeto: DOIS arquivos falando
// com a mesma API, um com cache e o outro sem.
//
//   api/fipe-search.js   fipeGet + CACHE (TTL 6h)   ← desde 02/set
//   api/fipe.js          fipeGet, sem cache          ← nunca teve
//
// E é justamente o SEM cache que gasta: para montar a lista de versões de um
// modelo ele pede os anos de cada modelo de nome parecido — 43 chamadas só
// para o Corolla. Uma busca por placa custava ~45 requisições.
//
// O nome começa com `_`, então a Vercel não roteia como função: não consome
// nada do teto de 12 do plano Hobby. Mesmo truque do _auth.js.
// ─────────────────────────────────────────────────────────────────

const FIPE_BASE = 'https://parallelum.com.br/fipe/api/v1/carros';

// ── Cache em memória do processo ──────────────────────────────────
// Vale por instância e some quando a Vercel recicla a função. Serve para o
// uso seguido ficar rápido e barato, não para garantir nada.
//
// Duas idades, de propósito:
//   `expira`    — até aqui a resposta é servida direto, sem rede.
//   `validoAte` — depois de expirar ela ainda fica guardada. Se a rede falhar
//                 ou a FIPE recusar, é melhor devolver um preço de ontem do
//                 que uma tela de erro: a tabela muda uma vez por mês.
const CACHE = new Map();
const TTL_FRESCO = 6 * 60 * 60 * 1000;       // 6h — igual ao que o fipe-search já usava
const TTL_SOCORRO = 7 * 24 * 60 * 60 * 1000; // 7 dias — só para quando a FIPE está fora
const TETO_ENTRADAS = 3000;

function guardar(path, valor) {
  // Teto para uma instância morna não crescer sem fim. As entradas são
  // pequenas, mas "sem limite" é como memória vira problema em produção.
  if (CACHE.size >= TETO_ENTRADAS) {
    const maisAntiga = CACHE.keys().next().value;
    if (maisAntiga !== undefined) CACHE.delete(maisAntiga);
  }
  const agora = Date.now();
  CACHE.set(path, { valor, expira: agora + TTL_FRESCO, validoAte: agora + TTL_SOCORRO });
}

// ── Token ─────────────────────────────────────────────────────────
// Opcional de propósito: sem a variável, tudo segue funcionando pela cota
// anônima — que é dividida com os outros clientes da Vercel, já que o IP é
// compartilhado. Com ela, a cota passa a ser nossa.
function cabecalhos() {
  const token = process.env.FIPE_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Busca um caminho da FIPE, com cache. Devolve o JSON já convertido.
 * Lança quando não há como responder — inclusive sem cópia guardada.
 */
async function fipeGet(path, retries = 3) {
  const guardado = CACHE.get(path);
  if (guardado && guardado.expira > Date.now()) return guardado.valor;

  let ultimoErro;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${FIPE_BASE}${path}`, { headers: cabecalhos() });

      if (res.ok) {
        const dados = await res.json();
        guardar(path, dados);
        return dados;
      }

      // 429 não se resolve esperando 600ms: o retry-after vem em horas.
      // Insistir só queima mais cota. Sai do laço e tenta a cópia guardada.
      if (res.status === 429) {
        ultimoErro = new Error('FIPE recusou: limite de consultas atingido');
        ultimoErro.limite = true;
        break;
      }

      ultimoErro = new Error(`Parallelum HTTP ${res.status}`);
      if (res.status >= 500 && i < retries - 1) {
        await new Promise(r => setTimeout(r, 600 * (i + 1)));
        continue;
      }
      break;
    } catch (e) {
      ultimoErro = e;
      if (i === retries - 1) break;
      await new Promise(r => setTimeout(r, 600 * (i + 1)));
    }
  }

  // Deu errado — mas talvez exista uma cópia velha e ainda utilizável.
  if (guardado && guardado.validoAte > Date.now()) {
    const horas = Math.round((Date.now() - (guardado.expira - TTL_FRESCO)) / 3600000);
    console.log(`fipe: ${ultimoErro.message} — usando cópia guardada de ~${horas}h atrás (${path})`);
    return guardado.valor;
  }

  if (ultimoErro && ultimoErro.limite && !process.env.FIPE_TOKEN) {
    // Diz o que fazer, não só o que falhou.
    console.error('fipe: limite atingido e FIPE_TOKEN não configurado — ' +
                  'a cota anônima é dividida com outros projetos no mesmo IP.');
  }
  throw ultimoErro || new Error('FIPE indisponível');
}

// Números para conferir se o cache está mesmo poupando chamadas.
function fipeCacheInfo() {
  const agora = Date.now();
  let frescas = 0;
  for (const v of CACHE.values()) if (v.expira > agora) frescas++;
  return { entradas: CACHE.size, frescas, comToken: !!process.env.FIPE_TOKEN };
}

module.exports = { FIPE_BASE, fipeGet, fipeCacheInfo };
