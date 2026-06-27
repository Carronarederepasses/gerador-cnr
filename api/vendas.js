// Vercel API Route — Registro de Vendas (CRUD)
// Fala com o Supabase via PostgREST usando a SERVICE_ROLE key (server-side).
//
// Env vars:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   VENDAS_KEY  — senha única de acesso. Se definida (recomendado!), exige
//                 header "x-cnr-key" com esse valor. Sem ela, a tela fica aberta.
//
// Métodos:
//   GET    /api/vendas            → lista (filtros via query string)
//   GET    /api/vendas?id=<uuid>  → uma venda
//   POST   /api/vendas            → cria
//   PATCH  /api/vendas?id=<uuid>  → atualiza
//   DELETE /api/vendas?id=<uuid>  → remove

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VENDAS_KEY   = process.env.VENDAS_KEY; // senha única (opcional, mas recomendada)

const TABLE = 'vendas';

const CAMPOS = [
  'veiculo_id',
  'marca', 'modelo', 'versao', 'ano', 'placa', 'cor', 'km', 'renavam', 'chassi',
  'origem', 'vendedor_nome', 'vendedor_cpf', 'vendedor_telefone',
  'destino', 'comprador_nome', 'comprador_cpf', 'comprador_telefone',
  'valor_venda', 'valor_fipe', 'taxa_intermediacao', 'forma_pagamento',
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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-cnr-key');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase não configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).' });
  }

  // Portão por senha única
  if (VENDAS_KEY && req.headers['x-cnr-key'] !== VENDAS_KEY) {
    return res.status(401).json({ error: 'Senha incorreta.' });
  }

  const q = req.query || {};

  try {
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
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      return res.status(201).json(data[0] || data);
    }

    if (req.method === 'PATCH') {
      if (!q.id) return res.status(400).json({ error: 'id obrigatório.' });
      const payload = limpar(req.body || {});
      const r = await sb(`${TABLE}?id=eq.${encodeURIComponent(q.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
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
