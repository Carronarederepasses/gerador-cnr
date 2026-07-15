// Proxy BrasilAPI CEP — retorna cidade, estado, bairro e logradouro a partir de um CEP
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const cep = (req.query.cep || '').replace(/\D/g, '');
  if (cep.length !== 8) return res.status(400).json({ error: 'CEP deve ter 8 dígitos' });

  try {
    const r = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.message || 'CEP não encontrado' });
    return res.status(200).json({
      cep:        data.cep,
      logradouro: data.street       || '',
      bairro:     data.neighborhood || '',
      cidade:     data.city         || '',
      estado:     data.state        || '',
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
