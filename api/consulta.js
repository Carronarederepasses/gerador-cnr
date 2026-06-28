// Vercel API Route — Proxy Consultar Placa
// Chama api.consultarplaca.com.br server-side (evita CORS do browser).
//
// Env vars (configurar no painel do Vercel):
//   CP_EMAIL   — e-mail da conta no Consultar Placa
//   CP_KEY     — API key do Consultar Placa
//
// GET /api/consulta?placa=ABC1D23

const CP_EMAIL = process.env.CP_EMAIL;
const CP_KEY   = process.env.CP_KEY;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const placa = ((req.query && req.query.placa) || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!placa || placa.length < 7) {
    return res.status(400).json({ error: 'Placa inválida.' });
  }
  if (!CP_EMAIL || !CP_KEY) {
    return res.status(500).json({ error: 'API não configurada. Adicione CP_EMAIL e CP_KEY no Vercel.' });
  }

  try {
    const cred = Buffer.from(`${CP_EMAIL}:${CP_KEY}`).toString('base64');
    const r = await fetch(`https://api.consultarplaca.com.br/v2/consultarPlaca?placa=${placa}`, {
      headers: { 'Authorization': `Basic ${cred}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    const data = await r.json();
    if (!r.ok || data.status !== 'ok') {
      return res.status(r.status).json({ error: data.mensagem || 'Erro na consulta.' });
    }
    return res.status(200).json(data);
  } catch (err) {
    console.error('consulta erro:', err.message);
    return res.status(500).json({ error: 'Falha ao conectar com a API. Tente novamente.' });
  }
};
