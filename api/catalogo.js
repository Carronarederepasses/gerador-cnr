// Vercel API Route — Catálogo de Oportunidades (CRUD de veículos) + Fotos
// Fala com o Supabase via PostgREST usando a SERVICE_ROLE key (server-side).
//
// As fotos foram fundidas aqui (em vez de api/catalogo-foto.js) pra economizar
// função serverless — o plano grátis do Vercel só deixa ter 12 no total.
//   → use ?foto=1 na URL pra cair na parte de fotos.
//
// Env vars:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
// Opcional:
//   CATALOGO_KEY — se definida, exige header "x-cnr-key" com esse valor.
//
// Veículos:
//   GET    /api/catalogo            → lista (com filtros via query string)
//   GET    /api/catalogo?id=<uuid>  → uma ficha
//   POST   /api/catalogo            → cria veículo (body JSON)
//   PATCH  /api/catalogo?id=<uuid>  → atualiza campos (body JSON; ex: status)
//   DELETE /api/catalogo?id=<uuid>  → remove
// Fotos (bucket público veiculos):
//   POST   /api/catalogo?foto=1   body { veiculoId, imageBase64, mimeType }
//   DELETE /api/catalogo?foto=1   body { veiculoId, url }

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CATALOGO_KEY = process.env.CATALOGO_KEY; // opcional

const TABLE = 'veiculos';
const BUCKET = 'veiculos';
const EXT = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const EXT_DOC = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/heic': 'heic', 'image/webp': 'webp' };

// Campos aceitos no POST/PATCH (whitelist — ignora o resto)
const CAMPOS = [
  'marca', 'modelo', 'versao', 'complemento', 'ano', 'ano_int',
  'km', 'cor', 'combustivel', 'regiao', 'placa', 'valor', 'fipe',
  'opcionais', 'observacoes', 'anuncio_texto', 'status', 'fotos', 'documentos', 'avaliacao',
  'valor_compra', 'gastos', 'renavam',
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
    f.push(`or=(marca.ilike.*${t}*,modelo.ilike.*${t}*,versao.ilike.*${t}*,complemento.ilike.*${t}*,placa.ilike.*${t}*)`);
  }
  return f;
}

// ── Fotos (bucket público) ───────────────────────────────────────
async function getFotos(veiculoId) {
  const r = await sb(`veiculos?id=eq.${veiculoId}&select=fotos`);
  if (!r.ok) throw new Error(await r.text());
  const rows = await r.json();
  if (!rows.length) throw new Error('Veículo não encontrado.');
  return Array.isArray(rows[0].fotos) ? rows[0].fotos : [];
}
async function setFotos(veiculoId, fotos) {
  const r = await sb(`veiculos?id=eq.${veiculoId}`, {
    method: 'PATCH', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ fotos }),
  });
  if (!r.ok) throw new Error(await r.text());
  return fotos;
}
function pathFromUrl(url) {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}

// Upload de foto de avaria (não entra no array fotos do veículo — fica só na avaliação)
// POST ?avaria=1  body { veiculoId, item, imageBase64, mimeType }  → { url }
async function avariaHandler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  const { veiculoId, item = 'avaria', imageBase64, mimeType = 'image/jpeg' } = req.body || {};
  if (!veiculoId || !imageBase64) return res.status(400).json({ error: 'veiculoId e imageBase64 obrigatórios.' });
  const ext = EXT[mimeType] || 'jpg';
  const objPath = `${veiculoId}/avaria/${item}-${Date.now()}.${ext}`;
  const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objPath}`, {
    method: 'POST',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': mimeType, 'x-upsert': 'true' },
    body: Buffer.from(imageBase64, 'base64'),
  });
  if (!up.ok) throw new Error(await up.text());
  const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objPath}`;
  return res.status(201).json({ url });
}

// ── Documentos (CRLV, etc.) ──────────────────────────────────────
async function getDocumentos(veiculoId) {
  const r = await sb(`veiculos?id=eq.${veiculoId}&select=documentos`);
  if (!r.ok) throw new Error(await r.text());
  const rows = await r.json();
  if (!rows.length) throw new Error('Veículo não encontrado.');
  return Array.isArray(rows[0].documentos) ? rows[0].documentos : [];
}
async function setDocumentos(veiculoId, documentos) {
  const r = await sb(`veiculos?id=eq.${veiculoId}`, {
    method: 'PATCH', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ documentos }),
  });
  if (!r.ok) throw new Error(await r.text());
  return documentos;
}
async function docHandler(req, res) {
  if (req.method === 'POST') {
    const { veiculoId, fileBase64, mimeType = 'application/pdf' } = req.body || {};
    if (!veiculoId || !fileBase64) return res.status(400).json({ error: 'veiculoId e fileBase64 obrigatórios.' });
    const ext = EXT_DOC[mimeType] || 'pdf';
    const objPath = `${veiculoId}/docs/${Date.now()}.${ext}`;
    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objPath}`, {
      method: 'POST',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': mimeType, 'x-upsert': 'true' },
      body: Buffer.from(fileBase64, 'base64'),
    });
    if (!up.ok) throw new Error(await up.text());
    const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objPath}`;
    const documentos = await getDocumentos(veiculoId);
    documentos.push(url);
    await setDocumentos(veiculoId, documentos);
    return res.status(201).json({ documentos });
  }
  if (req.method === 'DELETE') {
    const { veiculoId, url } = req.body || {};
    if (!veiculoId || !url) return res.status(400).json({ error: 'veiculoId e url obrigatórios.' });
    const objPath = pathFromUrl(url);
    if (objPath) {
      await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objPath}`, {
        method: 'DELETE', headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      });
    }
    const documentos = (await getDocumentos(veiculoId)).filter(u => u !== url);
    await setDocumentos(veiculoId, documentos);
    return res.status(200).json({ documentos });
  }
  return res.status(405).json({ error: 'Método não permitido.' });
}

async function fotoHandler(req, res) {
  if (req.method === 'POST') {
    const { veiculoId, imageBase64, mimeType = 'image/jpeg' } = req.body || {};
    if (!veiculoId || !imageBase64) return res.status(400).json({ error: 'veiculoId e imageBase64 obrigatórios.' });
    const ext = EXT[mimeType] || 'jpg';
    const objPath = `${veiculoId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objPath}`, {
      method: 'POST',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': mimeType, 'x-upsert': 'true' },
      body: Buffer.from(imageBase64, 'base64'),
    });
    if (!up.ok) throw new Error(await up.text());
    const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objPath}`;
    const fotos = await getFotos(veiculoId);
    fotos.push(url);
    await setFotos(veiculoId, fotos);
    return res.status(201).json({ fotos });
  }
  if (req.method === 'DELETE') {
    const { veiculoId, url } = req.body || {};
    if (!veiculoId || !url) return res.status(400).json({ error: 'veiculoId e url obrigatórios.' });
    const objPath = pathFromUrl(url);
    if (objPath) {
      await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objPath}`, {
        method: 'DELETE', headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      });
    }
    const fotos = (await getFotos(veiculoId)).filter(u => u !== url);
    await setFotos(veiculoId, fotos);
    return res.status(200).json({ fotos });
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

  // Portão opcional por chave
  if (CATALOGO_KEY && req.headers['x-cnr-key'] !== CATALOGO_KEY) {
    return res.status(401).json({ error: 'Acesso negado.' });
  }

  const q = req.query || {};

  try {
    // Rota de documentos (CRLV)
    if (q.doc !== undefined) return await docHandler(req, res);
    // Rota de fotos do catálogo
    if (q.foto !== undefined) return await fotoHandler(req, res);
    // Rota de fotos de avaria (avaliação — não entra no array fotos)
    if (q.avaria !== undefined) return await avariaHandler(req, res);

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
