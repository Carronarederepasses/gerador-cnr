// Aviso no celular (Web Push) — sem biblioteca nenhuma.
//
// ══ COMO ISTO FUNCIONA, E POR QUE ASSIM ════════════════════════════
//
// Mandar aviso pela web tem duas partes:
//
//   1. **Provar que o aviso é nosso** — um bilhete assinado (VAPID) com
//      a chave privada que mora só na Vercel. Isso o Node faz sozinho,
//      com `crypto`: é assinatura ES256.
//   2. **Criptografar o texto dentro do aviso** (aes128gcm) — isso é
//      trabalhoso e é onde se erra feio.
//
// Este projeto **não tem nenhuma biblioteca instalada** (não há
// package.json nem node_modules, de propósito, desde sempre). Escrever a
// parte 2 à mão seria a maior fonte de bug possível para o ganho que dá.
//
// Então o aviso vai **vazio**: o servidor só cutuca o aparelho. Quem
// monta o texto é o `sw.js`, que pergunta ao Gerador o que há de novo.
// Resultado igual para quem recebe, sem a parte perigosa.
//
// Prefixo `_`: não é rota, não consome função (teto de 12 na Hobby).

const crypto = require('crypto');

// A pública fica no código de propósito: ela vai para o navegador de
// qualquer jeito, é o que identifica o remetente. A privada só na Vercel.
const VAPID_PUBLICA = 'BBC7R1zlyfXM0Rd5QUsxrWAO0NTvLL8kCewulHJVEMRm1uKuL3OvSWzXKe3CZ-CW7KpzGqbIUKn5vgRjfYcn_YM';
const VAPID_PRIVADA = process.env.VAPID_PRIVADA || '';
const VAPID_CONTATO = process.env.VAPID_CONTATO || 'mailto:carronarederepasses@gmail.com';

const b64u = (b) => Buffer.from(b).toString('base64url');

/**
 * O bilhete assinado que prova que o aviso é nosso.
 *
 * `aud` é a ORIGEM do endereço de quem recebe (o servidor da Google, da
 * Apple…), não o endereço inteiro — mandar o endereço completo aqui faz
 * o serviço recusar com 401, e o erro não diz o motivo.
 */
function bilhete(endpoint) {
  const aud = new URL(endpoint).origin;
  const cab = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const corpo = b64u(JSON.stringify({
    aud,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,   // 12h: o serviço recusa acima de 24
    sub: VAPID_CONTATO,
  }));

  // A chave privada foi guardada em PKCS8 cru; o Node precisa dela em DER.
  const chave = crypto.createPrivateKey({
    key: Buffer.from(VAPID_PRIVADA, 'base64url'),
    format: 'der', type: 'pkcs8',
  });
  // `ieee-p1363` e não DER: o JWT exige a assinatura em 64 bytes crus.
  // Com o padrão do Node (DER), o serviço recusa sem explicar.
  const assinatura = crypto.sign('sha256', Buffer.from(`${cab}.${corpo}`), {
    key: chave, dsaEncoding: 'ieee-p1363',
  });
  return `${cab}.${corpo}.${b64u(assinatura)}`;
}

/**
 * Cutuca UM aparelho. Devolve o que aconteceu, para quem chama decidir.
 *
 * 404 e 410 querem dizer "este endereço morreu" — o aparelho desinstalou
 * o app ou revogou a permissão. É normal, não é erro: a linha deve sair
 * do banco, senão fica cutucando um endereço morto para sempre.
 */
async function cutucar(endpoint) {
  if (!VAPID_PRIVADA) return { ok: false, motivo: 'sem_chave' };
  try {
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: {
        TTL: '86400',                      // guarda por 1 dia se o aparelho estiver desligado
        Authorization: `vapid t=${bilhete(endpoint)}, k=${VAPID_PUBLICA}`,
        'Content-Length': '0',
      },
    });
    if (r.status === 404 || r.status === 410) return { ok: false, morto: true };
    if (!r.ok) return { ok: false, motivo: `HTTP ${r.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, motivo: e.message };
  }
}

/**
 * Avisa todo mundo de uma loja.
 *
 * `rsb` vem de fora (de `_rede.js`) para não abrir um segundo caminho
 * para o banco — a guarda `scripts/checa-funil.js` recusaria, e com
 * razão.
 *
 * NUNCA lança: aviso é acessório. Se o envio falhar, a oferta e a
 * mensagem já aconteceram e o sistema não pode cair por causa disso.
 */
async function avisarConta(rsb, contaId, exceto) {
  if (!VAPID_PRIVADA) return { enviados: 0, desligado: true };
  try {
    const assinaturas = await rsb(`push_assinaturas?conta_id=eq.${contaId}&select=id,endpoint,usuario_id`);
    let enviados = 0;
    for (const a of assinaturas) {
      if (exceto && a.usuario_id === exceto) continue;   // não avisa quem acabou de agir
      const r = await cutucar(a.endpoint);
      if (r.ok) enviados++;
      else if (r.morto) {
        await rsb(`push_assinaturas?id=eq.${a.id}`, { method: 'DELETE' }).catch(() => {});
      } else if (r.motivo) {
        await rsb(`push_assinaturas?id=eq.${a.id}`, {
          method: 'PATCH', body: JSON.stringify({ ultimo_erro: String(r.motivo).slice(0, 120) }),
        }).catch(() => {});
      }
    }
    return { enviados };
  } catch (e) {
    console.error('[aviso] não consegui avisar:', e.message);
    return { enviados: 0, erro: e.message };
  }
}

module.exports = { avisarConta, cutucar, VAPID_PUBLICA, ligado: () => Boolean(VAPID_PRIVADA) };
