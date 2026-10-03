// Mantém o valor de FIPE dos carros do catálogo no mês corrente.
//
// Problema que isto resolve (relatado pelo Yuri em 02/out): a FIPE vira
// todo mês, e o carro parado no estoque ficava com o número do mês em que
// foi captado. O Corolla dele estava com R$ 125.829 de setembro enquanto
// outubro dizia R$ 124.399 — R$ 1.430 de diferença no número com que ele
// precifica o repasse.
//
// ── Por que não dá para "só buscar de novo" ──────────────────────────
// Até 02/out o sistema guardava SÓ o valor. Para atualizar, teria de
// adivinhar o carro pelo nome outra vez — e adivinhar pelo nome já errou
// quatro vezes aqui (combustível ignorado em 02/set, Corolla virando
// Corolla Cross em 01/out, F-250 em 16/set, SW4 em 01/out).
//
// **Atualizar errado é pior que ficar velho.** Com o valor velho, ele sabe
// que é de setembro. Com o valor errado de outubro, parece certo.
//
// Por isso a atualização só acontece para carro que tem `fipe_ref` — os
// três códigos da FIPE gravados no momento em que o valor foi resolvido.
// Aí é consulta exata, sem escolha nenhuma. Carro sem referência fica como
// está, e a tela mostra isso em vez de inventar.

const { fipeGet } = require('./_fipe');

// Só o que está à venda. FIPE de carro vendido não muda decisão nenhuma,
// e gastar consulta com ele é queimar cota (a Parallelum limita por dia).
const STATUS_VIVO = ['disponivel', 'reservado'];

// Teto por chamada: o primeiro carregamento do mês não pode virar espera.
// Com o cache de 6h do `_fipe`, as aberturas seguintes custam quase nada,
// e o que sobrar entra na próxima.
const TETO = 12;

function ehRefValida(ref) {
  return !!(ref && ref.marcaCod && ref.modeloCod && ref.anoCod);
}

// O mês de referência vem da PRÓPRIA RESPOSTA da FIPE, nunca do relógio
// do servidor: a tabela nova sai alguns dias depois da virada, e comparar
// com o calendário faria o sistema achar que todo carro está velho
// durante os primeiros dias de todo mês — e refazer tudo à toa.

/**
 * Atualiza o que estiver velho. Devolve a lista JÁ corrigida, para a tela
 * receber o número certo na mesma resposta — sem segunda viagem e sem
 * mostrar o valor velho por um instante.
 *
 * Nunca derruba a listagem: se a FIPE estiver fora do ar ou sem cota, os
 * carros voltam como estão. Catálogo que não abre é pior que FIPE velha.
 *
 * @param {Function} sb    o `sb` do funil, já amarrado à conta
 * @param {Array}    lista veículos como vieram do banco
 */
async function atualizarFipe(sb, lista) {
  if (!Array.isArray(lista) || !lista.length) return lista;

  const candidatos = lista.filter(v =>
    STATUS_VIVO.includes(v.status) && ehRefValida(v.fipe_ref)
  );
  if (!candidatos.length) return lista;

  // Descobre o mês corrente com UMA consulta — a do primeiro candidato —
  // e usa a resposta dele também como atualização, para não gastar duas.
  const primeiro = candidatos[0];
  let mesAgora, valorPrimeiro;
  try {
    const d = await buscarValor(primeiro.fipe_ref);
    mesAgora = d.MesReferencia;
    valorPrimeiro = d;
  } catch (e) {
    console.error('[fipe-atualiza] não consegui falar com a FIPE:', e.message);
    return lista;
  }

  const velhos = candidatos.filter(v => (v.fipe_ref.mes || '') !== mesAgora).slice(0, TETO);
  if (!velhos.length) return lista;

  const porId = new Map();
  for (const v of velhos) {
    try {
      const d = (v.id === primeiro.id) ? valorPrimeiro : await buscarValor(v.fipe_ref);
      const valor = numeroDe(d.Valor);
      if (valor == null) continue;
      porId.set(v.id, {
        fipe: valor,
        fipe_ref: { ...v.fipe_ref, mes: d.MesReferencia, em: new Date().toISOString() },
      });
    } catch (e) {
      // Um carro que falha não impede os outros. E não se grava nada para
      // ele: ficar com o valor do mês passado é o comportamento correto.
      console.error(`[fipe-atualiza] ${v.id}:`, e.message);
    }
  }
  if (!porId.size) return lista;

  // Grava em paralelo, mas COM await antes de responder: na Vercel o worker
  // é encerrado ao enviar a resposta, e gravação solta seria cancelada em
  // silêncio — está documentado neste projeto desde 19/ago, com dois casos.
  await Promise.all([...porId.entries()].map(([id, campos]) =>
    sb(`veiculos?id=eq.${id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(campos),
    }).catch(e => console.error(`[fipe-atualiza] PATCH ${id}:`, e.message))
  ));

  console.log(`[fipe-atualiza] ${porId.size} carro(s) atualizados para ${mesAgora}`);
  return lista.map(v => (porId.has(v.id) ? { ...v, ...porId.get(v.id) } : v));
}

function buscarValor(ref) {
  return fipeGet(`/marcas/${ref.marcaCod}/modelos/${ref.modeloCod}/anos/${ref.anoCod}`);
}

// "R$ 124.399,00" → 124399
function numeroDe(txt) {
  const n = parseFloat(String(txt || '').replace(/[R$\s.]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

module.exports = { atualizarFipe, ehRefValida, numeroDe, STATUS_VIVO, TETO };
