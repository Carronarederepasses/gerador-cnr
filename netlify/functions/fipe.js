// Netlify Function — proxy para API oficial da FIPE
// Evita CORS e dependência de APIs de terceiros instáveis

const FIPE_BASE = 'https://veiculos.fipe.org.br/api/veiculos';

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

async function fipePost(endpoint, body) {
  const res = await fetch(`${FIPE_BASE}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'Accept': 'application/json, text/plain, */*',
      'Origin': 'https://veiculos.fipe.org.br',
      'Referer': 'https://veiculos.fipe.org.br/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`FIPE ${endpoint} HTTP ${res.status}`);
  return res.json();
}

async function getRefTable() {
  const data = await fipePost('ConsultarTabelaDeReferencia', {});
  return data[0].Codigo; // tabela mais recente
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: HEADERS, body: '' };
  }

  const path = (event.queryStringParameters?.path || '').replace(/^\//, '');
  const parts = path.split('/').filter(Boolean);

  try {
    const refTable = await getRefTable();

    // GET marcas
    if (parts.length === 1 && parts[0] === 'marcas') {
      const data = await fipePost('ConsultarMarcas', {
        codigoTabelaReferencia: refTable,
        codigoTipoVeiculo: 1,
      });
      const result = data.map(m => ({ codigo: String(m.Value), nome: m.Label }));
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify(result) };
    }

    // GET marcas/{id}/modelos
    if (parts.length === 3 && parts[2] === 'modelos') {
      const data = await fipePost('ConsultarModelos', {
        codigoTabelaReferencia: refTable,
        codigoTipoVeiculo: 1,
        codigoMarca: parts[1],
      });
      const modelos = data.Modelos.map(m => ({ codigo: String(m.Value), nome: m.Label }));
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ modelos, anos: data.Anos }) };
    }

    // GET marcas/{id}/modelos/{mid}/anos
    if (parts.length === 5 && parts[4] === 'anos') {
      const data = await fipePost('ConsultarAnoModelo', {
        codigoTabelaReferencia: refTable,
        codigoTipoVeiculo: 1,
        codigoMarca: parts[1],
        codigoModelo: parts[3],
      });
      const result = data.map(a => ({ codigo: a.Value, nome: a.Label }));
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify(result) };
    }

    // GET marcas/{id}/modelos/{mid}/anos/{ano}
    if (parts.length === 6) {
      const anoId = parts[5]; // ex: "2023-1"
      const [anoModelo, combCodigo] = anoId.split('-');
      const data = await fipePost('ConsultarValorComTodosParametros', {
        codigoTabelaReferencia: refTable,
        codigoTipoVeiculo: 1,
        codigoMarca: parts[1],
        codigoModelo: parts[3],
        ano: anoId,
        codigoTipoCombustivel: combCodigo,
        anoModelo: anoModelo,
        modeloCodigoExterno: '',
      });
      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({
          Valor: data.Valor,
          Marca: data.Marca,
          Modelo: data.Modelo,
          AnoModelo: data.AnoModelo,
          Combustivel: data.Combustivel,
          CodigoFipe: data.CodigoFipe,
          MesReferencia: data.MesReferencia,
        }),
      };
    }

    return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ error: 'Rota não encontrada' }) };
  } catch (err) {
    console.error('FIPE Function error:', err.message);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
