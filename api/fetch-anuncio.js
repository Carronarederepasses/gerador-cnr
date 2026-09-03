// Vercel API Route — modos via query param.
// Tudo mora neste arquivo porque o plano Hobby da Vercel limita a 12 funções
// serverless e o projeto já está no teto; um arquivo novo em api/ quebraria o
// deploy inteiro. Páginas HTML não contam no limite.
//
//   ?radar=1    → CRUD da tabela anuncios (Catafrango → Gerador)
//   ?mensagens=1→ conversas espelhadas do chat da OLX
//   ?buscas=1   → configuração das buscas do Radar (tela radar.html)
//   (sem param) → lê URL externa e extrai texto para a IA
//                 (URLs da OLX são recusadas: leitura passa pela extensão)
//
// Env vars para o modo radar:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   RADAR_KEY  (opcional — se definida, exige x-cnr-key no POST)

const { exigirChave } = require('./_auth');

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

// ── Modo Ideias: caderno do Yuri ─────────────────────────────────
// GET    → lista (novas primeiro, mais recentes no topo)
// POST   → anota uma ideia   { texto }
// PATCH  → muda o status     ?id=N  { status }
// DELETE → apaga             ?id=N
async function handleIdeias(req, res) {
  if (req.method === 'GET') {
    const r = await sb('ideias?select=*&order=status.asc,criada_em.desc&limit=500');
    if (!r.ok) return res.status(502).json({ error: `Supabase HTTP ${r.status}` });
    return res.status(200).json(await r.json());
  }

  if (req.method === 'POST') {
    const texto = String((req.body || {}).texto || '').trim();
    if (!texto) return res.status(400).json({ error: 'Escreva alguma coisa.' });
    if (texto.length > 4000) return res.status(400).json({ error: 'Texto muito longo.' });

    const r = await sb('ideias', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ texto }),
    });
    if (!r.ok) {
      const corpo = await r.text().catch(() => '');
      return res.status(502).json({ error: `Falha ao gravar: ${corpo.slice(0, 200)}` });
    }
    const linhas = await r.json();
    return res.status(201).json(Array.isArray(linhas) ? linhas[0] : linhas);
  }

  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'id obrigatório.' });

  if (req.method === 'PATCH') {
    const status = String((req.body || {}).status || '');
    if (!['nova', 'feita', 'descartada'].includes(status)) {
      return res.status(400).json({ error: 'status inválido.' });
    }
    const r = await sb(`ideias?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ status }),
    });
    if (!r.ok) return res.status(502).json({ error: await r.text() });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const r = await sb(`ideias?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE', headers: { Prefer: 'return=minimal' },
    });
    if (!r.ok) return res.status(502).json({ error: await r.text() });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Método não suportado.' });
}

// ── Modo Buscas: configuração das URLs do Radar ──────────────────
// GET  → lista as buscas (a extensão puxa daqui a cada verificação)
// POST → grava o conjunto inteiro enviado pela tela do Radar
async function handleBuscas(req, res) {
  if (req.method === 'GET') {
    const r = await sb('buscas?select=*&order=ordem.asc,id.asc');
    if (!r.ok) {
      return res.status(502).json({ error: `Supabase HTTP ${r.status}` });
    }
    return res.status(200).json(await r.json());
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não suportado.' });
  }

  if (RADAR_KEY && req.headers['x-cnr-key'] !== RADAR_KEY) {
    return res.status(401).json({ error: 'Acesso negado.' });
  }

  const { buscas } = req.body || {};
  if (!Array.isArray(buscas)) {
    return res.status(400).json({ error: 'Envie um array "buscas".' });
  }
  if (buscas.length > 30) {
    return res.status(400).json({ error: 'Máximo de 30 buscas.' });
  }

  // Validação antes de tocar no banco: uma busca inválida é melhor recusada
  // inteira do que gravada e descoberta só quando o Radar não achar nada.
  const linhas = [];
  for (const [i, b] of buscas.entries()) {
    const nome = String(b?.nome || '').trim();
    const url  = String(b?.url  || '').trim();
    if (!nome) return res.status(400).json({ error: `Busca ${i + 1}: falta o nome.` });
    if (!/^https:\/\/([a-z0-9-]+\.)*olx\.com\.br\//i.test(url)) {
      return res.status(400).json({
        error: `Busca "${nome}": a URL precisa ser uma busca da OLX (https://...olx.com.br/...).`,
      });
    }
    linhas.push({
      id:    String(b?.id || '').trim() || `busca-${Date.now()}-${i}`,
      nome,
      url,
      ativa: b?.ativa !== false,
      ordem: i,
    });
  }

  // Grava primeiro, apaga depois. Se o upsert falhar, a configuração antiga
  // continua de pé — o inverso deixaria o Radar sem nenhuma busca.
  if (linhas.length) {
    const up = await sb('buscas?on_conflict=id', {
      method:  'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body:    JSON.stringify(linhas),
    });
    if (!up.ok) {
      const corpo = await up.text().catch(() => '');
      return res.status(502).json({ error: `Falha ao gravar: HTTP ${up.status} ${corpo.slice(0, 200)}` });
    }
  }

  const manter = linhas.map((l) => l.id);
  const filtro = manter.length
    ? `id=not.in.(${manter.map((id) => `"${id.replace(/"/g, '')}"`).join(',')})`
    : 'id=neq.__nenhum__'; // sem buscas: apaga tudo
  const del = await sb(`buscas?${filtro}`, {
    method:  'DELETE',
    headers: { Prefer: 'return=minimal' },
  });
  if (!del.ok) {
    const corpo = await del.text().catch(() => '');
    return res.status(502).json({
      error: `Buscas salvas, mas a limpeza das antigas falhou: HTTP ${del.status} ${corpo.slice(0, 200)}`,
    });
  }

  return res.status(200).json({ ok: true, salvas: linhas.length });
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
      thumbnail:    l.thumbnail   || null,
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
    //
    // Thumbnail — estratégia de dois grupos:
    //   rowsWithThumb    → inclui thumbnail em columns (grava/atualiza a foto)
    //   rowsWithoutThumb → omite thumbnail de columns (preserva a foto já salva no banco)
    // Isso impede que um re-scan sem foto sobrescreva uma foto válida existente.
    const colsBase  = 'origem,listing_id,url,titulo,preco,localizacao,search_name,last_seen_at';
    const colsThumb = colsBase + ',thumbnail';

    const rowsWithThumb    = rows.filter((r) => r.thumbnail);
    const rowsWithoutThumb = rows.filter((r) => !r.thumbnail);

    if (rowsWithThumb.length > 0) {
      const r1 = await sb(`anuncios?columns=${colsThumb}&on_conflict=origem,listing_id`, {
        method:  'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body:    JSON.stringify(rowsWithThumb),
      });
      if (!r1.ok) {
        const err = await r1.text();
        console.error('[radar] upsert (com thumbnail) falhou:', err);
        return res.status(500).json({ error: 'Falha ao salvar anúncios.' });
      }
    }

    if (rowsWithoutThumb.length > 0) {
      const r2 = await sb(`anuncios?columns=${colsBase}&on_conflict=origem,listing_id`, {
        method:  'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body:    JSON.stringify(rowsWithoutThumb),
      });
      if (!r2.ok) {
        const err = await r2.text();
        console.error('[radar] upsert (sem thumbnail) falhou:', err);
        return res.status(500).json({ error: 'Falha ao salvar anúncios.' });
      }
    }

    return res.status(200).json({
      ok: true,
      count: rows.length,
      raw: rowsRaw.length,
      withThumb: rowsWithThumb.length,
      withoutThumb: rowsWithoutThumb.length,
    });
  }

  // PATCH — atualiza campos de fluxo (status, motivo_morte, vehicle_id)
  // Aceita dois modos de filtro:
  //   ?id=<uuid>          → Gerador frontend (anuncios.html)
  //   ?listing_id=<id>&origem=<olx|...> → extensão (não conhece o UUID)
  if (req.method === 'PATCH') {
    let filter;
    if (q.id) {
      filter = `id=eq.${q.id}`;
    } else if (q.listing_id) {
      const origem = q.origem || 'olx';
      filter = `listing_id=eq.${encodeURIComponent(q.listing_id)}&origem=eq.${encodeURIComponent(origem)}`;
    } else {
      return res.status(400).json({ error: 'id ou listing_id required' });
    }

    const body    = req.body || {};
    const payload = {};
    if (body.status       !== undefined) payload.status       = body.status;
    if (body.motivo_morte !== undefined) payload.motivo_morte = body.motivo_morte;
    if (body.vehicle_id   !== undefined) payload.vehicle_id   = body.vehicle_id;

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
    }

    const r = await sb(`anuncios?${filter}`, {
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

// ── Modo Mensagens: histórico de chat capturado pela extensão ────
// GET  ?mensagens=1&listing_id=<id>  → lista mensagens do anúncio
// POST ?mensagens=1                  → insere mensagem (dedup via msg_hash)
async function handleMensagens(req, res) {
  const q = req.query;

  // GET sem listing_id → resumo de TODAS as conversas, para a lista lateral.
  // Uma linha por anúncio: última mensagem, de quem foi e quantas existem.
  //
  // O agrupamento é feito aqui e não no Postgres porque PostgREST não faz
  // DISTINCT ON, e criar uma view exigiria migration para pouca coisa: são
  // centenas de linhas, não milhões.
  if (req.method === 'GET' && !q.listing_id) {
    const r = await sb('olx_mensagens?order=detected_at.desc&limit=2000');
    if (!r.ok) return res.status(502).json({ error: `Supabase HTTP ${r.status}` });
    const linhas = await r.json();

    const porAnuncio = new Map();
    for (const m of linhas) {
      // Vem ordenado do mais novo para o mais velho: o primeiro de cada
      // listing_id já é a última mensagem.
      if (!porAnuncio.has(m.listing_id)) {
        porAnuncio.set(m.listing_id, {
          listing_id:   m.listing_id,
          platform:     m.platform || 'olx',
          ultima:       m.content || '',
          direction:    m.direction,
          detected_at:  m.detected_at,
          total:        0,
          recebidas:    0,
          // As 5 mais recentes. A detecção de novidade compara a prévia da
          // caixa de entrada da OLX com estas, não só com a última: a prévia
          // nem sempre corresponde à mensagem mais nova do espelho, e comparar
          // com uma só gerava alarme falso em conversa sem nada de novo.
          ultimas:      [],
        });
      }
      const c = porAnuncio.get(m.listing_id);
      c.total++;
      if (m.direction === 'incoming') c.recebidas++;
      if (c.ultimas.length < 5) c.ultimas.push(m.content || '');
    }
    return res.status(200).json([...porAnuncio.values()]);
  }

  if (req.method === 'GET') {
    const { listing_id } = q;

    const r = await sb(
      `olx_mensagens?listing_id=eq.${encodeURIComponent(listing_id)}&order=detected_at.asc`
    );
    const data = await r.json();
    return res.status(200).json(data);
  }

  // DELETE — apaga o histórico de mensagens de UM anúncio.
  // Usado para reespelhar do zero quando a captura muda (o dedupe por
  // msg_hash impede que um re-sync corrija linhas já gravadas).
  // Exige listing_id: não existe apagar tudo.
  if (req.method === 'DELETE') {
    const { listing_id } = q;
    if (!listing_id) return res.status(400).json({ error: 'listing_id required' });

    const r = await sb(
      `olx_mensagens?listing_id=eq.${encodeURIComponent(listing_id)}`,
      { method: 'DELETE', headers: { Prefer: 'return=representation' } }
    );
    if (!r.ok) {
      const err = await r.text();
      return res.status(500).json({ error: err });
    }
    const apagadas = await r.json().catch(() => []);
    return res.status(200).json({
      ok: true,
      apagadas: Array.isArray(apagadas) ? apagadas.length : 0,
    });
  }

  if (req.method === 'POST') {
    // Auth: mesma RADAR_KEY usada pelo POST do radar
    if (RADAR_KEY && req.headers['x-cnr-key'] !== RADAR_KEY) {
      return res.status(401).json({ error: 'Acesso negado.' });
    }

    const { listing_id, origem = 'olx', direction, content, detected_at } = req.body || {};
    if (!listing_id || !direction || !content) {
      return res.status(400).json({ error: 'listing_id, direction e content são obrigatórios' });
    }

    console.log('[CNR DEBUG 43.1] mensagens POST recebido', { listing_id, direction, content: content?.slice(0, 80) }); // DEBUG 43.1

    // Hash determinístico para deduplicação (SHA-256 do Node.js)
    const crypto   = require('crypto');
    const msg_hash = crypto
      .createHash('sha256')
      .update(`${listing_id}:${direction}:${content}`)
      .digest('hex');

    const row = {
      listing_id,
      origem,
      direction,
      content,
      msg_hash,
      detected_at: detected_at || new Date().toISOString(),
    };

    // ON CONFLICT (msg_hash) → ignorar duplicata (mesma mensagem detectada 2x)
    const r = await sb('olx_mensagens?on_conflict=msg_hash', {
      method:  'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body:    JSON.stringify(row),
    });

    console.log('[CNR DEBUG 43.1] insert resultado HTTP', r.status, r.ok ? 'OK' : 'ERRO'); // DEBUG 43.1
    if (!r.ok) {
      const err = await r.text();
      return res.status(500).json({ error: err });
    }
    return res.status(200).json({ ok: true, msg_hash });
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-cnr-key');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Portão único (api/_auth.js), antes de escolher o modo. Vale inclusive
  // para o modo padrão: buscar uma URL qualquer pelo servidor da Vercel é
  // um proxy aberto se qualquer um puder chamar.
  // As guardas RADAR_KEY internas seguem de pé de propósito — se o portão
  // estiver desligado, elas ainda protegem a escrita.
  if (exigirChave(req, res)) return;

  // Modo Radar
  if ('radar' in req.query) return handleRadar(req, res);

  // Modo Buscas: configuração do Radar (Reforma 23)
  if ('buscas' in req.query) return handleBuscas(req, res);

  // Modo Ideias: caderno do Yuri
  if ('ideias' in req.query) return handleIdeias(req, res);

  // Modo Mensagens (Reforma 43)
  if ('mensagens' in req.query) return handleMensagens(req, res);

  // Modo padrão: fetch URL para IA
  const url = (req.body && req.body.url) || req.query.url;
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: 'URL inválida' });
  }

  // A OLX sai deste caminho de propósito. Buscar a página daqui significa o
  // servidor da Vercel se apresentando como um Chrome que não existe — sem a
  // sessão do operador e com identificação forjada. Era a única coisa no
  // sistema que se parecia com crawling, e os Termos da OLX vedam isso.
  // A leitura passou para a extensão, no navegador do próprio operador.
  if (/^https?:\/\/([a-z0-9-]+\.)*olx\.com\.br\//i.test(url)) {
    return res.status(400).json({
      error: 'Links da OLX são lidos pela extensão, no seu navegador. ' +
             'Ative a extensão Captação Inteligente e recarregue a página — ' +
             'ou cole o texto do anúncio em vez do link.',
    });
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
