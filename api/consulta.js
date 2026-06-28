// Vercel API Route — Proxy Consultar Placa
// Env vars: CP_EMAIL, CP_KEY
//
// GET  /api/consulta?placa=ABC1D23            → identificação básica
// POST /api/consulta?acao=solicitar body{placa}→ solicita relatório completo
// GET  /api/consulta?acao=verificar&protocolo= → verifica status / retorna PDF URL

const CP_EMAIL = process.env.CP_EMAIL;
const CP_KEY   = process.env.CP_KEY;

function auth() {
  return 'Basic ' + Buffer.from(`${CP_EMAIL}:${CP_KEY}`).toString('base64');
}
const BASE = 'https://api.consultarplaca.com.br/v2';
const HEADERS = () => ({ 'Authorization': auth(), 'Content-Type': 'application/json' });

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!CP_EMAIL || !CP_KEY) {
    return res.status(500).json({ error: 'API não configurada (CP_EMAIL / CP_KEY no Vercel).' });
  }

  const q = req.query || {};
  const acao = q.acao || '';

  try {
    // ── SOLICITAR RELATÓRIO COMPLETO ────────────────────────────
    if (acao === 'solicitar' && req.method === 'POST') {
      const body = req.body || {};
      const placa = (body.placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!placa || placa.length < 7) return res.status(400).json({ error: 'Placa inválida.' });

      const form = new URLSearchParams({
        placa,
        tipo_consulta: 'personalizada',
        // add-ons: 1=sinistro, 4=roubo/furto, 5=RENAJUD, 8=dados veiculo,
        //          10=gravame, 17=RENAINF/multas, 18=recall
        informacoes_adicionais: '1,4,5,8,10,17,18',
        consulta_para_revenda: '0',
      });

      const r = await fetch(`${BASE}/solicitarRelatorio`, {
        method: 'POST',
        headers: { 'Authorization': auth(), 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
        signal: AbortSignal.timeout(15000),
      });
      const data = await r.json();
      console.log('solicitar resposta:', JSON.stringify(data).slice(0, 300));
      if (!r.ok) return res.status(r.status).json({ error: data.mensagem || 'Erro ao solicitar relatório.' });
      return res.status(200).json(data);
    }

    // ── VERIFICAR STATUS / OBTER PDF ────────────────────────────
    if (acao === 'verificar') {
      const protocolo = q.protocolo || '';
      if (!protocolo) return res.status(400).json({ error: 'Protocolo obrigatório.' });

      // Primeiro tenta obter o PDF direto
      const rPdf = await fetch(`${BASE}/consultarProtocolo?protocolo=${protocolo}&tipo_retorno=PDF`, {
        headers: HEADERS(), signal: AbortSignal.timeout(15000),
      });

      // Se retornou JSON (ainda processando ou status)
      const ctype = rPdf.headers.get('content-type') || '';
      if (ctype.includes('json') || !rPdf.ok) {
        const data = await rPdf.json().catch(() => ({}));
        return res.status(200).json({
          status: data.status || 'em_processamento',
          mensagem: data.mensagem || '',
          data,
        });
      }

      // Se retornou PDF direto — devolve como base64
      const buf = await rPdf.arrayBuffer();
      const b64 = Buffer.from(buf).toString('base64');
      return res.status(200).json({ status: 'finalizada', pdfBase64: b64 });
    }

    // ── IDENTIFICAÇÃO BÁSICA ────────────────────────────────────
    const placa = (q.placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!placa || placa.length < 7) return res.status(400).json({ error: 'Placa inválida.' });

    const r = await fetch(`${BASE}/consultarPlaca?placa=${placa}`, {
      headers: HEADERS(), signal: AbortSignal.timeout(10000),
    });
    const data = await r.json();
    if (!r.ok || data.status !== 'ok') {
      return res.status(r.status || 400).json({ error: data.mensagem || 'Erro na consulta.' });
    }
    return res.status(200).json(data);

  } catch (err) {
    console.error('consulta erro:', err.message);
    return res.status(500).json({ error: 'Falha ao conectar com a API. Tente novamente.' });
  }
};
