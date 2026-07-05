// Vercel API Route — dado marca + modelo-base (ex: "renegade"), retorna os anos
// disponíveis e as versões de cada ano. Permite a cascata Marca→Modelo→Ano→Versão.
const FIPE_BASE = 'https://parallelum.com.br/fipe/api/v1/carros';

async function fipeGet(path, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${FIPE_BASE}${path}`);
      if (res.ok) return res.json();
      if ((res.status === 429 || res.status >= 500) && i < retries - 1) {
        await new Promise(r => setTimeout(r, 600 * (i + 1)));
        continue;
      }
      throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 600 * (i + 1)));
    }
  }
}

// Executa fn sobre arr com no máximo `limit` chamadas simultâneas (evita rate limit da FIPE)
async function mapLimit(arr, limit, fn) {
  const ret = [];
  let i = 0;
  const workers = Array(Math.min(limit, arr.length)).fill(0).map(async () => {
    while (i < arr.length) {
      const idx = i++;
      ret[idx] = await fn(arr[idx]);
    }
  });
  await Promise.all(workers);
  return ret;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const marca = req.query.marca;
  const base = (req.query.base || '').toLowerCase().trim();
  if (!marca || !base) return res.status(400).json({ error: 'marca e base obrigatórios' });

  try {
    const d = await fipeGet(`/marcas/${marca}/modelos`);
    const mods = (d.modelos || []).filter(m =>
      m.nome.toLowerCase().split(/[\s\-\/.]+/)[0] === base
    );
    if (mods.length === 0) return res.status(200).json({ base, anos: [], versoes: [] });

    // Busca os anos de cada versão (máx. 6 chamadas simultâneas)
    const versoes = await mapLimit(mods, 6, async m => {
      try {
        const anos = await fipeGet(`/marcas/${marca}/modelos/${m.codigo}/anos`);
        // A FIPE separa o mesmo ano por combustível (ex: "2020 Gasolina", "2020 Diesel"),
        // com códigos diferentes e valores diferentes. Guarda o combustível à parte
        // pra não misturar o valor de um com o do outro na cascata.
        const anosLimpos = (anos || [])
          .map(a => {
            const anoNum = (a.nome.match(/\b(19|20)\d{2}\b/) || [])[0];
            const combustivel = anoNum ? a.nome.replace(anoNum, '').trim() : '';
            return { codigo: a.codigo, nome: a.nome, anoNum, combustivel };
          })
          .filter(a => a.anoNum);
        return { codigo: m.codigo, nome: m.nome, anos: anosLimpos };
      } catch { return { codigo: m.codigo, nome: m.nome, anos: [] }; }
    });

    const anosSet = new Set();
    versoes.forEach(v => v.anos.forEach(a => anosSet.add(a.anoNum)));
    const anos = [...anosSet].sort((a, b) => Number(b) - Number(a));

    return res.status(200).json({ base, anos, versoes });
  } catch (err) {
    console.error('fipe-anos-versoes error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
