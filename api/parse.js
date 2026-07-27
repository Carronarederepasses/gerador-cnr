// Vercel API Route — parse de anúncio via OpenRouter (LLM free tier)
// Env var necessária: OPENROUTER_API_KEY

const MODELS = [
  // Pago barato e confiável (principal) — ~R$ 0,001 por anúncio
  'openai/gpt-4o-mini',
  'google/gemini-2.5-flash',
  // Gratuitos como reserva (instáveis: usados só se os pagos falharem)
  'meta-llama/llama-3.3-70b-instruct:free',
  'openai/gpt-oss-120b:free',
];

const PROMPT = (texto) => `Você extrai dados de anúncios de veículos em texto livre (português brasileiro informal, WhatsApp, OLX, etc.).

Retorne SOMENTE um JSON válido com estes campos (null se não encontrado):

{
  "veiculo": "marca + modelo + versão completa (ex: Volkswagen Basalt Dark Edition 1.0 Turbo). Se a marca não estiver no texto, infira pelo modelo usando esta lista (não invente): Onix/Onix Plus/Tracker/Equinox/Montana/Spin/S10/Cruze/Prisma/Cobalt/Agile = Chevrolet | Pulse/Pulse Impetus/Pulse Audace/Pulse Drive/Mobi/Uno/Argo/Cronos/Toro/Strada/Fastback/Titano/Doblo = Fiat | Gol/Polo/Virtus/Saveiro/Amarok/T-Cross/Taos/Nivus/Basalt/Fox/Voyage/CrossFox/Fusca = Volkswagen | HB20/HB20S/Creta/Tucson/Santa Fe/ix35 = Hyundai | Kicks/Frontier/Sentra/Versa/March = Nissan | Corolla/Yaris/Hilux/SW4/RAV4/Etios = Toyota | Civic/City/HR-V/CR-V/Fit/WR-V = Honda | Sandero/Logan/Duster/Kwid/Kardian/Captur = Renault | Renegade/Compass/Commander/Gladiator = Jeep | Ka/EcoSport/Ranger/Bronco Sport = Ford | Sportage/Sorento/Stonic = Kia | H6/H2/H5/Jolion/Steed/Ora/Big Dog = GWM Haval",
  "ano": "ano do veículo em YYYY. Quando aparecer no formato 'XXXX/YYYY' (ex: 2024/2025), use SEMPRE o segundo ano (2025), pois é o ano modelo/comercial que prevalece.",
  "km": "quilometragem ATUAL do odômetro do veículo, formatado sem 'km' (ex: 8.000). ATENÇÃO: NÃO confunda com km de revisão (ex: 'revisões até 80.000 km' NÃO é a quilometragem do carro). null se não informada.",
  "cor": "cor do veículo (null se não informada)",
  "regiao": "cidade ou região mencionada",
  "valor": "preço pedido sem R$ e sem pontos (ex: 89990)",
  "fipe": "valor FIPE sem R$ e sem pontos se mencionado, senão null",
  "combustivel": "um destes valores, se mencionado ou claramente indicado pela versão do carro: Flex, Gasolina, Álcool, Diesel, Híbrido, Elétrico, GNV. null se não der pra saber",
  "blindagem_marca": "marca da blindagem se mencionada (ex: Hevox, Inbrap, Blindex, Centurion). null se não houver ou não for blindado",
  "blindagem_nivel": "nível de proteção da blindagem se mencionado (ex: IIIA, Nível III-A). null se não houver ou não for blindado",
  "blindagem_vidro": "descrição do vidro da blindagem se mencionada (ex: vidros originais blindados). null se não houver ou não for blindado",
  "opcionais": ["array somente com itens CONFIRMADOS no texto, usando exatamente estes nomes: ar-condicionado, ar-condicionado digital, direcao-eletrica, vidros-eletricos, travas-eletricas, retrovisores-eletricos, comandos-no-volante, multimidia, android-auto-carplay, piloto-automatico, bancos-em-couro, teto-solar, teto-panoramico, keyless, partida-remota, freio-abs, airbag, controle-de-tracao, sensor-estacionamento, camera-re, cambio-manual, cambio-automatico, cambio-cvt, tracao-4x4, rodas-liga-leve, farol-led-xenon, pneus-zero, unico-dono, ipva-pago (sinônimos: IPVA quitado, IPVA 2024 pago, IPVA 2025 pago, IPVA 2026 pago, IPVA ok, com IPVA, IPVA em dia), sem-multas-debitos (sinônimos: sem débitos, sem multas, sem restrições, débitos quitados, sem pendências), revisoes-concessionaria (sinônimos: revisões em dia, revisões feitas, com revisões, revisado, revisões na agenda, histórico de revisões, revisões realizadas, revisões ok — mesmo sem mencionar 'concessionária'), na-garantia, blindado (sinônimos: blindagem, blindada, veículo blindado), cautelar-aprovada (sinônimos: laudo aprovado, laudo cautelar aprovado, laudo ok, laudo limpo, com laudo, cautelar aprovada, com cautelar)"],
  "chave_reserva": "tem | nao-tem | null. 'tem' se mencionar chave reserva, chave extra, chave cópia, manual e chave. 'nao-tem' se mencionar sem chave reserva, sem segunda chave, somente 1 chave. null se não mencionado.",
  "manual": "tem | nao-tem | null. 'tem' se mencionar manual do proprietário, manual do veículo, com manual. 'nao-tem' se mencionar sem manual. null se não mencionado.",
  "revisoes_km": "quilometragem até a qual as revisões foram feitas na concessionária, se mencionado (ex: '80000'). null se não mencionado.",
  "gastos": "string com reparos, melhorias ou gastos que o vendedor menciona que o carro precisa ou que já foram feitos por conta do comprador (ex: 'precisa pintar para-choque', 'gasta pneus na frente', 'tem um gasto de R$ 800 no câmbio'). null se não mencionado.",
  "extras": "string com informações relevantes do anúncio que NÃO se encaixam nos opcionais acima. IMPORTANTE: NUNCA repita aqui itens que já estão em opcionais. Capture SEMPRE que mencionado: manual do proprietário, chave reserva, manual e chave, chave extra, chave cópia, pneus meia vida, revisão feita fora da concessionária, sinistrado, de leilão, motor retificado, para-choque batido, etc. null se não houver nenhuma informação desse tipo."
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
      console.error(`parse falhou em ${model}: ${err.message}`);
      continue; // tenta o próximo modelo em qualquer falha
    }
  }

  return res.status(500).json({ error: 'Serviço temporariamente indisponível. Tente novamente em alguns segundos.' });
};
