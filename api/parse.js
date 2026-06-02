// Vercel API Route — parse de anúncio via OpenRouter (LLM free tier)
// Env var necessária: OPENROUTER_API_KEY

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
  "veiculo": "marca + modelo + versão completa (ex: Volkswagen Basalt Dark Edition 1.0 Turbo). Se a marca não estiver no texto, infira pelo modelo usando esta lista (não invente): Onix/Onix Plus/Tracker/Equinox/Montana/Spin/S10/Cruze/Prisma/Cobalt/Agile = Chevrolet | Pulse/Pulse Impetus/Pulse Audace/Pulse Drive/Mobi/Uno/Argo/Cronos/Toro/Strada/Fastback/Titano/Doblo = Fiat | Gol/Polo/Virtus/Saveiro/Amarok/T-Cross/Taos/Nivus/Basalt/Fox/Voyage/CrossFox/Fusca = Volkswagen | HB20/HB20S/Creta/Tucson/Santa Fe/ix35 = Hyundai | Kicks/Frontier/Sentra/Versa/March = Nissan | Corolla/Yaris/Hilux/SW4/RAV4/Etios = Toyota | Civic/City/HR-V/CR-V/Fit/WR-V = Honda | Sandero/Logan/Duster/Kwid/Kardian/Captur = Renault | Renegade/Compass/Commander/Gladiator = Jeep | Ka/EcoSport/Ranger/Bronco Sport = Ford | Sportage/Sorento/Stonic = Kia",
  "ano": "YYYY",
  "km": "número formatado sem 'km' (ex: 8.000)",
  "cor": "cor do veículo (null se não informada)",
  "regiao": "cidade ou região mencionada",
  "valor": "preço pedido sem R$ e sem pontos (ex: 89990)",
  "fipe": "valor FIPE sem R$ e sem pontos se mencionado, senão null",
  "opcionais": ["array somente com itens CONFIRMADOS no texto, usando exatamente estes nomes: ar-condicionado, ar-condicionado digital, direcao-eletrica, vidros-eletricos, travas-eletricas, retrovisores-eletricos, comandos-no-volante, multimidia, android-auto-carplay, piloto-automatico, bancos-em-couro, teto-solar, teto-panoramico, keyless, partida-remota, freio-abs, airbag, controle-de-tracao, sensor-estacionamento, camera-re, cambio-manual, cambio-automatico, cambio-cvt, tracao-4x4, rodas-liga-leve, farol-led-xenon, pneus-zero, unico-dono, ipva-pago, sem-multas-debitos, revisoes-concessionaria, na-garantia, blindado"],
  "extras": "string com informações relevantes do anúncio que NÃO se encaixam nos opcionais acima. IMPORTANTE: NUNCA repita aqui itens que já estão em opcionais (ex: não coloque 'IPVA pago', 'único dono', 'sem débitos', 'na garantia', 'revisões em concessionária' — esses já ficam em opcionais). Use apenas para informações genuinamente diferentes, como: 'manual e chave reserva', '2 pneus meia vida', 'sinistrado', 'de leilão'. null se não houver."
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
      'HTTP-Referer': 'https://crr-gerador.vercel.app',
      'X-Title': 'CRR Gerador de Anúncio',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: PROMPT(texto) }],
      temperature: 0,
      max_tokens: 512,
    }),
  });

  if (resp.status === 429 || resp.status === 503) throw new Error(`rate_limit:${resp.status}`);

  if (!resp.ok) {
    const err = await resp.text();
    let parsed; try { parsed = JSON.parse(err); } catch { parsed = {}; }
    if (parsed?.error?.message?.includes('Provider returned error') ||
        parsed?.error?.message?.includes('No endpoints')) throw new Error(`rate_limit:${resp.status}`);
    throw new Error(`http_error:${resp.status}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('no_json');
  return JSON.parse(jsonMatch[0]);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENROUTER_API_KEY não configurada' });

  const { texto } = req.body || {};
  if (!texto?.trim()) return res.status(400).json({ error: 'Campo texto obrigatório' });

  let lastErr = '';
  for (const model of MODELS) {
    try {
      const parsed = await tryModel(apiKey, model, texto);
      console.log(`OK com modelo: ${model}`);
      return res.status(200).json(parsed);
    } catch (err) {
      lastErr = err.message;
      if (err.message.startsWith('rate_limit')) { continue; }
      break;
    }
  }

  return res.status(500).json({ error: 'Serviço temporariamente indisponível. Tente novamente em alguns segundos.' });
};
