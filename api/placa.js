// Vercel API Route — Consulta de veículo pela placa via APiBrasil
// POST /api/placa   body: { placa: "ABC1234" }
// Env var: APIBRASIL_TOKEN

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { placa } = req.body || {};
  if (!placa) return res.status(400).json({ error: 'placa obrigatória' });

  const token = process.env.APIBRASIL_TOKEN;
  if (!token) return res.status(500).json({ error: 'APIBRASIL_TOKEN não configurado' });

  const placaLimpa = placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  try {
    const response = await fetch('https://gateway.apibrasil.io/api/v2/consulta/veiculos/credits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ tipo: 'fipe', placa: placaLimpa, homolog: false }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data?.message || 'Erro na consulta', raw: data });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('placa error:', err.message);
    return res.status(500).json({ error: 'Não foi possível consultar a placa. Tente novamente.' });
  }
}
