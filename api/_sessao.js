// Entrar por telefone — o motor. Desenho completo em `FASE1-ENTRAR.md`.
//
// ── Por que este arquivo fala com o banco por fora do funil ─────────
// `api/_db.js` exige o dono em toda consulta. Estas duas tabelas não têm
// dono por natureza: `codigos` é de quem ainda não entrou, e `sessoes` é
// justamente o que DESCOBRE a conta. Filtrar por conta antes de saber a
// conta é impossível.
//
// Por isso `_sessao.js` está na lista de liberados do
// `scripts/checa-funil.js` — exceção declarada e visível, não regra
// furada em silêncio. Nenhuma outra tabela pode ser tocada daqui.
//
// Prefixo `_`: não é rota, não consome função (teto de 12 na Hobby).

const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Tempero do hash. Sem ele o hash de 6 dígitos é quebrável em segundos se
// o banco vazar — só 1 milhão de possibilidades. Com ele, não adianta ter
// o banco sem ter a variável.
const PIMENTA = process.env.SESSAO_PIMENTA || '';

const VIDA_CODIGO_MIN  = 10;       // o código morre em 10 minutos
const VIDA_SESSAO_DIAS = 180;      // prazo longo de propósito — ver §"sessão" abaixo
const TENTATIVAS_MAX   = 5;
const ESPERA_ENVIO_SEG = 60;       // 1 envio por minuto, por telefone
const ENVIOS_POR_HORA  = 5;

// ── Banco, direto e só nestas duas tabelas ────────────────────────
async function sb(caminho, opcoes = {}) {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Supabase não configurado.');
  const tabela = String(caminho).split(/[?/]/)[0];
  const PERMITIDAS = ['codigos', 'sessoes', 'usuarios', 'conta_membros', 'contas'];
  if (!PERMITIDAS.includes(tabela)) {
    // Trava de segurança contra mim mesmo: este arquivo existe fora do
    // funil, então ele não pode virar a porta dos fundos para o resto.
    throw new Error(`_sessao.js não fala com a tabela ${tabela}`);
  }
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${caminho}`, {
    ...opcoes,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(opcoes.prefer ? { Prefer: opcoes.prefer } : {}),
      ...(opcoes.headers || {}),
    },
  });
  const corpo = await r.text();
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${corpo}`);
  // INSERT e PATCH respondem 201/204 com corpo VAZIO quando não se pede
  // `return=representation`. Ler JSON direto estoura com "Unexpected end
  // of JSON input" — e o erro aparece como falha de login, longe da causa.
  return corpo ? JSON.parse(corpo) : null;
}

const hash = (v) => crypto.createHash('sha256').update(PIMENTA + ':' + v).digest('hex');

/**
 * Telefone vira só dígitos, no padrão internacional sem o "+".
 * "(48) 99999-0000" → "5548999990000"
 * Guardar de um jeito só evita o caso em que a pessoa cadastra com DDD e
 * entra sem, e o sistema diz que ela não existe.
 */
function normalizar(telefone) {
  let d = String(telefone || '').replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) d = '55' + d;   // sem código do país
  return d.length >= 12 && d.length <= 13 ? d : '';
}

// ── Envio do SMS ──────────────────────────────────────────────────
// Sem as variáveis do Twilio, o código vai para o registro do servidor em
// vez de ir por mensagem. É deliberado: dá para construir e provar o
// mecanismo inteiro sem abrir conta em lugar nenhum nem gastar um real.
// Em produção com as variáveis presentes, manda de verdade.
async function enviarSMS(telefone, codigo) {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const de    = process.env.TWILIO_FROM;

  if (!sid || !token || !de) {
    console.log(`[entrar] SMS desligado — código de ${telefone}: ${codigo}`);
    return { enviado: false, simulado: true };
  }

  const corpo = new URLSearchParams({
    To: '+' + telefone,
    From: de,
    Body: `${codigo} é o seu código de acesso. Vale por ${VIDA_CODIGO_MIN} minutos.`,
  });
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: corpo,
  });
  if (!r.ok) {
    // Falha de envio não pode virar 500 na cara de quem está entrando, nem
    // sumir calada: fica no registro e a tela diz para tentar de novo.
    console.error('[entrar] Twilio recusou:', r.status, await r.text());
    return { enviado: false, simulado: false };
  }
  return { enviado: true, simulado: false };
}

// ── Passo 1 — pedir o código ──────────────────────────────────────
/**
 * Responde SEMPRE igual, exista ou não o telefone. Resposta diferente
 * para quem existe transforma esta rota numa lista de clientes: basta
 * testar números até um responder diferente.
 */
async function pedirCodigo(telefone, ip) {
  const tel = normalizar(telefone);
  if (!tel) return { ok: false, erro: 'telefone_invalido' };

  // Freio: protege o bolso (cada SMS custa) e a pessoa (não vira alvo).
  const desde = new Date(Date.now() - 3600e3).toISOString();
  const recentes = await sb(
    `codigos?telefone=eq.${tel}&criado_em=gte.${desde}&select=criado_em&order=criado_em.desc`
  );
  if (recentes.length >= ENVIOS_POR_HORA) return { ok: true, freio: true };
  if (recentes.length && (Date.now() - new Date(recentes[0].criado_em)) < ESPERA_ENVIO_SEG * 1000) {
    return { ok: true, freio: true };
  }

  const existe = await sb(`usuarios?telefone=eq.${tel}&select=id&limit=1`);
  if (!existe.length) {
    // Não cadastrado: nada é gravado, nada é enviado, e a resposta é a
    // mesma de quem existe. O passo 2 vai recusar por "código inválido".
    return { ok: true };
  }

  const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await sb('codigos', {
    method: 'POST',
    body: JSON.stringify({
      telefone:  tel,
      hash:      hash(tel + '|' + codigo),
      expira_em: new Date(Date.now() + VIDA_CODIGO_MIN * 60e3).toISOString(),
      ip:        ip || null,
    }),
  });

  const envio = await enviarSMS(tel, codigo);
  return { ok: true, simulado: envio.simulado };
}

// ── Passo 2 — conferir e criar a sessão ───────────────────────────
async function conferirCodigo(telefone, codigo, { ip, aparelho } = {}) {
  const tel = normalizar(telefone);
  const cod = String(codigo || '').replace(/\D/g, '');
  if (!tel || cod.length !== 6) return { ok: false, erro: 'codigo_invalido' };

  const agora = new Date().toISOString();
  const linhas = await sb(
    `codigos?telefone=eq.${tel}&usado_em=is.null&expira_em=gte.${agora}` +
    `&select=id,hash,tentativas&order=criado_em.desc&limit=1`
  );
  if (!linhas.length) return { ok: false, erro: 'codigo_invalido' };

  const linha = linhas[0];
  if (linha.tentativas >= TENTATIVAS_MAX) return { ok: false, erro: 'codigo_invalido' };

  if (linha.hash !== hash(tel + '|' + cod)) {
    // Conta a tentativa ANTES de responder. Se o contador subisse só
    // depois, uma rajada de pedidos paralelos passaria pelo limite.
    await sb(`codigos?id=eq.${linha.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ tentativas: linha.tentativas + 1 }),
    });
    return { ok: false, erro: 'codigo_invalido' };
  }

  // Certo. Queima o código no mesmo instante em que ele vale — senão o
  // mesmo código entraria duas vezes.
  await sb(`codigos?id=eq.${linha.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ usado_em: new Date().toISOString() }),
  });

  const usuarios = await sb(`usuarios?telefone=eq.${tel}&select=id,nome&limit=1`);
  if (!usuarios.length) return { ok: false, erro: 'codigo_invalido' };

  const token = crypto.randomBytes(32).toString('base64url');
  await sb('sessoes', {
    method: 'POST',
    body: JSON.stringify({
      usuario_id: usuarios[0].id,
      hash:       hash(token),
      expira_em:  new Date(Date.now() + VIDA_SESSAO_DIAS * 864e5).toISOString(),
      aparelho:   (aparelho || '').slice(0, 120) || null,
      ip:         ip || null,
    }),
  });

  return { ok: true, token, nome: usuarios[0].nome };
}

// ── Convidar uma loja ─────────────────────────────────────────────
//
// Cria a loja, a pessoa e o vínculo, e devolve um link pronto. Existe
// porque o SMS está desligado: sem isto, convidar alguém é o dono ler um
// código de seis dígitos no registro da Vercel e repassar no WhatsApp —
// péssima primeira impressão, justo na hora em que se quer que a pessoa
// ache o sistema bom.
//
// ⚠️ O LINK É A CREDENCIAL. Ele carrega uma sessão pronta: quem abrir,
// entra. Vale o mesmo cuidado da chave de aparelho — manda para a pessoa
// e para mais ninguém. Se vazar, `encerrarSessao` derruba só aquela.
//
// O token vai no FRAGMENTO (#) do endereço, nunca na query: fragmento
// não é enviado ao servidor, então não entra no registro de acesso da
// Vercel nem no Referer de terceiros. Mesma decisão de 03/set.
async function convidarLoja({ loja, pessoa, telefone, esconder }) {
  const nomePessoa = String(pessoa || '').trim().slice(0, 80);
  if (!nomePessoa) return { ok: false, erro: 'faltou_nome' };

  // A loja é OPCIONAL. Repassador em geral não tem loja — é ele e o
  // telefone —, e exigir um nome de loja obrigava a inventar um
  // (decisão do Yuri, 29/set). Sem loja, a conta leva o nome da pessoa,
  // que é como ele já é conhecido no mercado.
  const nomeLoja = String(loja || '').trim().slice(0, 80) || nomePessoa;

  const tel = telefone ? normalizar(telefone) : null;
  if (tel) {
    // Telefone já usado seria a pessoa entrando na loja errada pelo
    // código de SMS no dia em que ele ligar.
    const jaTem = await sb(`usuarios?telefone=eq.${tel}&select=id&limit=1`);
    if (jaTem.length) return { ok: false, erro: 'telefone_em_uso' };
  }

  const conta = (await sb('contas', {
    method: 'POST', prefer: 'return=representation',
    body: JSON.stringify({
      nome: nomeLoja,
      // Sem Instagram nem e-mail herdados: seriam os contatos da Carro na
      // Rede indo no anúncio de outra loja (decisão de 22/set).
      esconder: String(esconder || '').trim() || null,
    }),
  }))[0];

  const usuario = (await sb('usuarios', {
    method: 'POST', prefer: 'return=representation',
    body: JSON.stringify({ nome: nomePessoa, telefone: tel }),
  }))[0];

  await sb('conta_membros', {
    method: 'POST',
    body: JSON.stringify({ conta_id: conta.id, usuario_id: usuario.id, papel: 'dono' }),
  });

  const token = crypto.randomBytes(32).toString('base64url');
  await sb('sessoes', {
    method: 'POST',
    body: JSON.stringify({
      usuario_id: usuario.id,
      hash:       hash(token),
      expira_em:  new Date(Date.now() + VIDA_SESSAO_DIAS * 864e5).toISOString(),
      aparelho:   'convite',
    }),
  });

  return { ok: true, token, conta_id: conta.id, usuario_id: usuario.id,
           loja: nomeLoja, pessoa: nomePessoa };
}

// ── Entrar neste aparelho, sendo o dono ───────────────────────────
//
// Quem tem a chave mestra JÁ lê e escreve tudo desta loja — catálogo,
// vendas, clientes com CPF. Recusar-lhe uma sessão da própria loja não
// protege nada; só obriga a um código de SMS que hoje nem é enviado.
//
// O que a sessão acrescenta é IDENTIDADE: com ela o sistema sabe de que
// loja a pessoa é, e a Rede passa a funcionar. Sem ela, a chave diz "é
// alguém desta instalação" e nada mais.
//
// Abre a sessão do DONO da conta, nunca de um membro qualquer: é o único
// papel que a chave mestra representa sem ambiguidade.
async function sessaoDoDono(contaId, aparelho) {
  const membros = await sb(
    `conta_membros?conta_id=eq.${contaId}&papel=eq.dono&select=usuario_id&limit=1`
  );
  if (!membros.length) return { ok: false, erro: 'sem_dono' };

  const usuarios = await sb(`usuarios?id=eq.${membros[0].usuario_id}&select=id,nome&limit=1`);
  if (!usuarios.length) return { ok: false, erro: 'sem_dono' };

  const token = crypto.randomBytes(32).toString('base64url');
  await sb('sessoes', {
    method: 'POST',
    body: JSON.stringify({
      usuario_id: usuarios[0].id,
      hash:       hash(token),
      expira_em:  new Date(Date.now() + VIDA_SESSAO_DIAS * 864e5).toISOString(),
      aparelho:   (aparelho || '').slice(0, 120) || 'chave mestra',
    }),
  });
  return { ok: true, token, nome: usuarios[0].nome };
}

// ── Quem é quem está pedindo ──────────────────────────────────────
/**
 * Lê o cabeçalho `x-cnr-sessao`, e devolve { usuario_id, nome, conta_id,
 * papel, pode_ofertar } ou null.
 *
 * Devolve null em silêncio quando não há sessão: durante a transição o
 * pedido pode estar vindo pela chave de aparelho, que continua valendo.
 */
async function sessaoDoPedido(req) {
  const token = req.headers['x-cnr-sessao'];
  if (!token || typeof token !== 'string') return null;

  const agora = new Date().toISOString();
  const linhas = await sb(
    `sessoes?hash=eq.${hash(token)}&encerrada_em=is.null&expira_em=gte.${agora}` +
    `&select=id,usuario_id,ultimo_uso&limit=1`
  );
  if (!linhas.length) return null;
  const s = linhas[0];

  // `select=*` de propósito, e não a lista de colunas: `pode_ofertar` só
  // nasce com a fase 2 (`rede-fase2.sql`), e pedir coluna que ainda não
  // existe derruba a chamada inteira com 400. Com `*`, ela aparece sozinha
  // no dia em que existir. A tabela tem uma linha por pessoa — não pesa.
  const membros = await sb(`conta_membros?usuario_id=eq.${s.usuario_id}&select=*&limit=1`);
  if (!membros.length) return null;   // pessoa sem loja não alcança nada

  const usuarios = await sb(`usuarios?id=eq.${s.usuario_id}&select=nome&limit=1`);

  // Marca o uso no máximo de hora em hora. Gravar a cada chamada seria uma
  // escrita por requisição — caro e sem ganho.
  if (Date.now() - new Date(s.ultimo_uso) > 3600e3) {
    sb(`sessoes?id=eq.${s.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ultimo_uso: new Date().toISOString() }),
    }).catch(() => {});
  }

  return {
    sessao_id:    s.id,
    usuario_id:   s.usuario_id,
    nome:         usuarios[0]?.nome || null,
    conta_id:     membros[0].conta_id,
    papel:        membros[0].papel,
    pode_ofertar: membros[0].pode_ofertar === true,
  };
}

/**
 * A linha de `contas` daquela loja — nome, logo, Instagram, telas
 * escondidas. Lida aqui, e não dentro de `sessaoDoPedido`, de propósito:
 * só a tela da marca precisa disso, e buscar em toda chamada de API seria
 * uma consulta a mais por requisição, sem ganho.
 *
 * `contas` é o cadastro das lojas, não dado de loja — por isso fica fora
 * do funil `_db.js`, como já estava desde a fase 0.
 */
async function contaDaSessao(contaId) {
  if (!contaId) return null;
  const linhas = await sb(`contas?id=eq.${contaId}&select=*&limit=1`);
  return linhas.length ? linhas[0] : null;
}

async function encerrarSessao(req) {
  const token = req.headers['x-cnr-sessao'];
  if (!token) return false;
  await sb(`sessoes?hash=eq.${hash(token)}&encerrada_em=is.null`, {
    method: 'PATCH',
    body: JSON.stringify({ encerrada_em: new Date().toISOString() }),
  });
  return true;
}

module.exports = {
  pedirCodigo,
  convidarLoja,
  sessaoDoDono,
  conferirCodigo,
  sessaoDoPedido,
  contaDaSessao,
  encerrarSessao,
  normalizar,
  VIDA_CODIGO_MIN,
};
