// Vercel API Route — Consulta Veicular (proxy BrasilAPI/Sinesp)
// GET /api/consulta?placa=ABC1D23

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const placa = ((req.query && req.query.placa) || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!placa || placa.length < 7) {
    return res.status(400).json({ error: 'Placa inválida.' });
  }

  const tentativas = [
    `https://brasilapi.com.br/api/sinesp/v1/${placa}`,
    `https://brasilapi.com.br/api/sinesp/v2/${placa}`,
  ];

  for (const url of tentativas) {
    try {
      console.log(`consulta tentando: ${url}`);
      const r = await fetch(url, {
        headers: { 'User-Agent': 'CRR/1.0' },
        signal: AbortSignal.timeout(8000),
      });
      console.log(`consulta status ${r.status} de ${url}`);
      if (r.ok) {
        const data = await r.json();
        console.log('consulta ok:', JSON.stringify(data).slice(0, 120));
        return res.status(200).json(data);
      }
      if (r.status === 404) {
        const txt = await r.text().catch(() => '');
        console.log('consulta 404 body:', txt.slice(0, 200));
      }
    } catch (err) {
      console.error(`consulta erro em ${url}:`, err.message);
    }
  }

  return res.status(503).json({
    error: 'Consulta indisponível no momento. O serviço Sinesp está fora do ar ou bloqueando nossa origem. Tente novamente mais tarde.',
    _debug: 'Verificar logs do Vercel para detalhes.',
  });
};
