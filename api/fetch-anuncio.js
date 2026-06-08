// Vercel API Route — lê uma URL de anúncio (ex: OLX) e extrai o texto para a IA.
// Sites com proteção anti-bot (ex: Webmotors) podem bloquear (403).

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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

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
      const html = await r.text();
      const texto = extrairTexto(html);
      if (texto && texto.length >= 40) {
        return res.status(200).json({ texto: (slug ? slug + '\n' : '') + texto });
      }
    }
    // Site bloqueou ou veio vazio: usa o que dá pra extrair do próprio endereço
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
