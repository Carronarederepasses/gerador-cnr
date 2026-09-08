// Vercel API Route — busca FIPE completa server-side a partir de texto livre
const { exigirChave } = require('./_auth');

const FIPE_BASE = 'https://parallelum.com.br/fipe/api/v1/carros';

// Cache em memória do processo. A tabela FIPE muda uma vez por mês, e a lista
// de marcas e modelos quase nunca — mas a busca refaz as mesmas dezenas de
// chamadas a cada consulta. Numa instância morna, a segunda consulta do Yuri
// deixa de pagar a varredura inteira.
//
// É por instância e some quando a Vercel recicla a função: serve para deixar
// o uso seguido mais rápido, não para garantir nada. TTL curto o bastante
// para nunca segurar uma tabela nova por muito tempo.
const CACHE = new Map();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6h

async function fipeGet(path, retries = 3) {
  const emCache = CACHE.get(path);
  if (emCache && emCache.expira > Date.now()) return emCache.valor;

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${FIPE_BASE}${path}`);
      if (res.ok) {
        const dados = await res.json();
        CACHE.set(path, { valor: dados, expira: Date.now() + CACHE_TTL });
        return dados;
      }
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
  // Cada palavra conta UMA vez. Sem o Set, um nome que repete o mesmo pedaço
  // ganha pontos por repetição — e nomes longos da FIPE repetem muito.
  //
  // Foi assim que "Gol 1.0" de 2018 casou com
  // "Gol GL 1.6 Mi/Star 1.6 e 1.8/Atlanta 1.6": o "1" aparece quatro vezes
  // nesse nome, somou +4, e passou na frente de "Gol 1.0 Flex 12V 5p", que
  // é o carro certo. Depois, como esse modelo não tem 2018, o resultado saiu
  // com ano 1998 e R$ 17.219 — indistinguível de um acerto na tela.
  //
  // Casar o mesmo pedaço quatro vezes não torna o carro mais parecido.
  // O ponto entre dígitos NÃO separa: "1.0" é uma palavra, não "1" e "0".
  //
  // Medido em 07/set com "Hyundai HB20S 1.0 Manual" 2021: partindo no ponto,
  // as palavras viravam [hb, 20s, 1, 0, manual]. Como "1" e "0" também saem
  // de "1.6", "16V" e "12V", TODOS os 135 HB20S empatavam — a nota deixava de
  // ordenar. O certo (Evolution 1.0 Mec.) caía para a posição 19, fora da
  // janela, e a busca respondia que não encontrou.
  //
  // "1.0" inteiro tem 3 caracteres, entra na regra de palavra longa e vale
  // pelo tamanho — e, principalmente, não casa com "1.6".
  const CORTE  = /[\s\-\/()\[\]{}]+|\.(?!\d)|(?<!\d)\./;
  const words  = [...new Set(sep(nRaw).split(CORTE).filter(w => w.length > 0))];
  const h      = sep(hRaw);
  const hWords = h.split(CORTE).filter(Boolean); // palavras isoladas do texto

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

// Roda `fn` sobre os itens com no máximo `limite` chamadas ao mesmo tempo.
// A Parallelum devolve 429 se apertar demais (fipeGet já tem retry), então o
// limite existe para não trocar lentidão por erro.
async function emParalelo(itens, limite, fn) {
  const fila = [...itens];
  const saida = [];
  await Promise.all(
    Array(Math.min(limite, fila.length)).fill(0).map(async () => {
      while (fila.length) {
        const item = fila.shift();
        try { saida.push(await fn(item)); } catch { /* item ignorado */ }
      }
    })
  );
  return saida;
}

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

  // Idem fipe.js — e esta faz dezenas de chamadas por consulta.
  if (exigirChave(req, res)) return;


  // `fipeTexto` é o valor que o próprio anúncio declara, quando declara.
  // Serve para desempatar entre versões do mesmo carro — ver o bloco
  // "escolha por preço" mais abaixo.
  const { veiculo, ano, combustivel, fipeTexto } = req.body || {};
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
      // Este laço era serial: até ~35 marcas, uma chamada de rede cada, ~1s
      // por marca. Era daqui que vinham os 20s+ quando o texto não trazia a
      // marca ("Hilux SRV 2.8", "Gol 1.0", "Renegade") — títulos vindos da
      // OLX já trazem a marca e por isso caíam no caminho rápido.
      const listas = await emParalelo(marcasTentativas, 12, buscaModelos);
      for (const lista of listas) candidatos = candidatos.concat(lista);
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
    // Janela de 30, não de 12.
    //
    // Medido em 07/set: para "HB20S 1.0 Manual" 2021, os primeiros modelos que
    // TÊM 2021 estão nas posições 13, 14, 19, 20 e 30 — o primeiro ficava de
    // fora por uma posição, e a busca respondia "não encontrei" para um carro
    // que a FIPE tem. A Hyundai sozinha lista 261 modelos e 135 casam com
    // "HB20S": doze é pouco para separar versões de um mesmo carro.
    //
    // O custo é a busca dos anos, que já é paralela (6 por vez): passa de 2
    // para 5 rodadas. A concorrência segue em 6 de propósito — a Parallelum
    // devolve 429 quando se abusa, e isso já aconteceu aqui em 04/set.
    ).slice(0, 30);

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
    await emParalelo(topCands, 6, async (c) => {
      const chave = `${c.marca.codigo}/${c.modelo.codigo}`;
      anosDe.set(chave, await fipeGet(`/marcas/${c.marca.codigo}/modelos/${c.modelo.codigo}/anos`));
    });
    const anosCand = (c) => anosDe.get(`${c.marca.codigo}/${c.modelo.codigo}`) || [];

    const escolhidoNome = (c) => `${c.marca.nome} ${c.modelo.nome}`;

    const doAno = (anos) =>
      anos.filter(a => a.nome.includes(anoLimpo) || a.codigo.startsWith(anoLimpo));
    const bateComb = (a) => a.nome.toLowerCase().includes(combLower);

    let escolhido = null, anoObj = null, anoFallback = false;
    let valorJaBuscado = null; // evita repetir a chamada da etapa 4

    // Todos os candidatos que têm o ano pedido, com o registro de ano que
    // melhor serve a cada um.
    //
    // O combustível só era usado para escolher entre os anos de um modelo já
    // definido — nunca para escolher o modelo. Como o laço parava no primeiro
    // candidato com o ano certo, "Hilux SRV 2.8 diesel" caía na "Hilux CD SRV
    // 4x2 2.7 Flex" e "Corolla 2023 flex" caía na "Altis (Híbrido)": carros e
    // preços completamente diferentes do pedido.
    const comAno = [];
    for (const c of topCands) {
      const doAnoC = doAno(anosCand(c));
      if (!doAnoC.length) continue;
      const comComb = combLower ? doAnoC.find(bateComb) : null;
      comAno.push({ c, ano: comComb || doAnoC[0], bateCombustivel: !!comComb });
    }
    // Quem bate o combustível vem primeiro. `sort` é estável, então dentro de
    // cada grupo a ordem por score é preservada — é exatamente a ordem que as
    // duas passadas anteriores produziam.
    comAno.sort((x, y) => (y.bateCombustivel ? 1 : 0) - (x.bateCombustivel ? 1 : 0));

    if (comAno.length) {
      let melhor = comAno[0];

      // ── ESCOLHA POR PREÇO ──────────────────────────────────────────────
      // Entre "HB20S 1.0M Comfort Plus", "1.0M Vision" e "1.0M Sense", todas
      // batem igual em "HB20S 1.0 manual": o nome não desempata. O preço sim.
      //
      // Quando o anúncio declara a FIPE — o que é comum nos de parceiro,
      // ainda que arredondada — busca o valor de cada versão e fica com a
      // mais próxima. A diferença entre versões costuma ser muito maior que
      // o arredondamento do anúncio, então arredondado serve.
      //
      // Isto teria evitado o X6 de 04/set: R$ 438 mil devolvidos para um
      // anúncio que dizia R$ 298 mil. Lá a resposta foi AVISAR da divergência;
      // aqui ela é escolher certo. O aviso continua, como rede de segurança.
      const alvo = Number(fipeTexto);
      if (Number.isFinite(alvo) && alvo > 0 && comAno.length > 1) {
        const emReais = (s) => {
          const n = parseFloat(String(s || '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
          return Number.isFinite(n) && n > 0 ? n : null;
        };
        const cotados = (await emParalelo(comAno, 6, async (x) => {
          const d = await fipeGet(`/marcas/${x.c.marca.codigo}/modelos/${x.c.modelo.codigo}/anos/${x.ano.codigo}`);
          return { ...x, dados: d, valor: emReais(d.Valor) };
        })).filter(x => x.valor);

        if (cotados.length) {
          cotados.sort((a, b) => Math.abs(a.valor - alvo) - Math.abs(b.valor - alvo));
          const cand = cotados[0];
          const dist = Math.abs(cand.valor - alvo) / alvo;

          // Se nem a versão mais próxima chega perto, o número do anúncio não
          // está descrevendo nenhuma delas — acontece quando o parceiro põe o
          // preço de VENDA no campo da FIPE. Aí o preço não é pista, é ruído:
          // melhor manter a ordem por nome e deixar o aviso de divergência
          // falar, do que escolher uma versão com base em lixo.
          if (dist <= 0.40) {
            melhor = cand;
            valorJaBuscado = cand.dados;
            console.log(`fipe-search: preço escolheu "${cand.c.modelo.nome}" ` +
                        `(R$ ${cand.valor}, anúncio R$ ${alvo}, ${Math.round(dist * 100)}%) ` +
                        `entre ${cotados.length} versões`);
          } else {
            console.log(`fipe-search: preço ignorado — mais próximo é ${Math.round(dist * 100)}% ` +
                        `do que o anúncio declara (R$ ${alvo}); mantida a ordem por nome`);
          }
        }
      }

      escolhido = melhor.c;
      anoObj    = melhor.ano;
    }

    // 3ª passada: ninguém tem o ano exato → melhor score com ano mais próximo
    if (!escolhido) {
      const c = topCands[0];
      const anosReais = anosCand(c)
        .map(a => ({ obj: a, n: parseInt(a.nome.match(/\b(19|20)\d{2}\b/)?.[0] || '0') }))
        .filter(a => a.n > 0);
      const anoInt = parseInt(anoLimpo);
      anosReais.sort((a, b) => Math.abs(a.n - anoInt) - Math.abs(b.n - anoInt));

      // Ano distante demais não é aproximação: é outro carro.
      //
      // "Gol 1.0" de 2018 devolvia "Gol GL 1.6 Mi/Star 1.6 e 1.8/Atlanta 1.6"
      // de **1998** por R$ 17.219 — e com found:true, indistinguível de um
      // acerto na tela. A VW tem dezenas de variantes de Gol; as certas
      // ficaram fora dos 12 melhores por nome, e o "mais próximo" virou um
      // carro de vinte anos antes.
      //
      // Até 2 anos ainda é plausível (ano modelo, versão que saiu de linha no
      // meio do ano) e segue passando, com o aviso de anoFallback. Além disso
      // a resposta passa a ser "não identifiquei" — que abre a cascata manual
      // e devolve a escolha para quem sabe qual é o carro.
      const perto = anosReais[0];
      const distancia = perto ? Math.abs(perto.n - anoInt) : Infinity;
      if (distancia > 2) {
        return res.status(200).json({
          found: false,
          reason: `só encontrei ${escolhidoNome(c)} para ${perto ? perto.n : '—'}, e você pediu ${anoLimpo}`,
        });
      }

      escolhido = c; anoObj = perto?.obj || null; anoFallback = true;
    }

    if (!anoObj) return res.status(200).json({ found: false, reason: 'sem anos disponíveis' });

    // ── 4. VALOR FIPE ─────────────────────────────────────────────────────────
    // Se a escolha por preço já buscou este valor, reaproveita.
    const fipeData = valorJaBuscado ||
      await fipeGet(`/marcas/${escolhido.marca.codigo}/modelos/${escolhido.modelo.codigo}/anos/${anoObj.codigo}`);

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
