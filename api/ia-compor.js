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
    'nano-banana':     'google/gemini-2.5-flash-image',          // ~US$ 0,04/img
    'nano-banana-2':   'google/gemini-3.1-flash-image-preview',  // mais novo, ~US$ 0,05-0,15/img
    'nano-banana-pro': 'google/gemini-3-pro-image-preview',      // topo, ~US$ 0,13-0,24/img
    'gpt-image':       'openai/gpt-5-image',                     // GPT Image (ChatGPT)
    'gpt-image-2':     'openai/gpt-5.4-image-2',                 // GPT Image 2 (mais novo)
  };
  const modelId = MODELOS[model] || MODELOS['nano-banana'];

  const prompt = `Você é um fotógrafo automotivo profissional e retocador de imagens HIPER-REALISTA. Produza UMA única fotografia de showroom, indistinguível de uma foto real tirada com câmera full-frame profissional.

Imagem 1: a foto de referência do carro (pode estar em QUALQUER ângulo). É a verdade sobre o veículo: marca, modelo, cor, rodas, acabamentos e placa.
Imagem 2: referência da identidade visual do estúdio "CARRO NA REDE REPASSES" (estúdio escuro premium, logo na parede, plantas, clima). Use APENAS como referência de estilo e ambiente.

RECRIE toda a cena de forma nativa ao redor do carro — piso, paredes escuras, spots de teto, profundidade, reflexos e sombras renderizados juntos como uma fotografia única e real. NÃO faça colagem nem trate a Imagem 2 como camada de fundo fixa.

ÂNGULO PADRÃO (sempre, independente do ângulo da Imagem 1):
- Reposicione o carro em vista 3/4 frontal, levemente a partir da esquerda.
- Câmera na altura do farol, carro reto e nivelado, pneus tocando o piso, centralizado, ocupando ~70% da largura.

IDENTIDADE DO CARRO (preservar fielmente):
- Mantenha marca, modelo, cor exata, desenho das rodas, faróis, para-choques e proporções idênticos aos da Imagem 1.
- Reproduza a placa exatamente como na Imagem 1; se ela não estiver legível, deixe-a neutra, SEM inventar caracteres.

HIPER-REALISMO — PRIORIDADE MÁXIMA (sensação de realidade):
- Iluminação de estúdio profissional: spots de teto suaves criando reflexos especulares longos e naturais na pintura, capô, teto, vidros e cromados.
- Sombra de contato escura e bem definida exatamente sob cada pneu (oclusão de ambiente), somada a uma sombra ampla e suave ao redor — totalmente coerentes com a direção da luz.
- Reflexos sutis do ambiente escuro na lataria; pintura com profundidade, brilho e microrreflexos realistas.
- Harmonize exposição, contraste, temperatura de cor e granulação como se carro e cenário fossem a mesma foto, da mesma câmera.
- Leve profundidade de campo no fundo (logo/plantas levemente desfocados). Bordas perfeitas, sem halo, serrilhado ou aparência de recorte.

A parede ao fundo deve exibir a identidade "CARRO NA REDE REPASSES". Não adicione nenhum outro texto.
Retorne apenas a imagem final, fotorrealista e perfeitamente integrada.`;

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
