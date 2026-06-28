// Vercel API Route — Vistorias / Laudo Cautelar (CRUD)
// Mesmo padrão da api/vendas.js: Supabase via SERVICE_ROLE, gate por VENDAS_KEY
// (uma senha só pra toda a área interna).
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (+ VENDAS_KEY como senha)
//
//   GET    /api/vistorias            → lista (filtros via query string)
//   GET    /api/vistorias?id=<uuid>  → uma vistoria
//   POST   /api/vistorias            → cria
//   PATCH  /api/vistorias?id=<uuid>  → atualiza
//   DELETE /api/vistorias?id=<uuid>  → remove

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VENDAS_KEY   = process.env.VENDAS_KEY;

const TABLE = 'vistorias';

const CAMPOS = [
  'venda_id', 'veiculo_id',
  'marca', 'modelo', 'placa', 'ano_fabricacao', 'ano_modelo', 'cor',
  'inspetor', 'data_vistoria', 'latitude', 'longitude', 'nota_geral',
  'resultado', 'fotos', 'status', 'observacoes',
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
  if (q.venda_id) f.push(`venda_id=eq.${encodeURIComponent(q.venda_id)}`);
  if (q.q) {
    const t = encodeURIComponent(q.q);
    f.push(`or=(placa.ilike.*${t}*,marca.ilike.*${t}*,modelo.ilike.*${t}*,inspetor.ilike.*${t}*)`);
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
      if (!payload.placa && !payload.marca) {
        return res.status(400).json({ error: 'Informe ao menos a placa ou a marca do veículo.' });
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
    console.error('vistorias erro:', err.message);
    return res.status(500).json({ error: 'Falha ao acessar as vistorias.' });
  }
};
