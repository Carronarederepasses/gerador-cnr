// Vercel API Route — Catálogo de Oportunidades (CRUD de veículos)
// Fala com o Supabase via PostgREST usando a SERVICE_ROLE key (server-side).
//
// Env vars necessárias (já configuradas no .env / painel do Vercel):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
// Opcional:
//   CATALOGO_KEY — se definida, exige header "x-cnr-key" com esse valor.
//
// Métodos:
//   GET    /api/catalogo            → lista (com filtros via query string)
//   GET    /api/catalogo?id=<uuid>  → uma ficha
//   POST   /api/catalogo            → cria veículo (body JSON)
//   PATCH  /api/catalogo?id=<uuid>  → atualiza campos (body JSON; ex: status)
//   DELETE /api/catalogo?id=<uuid>  → remove

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CATALOGO_KEY = process.env.CATALOGO_KEY; // opcional

const TABLE = 'veiculos';

// Campos aceitos no POST/PATCH (whitelist — ignora o resto)
const CAMPOS = [
  'marca', 'modelo', 'versao', 'complemento', 'ano', 'ano_int',
  'km', 'cor', 'regiao', 'valor', 'fipe',
  'opcionais', 'observacoes', 'anuncio_texto', 'status', 'fotos', 'documentos',
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
  for (const k of CAMPOS) if (body[k] !== undefined) out[k] = body[k];
  return out;
}

// Monta os filtros do PostgREST a partir da query string
function filtros(q) {
  const f = [];
  if (q.id)        f.push(`id=eq.${encodeURIComponent(q.id)}`);
  if (q.status)    f.push(`status=eq.${encodeURIComponent(q.status)}`);
  if (q.marca)     f.push(`marca=ilike.*${encodeURIComponent(q.marca)}*`);
  if (q.regiao)    f.push(`regiao=ilike.*${encodeURIComponent(q.regiao)}*`);
  if (q.valor_max) f.push(`valor=lte.${Number(q.valor_max)}`);
  if (q.valor_min) f.push(`valor=gte.${Number(q.valor_min)}`);
  if (q.km_max)    f.push(`km=lte.${Number(q.km_max)}`);
  if (q.ano_min)   f.push(`ano_int=gte.${Number(q.ano_min)}`);
  if (q.ano_max)   f.push(`ano_int=lte.${Number(q.ano_max)}`);
  // busca livre: casa em marca, modelo ou versão
  if (q.q) {
    const t = encodeURIComponent(q.q);
    f.push(`or=(marca.ilike.*${t}*,modelo.ilike.*${t}*,versao.ilike.*${t}*,complemento.ilike.*${t}*)`);
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

  // Portão opcional por chave
  if (CATALOGO_KEY && req.headers['x-cnr-key'] !== CATALOGO_KEY) {
    return res.status(401).json({ error: 'Acesso negado.' });
  }

  const q = req.query || {};

  try {
    // ── LISTAR / DETALHE ────────────────────────────────────────
    if (req.method === 'GET') {
      const parts = ['select=*', 'order=created_at.desc', ...filtros(q)];
      const r = await sb(`${TABLE}?${parts.join('&')}`);
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      if (q.id) return res.status(200).json(data[0] || null);
      return res.status(200).json(data);
    }

    // ── CRIAR ───────────────────────────────────────────────────
    if (req.method === 'POST') {
      const payload = limpar(req.body || {});
      const nome = [payload.marca, payload.versao || payload.modelo].filter(Boolean).join(' ');
      if (!nome && !payload.anuncio_texto) {
        return res.status(400).json({ error: 'Informe ao menos o veículo.' });
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

    // ── ATUALIZAR ───────────────────────────────────────────────
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

    // ── REMOVER ─────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      if (!q.id) return res.status(400).json({ error: 'id obrigatório.' });
      const r = await sb(`${TABLE}?id=eq.${encodeURIComponent(q.id)}`, { method: 'DELETE' });
      if (!r.ok) throw new Error(await r.text());
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (err) {
    console.error('catalogo erro:', err.message);
    return res.status(500).json({ error: 'Falha ao acessar o catálogo.' });
  }
};
