// Vercel API Route — composição de foto por IA
//  • ChatGPT (gpt-image)  → API DIRETA da OpenAI (rápido)        — env: OPENAI_API_KEY
//  • Nano Banana (Gemini) → OpenRouter                          — env: OPENROUTER_API_KEY

const fs   = require('fs');
const path = require('path');

// Fundo CNR em memória (lido uma vez por instância)
let bgBuf = null;
function getBgBuffer() {
  if (!bgBuf) bgBuf = fs.readFileSync(path.join(process.cwd(), 'assets', 'bg-cnr.jpg'));
  return bgBuf;
}

const PROMPT = `Você é um fotógrafo automotivo profissional e retocador de imagens HIPER-REALISTA. Produza UMA única fotografia de showroom, indistinguível de uma foto real tirada com câmera full-frame profissional.

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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { imageBase64, mimeType = 'image/jpeg', model } = req.body || {};
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 obrigatório' });

  const ehOpenAI = model === 'gpt-image' || model === 'gpt-image-2';
  try {
    if (ehOpenAI) return await viaOpenAI(res, imageBase64, mimeType);
    return await viaOpenRouter(res, imageBase64, mimeType, model);
  } catch (err) {
    console.error('ia-compor error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

// ── ChatGPT: API direta da OpenAI (images/edits, gpt-image-1) ───────────────────
async function viaOpenAI(res, imageBase64, mimeType) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY não configurada no Vercel' });

  const form = new FormData();
  form.append('model', 'gpt-image-1');
  form.append('prompt', PROMPT);
  form.append('size', '1536x1024');     // paisagem (bom para carro)
  form.append('quality', 'medium');     // rápido com boa qualidade ('high' é lento)
  form.append('output_format', 'png');
  form.append('image[]', new Blob([Buffer.from(imageBase64, 'base64')], { type: mimeType || 'image/jpeg' }), 'carro.jpg');
  form.append('image[]', new Blob([getBgBuffer()], { type: 'image/jpeg' }), 'estudio.jpg');

  const resp = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: form,
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    return res.status(resp.status).json({ error: err?.error?.message || `Erro OpenAI: ${resp.status}` });
  }
  const data = await resp.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) return res.status(500).json({ error: 'A IA não retornou imagem. Tente novamente.' });
  return res.status(200).json({ result: b64, mimeType: 'image/png' });
}

// ── Nano Banana (Gemini) via OpenRouter ────────────────────────────────────────
async function viaOpenRouter(res, imageBase64, mimeType, model) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENROUTER_API_KEY não configurada no Vercel' });

  const MODELOS = {
    'nano-banana':     'google/gemini-2.5-flash-image',
    'nano-banana-2':   'google/gemini-3.1-flash-image-preview',
    'nano-banana-pro': 'google/gemini-3-pro-image-preview',
  };
  const modelId = MODELOS[model] || MODELOS['nano-banana'];

  const body = {
    model: modelId,
    modalities: ['image', 'text'],
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: PROMPT },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${getBgBuffer().toString('base64')}` } },
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
  const ci = url.indexOf(',');
  const meta = url.slice(0, ci);
  const b64  = url.slice(ci + 1);
  const outMime = (meta.match(/data:(.*?);base64/) || [])[1] || 'image/png';
  return res.status(200).json({ result: b64, mimeType: outMime });
}
