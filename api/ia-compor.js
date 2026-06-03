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

  const { imageBase64, mimeType = 'image/jpeg' } = req.body || {};
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 obrigatório' });

  const prompt = `Você é um editor de fotos automotivas profissional.
Imagem 1: foto de um carro.
Imagem 2: estúdio fotográfico com o fundo da marca "CARRO NA REDE REPASSES".

Componha o carro da Imagem 1 dentro do estúdio da Imagem 2, criando uma foto profissional de concessionária.

Regras obrigatórias:
- Remova o fundo original do carro e posicione-o dentro do estúdio da Imagem 2.
- NÃO altere o carro: mantenha exatamente a mesma cor, modelo, rodas, faróis e a PLACA idêntica e legível.
- Centralize o carro com os pneus tocando o chão e adicione sombra suave e realista embaixo.
- Iluminação coerente com o estúdio. Não escreva nenhum texto na imagem.
Retorne apenas a imagem final composta.`;

  try {
    const body = {
      model: 'google/gemini-2.5-flash-image',
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
