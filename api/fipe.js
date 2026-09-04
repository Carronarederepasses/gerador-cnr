// Vercel API Route — proxy Parallelum FIPE + anos/versões (sem CORS, sem chave)
const { exigirChave } = require('./_auth');

const FIPE_BASE = 'https://parallelum.com.br/fipe/api/v1/carros';

async function fipeGet(endpoint, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${FIPE_BASE}${endpoint}`);
      if (res.ok) return res.json();
      if ((res.status === 429 || res.status >= 500) && i < retries - 1) {
        await new Promise(r => setTimeout(r, 600 * (i + 1)));
        continue;
      }
      throw new Error(`Parallelum HTTP ${res.status}`);
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 600 * (i + 1)));
    }
  }
}

async function mapLimit(arr, limit, fn) {
  const ret = [];
  let i = 0;
  const workers = Array(Math.min(limit, arr.length)).fill(0).map(async () => {
    while (i < arr.length) { const idx = i++; ret[idx] = await fn(arr[idx]); }
  });
  await Promise.all(workers);
  return ret;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Parallelum e gratis, mas proxy aberto e proxy de todo mundo.
  if (exigirChave(req, res)) return;


  // ── Modo anos/versões: ?marca=<codigo>&base=<nome-base> ──────────────────
  if (req.query.marca && req.query.base) {
    const marca = req.query.marca;
    const base = (req.query.base || '').toLowerCase().trim();
    try {
      const d = await fipeGet(`/marcas/${marca}/modelos`);
      const mods = (d.modelos || []).filter(m =>
        m.nome.toLowerCase().split(/[\s\-\/.]+/)[0] === base
      );
      if (!mods.length) return res.status(200).json({ base, anos: [], versoes: [] });

      const versoes = await mapLimit(mods, 6, async m => {
        try {
          const anos = await fipeGet(`/marcas/${marca}/modelos/${m.codigo}/anos`);
          const anosLimpos = (anos || []).map(a => {
            const anoNum = (a.nome.match(/\b(19|20)\d{2}\b/) || [])[0];
            const combustivel = anoNum ? a.nome.replace(anoNum, '').trim() : '';
            return { codigo: a.codigo, nome: a.nome, anoNum, combustivel };
          }).filter(a => a.anoNum);
          return { codigo: m.codigo, nome: m.nome, anos: anosLimpos };
        } catch { return { codigo: m.codigo, nome: m.nome, anos: [] }; }
      });

      const anosSet = new Set();
      versoes.forEach(v => v.anos.forEach(a => anosSet.add(a.anoNum)));
      const anos = [...anosSet].sort((a, b) => Number(b) - Number(a));
      return res.status(200).json({ base, anos, versoes });
    } catch (err) {
      console.error('fipe anos-versoes error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── Modo proxy path: ?path=<rota-fipe> ───────────────────────────────────
  const path = (req.query.path || '').replace(/^\//, '');
  const parts = path.split('/').filter(Boolean);
  try {
    if (parts.length === 1 && parts[0] === 'marcas')
      return res.status(200).json(await fipeGet('/marcas'));
    if (parts.length === 3 && parts[2] === 'modelos')
      return res.status(200).json(await fipeGet(`/marcas/${parts[1]}/modelos`));
    if (parts.length === 5 && parts[4] === 'anos')
      return res.status(200).json(await fipeGet(`/marcas/${parts[1]}/modelos/${parts[3]}/anos`));
    if (parts.length === 6)
      return res.status(200).json(await fipeGet(`/marcas/${parts[1]}/modelos/${parts[3]}/anos/${parts[5]}`));
    return res.status(404).json({ error: 'Rota não encontrada' });
  } catch (err) {
    console.error('fipe error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
