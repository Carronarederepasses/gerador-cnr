// O funil — toda conversa com o banco passa por aqui, com o dono junto.
//
// ── Por que este arquivo existe ──────────────────────────────────────
// Desde 23/set toda linha tem `conta_id` (fase 0). Mas coluna sozinha não
// isola nada: quem isola é o filtro, e filtro espalhado por doze arquivos é
// filtro que um dia falta. No dia em que faltar, um lojista vê o estoque do
// outro — e ninguém percebe, porque a tela não dá erro, ela mostra dados a
// mais.
//
// A RLS do Postgres também não salva aqui: as funções de `api/` entram com
// a chave de serviço, que passa por cima dela de propósito. A RLS fecha a
// porta de quem chega com a chave pública; a porta de uma conta para a
// outra é esta.
//
// Então o desenho é: não existe caminho para o banco sem dono. Pedir sem
// dono não devolve tudo — lança.
//
// Prefixo `_`: a Vercel não roteia, não consome função (teto de 12).

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Tabelas que pertencem a uma loja. `contas`, `usuarios` e `conta_membros`
// ficam de fora: elas são o cadastro das lojas, não dado de loja.
const DE_CONTA = new Set([
  'veiculos', 'vendas', 'compradores', 'negociacoes', 'anuncios',
  'buscas', 'ideias', 'eventos', 'historico', 'observacoes',
  'olx_mensagens', 'agenda',
]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ehDeConta(path) {
  const tabela = String(path).split(/[?/]/)[0];
  return DE_CONTA.has(tabela);
}

/**
 * Devolve o `sb()` daquela conta. Cada função de api/ chama isto uma vez,
 * no começo do pedido, e usa o resultado como usava o `sb()` de antes.
 *
 * @param {string} contaId  uuid da loja dona do pedido (ver _conta.js)
 */
function db(contaId) {
  if (!UUID.test(String(contaId || ''))) {
    // Erro alto e cedo, não silêncio. O caminho sem dono não pode existir.
    throw new Error('db(): pedido sem conta — recuse em vez de devolver tudo');
  }

  return function sb(path, opts = {}) {
    let alvo = path;

    if (ehDeConta(path)) {
      const metodo = (opts.method || 'GET').toUpperCase();

      // Ler, alterar e apagar: o filtro entra na URL. PostgREST combina
      // filtros com E, então `conta_id=eq.X` estreita o que já vinha —
      // nunca alarga.
      if (metodo !== 'POST') {
        alvo += (alvo.includes('?') ? '&' : '?') + 'conta_id=eq.' + contaId;
      }

      // Gravar: o dono entra no corpo. Sobrescreve o que vier de fora de
      // propósito — o navegador não escolhe de quem é a linha.
      if (metodo === 'POST' && typeof opts.body === 'string') {
        try {
          const corpo = JSON.parse(opts.body);
          const carimbar = (o) => (o && typeof o === 'object' ? { ...o, conta_id: contaId } : o);
          opts = {
            ...opts,
            body: JSON.stringify(Array.isArray(corpo) ? corpo.map(carimbar) : carimbar(corpo)),
          };
        } catch {
          // Corpo que não é JSON não é linha nossa; segue como veio.
        }
      }
    }

    return fetch(`${SUPABASE_URL}/rest/v1/${alvo}`, {
      ...opts,
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        ...(opts.prefer ? { Prefer: opts.prefer } : {}),
        ...(opts.headers || {}),
      },
    });
  };
}

module.exports = { db, DE_CONTA, ehDeConta };
