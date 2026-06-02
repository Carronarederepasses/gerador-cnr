// Vercel API Route — remove fundo via HuggingFace Inference API (GPU, grátis)
// Env var opcional: HF_TOKEN (token gratuito do huggingface.co)

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { imageBase64 } = req.body || {};
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 obrigatório' });

  try {
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    const headers = { 'Content-Type': 'application/octet-stream' };
    if (process.env.HF_TOKEN) headers['Authorization'] = `Bearer ${process.env.HF_TOKEN}`;

    // Tenta RMBG-1.4 (melhor qualidade)
    let response = await fetch(
      'https://api-inference.huggingface.co/models/briaai/RMBG-1.4',
      { method: 'POST', headers, body: imageBuffer }
    );

    // Fallback: isnet-general-use se RMBG estiver fora
    if (!response.ok) {
      response = await fetch(
        'https://api-inference.huggingface.co/models/Xenova/isnet-general-use',
        { method: 'POST', headers, body: imageBuffer }
      );
    }

    if (!response.ok) {
      const err = await response.text();
      // Modelo carregando (cold start) — avisa o frontend pra tentar de novo
      if (response.status === 503) {
        return res.status(503).json({ error: 'Modelo iniciando, tente em 20 segundos' });
      }
      return res.status(response.status).json({ error: err });
    }

    const contentType = response.headers.get('content-type') || '';

    // Se retornar imagem diretamente (PNG transparente)
    if (contentType.includes('image')) {
      const buf = Buffer.from(await response.arrayBuffer());
      return res.status(200).json({ result: buf.toString('base64'), type: 'png' });
    }

    // Se retornar JSON com máscara (image-segmentation padrão)
    const data = await response.json();
    if (Array.isArray(data) && data[0]?.mask) {
      return res.status(200).json({ result: data[0].mask, type: 'mask' });
    }

    return res.status(500).json({ error: 'Resposta inesperada da API' });

  } catch (err) {
    console.error('remove-bg error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
