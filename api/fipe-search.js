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

// Palavras que indicam variante específica — penaliza se estão no modelo mas NÃO no texto do usuário
const PALAVRAS_VARIANTE = ['awc','awd','4x4','4wd','sport','black','rush','outdoor','outd','tarmac','mtsp','híb','hybrid','phev'];

function score(haystack, needle) {
  const words = needle.toLowerCase().split(/[\s\-\/]+/).filter(w => w.length > 0);
  const h = haystack.toLowerCase();

  let pts = words.reduce((acc, w) => {
    if (w.length > 2) return acc + (h.includes(w) ? w.length : 0);
    const matched = new RegExp(`(?:^|\\s)${w}(?:\\s|$)`).test(h);
    return acc + (matched ? 1 : 0);
  }, 0);

  // Penaliza variantes específicas que aparecem no modelo mas não no texto
  for (const v of PALAVRAS_VARIANTE) {
    if (needle.toLowerCase().includes(v) && !h.includes(v)) {
      pts -= 3;
    }
  }

  return pts;
}

const MARCAS_POPULARES_IDS = [
  'fiat','chevrolet','volkswagen','hyundai','toyota','honda',
  'renault','jeep','ford','nissan','kia','mitsubishi','peugeot','citroen',
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { veiculo, ano } = req.body || {};
  if (!veiculo || !ano) return res.status(400).json({ error: 'veiculo e ano obrigatórios' });

  // Garante que o ano seja apenas 4 dígitos reais (ex: "2024/2025" → "2024")
  const anoMatch = String(ano).match(/\b(19|20)\d{2}\b/);
  if (!anoMatch) return res.status(400).json({ error: 'ano inválido' });
  const anoLimpo = anoMatch[0];

  try {
    const vLower = veiculo.toLowerCase();

    // ── 1. MARCA ──────────────────────────────────────────────────────────────
    const marcas = await fipeGet('/marcas');
    let melhorMarca = null, melhorScore = 0;
    for (const m of marcas) {
      const s = score(vLower, m.nome);
      if (s > melhorScore) { melhorScore = s; melhorMarca = m; }
    }

    // ── 2. MODELO ─────────────────────────────────────────────────────────────
    // Função auxiliar: retorna TODOS os modelos de uma marca pontuados (ordenado desc)
    async function buscaModelos(marca) {
      const d = await fipeGet(`/marcas/${marca.codigo}/modelos`);
      const mods = d.modelos || [];
      const palavras = marca.nome.toLowerCase().split(/[\s\-\/]+/).filter(w => w.length > 2);
      let semM = vLower;
      palavras.forEach(p => { semM = semM.replace(new RegExp(p, 'gi'), ''); });
      return mods
        .map(m => ({ marca, modelo: m, score: score(semM.trim(), m.nome) }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score);
    }

    // Acumula candidatos (modelo + marca + score)
    let candidatos = [];
    if (melhorMarca && melhorScore > 0) {
      candidatos = await buscaModelos(melhorMarca);
    }

    // Se nada bom na marca detectada, varre marcas populares (marca não detectada
    // ou IA inferiu marca errada) e junta tudo
    if (candidatos.length === 0 || candidatos[0].score < 4) {
      const marcasTentativas = marcas.filter(m =>
        MARCAS_POPULARES_IDS.some(p => m.nome.toLowerCase().includes(p)) &&
        m.codigo !== melhorMarca?.codigo
      );
      for (const marca of marcasTentativas) {
        try { candidatos = candidatos.concat(await buscaModelos(marca)); } catch { continue; }
      }
      candidatos.sort((a, b) => b.score - a.score);
    }

    if (candidatos.length === 0) {
      return res.status(200).json({ found: false, reason: 'modelo não identificado' });
    }

    // ── 3. MODELO + ANO (desambiguação) ───────────────────────────────────────
    // Entre as VERSÕES do mesmo modelo/marca do melhor candidato, prefere a que TEM
    // o ano pedido (ex: "Renegade Longitude Flex 2023" → 1.3 Turbo, não a 1.8 que só
    // vai até 2021). Trava na mesma marca + mesmo modelo-base para não pular para
    // outro carro (ex: Commander) só porque ele tem o ano.
    const top = candidatos[0];
    const ancora = top.modelo.nome.toLowerCase().split(/[\s\-\/]+/)[0];
    const topCands = candidatos.filter(c =>
      c.marca.codigo === top.marca.codigo &&
      c.modelo.nome.toLowerCase().split(/[\s\-\/]+/)[0] === ancora
    ).slice(0, 12);

    const temAnoExato = (anos) =>
      anos.find(a => a.nome.includes(anoLimpo) || a.codigo.startsWith(anoLimpo));

    let escolhido = null, anoObj = null, anoFallback = false;

    // 1ª passada: maior score que possua o ano exato
    for (const c of topCands) {
      try {
        const anos = await fipeGet(`/marcas/${c.marca.codigo}/modelos/${c.modelo.codigo}/anos`);
        const exato = temAnoExato(anos);
        if (exato) { escolhido = c; anoObj = exato; break; }
      } catch { continue; }
    }

    // 2ª passada: ninguém tem o ano exato → melhor score com ano mais próximo
    if (!escolhido) {
      const c = topCands[0];
      const anos = await fipeGet(`/marcas/${c.marca.codigo}/modelos/${c.modelo.codigo}/anos`);
      const anosReais = anos
        .map(a => ({ obj: a, n: parseInt(a.nome.match(/\b(19|20)\d{2}\b/)?.[0] || '0') }))
        .filter(a => a.n > 0);
      const anoInt = parseInt(anoLimpo);
      anosReais.sort((a, b) => Math.abs(a.n - anoInt) - Math.abs(b.n - anoInt));
      escolhido = c; anoObj = anosReais[0]?.obj || null; anoFallback = true;
    }

    if (!anoObj) return res.status(200).json({ found: false, reason: 'sem anos disponíveis' });

    // ── 4. VALOR FIPE ─────────────────────────────────────────────────────────
    const fipeData = await fipeGet(`/marcas/${escolhido.marca.codigo}/modelos/${escolhido.modelo.codigo}/anos/${anoObj.codigo}`);

    return res.status(200).json({
      found: true,
      valor: fipeData.Valor,
      valorNumerico: (fipeData.Valor || '').replace('R$', '').trim(),
      marca: escolhido.marca.nome,
      modelo: escolhido.modelo.nome,
      ano: anoObj.nome,
      mesReferencia: fipeData.MesReferencia,
      anoFallback,
    });

  } catch (err) {
    console.error('fipe-search error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
