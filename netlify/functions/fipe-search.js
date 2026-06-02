// Netlify Function — busca FIPE completa server-side a partir de texto livre
// Browser faz 1 chamada, esta função faz todas as cascatas internamente com retry

const FIPE_BASE = 'https://parallelum.com.br/fipe/api/v1/carros';

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

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

// Pontuação ponderada:
// - palavras longas (>2 chars): peso = tamanho da palavra
// - tokens curtos (1-2 chars, ex: "T", "S", "X"): peso 1 se match de palavra inteira
// Isso distingue "718 Boxster T" de "718 Boxster" corretamente
function score(haystack, needle) {
  const words = needle.toLowerCase().split(/[\s\-\/]+/).filter(w => w.length > 0);
  const h = haystack.toLowerCase();
  return words.reduce((acc, w) => {
    if (w.length > 2) {
      return acc + (h.includes(w) ? w.length : 0);
    }
    // Token curto: só conta se for palavra inteira (evita "s" matching em "sp" etc.)
    const matched = new RegExp(`(?:^|\\s)${w}(?:\\s|$)`).test(h);
    return acc + (matched ? 1 : 0);
  }, 0);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: HEADERS, body: '' };
  }

  let veiculo, ano;
  try {
    ({ veiculo, ano } = JSON.parse(event.body || '{}'));
  } catch {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Body inválido' }) };
  }

  if (!veiculo || !ano) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'veiculo e ano obrigatórios' }) };
  }

  // Garante que o ano seja apenas 4 dígitos numéricos (ex: "2024/2025" → "2024")
  const anoMatch = String(ano).match(/\d{4}/);
  if (!anoMatch) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'ano inválido' }) };
  }
  const anoLimpo = anoMatch[0];

  try {
    const vLower = veiculo.toLowerCase();

    // 1. Marcas
    const marcas = await fipeGet('/marcas');
    let melhorMarca = null, melhorScore = 0;
    for (const m of marcas) {
      const s = score(vLower, m.nome);
      if (s > melhorScore) { melhorScore = s; melhorMarca = m; }
    }
    if (!melhorMarca || melhorScore === 0) {
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ found: false, reason: 'marca não identificada' }) };
    }

    // 2. Modelos
    const data = await fipeGet(`/marcas/${melhorMarca.codigo}/modelos`);
    const modelos = data.modelos || [];

    // Remove palavras da marca do texto para melhorar match do modelo
    const palavrasMarca = melhorMarca.nome.toLowerCase().split(/[\s\-\/]+/).filter(w => w.length > 2);
    let semMarca = vLower;
    palavrasMarca.forEach(p => { semMarca = semMarca.replace(new RegExp(p, 'gi'), ''); });

    let melhorModelo = null, melhorMScore = 0;
    for (const m of modelos) {
      const s = score(semMarca.trim(), m.nome);
      if (s > melhorMScore) { melhorMScore = s; melhorModelo = m; }
    }
    if (!melhorModelo || melhorMScore === 0) {
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ found: false, reason: `marca ${melhorMarca.nome} ok, modelo não identificado` }) };
    }

    // 3. Anos — tenta ano exato, senão usa o mais recente disponível
    const anos = await fipeGet(`/marcas/${melhorMarca.codigo}/modelos/${melhorModelo.codigo}/anos`);
    let anoObj = anos.find(a => a.nome.includes(anoLimpo) || a.codigo.startsWith(anoLimpo));
    let anoFallback = false;
    if (!anoObj && anos.length > 0) {
      // Tenta o ano mais próximo ao solicitado
      // Filtra apenas anos reais (1900-2099) — exclui códigos internos FIPE como "32000"
      const anosComAnno = anos
        .map(a => ({ obj: a, n: parseInt(a.nome.match(/\b(19|20)\d{2}\b/)?.[0] || '0') }))
        .filter(a => a.n > 0);
      const anoInt = parseInt(anoLimpo);
      anosComAnno.sort((a, b) => Math.abs(a.n - anoInt) - Math.abs(b.n - anoInt));
      anoObj = anosComAnno[0]?.obj || null;
      anoFallback = true;
    }
    if (!anoObj) {
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ found: false, reason: `${melhorMarca.nome} ${melhorModelo.nome} — sem anos disponíveis` }) };
    }

    // 4. Valor FIPE
    const fipeData = await fipeGet(`/marcas/${melhorMarca.codigo}/modelos/${melhorModelo.codigo}/anos/${anoObj.codigo}`);

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        found: true,
        valor: fipeData.Valor,
        valorNumerico: (fipeData.Valor || '').replace('R$', '').trim(),
        marca: melhorMarca.nome,
        modelo: melhorModelo.nome,
        ano: anoObj.nome,
        mesReferencia: fipeData.MesReferencia,
        anoFallback,
      }),
    };

  } catch (err) {
    console.error('fipe-search error:', err.message);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
