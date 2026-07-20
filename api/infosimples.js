// Vercel API Route — consultas veiculares via Infosimples
// Quando INFOSIMPLES_API_KEY estiver configurada no Vercel, usa a API real.
// Sem a chave, retorna dados simulados para desenvolvimento/demonstração.

const API_KEY = process.env.INFOSIMPLES_API_KEY;
const BASE    = 'https://api.infosimples.com/api/v2';

// ── Consultas reais ────────────────────────────────────────────────────────

async function consultaDetranSC(placa) {
  const r = await fetch(`${BASE}/consultas/detran/sc/veiculo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: API_KEY, placa }),
  });
  const d = await r.json();
  if (d.code !== 200) throw new Error(d.errors?.[0] || 'Erro DETRAN SC');
  const v = d.data?.[0] || {};
  return {
    nome: 'DETRAN SC — Situação do veículo',
    nomeAbrev: 'DETRAN SC',
    status: v.restricoes?.length ? 'warn' : 'ok',
    statusTexto: v.restricoes?.length ? `${v.restricoes.length} restrição(ões)` : 'Regular',
    detalhe: [
      v.marca && `Veículo: ${v.marca} ${v.modelo || ''}`,
      v.cor   && `Cor: ${v.cor}`,
      v.ano_fabricacao && `Ano: ${v.ano_fabricacao}/${v.ano_modelo}`,
      v.restricoes?.length && `Restrições: ${v.restricoes.join(', ')}`,
    ].filter(Boolean).join(' · ') || 'Sem dados retornados',
  };
}

async function consultaRestricoes(placa) {
  const r = await fetch(`${BASE}/consultas/detran/restricoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: API_KEY, placa }),
  });
  const d = await r.json();
  if (d.code !== 200) throw new Error(d.errors?.[0] || 'Erro Restrições');
  const itens = d.data?.[0]?.restricoes || [];
  return {
    nome: 'Restrições Unificada — todos os estados',
    nomeAbrev: 'Restrições',
    status: itens.length ? 'warn' : 'ok',
    statusTexto: itens.length ? `${itens.length} encontrada(s)` : 'Nenhuma',
    detalhe: itens.length ? itens.join(', ') : 'Sem restrições em nenhum estado.',
  };
}

async function consultaRecall(placa) {
  const r = await fetch(`${BASE}/consultas/senatran/recall`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: API_KEY, placa }),
  });
  const d = await r.json();
  if (d.code !== 200) throw new Error(d.errors?.[0] || 'Erro Recall');
  const itens = d.data?.[0]?.recalls || [];
  return {
    nome: 'SENATRAN — Recall',
    nomeAbrev: 'Recall',
    status: itens.length ? 'warn' : 'ok',
    statusTexto: itens.length ? `${itens.length} recall(s) pendente(s)` : 'Sem recall',
    detalhe: itens.length
      ? itens.map(i => `${i.descricao || i}`).join('; ')
      : 'Sem recalls pendentes para este veículo.',
  };
}

async function consultaInfracoes(placa) {
  const r = await fetch(`${BASE}/consultas/senatran/infracoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: API_KEY, placa }),
  });
  const d = await r.json();
  if (d.code !== 200) throw new Error(d.errors?.[0] || 'Erro Infrações');
  const itens = d.data?.[0]?.infracoes || [];
  return {
    nome: 'SENATRAN — Multas nacionais',
    nomeAbrev: 'Multas',
    status: itens.length ? 'warn' : 'ok',
    statusTexto: itens.length ? `${itens.length} multa(s)` : 'Sem multas',
    detalhe: itens.length
      ? itens.map(i => `${i.descricao || i.codigo || i}`).join('; ')
      : 'Sem infrações registradas em nível nacional.',
  };
}

async function consultaLaudo(placa) {
  const r = await fetch(`${BASE}/consultas/laudos-veiculares/dekra/ecv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: API_KEY, placa }),
  });
  const d = await r.json();
  if (d.code !== 200) throw new Error(d.errors?.[0] || 'Erro Laudo');
  const laudo = d.data?.[0] || {};
  const temSinistro = laudo.sinistro || laudo.leilao || false;
  return {
    nome: 'Laudo DEKRA — Histórico de sinistros',
    nomeAbrev: 'Laudo',
    status: temSinistro ? 'err' : 'ok',
    statusTexto: temSinistro ? 'Ocorrência encontrada' : 'Sem ocorrências',
    detalhe: laudo.descricao || (temSinistro
      ? `Sinistro: ${laudo.sinistro ? 'Sim' : 'Não'} · Leilão: ${laudo.leilao ? 'Sim' : 'Não'}`
      : 'Sem passagem por sinistro ou leilão registrada.'),
  };
}

// ── Dados simulados (sem chave) ───────────────────────────────────────────

function mockResultados(placa, tipos) {
  const map = {
    detran: {
      nome: 'DETRAN SC — Situação do veículo', nomeAbrev: 'DETRAN SC',
      status: 'ok', statusTexto: 'Regular',
      detalhe: `Placa: ${placa} · Situação: Regular · Sem restrições. (simulado)`,
    },
    restricoes: {
      nome: 'Restrições Unificada — todos os estados', nomeAbrev: 'Restrições',
      status: 'ok', statusTexto: 'Nenhuma',
      detalhe: 'Sem restrições em nenhum estado. (simulado)',
    },
    recall: {
      nome: 'SENATRAN — Recall', nomeAbrev: 'Recall',
      status: 'ok', statusTexto: 'Sem recall',
      detalhe: 'Sem recalls pendentes para este veículo. (simulado)',
    },
    infracoes: {
      nome: 'SENATRAN — Multas nacionais', nomeAbrev: 'Multas',
      status: 'ok', statusTexto: 'Sem multas',
      detalhe: 'Sem infrações registradas em nível nacional. (simulado)',
    },
    laudo: {
      nome: 'Laudo DEKRA — Histórico de sinistros', nomeAbrev: 'Laudo',
      status: 'ok', statusTexto: 'Sem ocorrências',
      detalhe: 'Sem passagem por sinistro ou leilão registrada. (simulado)',
    },
  };
  return tipos.map(t => map[t]).filter(Boolean);
}

// ── Handler principal ──────────────────────────────────────────────────────

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const placa = (req.query.placa || '').replace(/\W/g, '').toUpperCase();
  const tipos = (req.query.tipos || '').split(',').filter(Boolean);

  if (!placa || placa.length < 7)
    return res.status(400).json({ error: 'Placa inválida' });
  if (!tipos.length)
    return res.status(400).json({ error: 'Nenhum tipo de consulta selecionado' });

  // Sem chave → retorna simulação
  if (!API_KEY) {
    return res.status(200).json({
      simulado: true,
      placa,
      resultados: mockResultados(placa, tipos),
    });
  }

  // Com chave → consultas reais em paralelo
  const fnMap = { detran: consultaDetranSC, restricoes: consultaRestricoes,
                  recall: consultaRecall,   infracoes:  consultaInfracoes,
                  laudo:  consultaLaudo };
  try {
    const resultados = await Promise.all(
      tipos.map(t => fnMap[t] ? fnMap[t](placa) : Promise.resolve(null))
    );
    return res.status(200).json({ simulado: false, placa, resultados: resultados.filter(Boolean) });
  } catch (err) {
    console.error('infosimples error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
