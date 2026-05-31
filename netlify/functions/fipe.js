// Netlify Function — proxy para API Parallelum (FIPE)
// Parallelum é uma API pública REST com CORS, sem chave, confiável.

const FIPE_BASE = 'https://parallelum.com.br/fipe/api/v1/carros';

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

async function fipeGet(endpoint) {
  const res = await fetch(`${FIPE_BASE}${endpoint}`);
  if (!res.ok) throw new Error(`Parallelum ${endpoint} HTTP ${res.status}`);
  return res.json();
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: HEADERS, body: '' };
  }

  const path = (event.queryStringParameters?.path || '').replace(/^\//, '');
  const parts = path.split('/').filter(Boolean);

  try {
    // GET marcas
    if (parts.length === 1 && parts[0] === 'marcas') {
      const data = await fipeGet('/marcas');
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify(data) };
    }

    // GET marcas/{id}/modelos
    if (parts.length === 3 && parts[2] === 'modelos') {
      const data = await fipeGet(`/marcas/${parts[1]}/modelos`);
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify(data) };
    }

    // GET marcas/{id}/modelos/{mid}/anos
    if (parts.length === 5 && parts[4] === 'anos') {
      const data = await fipeGet(`/marcas/${parts[1]}/modelos/${parts[3]}/anos`);
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify(data) };
    }

    // GET marcas/{id}/modelos/{mid}/anos/{ano}
    if (parts.length === 6) {
      const data = await fipeGet(`/marcas/${parts[1]}/modelos/${parts[3]}/anos/${parts[5]}`);
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify(data) };
    }

    return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ error: 'Rota não encontrada' }) };
  } catch (err) {
    console.error('FIPE Function error:', err.message);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
