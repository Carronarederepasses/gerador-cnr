// Vercel API Route — composição por IA (Gemini 2.5 Flash Image / "Nano Banana") via OpenRouter
// Env var necessária: OPENROUTER_API_KEY (a mesma já usada no parse.js)

const fs   = require('fs');
const path = require('path');

// Cacheia o fundo CNR em memória (lido uma vez por instância)
let bgCache = null;
function getBg() {
  if (!bgCache) {
    const bgPath = path.join(process.cwd(), 'assets', 'bg-cnr.jpg');
    bgCache = fs.readFileSync(bgPath).toString('base64');
  }
  return bgCache;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENROUTER_API_KEY não configurada no Vercel' });

  const { imageBase64, mimeType = 'image/jpeg', model } = req.body || {};
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 obrigatório' });

  // Lista fechada de modelos permitidos (evita acionar modelos caros por engano)
  const MODELOS = {
    'nano-banana':   'google/gemini-2.5-flash-image',          // ~US$ 0,04/img
    'nano-banana-2': 'google/gemini-3.1-flash-image-preview',  // mais novo, ~US$ 0,05-0,15/img
  };
  const modelId = MODELOS[model] || MODELOS['nano-banana'];

  const prompt = `Você é um fotógrafo automotivo. Produza UMA única foto fotorrealista do carro da Imagem 1, como se ele tivesse sido realmente fotografado dentro de um estúdio premium de concessionária.

Imagem 1: o carro — esta é a verdade sobre o veículo, preserve com exatidão.
Imagem 2: referência da identidade visual da marca "CARRO NA REDE REPASSES" (estúdio escuro, logo na parede, plantas, clima). Use APENAS como referência de estilo e ambiente.

NÃO faça uma colagem e NÃO trate a Imagem 2 como uma camada de fundo fixa. Em vez disso, RECRIE toda a cena de forma nativa ao redor do carro — piso, paredes escuras, spots de teto, profundidade e sombras renderizados juntos, como uma fotografia única e real.

PRESERVAR sem alterar (regra mais importante):
- A identidade exata do carro: marca, modelo, cor, rodas, faróis, para-choques e proporções.
- A PLACA idêntica e legível, exatamente como na Imagem 1.

LUZ E SOMBRA (o que tira a cara de montagem):
- Reacenda o carro com a luz suave e difusa dos spots do teto, coerente com o ambiente recriado.
- Sombra de contato escura e nítida exatamente onde cada pneu toca o piso, somada a uma sombra ampla e suave ao redor.
- Piso fosco e limpo, SEM reflexo espelhado do carro no chão.
- Harmonize exposição, contraste e temperatura de cor do carro com a cena.
- Bordas naturais, sem halo nem contorno de recorte.

ENQUADRAMENTO:
- Carro centralizado, leve ângulo 3/4 frontal, câmera na altura do farol, ocupando ~70% da largura.
- A parede ao fundo deve exibir a identidade "CARRO NA REDE REPASSES".

Resultado: uma única foto realista e coesa, indistinguível de uma foto de estúdio real. Não escreva nenhum texto novo além da identidade da marca no fundo.`;

  try {
    const body = {
      model: modelId,
      modalities: ['image', 'text'],
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${getBg()}` } },
        ],
      }],
    };

    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://gerador-cnr.vercel.app',
        'X-Title': 'Gerador CNR',
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return res.status(resp.status).json({ error: err?.error?.message || `Erro OpenRouter: ${resp.status}` });
    }

    const data = await resp.json();
    const url = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!url || !url.startsWith('data:')) {
      return res.status(500).json({ error: 'A IA não retornou imagem. Tente novamente.' });
    }

    // url = "data:image/png;base64,...."
    const commaIdx = url.indexOf(',');
    const meta = url.slice(0, commaIdx);
    const b64  = url.slice(commaIdx + 1);
    const outMime = (meta.match(/data:(.*?);base64/) || [])[1] || 'image/png';

    return res.status(200).json({ result: b64, mimeType: outMime });

  } catch (err) {
    console.error('ia-compor error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
