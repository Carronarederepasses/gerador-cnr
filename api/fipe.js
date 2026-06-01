// Vercel API Route — proxy Parallelum FIPE (sem CORS, sem chave)
const FIPE_BASE = 'https://parallelum.com.br/fipe/api/v1/carros';

async function fipeGet(endpoint) {
  const res = await fetch(`${FIPE_BASE}${endpoint}`);
  if (!res.ok) throw new Error(`Parallelum HTTP ${res.status}`);
  return res.json();
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const path = (req.query.path || '').replace(/^\//, '');
  const parts = path.split('/').filter(Boolean);

  try {
    if (parts.length === 1 && parts[0] === 'marcas') {
      return res.status(200).json(await fipeGet('/marcas'));
    }
    if (parts.length === 3 && parts[2] === 'modelos') {
      return res.status(200).json(await fipeGet(`/marcas/${parts[1]}/modelos`));
    }
    if (parts.length === 5 && parts[4] === 'anos') {
      return res.status(200).json(await fipeGet(`/marcas/${parts[1]}/modelos/${parts[3]}/anos`));
    }
    if (parts.length === 6) {
      return res.status(200).json(await fipeGet(`/marcas/${parts[1]}/modelos/${parts[3]}/anos/${parts[5]}`));
    }
    return res.status(404).json({ error: 'Rota não encontrada' });
  } catch (err) {
    console.error('fipe error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
