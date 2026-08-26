// Vercel API Route — dois modos via query param:
//
//   ?radar=1  → CRUD da tabela anuncios (Catafrango → Gerador)
//   (sem param) → lê URL externa e extrai texto para a IA
//
// Env vars para o modo radar:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   RADAR_KEY  (opcional — se definida, exige x-cnr-key no POST)

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RADAR_KEY    = process.env.RADAR_KEY; // opcional — protege o POST (upsert da extensão)

// ── Cliente Supabase ─────────────────────────────────────────────
function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey:        SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
}

// ── Modo Radar: CRUD de anúncios ─────────────────────────────────
async function handleRadar(req, res) {
  const q = req.query;

  // GET — lista anúncios (filtro por status opcional)
  if (req.method === 'GET') {
    let qs = 'order=first_seen_at.desc&limit=300';
    if (q.id)     { qs = `id=eq.${q.id}`; }
    else if (q.status && q.status !== 'todos') { qs += `&status=eq.${q.status}`; }
    const r = await sb(`anuncios?${qs}`);
    const data = await r.json();
    return res.status(200).json(data);
  }

  // POST — upsert em lote (chamado pelo Catafrango após cada verificação)
  if (req.method === 'POST') {
    // Auth: RADAR_KEY protege apenas o POST (escrita em massa da extensão)
    if (RADAR_KEY && req.headers['x-cnr-key'] !== RADAR_KEY) {
      return res.status(401).json({ error: 'Acesso negado.' });
    }

    const { listings } = req.body || {};
    if (!Array.isArray(listings) || listings.length === 0) {
      return res.status(400).json({ error: 'listings array required' });
    }

    const now  = new Date().toISOString();
    const rowsRaw = listings.map((l) => ({
      origem:       l.platform    || 'olx',
      listing_id:   l.listing_id,
      url:          l.url         || '',
      titulo:       l.title       || '',
      preco:        l.price       || '',
      localizacao:  l.location    || '',
      search_name:  l.search_name || null,
      last_seen_at: now,
    }));

    // Deduplicar por (origem, listing_id) dentro do próprio lote.
    // Um mesmo anúncio pode aparecer em múltiplas buscas (ex: busca Garopaba
    // e busca Imbituba retornam o mesmo listing_id). PostgreSQL rejeita dois
    // rows com a mesma chave no mesmo INSERT — a Map garante que só a última
    // ocorrência de cada chave entra no upsert.
    const dedupMap = new Map();
    for (const row of rowsRaw) {
      dedupMap.set(`${row.origem}:${row.listing_id}`, row);
    }
    const rows = Array.from(dedupMap.values());

    // Upsert com conflict target explícito.
    // Sem &on_conflict=, PostgREST tentaria usar a PK (id) como alvo — mas
    // id não está no payload (gerado pelo banco), então o INSERT passaria
    // direto e colidiria com a constraint UNIQUE(origem, listing_id).
    // Com on_conflict=origem,listing_id:
    //   - anúncio novo     → INSERT (first_seen_at, status e id ficam com o default do banco)
    //   - anúncio existente → UPDATE somente das colunas listadas em `columns`
    //                         (status, vehicle_id e first_seen_at são preservados)
    const cols = 'origem,listing_id,url,titulo,preco,localizacao,search_name,last_seen_at';
    const r = await sb(`anuncios?columns=${cols}&on_conflict=origem,listing_id`, {
      method:  'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body:    JSON.stringify(rows),
    });

    if (!r.ok) {
      const err = await r.text();
      console.error('[radar] upsert falhou:', err);
      return res.status(500).json({ error: 'Falha ao salvar anúncios.' });
    }

    return res.status(200).json({ ok: true, count: rows.length, raw: rowsRaw.length });
  }

  // PATCH — atualiza campos de fluxo (status, motivo_morte, vehicle_id)
  if (req.method === 'PATCH') {
    if (!q.id) return res.status(400).json({ error: 'id required' });

    const body    = req.body || {};
    const payload = {};
    if (body.status       !== undefined) payload.status       = body.status;
    if (body.motivo_morte !== undefined) payload.motivo_morte = body.motivo_morte;
    if (body.vehicle_id   !== undefined) payload.vehicle_id   = body.vehicle_id;

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
    }

    const r = await sb(`anuncios?id=eq.${q.id}`, {
      method:  'PATCH',
      headers: { Prefer: 'return=minimal' },
      body:    JSON.stringify(payload),
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(500).json({ error: err });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ── Modo padrão: extrai texto de URL externa para a IA ──────────

function meta(html, prop) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, 'i');
  const tag = html.match(re);
  if (!tag) return '';
  const c = tag[0].match(/content=["']([^"']*)["']/i);
  return c ? c[1] : '';
}

function extrairTexto(html) {
  const partes = [];

  const titulo = meta(html, 'og:title') || (html.match(/<title>([^<]*)<\/title>/i)?.[1] || '');
  const desc   = meta(html, 'og:description') || meta(html, 'description');
  if (titulo) partes.push(titulo.trim());
  if (desc)   partes.push(desc.trim());

  // JSON-LD (dados estruturados do produto/anúncio)
  const lds = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of lds) {
    try {
      const obj = JSON.parse(m[1].trim());
      const blob = JSON.stringify(obj)
        .replace(/[{}\[\]"]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (blob.length > 20) partes.push(blob.slice(0, 1800));
    } catch { /* ignora JSON-LD inválido */ }
  }

  // Corpo limpo (fallback): remove scripts/estilos/tags
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
  if (body) partes.push(body.slice(0, 3000));

  return partes.join('\n').slice(0, 5000);
}

// Extrai dados do "slug" da URL (ex: .../honda-wr-v-exl-1-5-flexone-16v-5p-aut-2018-1503745454
// → "honda wr v exl 1.5 flexone 16v 5p aut 2018"). Funciona mesmo quando o site bloqueia a leitura.
function textoDoSlug(url) {
  try {
    const u = new URL(url);
    let seg = (u.pathname.split('/').filter(Boolean).pop() || '');
    seg = decodeURIComponent(seg)
      .replace(/-?\d{6,}$/, '')        // remove o ID numérico longo do anúncio no final
      .replace(/[-_]+/g, ' ')          // hífens/underscores viram espaços
      .replace(/\b(\d)\s(\d)\b/g, '$1.$2') // "1 5" → "1.5" (motorização)
      .replace(/\s+/g, ' ')
      .trim();
    return seg;
  } catch { return ''; }
}

// ── Handler principal ────────────────────────────────────────────
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Modo Radar
  if ('radar' in req.query) return handleRadar(req, res);

  // Modo padrão: fetch URL para IA
  const url = (req.body && req.body.url) || req.query.url;
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: 'URL inválida' });
  }

  const slug = textoDoSlug(url);

  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
    });

    if (r.ok) {
      const html  = await r.text();
      const texto = extrairTexto(html);
      if (texto && texto.length >= 40) {
        return res.status(200).json({ texto: (slug ? slug + '\n' : '') + texto });
      }
    }
    if (slug && slug.length >= 8) {
      return res.status(200).json({ texto: slug, parcial: true });
    }
    return res.status(502).json({ error: `O site bloqueou a leitura (HTTP ${r.status}). Copie e cole o texto do anúncio.` });
  } catch (err) {
    console.error('fetch-anuncio error:', err.message);
    if (slug && slug.length >= 8) {
      return res.status(200).json({ texto: slug, parcial: true });
    }
    return res.status(502).json({ error: 'Não consegui acessar o link. Copie e cole o texto do anúncio.' });
  }
};
