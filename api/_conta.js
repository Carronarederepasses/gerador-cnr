// De quem é este pedido.
//
// Hoje a resposta é simples: cada site serve UMA loja, então a conta vem da
// variável de ambiente — a mesma ideia da marca (`_marca.js`). O site do
// Yuri responde pela conta dele; o do piloto, pela do lojista.
//
// Na fase 1 isto muda de lugar, não de forma: a chave por aparelho vira
// identidade por telefone, e a conta passa a sair do usuário que entrou
// (`conta_membros`). Quem chama esta função não precisa saber a diferença —
// é por isso que ela existe separada desde já.
//
// Prefixo `_`: não é rota, não consome função.

// A conta da Carro na Rede, criada em 23/set por `supabase/fase0-contas.sql`.
// Fixa no código de propósito: é o mesmo id que ficou como DEFAULT das doze
// tabelas, e os dois têm de continuar iguais.
const CNR = '00000000-0000-4000-8000-000000000001';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * @param {object} [req] pedido — hoje não usado; na fase 1, é de onde sai o
 *                       usuário e, dele, a conta.
 * @returns {string} uuid da loja
 */
function contaDoPedido(req, env = process.env) {
  const daVariavel = String(env.CNR_CONTA_ID || '').trim();

  if (daVariavel) {
    if (!UUID.test(daVariavel)) {
      // Preferir parar a preferir adivinhar: conta errada é dado de uma loja
      // aparecendo na tela de outra.
      throw new Error('CNR_CONTA_ID configurada com valor que não é uuid');
    }
    return daVariavel;
  }

  // Sem variável, é o site da Carro na Rede. Mesmo critério do `_marca.js`:
  // ausência de configuração significa "o site original", nunca "sem dono".
  return CNR;
}

module.exports = { contaDoPedido, CNR };
