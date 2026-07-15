// Utilitários gratuitos: CEP (BrasilAPI) e preços ML (Mercado Livre)
// Rota por ?type=cep ou ?type=mercado

const ML_CATEGORIA = 'MLB1744'; // Carros e Caminhonetes
const PRECO_MINIMO = 8000;

async function handleCep(cep, res) {
  const limpo = (cep || '').replace(/\D/g, '');
  if (limpo.length !== 8) return res.status(400).json({ error: 'CEP deve ter 8 dígitos' });
  const r = await fetch(`https://brasilapi.com.br/api/cep/v2/${limpo}`);
  const data = await r.json();
  if (!r.ok) return res.status(r.status).json({ error: data.message || 'CEP não encontrado' });
  return res.status(200).json({
    cep:        data.cep,
    logradouro: data.street       || '',
    bairro:     data.neighborhood || '',
    cidade:     data.city         || '',
    estado:     data.state        || '',
  });
}

async function handleMercado(q, res) {
  if (!q) return res.status(400).json({ error: 'q obrigatório' });
  const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(q)}&category=${ML_CATEGORIA}&limit=20`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`ML HTTP ${r.status}`);
  const data = await r.json();
  const precos = (data.results || [])
    .map(i => i.price)
    .filter(p => typeof p === 'number' && p >= PRECO_MINIMO)
    .sort((a, b) => a - b);
  if (!precos.length) return res.status(200).json({ found: false });
  return res.status(200).json({
    found: true,
    count: precos.length,
    min: precos[0],
    max: precos[precos.length - 1],
    med: precos[Math.floor(precos.length / 2)],
    searchUrl: `https://www.mercadolivre.com.br/jm/search?q=${encodeURIComponent(q)}&category=${ML_CATEGORIA}`,
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const type = req.query.type;
    if (type === 'cep')     return await handleCep(req.query.cep, res);
    if (type === 'mercado') return await handleMercado(req.query.q, res);
    return res.status(400).json({ error: 'type deve ser cep ou mercado' });
  } catch (err) {
    console.error('utils error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
