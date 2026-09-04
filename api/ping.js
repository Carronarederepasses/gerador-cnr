// Ping diário (Vercel Cron) — mantém o projeto Supabase ATIVO pra ele não pausar
// sozinho no plano gratuito (que pausa após ~7 dias sem atividade).
// Faz uma consulta mínima (1 id) na tabela veiculos. Agendado em vercel.json -> crons.
//
// Env vars (mesmas do catálogo):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ ok: false, error: 'Supabase não configurado.' });
  }

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/veiculos?select=id&limit=1`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    return res.status(r.ok ? 200 : 502).json({
      ok: r.ok,
      status: r.status,
      at: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(502).json({ ok: false, error: err.message });
  }
};
