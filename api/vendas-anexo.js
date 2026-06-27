// Vercel API Route — Anexos das vendas (Supabase Storage, bucket PRIVADO)
// Sobe comprovante / cautelar / documento pro bucket "vendas-docs" e guarda
// só o CAMINHO do objeto no array vendas.anexos (jsonb). Bucket é privado:
// pra exibir, a gente gera um link temporário assinado (signed URL).
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (+ VENDAS_KEY opcional)
//
//   POST   /api/vendas-anexo   body { vendaId, tipo, fileBase64, mimeType, nome }
//   GET    /api/vendas-anexo?vendaId=&path=   → { url } (link temporário, 1h)
//   DELETE /api/vendas-anexo   body { vendaId, path }

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VENDAS_KEY   = process.env.VENDAS_KEY;
const BUCKET = 'vendas-docs';

const EXT = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'application/pdf': 'pdf',
};

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

async function getAnexos(vendaId) {
  const r = await sbRest(`vendas?id=eq.${vendaId}&select=anexos`);
  if (!r.ok) throw new Error(await r.text());
  const rows = await r.json();
  if (!rows.length) throw new Error('Venda não encontrada.');
  return Array.isArray(rows[0].anexos) ? rows[0].anexos : [];
}

async function setAnexos(vendaId, anexos) {
  const r = await sbRest(`vendas?id=eq.${vendaId}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ anexos }),
  });
  if (!r.ok) throw new Error(await r.text());
  return anexos;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-cnr-key');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase não configurado.' });
  }
  if (VENDAS_KEY && req.headers['x-cnr-key'] !== VENDAS_KEY) {
    return res.status(401).json({ error: 'Senha incorreta.' });
  }

  try {
    // ── LINK TEMPORÁRIO (signed URL) ────────────────────────────
    if (req.method === 'GET') {
      const { path } = req.query || {};
      if (!path) return res.status(400).json({ error: 'path obrigatório.' });
      const r = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${path}`, {
        method: 'POST',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn: 3600 }), // 1 hora
      });
      if (!r.ok) throw new Error(await r.text());
      const { signedURL } = await r.json();
      return res.status(200).json({ url: `${SUPABASE_URL}/storage/v1${signedURL}` });
    }

    // ── UPLOAD ──────────────────────────────────────────────────
    if (req.method === 'POST') {
      const { vendaId, tipo = 'outro', fileBase64, mimeType = 'application/octet-stream', nome } = req.body || {};
      if (!vendaId || !fileBase64) {
        return res.status(400).json({ error: 'vendaId e fileBase64 obrigatórios.' });
      }
      const ext = EXT[mimeType] || (nome && nome.includes('.') ? nome.split('.').pop().toLowerCase() : 'bin');
      const objPath = `${vendaId}/${tipo}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objPath}`, {
        method: 'POST',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': mimeType,
          'x-upsert': 'true',
        },
        body: Buffer.from(fileBase64, 'base64'),
      });
      if (!up.ok) throw new Error(await up.text());

      const anexos = await getAnexos(vendaId);
      anexos.push({ tipo, path: objPath, nome: nome || objPath.split('/').pop(), mimeType, uploadedAt: new Date().toISOString() });
      await setAnexos(vendaId, anexos);
      return res.status(201).json({ anexos });
    }

    // ── REMOVER ─────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      const { vendaId, path } = req.body || {};
      if (!vendaId || !path) return res.status(400).json({ error: 'vendaId e path obrigatórios.' });
      await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
        method: 'DELETE',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      });
      const anexos = (await getAnexos(vendaId)).filter(a => a.path !== path);
      await setAnexos(vendaId, anexos);
      return res.status(200).json({ anexos });
    }

    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (err) {
    console.error('vendas-anexo erro:', err.message);
    return res.status(500).json({ error: 'Falha ao processar o anexo.' });
  }
};
