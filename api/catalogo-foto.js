// Vercel API Route — Fotos do catálogo (Supabase Storage)
// Sobe foto pro bucket "veiculos" e guarda a URL pública no array
// veiculos.fotos (jsonb). Tudo via SERVICE_ROLE (server-side).
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (+ CATALOGO_KEY opcional)
//
//   POST   /api/catalogo-foto   body { veiculoId, imageBase64, mimeType }
//   DELETE /api/catalogo-foto    body { veiculoId, url }

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CATALOGO_KEY = process.env.CATALOGO_KEY;
const BUCKET = 'veiculos';

const EXT = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

function sbRest(path, opts = {}) {
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

async function getFotos(veiculoId) {
  const r = await sbRest(`veiculos?id=eq.${veiculoId}&select=fotos`);
  if (!r.ok) throw new Error(await r.text());
  const rows = await r.json();
  if (!rows.length) throw new Error('Veículo não encontrado.');
  return Array.isArray(rows[0].fotos) ? rows[0].fotos : [];
}

async function setFotos(veiculoId, fotos) {
  const r = await sbRest(`veiculos?id=eq.${veiculoId}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-cnr-key');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase não configurado.' });
  }
  if (CATALOGO_KEY && req.headers['x-cnr-key'] !== CATALOGO_KEY) {
    return res.status(401).json({ error: 'Acesso negado.' });
  }

  try {
    // ── UPLOAD ──────────────────────────────────────────────────
    if (req.method === 'POST') {
      const { veiculoId, imageBase64, mimeType = 'image/jpeg' } = req.body || {};
      if (!veiculoId || !imageBase64) {
        return res.status(400).json({ error: 'veiculoId e imageBase64 obrigatórios.' });
      }
      const ext = EXT[mimeType] || 'jpg';
      const objPath = `${veiculoId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objPath}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': mimeType,
          'x-upsert': 'true',
        },
        body: Buffer.from(imageBase64, 'base64'),
      });
      if (!up.ok) throw new Error(await up.text());

      const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objPath}`;
      const fotos = await getFotos(veiculoId);
      fotos.push(url);
      await setFotos(veiculoId, fotos);
      return res.status(201).json({ fotos });
    }

    // ── REMOVER FOTO ────────────────────────────────────────────
    if (req.method === 'DELETE') {
      const { veiculoId, url } = req.body || {};
      if (!veiculoId || !url) return res.status(400).json({ error: 'veiculoId e url obrigatórios.' });

      const objPath = pathFromUrl(url);
      if (objPath) {
        await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objPath}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${SERVICE_KEY}` },
        });
      }
      const fotos = (await getFotos(veiculoId)).filter(u => u !== url);
      await setFotos(veiculoId, fotos);
      return res.status(200).json({ fotos });
    }

    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (err) {
    console.error('catalogo-foto erro:', err.message);
    return res.status(500).json({ error: 'Falha ao processar a foto.' });
  }
};
