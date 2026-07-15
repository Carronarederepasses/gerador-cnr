// Busca preços de carros similares no Mercado Livre (gratuita, sem chave)
// Categoria MLB1744 = Carros e Caminhonetes no MLB Brasil
const ML_SEARCH = 'https://api.mercadolibre.com/sites/MLB/search';
const CATEGORIA = 'MLB1744';
const PRECO_MINIMO = 8000; // filtra peças/acessórios

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'q obrigatório' });

  try {
    const url = `${ML_SEARCH}?q=${encodeURIComponent(q)}&category=${CATEGORIA}&limit=20`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`ML HTTP ${r.status}`);
    const data = await r.json();

    const precos = (data.results || [])
      .map(i => i.price)
      .filter(p => typeof p === 'number' && p >= PRECO_MINIMO)
      .sort((a, b) => a - b);

    if (!precos.length) return res.status(200).json({ found: false });

    const min = precos[0];
    const max = precos[precos.length - 1];
    const med = precos[Math.floor(precos.length / 2)];

    return res.status(200).json({
      found: true,
      count: precos.length,
      min, max, med,
      searchUrl: `https://www.mercadolivre.com.br/jm/search?q=${encodeURIComponent(q)}&category=${CATEGORIA}`,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
