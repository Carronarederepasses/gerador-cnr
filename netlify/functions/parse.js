// Netlify Function — parse de anúncio via OpenRouter (LLM free tier)
// Env var necessária: OPENROUTER_API_KEY
// Tenta modelos em sequência até um responder (fallback automático)

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

// Ordem de preferência — se um der 429/erro, tenta o próximo
const MODELS = [
  'openai/gpt-oss-20b:free',
  'openai/gpt-oss-120b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
];

const PROMPT = (texto) => `Você extrai dados de anúncios de veículos em texto livre (português brasileiro informal, WhatsApp, OLX, etc.).

Retorne SOMENTE um JSON válido com estes campos (null se não encontrado):

{
  "veiculo": "marca + modelo + versão completa (ex: Volkswagen Basalt Dark Edition 1.0 Turbo)",
  "ano": "YYYY",
  "km": "número formatado sem 'km' (ex: 8.000)",
  "cor": "cor do veículo (null se não informada)",
  "regiao": "cidade ou região mencionada",
  "valor": "preço pedido sem R$ e sem pontos (ex: 89990)",
  "fipe": "valor FIPE sem R$ e sem pontos se mencionado, senão null",
  "opcionais": ["array somente com itens CONFIRMADOS no texto, usando exatamente estes nomes: ar-condicionado, ar-condicionado digital, direcao-eletrica, vidros-eletricos, travas-eletricas, retrovisores-eletricos, comandos-no-volante, multimidia, android-auto-carplay, piloto-automatico, bancos-em-couro, teto-solar, teto-panoramico, keyless, partida-remota, freio-abs, airbag, controle-de-tracao, sensor-estacionamento, camera-re, cambio-manual, cambio-automatico, cambio-cvt, tracao-4x4, rodas-liga-leve, farol-led-xenon, pneus-zero, unico-dono, ipva-pago, sem-multas-debitos, revisoes-concessionaria, na-garantia, blindado"]
}

Anúncio:
${texto}

JSON:`;

async function tryModel(apiKey, model, texto) {
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://crr-gerador.netlify.app',
      'X-Title': 'CRR Gerador de Anúncio',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: PROMPT(texto) }],
      temperature: 0,
      max_tokens: 512,
    }),
  });

  if (resp.status === 429 || resp.status === 503) {
    throw new Error(`rate_limit:${resp.status}`);
  }

  if (!resp.ok) {
    const err = await resp.text();
    let parsed;
    try { parsed = JSON.parse(err); } catch { parsed = {}; }
    // Provider error (rate limit no provider) → tenta próximo
    if (parsed?.error?.message?.includes('Provider returned error') ||
        parsed?.error?.message?.includes('No endpoints')) {
      throw new Error(`rate_limit:${resp.status}`);
    }
    throw new Error(`http_error:${resp.status}:${err}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('no_json');

  return JSON.parse(jsonMatch[0]);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: HEADERS, body: '' };
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'OPENROUTER_API_KEY não configurada no Netlify' }) };
  }

  let texto;
  try {
    ({ texto } = JSON.parse(event.body || '{}'));
  } catch {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Body inválido' }) };
  }

  if (!texto?.trim()) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Campo texto obrigatório' }) };
  }

  let lastErr = '';
  for (const model of MODELS) {
    try {
      const parsed = await tryModel(apiKey, model, texto);
      console.log(`OK com modelo: ${model}`);
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify(parsed) };
    } catch (err) {
      lastErr = err.message;
      if (err.message.startsWith('rate_limit')) {
        console.log(`Rate limit em ${model}, tentando próximo...`);
        continue;
      }
      // Erro diferente de rate limit → retorna imediatamente
      break;
    }
  }

  console.error('Todos os modelos falharam:', lastErr);
  return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'Serviço temporariamente indisponível. Tente novamente em alguns segundos.' }) };
};
