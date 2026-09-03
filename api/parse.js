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

// Traduz o motivo real da falha para uma frase que diz o que fazer.
//
// Os códigos internos (rate_limit:429, http_error:402, no_json) já existiam,
// mas iam só para o console do servidor — que o operador não vê. Na tela
// aparecia "Serviço temporariamente indisponível. Tente novamente", igual
// para sobrecarga passageira, chave vencida e conta sem crédito. Três
// problemas com respostas muito diferentes, e a mesma frase para os três.
//
// Nenhum código carrega segredo: são status HTTP e rótulos nossos.
function motivoLegivel(codigos) {
  const todos = codigos.join(' ');

  if (/rate_limit:(429|503)/.test(todos)) {
    return { texto: 'A IA está sobrecarregada agora. Espere alguns segundos e clique de novo — costuma passar sozinho.',
             tipo: 'passageiro' };
  }
  if (/http_error:40[13]/.test(todos)) {
    return { texto: 'A chave da IA foi recusada. Precisa renovar a OPENROUTER_API_KEY na Vercel.',
             tipo: 'configuracao' };
  }
  if (/http_error:402/.test(todos)) {
    return { texto: 'A conta da IA está sem crédito. Recarregue no OpenRouter para voltar a ler anúncios.',
             tipo: 'configuracao' };
  }
  if (/http_error:413/.test(todos)) {
    return { texto: 'A imagem é grande demais para a IA. Tente com uma foto menor ou recorte só o card do anúncio.',
             tipo: 'entrada' };
  }
  if (/no_json/.test(todos)) {
    return { texto: 'A IA respondeu, mas fora do formato esperado. Tente de novo, ou cole o texto do anúncio em vez da imagem.',
             tipo: 'passageiro' };
  }
  if (/http_error:5\d\d/.test(todos)) {
    return { texto: 'O serviço de IA está fora do ar. Não é o Gerador — tente daqui a pouco.',
             tipo: 'passageiro' };
  }
  return { texto: 'Não consegui ler com nenhum modelo de IA. Tente de novo; se insistir, me mostre o detalhe abaixo.',
           tipo: 'desconhecido' };
}

// Modelos com suporte a visão (imagem) — usados no modo parceiro
const MODELS_VISION = [
  'anthropic/claude-sonnet-4-5',
  'openai/gpt-4o-mini',
  'google/gemini-2.5-flash',
];

const PROMPT_PARCEIRO = (laudoTexto) => `Você analisa imagem(ns) de veículo — pode ser o card de um site de revendedora OU páginas do laudo cautelar renderizadas — e, quando disponível, o texto extraído do laudo cautelar abaixo.

REGRA OBRIGATÓRIA: se a quilometragem da imagem e do laudo cautelar forem diferentes, use SEMPRE a km do laudo cautelar — ele é o documento oficial. Se só houver laudo, use a km nele registrada.

Analise AMBAS as fontes (imagem + laudo) para preencher os campos abaixo.

Laudo cautelar (texto extraído do PDF):
${laudoTexto || '(não fornecido)'}

Retorne SOMENTE um JSON válido com estes campos (null se não encontrado):

{
  "veiculo": "marca + modelo + versão completa visível no card. Se marca não estiver explícita, infira pelo modelo",
  "ano": "ano em YYYY. Quando aparecer 'XXXX/YYYY' ou abreviado 'XX/XX' (ex: '24/25'), use SEMPRE o segundo ano. Se for '24/25', retorne '2025'",
  "km": "quilometragem do odômetro. Se houver divergência entre imagem e laudo, USE A DO LAUDO. Sem 'km' (ex: 29.254)",
  "cor": "cor do veículo",
  "regiao": null,
  "valor": "preço pedido sem R$ e sem pontos (ex: 79758)",
  "fipe": null,
  "combustivel": "Flex, Gasolina, Álcool, Diesel, Híbrido, Elétrico ou GNV. Infira pela versão se não estiver explícito",
  "blindagem_marca": null,
  "blindagem_nivel": null,
  "blindagem_vidro": null,
  "opcionais": ["array com itens confirmados na imagem ou no laudo. Use exatamente estes nomes: ar-condicionado, ar-condicionado digital, direcao-eletrica, vidros-eletricos, travas-eletricas, retrovisores-eletricos, comandos-no-volante, multimidia, android-auto-carplay, piloto-automatico, bancos-em-couro, teto-solar, teto-panoramico, keyless, partida-remota, freio-abs, airbag, controle-de-tracao, sensor-estacionamento, camera-re, cambio-manual, cambio-automatico, cambio-cvt, tracao-4x4, rodas-liga-leve, farol-led-xenon, pneus-zero, unico-dono, ipva-pago (= IPVA pago, IPVA 2024 pago, IPVA 2025 pago, IPVA 2026 pago, IPVA quitado, IPVA em dia, IPVA ok), sem-multas-debitos, revisoes-concessionaria, na-garantia, blindado, cautelar-aprovada"],
  "chave_reserva": "tem | nao-tem | null — IMPORTANTE: se na imagem aparecer duas chaves (ou '2 chaves', 'chave extra', 'chave reserva', ícone de duas chaves), retorne 'tem'. Se aparecer uma chave só ou 'sem chave reserva', retorne 'nao-tem'. null se não der pra saber",
  "manual": "tem | nao-tem | null — se houver menção a manual do proprietário ou ícone de livro/manual no card, retorne 'tem'. null se não der pra saber",
  "revisoes_km": "km até onde as revisões foram feitas, se mencionado. null se não encontrado",
  "gastos": "Reparos, melhorias ou gastos indicados na imagem ou no laudo — tanto laudo (itens reprovados com valores de reparo) quanto card (ex: 'precisa pintar para-choque', 'câmbio com folga', custo total de reparos). null se nenhum reparo ou custo for mencionado",
  "extras": "informações relevantes do laudo que não se encaixam nos campos acima (ex: restrições administrativas, débitos, avisos). null se não houver"
}

JSON:`;

const PROMPT = (texto) => `Você extrai dados de anúncios de veículos em texto livre (português brasileiro informal, WhatsApp, OLX, etc.).

Retorne SOMENTE um JSON válido com estes campos (null se não encontrado):

{
  "veiculo": "marca + modelo + versão completa (ex: Volkswagen Basalt Dark Edition 1.0 Turbo). Se a marca não estiver no texto, infira pelo modelo usando esta lista (não invente): Onix/Onix Plus/Tracker/Equinox/Montana/Spin/S10/Cruze/Prisma/Cobalt/Agile = Chevrolet | Pulse/Pulse Impetus/Pulse Audace/Pulse Drive/Mobi/Uno/Argo/Cronos/Toro/Strada/Fastback/Titano/Doblo = Fiat | Gol/Polo/Virtus/Saveiro/Amarok/T-Cross/Taos/Nivus/Basalt/Fox/Voyage/CrossFox/Fusca = Volkswagen | HB20/HB20S/Creta/Tucson/Santa Fe/ix35 = Hyundai | Kicks/Frontier/Sentra/Versa/March = Nissan | Corolla/Yaris/Hilux/SW4/RAV4/Etios = Toyota | Civic/City/HR-V/CR-V/Fit/WR-V = Honda | Sandero/Logan/Duster/Kwid/Kardian/Captur = Renault | Renegade/Compass/Commander/Gladiator = Jeep | Ka/EcoSport/Ranger/Bronco Sport = Ford | Sportage/Sorento/Stonic = Kia | H6/H2/H5/Jolion/Steed/Ora/Big Dog = GWM Haval | Journey/Durango/Ram 1500/Ram 2500/Ram 3500 = Dodge | Chrysler 300/300C = Chrysler",
  "ano": "ano do veículo em YYYY. Quando aparecer no formato 'XXXX/YYYY' (ex: 2024/2025) ou abreviado 'XX/XX' (ex: '24/25'), use SEMPRE o segundo ano (o ano modelo/comercial que prevalece). Se for '24/25', retorne '2025'.",
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
  "pneus": "array com até 2 grupos, no formato [{\"qtd\": 4, \"estado\": \"novos\"}]. O campo estado aceita SOMENTE: novos, bons, meia-vida, fracos. Mapeie assim: 'novos/zero/zerados/trocados agora/recém trocados' → novos; 'bons/em bom estado/ok/bem/inteiros' → bons; 'meia vida/meia-vida/metade/50%/na metade' → meia-vida; 'fracos/gastos/carecas/lisos/ruins/precisa trocar/a trocar/vão precisar de troca' → fracos. Quando o texto disser quantidades diferentes, devolva os dois grupos (ex: 'dois pneus novos e dois meia vida' → [{\"qtd\":2,\"estado\":\"novos\"},{\"qtd\":2,\"estado\":\"meia-vida\"}]). Quando não disser quantidade, assuma 4 (ex: 'pneus bons' → [{\"qtd\":4,\"estado\":\"bons\"}]). Entenda número por extenso: um=1, dois=2, três=3, quatro=4. null se pneus não forem mencionados.",
  "gastos": "string com reparos, melhorias ou gastos que o vendedor menciona que o carro precisa ou que já foram feitos por conta do comprador (ex: 'precisa pintar para-choque', 'tem um gasto de R$ 800 no câmbio'). NÃO coloque aqui o estado dos pneus — isso vai no campo pneus. null se não mencionado.",
  "extras": "string com informações relevantes do anúncio que NÃO se encaixam nos opcionais acima. IMPORTANTE: NUNCA repita aqui itens que já estão em opcionais, nem o estado dos pneus (isso vai no campo pneus). Capture SEMPRE que mencionado: manual do proprietário, chave reserva, manual e chave, chave extra, chave cópia, revisão feita fora da concessionária, sinistrado, de leilão, motor retificado, para-choque batido, etc. null se não houver nenhuma informação desse tipo."
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

async function tryModelParceiro(apiKey, model, imagemBase64, laudoTexto) {
  const content = [
    { type: 'image_url', image_url: { url: imagemBase64 } },
    { type: 'text', text: PROMPT_PARCEIRO(laudoTexto) },
  ];

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
      messages: [{ role: 'user', content }],
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
  const content2 = data.choices?.[0]?.message?.content || '';
  const jsonMatch = content2.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('no_json');
  return JSON.parse(jsonMatch[0]);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENROUTER_API_KEY não configurada' });

  // Modo parceiro: imagem do site + texto do laudo cautelar
  if (req.query.parceiro === '1') {
    const { imagem, laudoTexto } = req.body || {};
    if (!imagem) return res.status(400).json({ error: 'Campo imagem obrigatório' });

    const falhas = [];
    for (const model of MODELS_VISION) {
      try {
        const parsed = await tryModelParceiro(apiKey, model, imagem, laudoTexto || '');
        console.log(`parceiro OK com modelo: ${model}`);
        return res.status(200).json(parsed);
      } catch (err) {
        falhas.push(`${model} → ${err.message}`);
        console.error(`parceiro falhou em ${model}: ${err.message}`);
        continue;
      }
    }
    const m = motivoLegivel(falhas);
    return res.status(500).json({ error: m.texto, tipo: m.tipo, detalhe: falhas });
  }

  const { texto } = req.body || {};
  if (!texto?.trim()) return res.status(400).json({ error: 'Campo texto obrigatório' });

  const falhas = [];
  for (const model of MODELS) {
    try {
      const parsed = await tryModel(apiKey, model, texto);
      console.log(`OK com modelo: ${model}`);
      return res.status(200).json(parsed);
    } catch (err) {
      falhas.push(`${model} → ${err.message}`);
      console.error(`parse falhou em ${model}: ${err.message}`);
      continue; // tenta o próximo modelo em qualquer falha
    }
  }

  const m = motivoLegivel(falhas);
  return res.status(500).json({ error: m.texto, tipo: m.tipo, detalhe: falhas });
};
