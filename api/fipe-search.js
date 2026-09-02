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
const PALAVRAS_VARIANTE = ['awc','awd','4x4','4wd','sport','black','rush','outdoor','outd','tarmac','mtsp','hybrid','phev'];

// Remove acentos para comparação neutra ("híbrido" ↔ "hibrido", etc.)
const normalize = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

// skipBasePenaltyFor: palavras de marca removidas do haystack — não penalizar se o
// modelo começa com elas (ex: GWM tem modelos "Haval H6 …", após alias "haval"→"gwm"
// a base seria "gwm" que nunca aparece no texto do usuário porque foi removida junto
// com as demais palavras da marca).
function score(haystack, needle, skipBasePenaltyFor = []) {
  const hRaw = normalize(haystack.toLowerCase());
  const nRaw = normalize(needle.toLowerCase());
  // Separa letra grudada de número: "Furgão16V" → "furgão 16v", "T270" → "t 270".
  // A FIPE às vezes cola o motor no nome (ex: "Grand Furgão16V"), o que impedia o
  // match de "Furgão". Aplicado igual nos dois lados para ficar justo.
  // Também trata o ponto como separador (abreviações: "Long.", "Lo.", "Lim.").
  // Separa letra↔dígito nos dois sentidos: "GLC220D"→"glc 220 d", "16V"→"16 v", "4M"→"4 m"
  const sep = s => s
    .replace(/([a-záàâãéêíóôõúüç])(\d)/g, '$1 $2')
    .replace(/(\d)([a-záàâãéêíóôõúüç])/g, '$1 $2');
  const words  = sep(nRaw).split(/[\s\-\/.()\[\]{}]+/).filter(w => w.length > 0);
  const h      = sep(hRaw);
  const hWords = h.split(/[\s\-\/.()\[\]{}]+/).filter(Boolean); // palavras isoladas do texto

  let pts = words.reduce((acc, w) => {
    if (w.length > 2) return acc + (h.includes(w) ? w.length : 0);
    // Palavra curta: casa só se for palavra isolada (sem regex, evita erro com '(' ')' etc.)
    return acc + (hWords.includes(w) ? 1 : 0);
  }, 0);

  // Penaliza variantes específicas que aparecem no modelo mas não no texto
  // (usa o texto cru, sem separar dígitos, p/ casar "4x4", "awd" etc.)
  for (const v of PALAVRAS_VARIANTE) {
    if (nRaw.includes(v) && !hRaw.includes(v)) {
      pts -= 2;
    }
  }

  // Penaliza forte se o modelo-base (1ª palavra do nome FIPE) não aparece no texto.
  // Evita casar "Fit ... Aut" quando o usuário falou "WR-V ..." (mesmos opcionais no nome).
  const base = words[0];
  if (base && base.length >= 2 && !hWords.includes(base) && !h.includes(base)) {
    if (!skipBasePenaltyFor.includes(base)) {
      pts -= 8;
    }
  }

  return pts;
}

// Apelidos/grafias alternativas de marcas → normaliza o texto do usuário antes do scoring
const BRAND_ALIASES = [
  [/\bchery\b/g,       'caoa cherry'],  // "Chery Tiggo" → casa com "CAOA Cherry" no FIPE
  [/\bgm\b/g,          'chevrolet'],
  [/\bvw\b/g,          'volkswagen'],
  [/\bhaval\b/g,       'gwm'],          // "Haval H6" → GWM no FIPE (marca atual)
  [/\bgmw\b/g,         'gwm'],          // typo comum: "GMW" → "GWM"
  // Nota: NÃO converte gwm→great wall. GWM e Great Wall são marcas distintas no FIPE:
  // Great Wall = carros 2009-2016; GWM = carros 2019+ (Haval H6, Jolion, etc.)
  [/\bmercedes\b/g,    'mercedes-benz'], // "Mercedes GLC" → casa com "Mercedes-Benz"
  [/\bland\s*rover\b/g,'land rover'],
  [/\bjourney\b/g,     'dodge journey'], // "Journey" sem marca → Dodge
  [/\bdurango\b/g,     'dodge durango'], // "Durango" sem marca → Dodge
];

const MARCAS_POPULARES_IDS = [
  'fiat','chevrolet','volkswagen','hyundai','toyota','honda',
  'renault','jeep','ford','nissan','kia','mitsubishi','peugeot','citroen',
  'caoa','cherry','byd','great wall','gwm','haval','jac',
  'mercedes','bmw','audi','volvo','land rover','porsche','jaguar',
  'dodge','chrysler','ram','subaru','suzuki','lexus','infiniti',
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { veiculo, ano, combustivel } = req.body || {};
  if (!veiculo || !ano) return res.status(400).json({ error: 'veiculo e ano obrigatórios' });
  const combLower = (combustivel || '').toLowerCase().trim();

  // Garante que o ano seja apenas 4 dígitos reais (ex: "2024/2025" → "2024")
  const anoMatch = String(ano).match(/\b(19|20)\d{2}\b/);
  if (!anoMatch) return res.status(400).json({ error: 'ano inválido' });
  const anoLimpo = anoMatch[0];

  try {
    const vLower = BRAND_ALIASES.reduce((s, [re, rep]) => s.replace(re, rep), veiculo.toLowerCase());

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
        .map(m => {
          // Aplica aliases de marca no nome do modelo antes do scoring.
          // Corrige o caso GWM: todos os modelos começam com "Haval" (ex: "Haval H6 GT"),
          // mas o texto do usuário já teve "haval" convertido para "gwm" pelo alias.
          // Sem esta normalização, a penalidade de base dispara porque "haval" não aparece
          // em semM (que tem "gwm" removido), e o score vai negativo — modelo descartado.
          const nomeNorm = BRAND_ALIASES.reduce((s, [re, rep]) => s.replace(re, rep), m.nome.toLowerCase());
          return { marca, modelo: m, score: score(semM.trim(), nomeNorm, palavras) };
        })
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

    // Rejeita resultado fraco: se alguma palavra-chave do usuário (3+ chars, não marca,
    // não número puro) não aparece em nenhum dos top candidatos, não retorna resultado falso.
    // Ex: "GLC220" tem palavra-chave "glc" — se o top for "E-220" (sem "glc"), rejeita.
    {
      const sepFn = s => s.replace(/([a-záàâãéêíóôõúüç])(\d)/g, '$1 $2');
      const brandWords = new Set((melhorMarca?.nome || '').toLowerCase().split(/[\s\-\/]+/).filter(w => w.length >= 3));
      // Mínimo 2 chars: captura sufixos de versão curtos como "gt", "rs", "s"
      const palavrasChave = sepFn(vLower).split(/[\s\-\/]+/)
        .filter(w => w.length >= 2 && !/^\d+$/.test(w) && !brandWords.has(w));
      if (palavrasChave.length > 0) {
        // Filtra TODOS os candidatos que não contêm nenhuma palavra-chave — não rejeita
        // só o topo, porque o certo pode estar logo abaixo (ex: H6 GT AWD atrás do H6 sem AWD)
        const antes = candidatos.length;
        candidatos = candidatos.filter(c => {
          const nomeC = sepFn(c.modelo.nome.toLowerCase());
          return palavrasChave.some(w => nomeC.includes(w));
        });
        if (candidatos.length === 0) {
          console.log(`fipe-search: "${veiculo}" sem candidato para [${palavrasChave}]`);
          return res.status(200).json({ found: false, reason: 'modelo não encontrado na FIPE' });
        }
      }
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

    // A FIPE lista o mesmo ano separado por combustível (ex: "2020 Gasolina",
    // "2020 Diesel"), cada um com código e valor próprios. Sem essa
    // desambiguação o código pegava o primeiro que aparecesse, o que às vezes
    // trazia o valor de Gasolina pra um carro Diesel (e vice-versa).
    // Os anos de cada candidato eram buscados em série, um a um, até achar o
    // primeiro com o ano pedido. Com 12 candidatos a ~1,5s cada, uma Hilux
    // levava 21 segundos. Aqui todos são buscados de uma vez (concorrência
    // limitada, para não tomar 429 da Parallelum) e as passadas seguintes
    // trabalham em memória.
    const anosDe = new Map();
    const fila = [...topCands];
    await Promise.all(Array(Math.min(6, fila.length)).fill(0).map(async () => {
      while (fila.length) {
        const c = fila.shift();
        const chave = `${c.marca.codigo}/${c.modelo.codigo}`;
        try {
          anosDe.set(chave, await fipeGet(`/marcas/${c.marca.codigo}/modelos/${c.modelo.codigo}/anos`));
        } catch {
          anosDe.set(chave, []);
        }
      }
    }));
    const anosCand = (c) => anosDe.get(`${c.marca.codigo}/${c.modelo.codigo}`) || [];

    const doAno = (anos) =>
      anos.filter(a => a.nome.includes(anoLimpo) || a.codigo.startsWith(anoLimpo));
    const bateComb = (a) => a.nome.toLowerCase().includes(combLower);

    let escolhido = null, anoObj = null, anoFallback = false;

    // 1ª passada: ano exato E combustível pedido.
    //
    // O combustível só era usado para escolher entre os anos de um modelo já
    // definido — nunca para escolher o modelo. Como o laço parava no primeiro
    // candidato com o ano certo, "Hilux SRV 2.8 diesel" caía na "Hilux CD SRV
    // 4x2 2.7 Flex" e "Corolla 2023 flex" caía na "Altis (Híbrido)": carros e
    // preços completamente diferentes do pedido.
    if (combLower) {
      for (const c of topCands) {
        const match = doAno(anosCand(c)).find(bateComb);
        if (match) { escolhido = c; anoObj = match; break; }
      }
    }

    // 2ª passada: ano exato, qualquer combustível (o comportamento antigo,
    // agora como recuo e não como regra).
    if (!escolhido) {
      for (const c of topCands) {
        const doAnoC = doAno(anosCand(c));
        if (doAnoC.length) {
          escolhido = c;
          anoObj = (combLower && doAnoC.find(bateComb)) || doAnoC[0];
          break;
        }
      }
    }

    // 3ª passada: ninguém tem o ano exato → melhor score com ano mais próximo
    if (!escolhido) {
      const c = topCands[0];
      const anosReais = anosCand(c)
        .map(a => ({ obj: a, n: parseInt(a.nome.match(/\b(19|20)\d{2}\b/)?.[0] || '0') }))
        .filter(a => a.n > 0);
      const anoInt = parseInt(anoLimpo);
      anosReais.sort((a, b) => Math.abs(a.n - anoInt) - Math.abs(b.n - anoInt));
      escolhido = c; anoObj = anosReais[0]?.obj || null; anoFallback = true;
    }

    if (!anoObj) return res.status(200).json({ found: false, reason: 'sem anos disponíveis' });

    // ── 4. VALOR FIPE ─────────────────────────────────────────────────────────
    const fipeData = await fipeGet(`/marcas/${escolhido.marca.codigo}/modelos/${escolhido.modelo.codigo}/anos/${anoObj.codigo}`);

    const result = {
      found: true,
      valor: fipeData.Valor,
      valorNumerico: (fipeData.Valor || '').replace('R$', '').trim(),
      marca: escolhido.marca.nome,
      modelo: escolhido.modelo.nome,
      ano: anoObj.nome,
      combustivel: fipeData.Combustivel || anoObj.nome.replace(/\b(19|20)\d{2}\b/, '').trim() || null,
      mesReferencia: fipeData.MesReferencia,
      anoFallback,
    };
    console.log(`fipe-search: "${veiculo}" ${ano} → ${result.marca} ${result.modelo} ${result.ano} score=${escolhido.score}`);
    return res.status(200).json(result);

  } catch (err) {
    console.error('fipe-search error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
