// Vercel API Route — remove fundo via remove.bg
// Env var necessária: REMOVE_BG_API_KEY

const { exigirChave } = require('./_auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // remove.bg gasta credito por imagem.
  if (exigirChave(req, res)) return;


  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'REMOVE_BG_API_KEY não configurada no Vercel' });

  const { imageBase64 } = req.body || {};
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 obrigatório' });

  try {
    const params = new URLSearchParams();
    params.append('image_file_b64', imageBase64);
    params.append('size', 'auto');
    params.append('format', 'png');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: params,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const msg = errData?.errors?.[0]?.title || `Erro remove.bg: ${response.status}`;
      return res.status(response.status).json({ error: msg });
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return res.status(200).json({ result: base64, type: 'png' });

  } catch (err) {
    console.error('remove-bg error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
