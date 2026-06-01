// Vercel API Route — busca FIPE completa server-side a partir de texto livre
const FIPE_BASE = 'https://parallelum.com.br/fipe/api/v1/carros';

async function fipeGet(path, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${FIPE_BASE}${path}`);
      if (res.ok) return res.json();
      if (res.status >= 500 && i < retries - 1) {
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

function score(haystack, needle) {
  const words = needle.toLowerCase().split(/[\s\-\/]+/).filter(w => w.length > 0);
  const h = haystack.toLowerCase();
  return words.reduce((acc, w) => {
    if (w.length > 2) return acc + (h.includes(w) ? w.length : 0);
    const matched = new RegExp(`(?:^|\\s)${w}(?:\\s|$)`).test(h);
    return acc + (matched ? 1 : 0);
  }, 0);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { veiculo, ano } = req.body || {};
  if (!veiculo || !ano) return res.status(400).json({ error: 'veiculo e ano obrigatórios' });

  try {
    const vLower = veiculo.toLowerCase();

    const marcas = await fipeGet('/marcas');
    let melhorMarca = null, melhorScore = 0;
    for (const m of marcas) {
      const s = score(vLower, m.nome);
      if (s > melhorScore) { melhorScore = s; melhorMarca = m; }
    }
    // Se não encontrou marca, tenta buscar o modelo nas marcas mais populares
    if (!melhorMarca || melhorScore === 0) {
      const marcasPopulares = marcas.filter(m =>
        ['fiat','chevrolet','volkswagen','hyundai','toyota','honda','renault','jeep',
         'ford','nissan','mitsubishi','peugeot','citroen','kia','mercedes','bmw','audi']
        .some(p => m.nome.toLowerCase().includes(p))
      );
      for (const marca of marcasPopulares) {
        try {
          const d = await fipeGet(`/marcas/${marca.codigo}/modelos`);
          const mods = d.modelos || [];
          let bestMod = null, bestS = 0;
          for (const m of mods) {
            const s = score(vLower, m.nome);
            if (s > bestS) { bestS = s; bestMod = m; }
          }
          if (bestMod && bestS >= 4) { melhorMarca = marca; melhorModelo = bestMod; break; }
        } catch { continue; }
      }
      if (!melhorMarca) return res.status(200).json({ found: false, reason: 'marca não identificada' });
    }

    const data = await fipeGet(`/marcas/${melhorMarca.codigo}/modelos`);
    const modelos = data.modelos || [];
    const palavrasMarca = melhorMarca.nome.toLowerCase().split(/[\s\-\/]+/).filter(w => w.length > 2);
    let semMarca = vLower;
    palavrasMarca.forEach(p => { semMarca = semMarca.replace(new RegExp(p, 'gi'), ''); });

    let melhorModelo = null, melhorMScore = 0;
    for (const m of modelos) {
      const s = score(semMarca.trim(), m.nome);
      if (s > melhorMScore) { melhorMScore = s; melhorModelo = m; }
    }
    if (!melhorModelo || melhorMScore === 0) {
      return res.status(200).json({ found: false, reason: `${melhorMarca.nome} ok, modelo não identificado` });
    }

    const anos = await fipeGet(`/marcas/${melhorMarca.codigo}/modelos/${melhorModelo.codigo}/anos`);
    let anoObj = anos.find(a => a.nome.includes(ano) || a.codigo.startsWith(ano));
    let anoFallback = false;
    if (!anoObj && anos.length > 0) {
      anoObj = anos.filter(a => /\d{4}/.test(a.nome))
        .sort((a, b) => parseInt(b.nome) - parseInt(a.nome))[0] || anos[0];
      anoFallback = true;
    }
    if (!anoObj) return res.status(200).json({ found: false, reason: 'sem anos disponíveis' });

    const fipeData = await fipeGet(`/marcas/${melhorMarca.codigo}/modelos/${melhorModelo.codigo}/anos/${anoObj.codigo}`);

    return res.status(200).json({
      found: true,
      valor: fipeData.Valor,
      valorNumerico: (fipeData.Valor || '').replace('R$', '').trim(),
      marca: melhorMarca.nome,
      modelo: melhorModelo.nome,
      ano: anoObj.nome,
      mesReferencia: fipeData.MesReferencia,
      anoFallback,
    });

  } catch (err) {
    console.error('fipe-search error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
