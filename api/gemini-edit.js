// Vercel API Route — composição de foto via Gemini 2.0 Flash (edição de imagem)
// Env var necessária: GEMINI_API_KEY

const fs   = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no Vercel' });

  const { imageBase64, mimeType = 'image/jpeg' } = req.body || {};
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 obrigatório' });

  try {
    // Lê o fundo CNR do disco
    const bgPath   = path.join(process.cwd(), 'assets', 'bg-cnr.jpg');
    const bgBase64 = fs.readFileSync(bgPath).toString('base64');

    const prompt = `Você é um editor de fotos automotivas profissional.

Imagem 1: foto de um carro com fundo a ser removido.
Imagem 2: estúdio fotográfico com o fundo da marca "CARRO NA REDE REPASSES".

Crie uma foto profissional compondo o carro da Imagem 1 no estúdio da Imagem 2.

Requisitos:
- Remova completamente o fundo original do carro
- Posicione o carro centralizado no estúdio, sentado no chão (pneus tocando o piso)
- O carro deve ocupar aproximadamente 60-70% da largura da imagem
- Adicione uma sombra suave e realista embaixo do carro
- Mantenha a iluminação consistente com o estúdio (spots de teto)
- Preserve todos os detalhes originais do carro (cor, acabamento, placa)
- O resultado deve parecer uma foto profissional de concessionária

Retorne apenas a imagem final composta, sem texto.`;

    const body = {
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType,    data: imageBase64 } },
          { inline_data: { mime_type: 'image/jpeg', data: bgBase64    } },
        ],
      }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
      },
    };

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return res.status(resp.status).json({ error: err?.error?.message || `Erro Gemini: ${resp.status}` });
    }

    const data = await resp.json();

    // Procura a parte de imagem na resposta
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imgPart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));

    if (!imgPart) {
      return res.status(500).json({ error: 'Gemini não retornou imagem. Tente novamente.' });
    }

    return res.status(200).json({
      result:   imgPart.inlineData.data,
      mimeType: imgPart.inlineData.mimeType,
    });

  } catch (err) {
    console.error('gemini-edit error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
