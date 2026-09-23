// Vercel API Route — Registro de Vendas (CRUD) + Anexos
// Fala com o Supabase via PostgREST usando a SERVICE_ROLE key (server-side).
//
// Os anexos foram fundidos aqui (em vez de api/vendas-anexo.js) pra economizar
// função serverless — o plano grátis do Vercel só deixa ter 12 no total.
//   → use ?anexo=1 na URL pra cair na parte de anexos.
//
// Env vars:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   VENDAS_KEY  — senha única de acesso (header "x-cnr-key").
//
// Vendas:
//   GET    /api/vendas            → lista (filtros via query string)
//   GET    /api/vendas?id=<uuid>  → uma venda
//   POST   /api/vendas            → cria
//   PATCH  /api/vendas?id=<uuid>  → atualiza
//   DELETE /api/vendas?id=<uuid>  → remove
// Anexos (bucket PRIVADO vendas-docs):
//   POST   /api/vendas?anexo=1    body { vendaId, tipo, fileBase64, mimeType, nome }
//   GET    /api/vendas?anexo=1&path=...   → { url } (link temporário, 1h)
//   DELETE /api/vendas?anexo=1    body { vendaId, path }

const { exigirChave } = require('./_auth');
const { db } = require('./_db');
const { contaDoPedido } = require('./_conta');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TABLE = 'vendas';
const BUCKET = 'vendas-docs';
const EXT = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'application/pdf': 'pdf',
};

const CAMPOS = [
  'veiculo_id',
  'marca', 'modelo', 'versao', 'ano', 'placa', 'cor', 'km', 'renavam', 'chassi',
  'origem', 'vendedor_nome', 'vendedor_cpf', 'vendedor_telefone',
  'destino', 'comprador_nome', 'comprador_cpf', 'comprador_telefone',
  'valor_venda', 'valor_fipe', 'taxa_intermediacao', 'forma_pagamento',
  'valor_compra', 'canal_origem', 'comprador_id', 'motivo_match',
  'data_venda', 'data_retirada',
  // Venda em andamento (16/set): sinal recebido trava o carro enquanto a
  // negociação não fecha. `status='negociando'` tira do faturamento.
  'valor_sinal', 'sinal_em',
  'status', 'doc_status', 'observacoes', 'anexos',
];

// O `sb` local saiu daqui em 23/set — agora vem de `_db.js`, amarrado à conta
// do pedido. Ele NÃO fica como reserva de propósito: um `sb` de módulo ainda
// declarado seria o caminho sem dono esperando a primeira chamada que eu
// esquecesse de converter, e ela funcionaria em silêncio, devolvendo dado de
// todas as lojas. Sem ele, o esquecimento vira erro na hora.

function limpar(body) {
  const out = {};
  for (const k of CAMPOS) if (body[k] !== undefined) out[k] = body[k] === '' ? null : body[k];
  return out;
}

// ── Rede de segurança: a janela entre o deploy e a migration ─────
// O deploy é automático no push; a migration roda à mão no SQL Editor. Nesse
// intervalo o código manda `valor_sinal`/`sinal_em` e o banco ainda não tem as
// colunas: o PostgREST devolve 400 e a venda NÃO salva — no meio do negócio,
// sem explicação na tela. Foi exatamente isso em 08/set com `operador`.
// Pode ser removido depois que a migration tiver rodado.
const COLUNAS_NOVAS = ['valor_sinal', 'sinal_em'];

async function gravar(sb, path, opts, payload) {
  const r = await sb(path, { ...opts, body: JSON.stringify(payload) });
  if (r.ok) return r;

  const txt = await r.text();
  const faltaColuna = COLUNAS_NOVAS.some(c => txt.includes(c)) &&
                      /column|schema cache|PGRST204|42703/i.test(txt);
  if (!faltaColuna) throw new Error(txt);

  console.warn('vendas: colunas de sinal ainda não existem no banco — regravando sem elas.');
  const semNovas = { ...payload };
  COLUNAS_NOVAS.forEach(c => delete semNovas[c]);
  return sb(path, { ...opts, body: JSON.stringify(semNovas) });
}

// ── Caixa Preta — registro histórico (fire-and-forget) ───────────
// Nunca bloqueia a operação principal. Falha silenciosa com log de erro.
function registrarHistorico(sb, { evento, entidade = 'venda', entidade_id, veiculo_id, venda_id, cliente_id, dados_antes, dados_depois }) {
  sb('historico', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      evento,
      entidade,
      entidade_id,
      veiculo_id:   veiculo_id  || null,
      venda_id:     venda_id    || null,
      cliente_id:   cliente_id  || null,
      dados_antes:  dados_antes  ?? null,
      dados_depois: dados_depois ?? null,
      origem:       'api',
      versao_app:   process.env.VERCEL_GIT_COMMIT_SHA || null,
    }),
  }).catch(e => console.error('[historico] falha ao registrar:', e.message));
  // Retorna undefined intencionalmente — sem await
}

function filtros(q) {
  const f = [];
  if (q.id)     f.push(`id=eq.${encodeURIComponent(q.id)}`);
  if (q.status) f.push(`status=eq.${encodeURIComponent(q.status)}`);
  if (q.q) {
    const t = encodeURIComponent(q.q);
    f.push(`or=(comprador_nome.ilike.*${t}*,vendedor_nome.ilike.*${t}*,origem.ilike.*${t}*,destino.ilike.*${t}*,marca.ilike.*${t}*,modelo.ilike.*${t}*,versao.ilike.*${t}*,placa.ilike.*${t}*)`);
  }
  return f;
}

// ── Anexos (bucket privado) ──────────────────────────────────────
//
// Dono do anexo: VENDA ou NEGOCIAÇÃO (18/set — comprovante do sinal).
//
// A tabela vem desta tradução e de mais nenhum lugar. O corpo da requisição
// diz `vendaId` ou `negociacaoId`, nunca o nome da tabela: deixar o
// navegador escolher tabela seria deixar ele escrever em qualquer uma.
//
// O id é validado como UUID porque vai direto na URL do PostgREST
// (`?id=eq.<id>`) e no caminho do arquivo no storage. Sem isso, um id
// forjado com `&` ou `/` mudaria a consulta ou a pasta.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// O tipo vira PASTA no storage (`<dono>/<tipo>/<arquivo>`). Só letras,
// números, _ e -. Conferido em 18/set contra os 190 anexos existentes: os 17
// tipos em uso já cabem, então isto não muda nenhum caminho antigo.
function tipoSeguro(tipo) {
  const t = String(tipo || 'outro').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return t || 'outro';
}

function donoDoAnexo(corpo) {
  const c = corpo || {};
  if (c.negociacaoId) {
    if (!UUID.test(c.negociacaoId)) return { erro: 'negociacaoId inválido.' };
    // Prefixo `neg-` só para ser legível no bucket: batendo o olho na pasta
    // se sabe que o arquivo nasceu numa negociação.
    return { tabela: 'negociacoes', id: c.negociacaoId, pasta: `neg-${c.negociacaoId}`, rotulo: 'Negociação' };
  }
  if (c.vendaId) {
    if (!UUID.test(c.vendaId)) return { erro: 'vendaId inválido.' };
    return { tabela: 'vendas', id: c.vendaId, pasta: c.vendaId, rotulo: 'Venda' };
  }
  return { erro: 'vendaId ou negociacaoId obrigatório.' };
}

async function getAnexos(sb, dono) {
  const r = await sb(`${dono.tabela}?id=eq.${dono.id}&select=anexos`);
  if (!r.ok) throw new Error(await r.text());
  const rows = await r.json();
  if (!rows.length) throw new Error(`${dono.rotulo} não encontrada.`);
  return Array.isArray(rows[0].anexos) ? rows[0].anexos : [];
}
async function setAnexos(sb, dono, anexos) {
  const r = await sb(`${dono.tabela}?id=eq.${dono.id}`, {
    method: 'PATCH', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ anexos }),
  });
  if (!r.ok) throw new Error(await r.text());
  return anexos;
}

// Cópia física do arquivo no storage. Usada na conversão negociação → venda:
// se os dois apontassem para o MESMO arquivo, apagar de um lado apagaria do
// outro. Com cópia, cada registro é dono do seu.
async function copiarNoStorage(de, para) {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/copy`, {
    method: 'POST',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucketId: BUCKET, sourceKey: de, destinationKey: para }),
  });
  if (!r.ok) throw new Error(await r.text());
}

// Leva os anexos da negociação para a venda recém-criada. Nunca lança: a
// venda já existe quando isto roda, e um comprovante que falhou não pode
// desfazer um negócio fechado. Devolve { copiados, falhas } para a tela
// poder DIZER o que aconteceu, em vez de fingir que deu certo.
async function copiarAnexosDaNegociacao(sb, negociacaoId, venda) {
  const resultado = { copiados: 0, falhas: 0 };
  if (!UUID.test(String(negociacaoId || '')) || !venda || !venda.id) return resultado;

  let daNegociacao = [];
  try {
    const r = await sb(`negociacoes?id=eq.${negociacaoId}&select=anexos`);
    // 400 aqui é a coluna ainda não existir (janela entre deploy e migration):
    // simplesmente não há o que copiar.
    if (!r.ok) { console.warn('anexos: negociação sem coluna de anexos ainda —', r.status); return resultado; }
    const rows = await r.json();
    daNegociacao = Array.isArray(rows[0] && rows[0].anexos) ? rows[0].anexos : [];
  } catch (e) {
    console.error('anexos: não li a negociação', negociacaoId, e.message);
    return resultado;
  }
  if (!daNegociacao.length) return resultado;

  const novos = [];
  for (const a of daNegociacao) {
    const arquivo = String(a.path || '').split('/').pop();
    if (!arquivo) { resultado.falhas++; continue; }
    const destino = `${venda.id}/${tipoSeguro(a.tipo)}/${arquivo}`;
    try {
      await copiarNoStorage(a.path, destino);
      novos.push({ ...a, path: destino, veioDaNegociacao: negociacaoId });
      resultado.copiados++;
    } catch (e) {
      console.error('anexos: falhou ao copiar', a.path, '→', destino, e.message);
      resultado.falhas++;
    }
  }

  if (novos.length) {
    try {
      const atuais = Array.isArray(venda.anexos) ? venda.anexos : [];
      await setAnexos(sb, { tabela: 'vendas', id: venda.id }, atuais.concat(novos));
      venda.anexos = atuais.concat(novos);
    } catch (e) {
      // Arquivo copiado mas não registrado: fica no storage sem referência.
      // Raro, e é o caso em que o log precisa existir.
      console.error('anexos: copiei mas não registrei na venda', venda.id, e.message);
      resultado.falhas += resultado.copiados; resultado.copiados = 0;
    }
  }
  return resultado;
}

async function anexoHandler(sb, req, res, q) {
  // GET → link temporário assinado
  if (req.method === 'GET') {
    const { path } = q;
    if (!path) return res.status(400).json({ error: 'path obrigatório.' });
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${path}`, {
      method: 'POST',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: 3600 }),
    });
    if (!r.ok) throw new Error(await r.text());
    const { signedURL } = await r.json();
    return res.status(200).json({ url: `${SUPABASE_URL}/storage/v1${signedURL}` });
  }
  // POST → upload via base64 OU preparar upload direto OU confirmar upload direto
  if (req.method === 'POST') {
    // prepare-upload: gera URL assinada para upload direto (sem passar pelo Vercel)
    if (q.action === 'prepare-upload') {
      const { tipo = 'outro', mimeType = 'application/octet-stream', nome } = req.body || {};
      const dono = donoDoAnexo(req.body);
      if (dono.erro) return res.status(400).json({ error: dono.erro });
      const ext = EXT[mimeType] || (nome && nome.includes('.') ? nome.split('.').pop().toLowerCase() : 'bin');
      const objPath = `${dono.pasta}/${tipoSeguro(tipo)}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const r = await fetch(`${SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET}/${objPath}`, {
        method: 'POST',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      // Supabase retorna { url: '/storage/v1/object/upload/sign/...' }
      const uploadUrl = data.url.startsWith('http') ? data.url : `${SUPABASE_URL}/storage/v1${data.url}`;
      return res.status(200).json({ path: objPath, uploadUrl });
    }
    // confirm-upload: registra o arquivo no campo anexos após upload direto
    if (q.action === 'confirm-upload') {
      const { tipo = 'outro', path, mimeType = 'application/octet-stream', nome } = req.body || {};
      const dono = donoDoAnexo(req.body);
      if (dono.erro) return res.status(400).json({ error: dono.erro });
      if (!path) return res.status(400).json({ error: 'path obrigatório.' });
      // O caminho vem do navegador. Ele só pode registrar arquivo DENTRO da
      // pasta do próprio dono — senão uma negociação poderia "adotar" o
      // comprovante de outra venda só informando o caminho dele.
      if (!path.startsWith(dono.pasta + '/')) return res.status(400).json({ error: 'caminho fora da pasta do registro.' });
      const anexos = await getAnexos(sb, dono);
      anexos.push({ tipo: tipoSeguro(tipo), path, nome: nome || path.split('/').pop(), mimeType, uploadedAt: new Date().toISOString() });
      await setAnexos(sb, dono, anexos);
      return res.status(200).json({ anexos });
    }
    // upload via base64 (arquivos pequenos, mantido por compatibilidade)
    const { tipo = 'outro', fileBase64, mimeType = 'application/octet-stream', nome } = req.body || {};
    const dono = donoDoAnexo(req.body);
    if (dono.erro) return res.status(400).json({ error: dono.erro });
    if (!fileBase64) return res.status(400).json({ error: 'fileBase64 obrigatório.' });
    const ext = EXT[mimeType] || (nome && nome.includes('.') ? nome.split('.').pop().toLowerCase() : 'bin');
    const objPath = `${dono.pasta}/${tipoSeguro(tipo)}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objPath}`, {
      method: 'POST',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': mimeType, 'x-upsert': 'true' },
      body: Buffer.from(fileBase64, 'base64'),
    });
    if (!up.ok) throw new Error(await up.text());
    const anexos = await getAnexos(sb, dono);
    anexos.push({ tipo: tipoSeguro(tipo), path: objPath, nome: nome || objPath.split('/').pop(), mimeType, uploadedAt: new Date().toISOString() });
    await setAnexos(sb, dono, anexos);
    return res.status(201).json({ anexos });
  }
  // DELETE → remove
  if (req.method === 'DELETE') {
    const { path } = req.body || {};
    const dono = donoDoAnexo(req.body);
    if (dono.erro) return res.status(400).json({ error: dono.erro });
    if (!path) return res.status(400).json({ error: 'path obrigatório.' });
    // Só apaga do storage o que é do próprio dono. Sem esta trava, uma
    // negociação poderia apagar o arquivo de uma venda informando o caminho.
    if (!path.startsWith(dono.pasta + '/')) return res.status(400).json({ error: 'caminho fora da pasta do registro.' });
    await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'DELETE', headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const anexos = (await getAnexos(sb, dono)).filter(a => a.path !== path);
    await setAnexos(sb, dono, anexos);
    return res.status(200).json({ anexos });
  }
  return res.status(405).json({ error: 'Método não permitido.' });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-cnr-key');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Portão único (api/_auth.js). Passou a valer também no GET: esta rota
  // devolvia placa, renavam, chassi, valor de compra e lucro a quem pedisse.
  if (exigirChave(req, res)) return;

  // De quem é este pedido (fase 0, 23/set). `db()` recusa sem conta, e o
  // `sb` é PASSADO a quem precisa em vez de ficar em variável do módulo: a
  // Vercel pode atender dois pedidos ao mesmo tempo na mesma instância, e
  // variável trocada por pedido faria um usar a conta do outro.
  const sb = db(contaDoPedido(req));

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase não configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).' });
  }

  const q = req.query || {};

  try {
    // Rota de anexos
    if (q.anexo !== undefined) return await anexoHandler(sb, req, res, q);

    // Importação em lote (só POST)
    if (q.import === '1') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'POST obrigatório.' });
      const registros = Array.isArray(req.body) ? req.body : (req.body?.registros || []);
      if (!registros.length) return res.status(400).json({ error: 'Nenhum registro enviado.' });
      const limpos = registros.map(b => limpar(b)).filter(b => Object.keys(b).length > 0);
      const r = await sb(TABLE, {
        method: 'POST', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(limpos),
      });
      if (!r.ok) throw new Error(await r.text());
      return res.status(201).json({ importados: limpos.length });
    }

    if (req.method === 'GET') {
      // Ordena pela data em que a venda ACONTECEU, não por quando o registro
      // foi digitado. As vendas históricas foram lançadas em lote e muitas têm
      // created_at nulo — em DESC o Postgres coloca nulos PRIMEIRO, o que
      // empurrava toda venda nova para o fim da lista (parecia não ter salvo).
      // nullslast garante que registro sem data nunca ocupe o topo.
      const parts = [
        'select=*',
        'order=data_venda.desc.nullslast,created_at.desc.nullslast',
        ...filtros(q),
      ];
      const r = await sb(`${TABLE}?${parts.join('&')}`);
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      if (q.id) return res.status(200).json(data[0] || null);
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      // Caixa Preta — Etapa 6: captura antes do limpar() — não existe na tabela vendas
      const negociacao_id = (req.body && req.body.negociacao_id) ? req.body.negociacao_id : null;
      const payload = limpar(req.body || {});
      if (!payload.comprador_nome && !payload.vendedor_nome && !payload.marca) {
        return res.status(400).json({ error: 'Informe ao menos o comprador, o vendedor ou o veículo.' });
      }
      const r = await gravar(sb, TABLE, {
        method: 'POST', headers: { Prefer: 'return=representation' },
      }, payload);
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      const venda = data[0] || data;

      // Caixa Preta — VENDA_CRIADA (fire-and-forget, nunca bloqueia)
      registrarHistorico(sb, {
        evento:       'VENDA_CRIADA',
        entidade_id:  venda.id,
        veiculo_id:   venda.veiculo_id   || null,
        venda_id:     venda.id,
        cliente_id:   venda.comprador_id || null,
        dados_antes:  null,
        dados_depois: venda,
      });

      // Caixa Preta — NEGOCIACAO_CONVERTIDA (await + try/catch)
      // Registrado somente quando a venda nasce de uma negociação rastreável.
      // Usa await porque o worker Vercel encerra após res.json() — fire-and-forget
      // puro não garante que um segundo fetch paralelo complete (padrão Etapa 3).
      if (negociacao_id) {
        try {
          await sb('historico', {
            method: 'POST',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({
              evento:      'NEGOCIACAO_CONVERTIDA',
              entidade:    'negociacao',
              entidade_id: negociacao_id,
              veiculo_id:  venda.veiculo_id   || null,
              venda_id:    venda.id,
              cliente_id:  venda.comprador_id || null,
              dados_antes: {
                status:        'comprado',
                negociacao_id,
              },
              dados_depois: {
                venda_id:     venda.id,
                valor_venda:  venda.valor_venda  || null,
                comprador_id: venda.comprador_id || null,
                veiculo_id:   venda.veiculo_id   || null,
              },
              origem:    'api',
              versao_app: process.env.VERCEL_GIT_COMMIT_SHA || null,
            }),
          });
        } catch (e) {
          console.error('[historico] NEGOCIACAO_CONVERTIDA falhou:', e.message);
        }

        // O comprovante do sinal acompanha a venda (decisão do Yuri, 18/set).
        //
        // Cópia FÍSICA, não referência: se venda e negociação apontassem para o
        // mesmo arquivo, remover de um lado apagaria do outro.
        //
        // `await` antes do `return` de propósito: a Vercel encerra o worker ao
        // enviar a resposta e cancela o que estiver pendente (lição da Reforma
        // 35, Etapa 6). E falha aqui NUNCA derruba a venda — o negócio fechou;
        // um comprovante que não copiou se anexa à mão depois.
        venda.anexos_copiados = await copiarAnexosDaNegociacao(sb, negociacao_id, venda);
      }

      // Auto-atualiza veículos para "vendido" após venda registrada.
      // Primário: por veiculo_id (mais confiável). Fallback: por placa.
      const _vidUpd = payload.veiculo_id;
      const _placaUpd = payload.placa;
      if (_vidUpd) {
        sb(`veiculos?id=eq.${encodeURIComponent(_vidUpd)}&status=neq.vendido`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ status: 'vendido' }),
        }).then(r => {
          if (!r.ok) r.text().then(t => console.error('[vendas] auto-update por id falhou:', r.status, t));
        }).catch(e => console.error('[vendas] auto-update por id erro de rede:', e.message));
      } else if (_placaUpd) {
        sb(`veiculos?placa=eq.${encodeURIComponent(_placaUpd)}&status=neq.vendido`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ status: 'vendido' }),
        }).then(r => {
          if (!r.ok) r.text().then(t => console.error('[vendas] auto-update por placa falhou:', r.status, t));
        }).catch(e => console.error('[vendas] auto-update por placa erro de rede:', e.message));
      }

      return res.status(201).json(venda);
    }

    if (req.method === 'PATCH') {
      if (!q.id) return res.status(400).json({ error: 'id obrigatório.' });
      const payload = limpar(req.body || {});

      // Caixa Preta — captura estado anterior antes do PATCH
      const rAntes = await sb(`${TABLE}?id=eq.${encodeURIComponent(q.id)}&select=*`);
      const dadosAntes = rAntes.ok ? ((await rAntes.json())[0] || null) : null;

      const r = await gravar(sb, `${TABLE}?id=eq.${encodeURIComponent(q.id)}`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' },
      }, payload);
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      const vendaDepois = data[0] || data;

      // Caixa Preta — VENDA_EDITADA (fire-and-forget, nunca bloqueia)
      registrarHistorico(sb, {
        evento:       'VENDA_EDITADA',
        entidade_id:  q.id,
        veiculo_id:   dadosAntes?.veiculo_id   || vendaDepois?.veiculo_id   || null,
        venda_id:     q.id,
        cliente_id:   dadosAntes?.comprador_id || vendaDepois?.comprador_id || null,
        dados_antes:  dadosAntes,
        dados_depois: vendaDepois,
      });

      return res.status(200).json(vendaDepois);
    }

    if (req.method === 'DELETE') {
      if (!q.id) return res.status(400).json({ error: 'id obrigatório.' });

      // Caixa Preta — captura snapshot completo antes do DELETE
      const rSnap = await sb(`${TABLE}?id=eq.${encodeURIComponent(q.id)}&select=*`);
      const snapshot = rSnap.ok ? ((await rSnap.json())[0] || null) : null;

      const r = await sb(`${TABLE}?id=eq.${encodeURIComponent(q.id)}`, { method: 'DELETE' });
      if (!r.ok) throw new Error(await r.text());

      // Caixa Preta — VENDA_EXCLUIDA (fire-and-forget, nunca bloqueia)
      registrarHistorico(sb, {
        evento:       'VENDA_EXCLUIDA',
        entidade_id:  q.id,
        veiculo_id:   snapshot?.veiculo_id   || null,
        venda_id:     q.id,
        cliente_id:   snapshot?.comprador_id || null,
        dados_antes:  snapshot,
        dados_depois: null,
      });

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (err) {
    console.error('vendas erro:', err.message);
    return res.status(500).json({ error: 'Falha ao acessar o registro de vendas.' });
  }
};
