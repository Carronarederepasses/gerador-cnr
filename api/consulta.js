// Vercel API Route — Consulta Sinesp Cidadão (proxy server-side)
// Chama o Sinesp diretamente, evitando CORS e instabilidade da BrasilAPI.
// Nenhuma chave necessária — base pública federal.
//
// GET /api/consulta?placa=ABC1D23

const crypto = require('crypto');

const SINESP_URL = 'https://cidadao.sinesp.gov.br/sinesp-cidadao/mobile/consultar-placa/v5';
const SECRET     = 'v5g73ESsJPgfyHiLBXKIFQ==';

function gerarToken(placa) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const hash = crypto.createHash('sha1').update(placa + SECRET + ts).digest('hex');
  return { token: hash, ts };
}

function parseXml(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`));
  return m ? m[1].trim() : '';
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const placa = ((req.query && req.query.placa) || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!placa || placa.length < 7) {
    return res.status(400).json({ error: 'Placa inválida.' });
  }

  try {
    const { token, ts } = gerarToken(placa);

    const body = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<soapenv:Envelope xmlns:soapenv="http://www.w3.org/2003/05/soap-envelope">`,
      `<soapenv:Body>`,
      `<ns2:getStatus xmlns:ns2="http://sinesp.org/">`,
      `<placa>${placa}</placa>`,
      `</ns2:getStatus>`,
      `</soapenv:Body>`,
      `</soapenv:Envelope>`,
    ].join('');

    const r = await fetch(SINESP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': 'SinespCidadao/4.5.2 CFNetwork/978.0.7 Darwin/18.6.0',
        'Accept-Language': 'pt-br',
        'Token': token,
        'Host': 'cidadao.sinesp.gov.br',
      },
      body: new URLSearchParams({ placa, identificador: ts }).toString(),
    });

    if (!r.ok) {
      // Fallback: tenta pela BrasilAPI
      const br = await fetch(`https://brasilapi.com.br/api/sinesp/v1/${placa}`);
      if (!br.ok) {
        return res.status(br.status).json({ error: 'Serviço Sinesp indisponível no momento. Tente novamente em alguns minutos.' });
      }
      return res.status(200).json(await br.json());
    }

    const text = await r.text();

    // Tenta parsear XML do Sinesp
    if (text.includes('<placa>') || text.includes('<situacao>') || text.includes('<cor>')) {
      return res.status(200).json({
        placa:      parseXml(text, 'placa') || placa,
        situacao:   parseXml(text, 'situacao'),
        marca:      parseXml(text, 'marca'),
        modelo:     parseXml(text, 'modelo'),
        cor:        parseXml(text, 'cor'),
        ano:        parseXml(text, 'anoModelo') || parseXml(text, 'ano'),
        chassi:     parseXml(text, 'chassi'),
        municipio:  parseXml(text, 'municipio'),
        uf:         parseXml(text, 'uf'),
        restricao:  parseXml(text, 'restricao'),
        ocorrencia: parseXml(text, 'ocorrencia'),
      });
    }

    // Sinesp retornou algo mas não é o formato esperado — tenta BrasilAPI como fallback
    const br = await fetch(`https://brasilapi.com.br/api/sinesp/v1/${placa}`);
    if (br.ok) return res.status(200).json(await br.json());

    return res.status(502).json({ error: 'Formato de resposta inesperado do Sinesp. Tente novamente.' });

  } catch (err) {
    console.error('consulta erro:', err.message);
    // Último recurso: BrasilAPI
    try {
      const br = await fetch(`https://brasilapi.com.br/api/sinesp/v1/${placa}`);
      if (br.ok) return res.status(200).json(await br.json());
    } catch {}
    return res.status(500).json({ error: 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.' });
  }
};
