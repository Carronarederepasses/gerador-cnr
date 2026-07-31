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

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VENDAS_KEY   = process.env.VENDAS_KEY; // senha única (opcional, mas recomendada)

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
  'status', 'doc_status', 'observacoes', 'anexos',
];

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
}

function limpar(body) {
  const out = {};
  for (const k of CAMPOS) if (body[k] !== undefined) out[k] = body[k] === '' ? null : body[k];
  return out;
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
async function getAnexos(vendaId) {
  const r = await sb(`vendas?id=eq.${vendaId}&select=anexos`);
  if (!r.ok) throw new Error(await r.text());
  const rows = await r.json();
  if (!rows.length) throw new Error('Venda não encontrada.');
  return Array.isArray(rows[0].anexos) ? rows[0].anexos : [];
}
async function setAnexos(vendaId, anexos) {
  const r = await sb(`vendas?id=eq.${vendaId}`, {
    method: 'PATCH', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ anexos }),
  });
  if (!r.ok) throw new Error(await r.text());
  return anexos;
}

async function anexoHandler(req, res, q) {
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
  // POST → upload
  if (req.method === 'POST') {
    const { vendaId, tipo = 'outro', fileBase64, mimeType = 'application/octet-stream', nome } = req.body || {};
    if (!vendaId || !fileBase64) return res.status(400).json({ error: 'vendaId e fileBase64 obrigatórios.' });
    const ext = EXT[mimeType] || (nome && nome.includes('.') ? nome.split('.').pop().toLowerCase() : 'bin');
    const objPath = `${vendaId}/${tipo}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objPath}`, {
      method: 'POST',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': mimeType, 'x-upsert': 'true' },
      body: Buffer.from(fileBase64, 'base64'),
    });
    if (!up.ok) throw new Error(await up.text());
    const anexos = await getAnexos(vendaId);
    anexos.push({ tipo, path: objPath, nome: nome || objPath.split('/').pop(), mimeType, uploadedAt: new Date().toISOString() });
    await setAnexos(vendaId, anexos);
    return res.status(201).json({ anexos });
  }
  // DELETE → remove
  if (req.method === 'DELETE') {
    const { vendaId, path } = req.body || {};
    if (!vendaId || !path) return res.status(400).json({ error: 'vendaId e path obrigatórios.' });
    await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'DELETE', headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const anexos = (await getAnexos(vendaId)).filter(a => a.path !== path);
    await setAnexos(vendaId, anexos);
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

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase não configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).' });
  }

  const q = req.query || {};

  try {
    // Rota de anexos
    if (q.anexo !== undefined) return await anexoHandler(req, res, q);

    // Limpar todas as vendas (só DELETE)
    if (q.limpar === '1') {
      if (req.method !== 'DELETE') return res.status(405).json({ error: 'DELETE obrigatório.' });
      const r = await sb(`${TABLE}?created_at=gte.2000-01-01`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      if (!r.ok) throw new Error(await r.text());
      return res.status(200).json({ ok: true });
    }

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
      const parts = ['select=*', 'order=created_at.desc', ...filtros(q)];
      const r = await sb(`${TABLE}?${parts.join('&')}`);
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      if (q.id) return res.status(200).json(data[0] || null);
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const payload = limpar(req.body || {});
      if (!payload.comprador_nome && !payload.vendedor_nome && !payload.marca) {
        return res.status(400).json({ error: 'Informe ao menos o comprador, o vendedor ou o veículo.' });
      }
      const r = await sb(TABLE, {
        method: 'POST', headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      const venda = data[0] || data;

      // Auto-atualiza catálogo para "vendido" quando há placa
      if (payload.placa) {
        sb(`catalogo?placa=eq.${encodeURIComponent(payload.placa)}&status=neq.vendido`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ status: 'vendido' }),
        }).catch(() => {});
      }

      return res.status(201).json(venda);
    }

    if (req.method === 'PATCH') {
      if (!q.id) return res.status(400).json({ error: 'id obrigatório.' });
      const payload = limpar(req.body || {});
      const r = await sb(`${TABLE}?id=eq.${encodeURIComponent(q.id)}`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      return res.status(200).json(data[0] || data);
    }

    if (req.method === 'DELETE') {
      if (!q.id) return res.status(400).json({ error: 'id obrigatório.' });
      const r = await sb(`${TABLE}?id=eq.${encodeURIComponent(q.id)}`, { method: 'DELETE' });
      if (!r.ok) throw new Error(await r.text());
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (err) {
    console.error('vendas erro:', err.message);
    return res.status(500).json({ error: 'Falha ao acessar o registro de vendas.' });
  }
};
