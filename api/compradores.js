// Vercel API Route — CRM de Compradores + Log de Eventos + Motor de Match
//
// Compradores (tabela `compradores`):
//   GET    /api/compradores              → lista todos
//   GET    /api/compradores?id=<uuid>    → um comprador
//   POST   /api/compradores             → cria
//   PATCH  /api/compradores?id=<uuid>   → atualiza
//   DELETE /api/compradores?id=<uuid>   → desativa (ativo=false)
//
// Match:
//   GET    /api/compradores?match=1&marca=X&valor=Y → compradores rankeados por score
//
// Eventos (tabela `eventos`, imutável):
//   POST   /api/compradores?evento=1    body { tipo, veiculo_id?, venda_id?, comprador_id?, dados? }
//   GET    /api/compradores?evento=1&veiculo_id=X  → eventos de um veículo (ordem cronológica)

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

const CAMPOS_NEG = [
  'veiculo_id','veiculo_nome','comprador_nome','comprador_id','contato_telefone',
  'valor_proposto','status','ultimo_contato','historico','observacoes',
  'motivo_descarte','motivo_match',
];

const CAMPOS_COMPRADOR = [
  'nome','proprietario','telefone','tipo','papel','cidade','marcas','preco_min','preco_max','observacoes','ativo',
  'razao_social','cnpj','ie',
  'cpf','rg','data_nascimento',
  'cep','estado','logradouro','numero','complemento_end','bairro',
  'banco','agencia','conta','tipo_conta','pix_tipo','pix_chave',
];
const CAMPOS_EVENTO    = ['tipo','veiculo_id','venda_id','comprador_id','usuario','dados','origem'];

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: opts.prefer || 'return=representation',
      ...(opts.headers || {}),
    },
  });
}

function limpar(body, campos) {
  const out = {};
  for (const k of campos) if (body[k] !== undefined) out[k] = body[k] === '' ? null : body[k];
  return out;
}

// Aliases FIPE → forma canônica lowercase (para comparação de marca no Match)
const MARCA_ALIAS = {
  'vw - volkswagen': 'volkswagen',
  'gm - chevrolet':  'chevrolet',
};
function normMarca(m) {
  if (!m) return '';
  const lower = m.toLowerCase().trim();
  return MARCA_ALIAS[lower] || lower;
}

// Score de match (0–100)
// Camada 1 — estática (perfil):
//   40 pts — valor dentro da faixa de preço
//   30 pts — marca na lista de interesse
//   20 pts — valor abaixo do máximo (mas fora da faixa)
//   10 pts — base (qualquer comprador ativo)
// Camada 2 — histórico de compras (tabela vendas):
//   +5/10/15 pts — qtd de compras no CNR
//   +15 pts — já comprou a mesma marca
//   +5/10 pts — ticket médio próximo do valor
//   +3/6/10 pts — recência da última compra
// Camada 3 — comportamento nos eventos de match:
//   +5/20 pts — engajamento recente
//   -8/-15/-25 pts — recusas recentes
//   -40 pts — já notificado neste veículo (evita spam)
function calcScore(comprador, { marca, valor, veiculo_id = null }) {
  let score = 10;
  const v = parseFloat(valor) || 0;
  const min = parseFloat(comprador.preco_min) || 0;
  const max = parseFloat(comprador.preco_max) || Infinity;
  const marcas = (comprador.marcas || []).map(m => m.toLowerCase());
  const compras  = comprador.compras  || [];
  const eventos  = comprador.eventos  || [];
  const agora    = Date.now();

  // — Camada 1: perfil estático —
  if (v > 0 && v >= min && v <= max) score += 40;
  else if (v > 0 && max < Infinity && v <= max) score += 20;
  if (marca && marcas.includes(normMarca(marca))) score += 30;

  // — Camada 2: histórico de compras —
  const qtd = compras.length;
  if (qtd >= 5) score += 15;
  else if (qtd >= 3) score += 10;
  else if (qtd >= 1) score += 5;

  if (marca && compras.some(p => p.marca && normMarca(p.marca) === normMarca(marca))) score += 15;

  if (qtd > 0 && v > 0) {
    const ticket = compras.reduce((s, p) => s + (parseFloat(p.valor_venda) || 0), 0) / qtd;
    const diff = Math.abs(ticket - v) / v;
    if (diff <= 0.15) score += 10;
    else if (diff <= 0.30) score += 5;
  }

  if (qtd > 0) {
    const ultima = Math.max(...compras.map(p => new Date(p.data_venda).getTime()));
    const dias = (agora - ultima) / 86400000;
    if (dias <= 30) score += 10;
    else if (dias <= 60) score += 6;
    else if (dias <= 90) score += 3;
  }

  // — Camada 3: comportamento nos eventos —
  const eventosRecentes = eventos.filter(e => (agora - new Date(e.created_at).getTime()) / 86400000 <= 21);
  const respondeuRecente = eventosRecentes.some(e => ['respondeu_interessado', 'ligar_depois'].includes(e.resultado));
  if (respondeuRecente) score += 20;
  else if (eventosRecentes.length > 0) score += 5;

  const recusasRecentes = eventos.filter(e => {
    const dias = (agora - new Date(e.created_at).getTime()) / 86400000;
    return dias <= 30 && ['nao_serve', 'nao_respondeu'].includes(e.resultado);
  });
  if (recusasRecentes.length >= 3) score -= 25;
  else if (recusasRecentes.length === 2) score -= 15;
  else if (recusasRecentes.length === 1) score -= 8;

  if (veiculo_id && eventos.some(e => e.veiculo_id === veiculo_id)) score -= 40;

  return Math.max(0, Math.min(score, 100));
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const q = req.query;

  try {
    // ── OBSERVAÇÕES (conhecimento sobre qualquer entidade) ────
    if ('obs' in q) {
      if (req.method === 'GET') {
        if (!q.entidade_id) return res.status(400).json({ error: 'entidade_id obrigatório' });
        const tipo = q.tipo || 'comprador';
        const r = await sb(`observacoes?tipo_entidade=eq.${encodeURIComponent(tipo)}&entidade_id=eq.${q.entidade_id}&ativo=eq.true&order=created_at.asc`);
        const data = await r.json();
        return res.status(r.ok ? 200 : r.status).json(data);
      }
      if (req.method === 'POST') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
        if (!body.texto || !body.entidade_id) return res.status(400).json({ error: 'texto e entidade_id obrigatórios' });
        const payload = {
          tipo_entidade: body.tipo_entidade || 'comprador',
          entidade_id:   body.entidade_id,
          texto:         body.texto.trim(),
          autor:         body.autor || 'yuri',
        };
        const r = await sb('observacoes', { method: 'POST', body: JSON.stringify(payload), prefer: 'return=representation' });
        const data = await r.json();
        return res.status(r.ok ? 201 : r.status).json(r.ok ? data[0] : data);
      }
      if (req.method === 'PATCH') {
        if (!q.id) return res.status(400).json({ error: 'id obrigatório' });
        const r = await sb(`observacoes?id=eq.${q.id}`, { method: 'PATCH', body: JSON.stringify({ ativo: false }), prefer: 'return=representation' });
        const data = await r.json();
        return res.status(r.ok ? 200 : r.status).json(r.ok ? data[0] : data);
      }
      return res.status(405).json({ error: 'Método não permitido' });
    }

    // ── EVENTOS ──────────────────────────────────────────────
    if ('evento' in q) {
      if (req.method === 'POST') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
        const payload = limpar(body, CAMPOS_EVENTO);
        if (!payload.tipo) return res.status(400).json({ error: 'tipo obrigatório' });
        payload.origem = payload.origem || 'web';
        const r = await sb('eventos', {
          method: 'POST',
          body: JSON.stringify(payload),
          prefer: 'return=representation',
        });
        const data = await r.json();
        return res.status(r.ok ? 201 : r.status).json(r.ok ? data[0] : data);
      }
      if (req.method === 'GET') {
        const filtros = ['order=created_at.asc'];
        if (q.veiculo_id) filtros.push(`veiculo_id=eq.${q.veiculo_id}`);
        if (q.venda_id)   filtros.push(`venda_id=eq.${q.venda_id}`);
        if (q.tipo)       filtros.push(`tipo=eq.${encodeURIComponent(q.tipo)}`);
        const r = await sb(`eventos?select=*&${filtros.join('&')}`);
        const data = await r.json();
        return res.status(r.ok ? 200 : r.status).json(data);
      }
      return res.status(405).json({ error: 'Método não permitido' });
    }

    // ── NEGOCIAÇÕES ───────────────────────────────────────────
    if ('neg' in q) {
      if (req.method === 'GET') {
        if (q.id) {
          const r = await sb(`negociacoes?id=eq.${q.id}&select=*`);
          const data = await r.json();
          if (!r.ok) return res.status(r.status).json(data);
          return res.status(200).json(data[0] || null);
        }
        const filtros = ['select=*', 'order=updated_at.desc'];
        if (q.status) filtros.push(`status=eq.${encodeURIComponent(q.status)}`);
        const r = await sb(`negociacoes?${filtros.join('&')}`);
        const data = await r.json();
        return res.status(r.ok ? 200 : r.status).json(data);
      }
      if (req.method === 'POST') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
        const payload = limpar(body, CAMPOS_NEG);
        if (!payload.veiculo_nome && !payload.comprador_nome)
          return res.status(400).json({ error: 'veiculo_nome ou comprador_nome obrigatório' });
        payload.historico = payload.historico || [];
        const r = await sb('negociacoes', {
          method: 'POST', body: JSON.stringify(payload), prefer: 'return=representation',
        });
        const data = await r.json();
        return res.status(r.ok ? 201 : r.status).json(r.ok ? data[0] : data);
      }
      if (req.method === 'PATCH') {
        if (!q.id) return res.status(400).json({ error: 'id obrigatório' });
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
        const payload = limpar(body, CAMPOS_NEG);
        payload.updated_at = new Date().toISOString();
        const r = await sb(`negociacoes?id=eq.${q.id}`, {
          method: 'PATCH', body: JSON.stringify(payload), prefer: 'return=representation',
        });
        const data = await r.json();
        return res.status(r.ok ? 200 : r.status).json(r.ok ? data[0] : data);
      }
      if (req.method === 'DELETE') {
        if (!q.id) return res.status(400).json({ error: 'id obrigatório' });
        const r = await sb(`negociacoes?id=eq.${q.id}`, { method: 'DELETE' });
        if (!r.ok) throw new Error(await r.text());
        return res.status(200).json({ ok: true });
      }
      return res.status(405).json({ error: 'Método não permitido' });
    }

    // ── CAPITAL DE CONHECIMENTO (KCR) ─────────────────────────
    if ('saude' in q) {
      const [rComp, rNeg, rVend] = await Promise.all([
        sb('compradores?ativo=eq.true&select=marcas,preco_min,preco_max,observacoes'),
        sb('negociacoes?select=status,motivo_descarte'),
        sb('vendas?select=valor_compra,motivo_match'),
      ]);
      if (!rComp.ok) throw new Error('Erro ao buscar compradores');
      if (!rNeg.ok)  throw new Error('Erro ao buscar negociações');
      if (!rVend.ok) throw new Error('Erro ao buscar vendas');
      const comps = await rComp.json();
      const negs  = await rNeg.json();
      const vends = await rVend.json();
      const descartadas = negs.filter(n => n.status === 'descartado');
      return res.status(200).json({
        compradores: {
          total:      comps.length,
          com_marcas: comps.filter(c => Array.isArray(c.marcas) && c.marcas.length > 0).length,
          com_preco:  comps.filter(c => c.preco_min != null && c.preco_max != null).length,
          com_obs:    comps.filter(c => c.observacoes && c.observacoes.trim().length > 0).length,
        },
        negociacoes: {
          descartadas:         descartadas.length,
          com_motivo_descarte: descartadas.filter(n => n.motivo_descarte != null && n.motivo_descarte !== '').length,
        },
        vendas: {
          total:            vends.length,
          com_valor_compra: vends.filter(v => v.valor_compra != null).length,
          com_motivo_match: vends.filter(v => v.motivo_match != null && v.motivo_match !== '').length,
        },
      });
    }

    // ── COMPRADORES ENRIQUECIDOS (com histórico e eventos de match) ──
    if ('enriquecido' in q && req.method === 'GET') {
      const [rComp, rVendas, rEventos] = await Promise.all([
        sb('compradores?select=*&ativo=eq.true&order=nome.asc'),
        sb('vendas?select=comprador_id,marca,valor_venda,data_venda&comprador_id=not.is.null'),
        sb('eventos?select=comprador_id,resultado,created_at,veiculo_id&tipo=eq.match_notificado'),
      ]);
      if (!rComp.ok) throw new Error(await rComp.text());
      const compradores  = await rComp.json();
      const todasVendas  = rVendas.ok  ? await rVendas.json()  : [];
      const todosEventos = rEventos.ok ? await rEventos.json() : [];

      const vendasMap  = {};
      const eventosMap = {};
      for (const v of todasVendas) {
        if (!vendasMap[v.comprador_id]) vendasMap[v.comprador_id] = [];
        vendasMap[v.comprador_id].push(v);
      }
      for (const e of todosEventos) {
        if (!eventosMap[e.comprador_id]) eventosMap[e.comprador_id] = [];
        eventosMap[e.comprador_id].push(e);
      }

      return res.status(200).json(compradores.map(c => ({
        ...c,
        compras: vendasMap[c.id]  || [],
        eventos: eventosMap[c.id] || [],
      })));
    }

    // ── MATCH ─────────────────────────────────────────────────
    if ('match' in q) {
      const [rComp, rVendas, rEventos] = await Promise.all([
        sb('compradores?select=*&ativo=eq.true&papel=in.(comprador,ambos)&order=nome.asc'),
        sb('vendas?select=comprador_id,marca,valor_venda,data_venda&comprador_id=not.is.null'),
        sb('eventos?select=comprador_id,resultado,created_at,veiculo_id&tipo=eq.match_notificado'),
      ]);
      if (!rComp.ok) throw new Error(await rComp.text());
      const compradores  = await rComp.json();
      const todasVendas  = rVendas.ok  ? await rVendas.json()  : [];
      const todosEventos = rEventos.ok ? await rEventos.json() : [];

      const vendasMap  = {};
      const eventosMap = {};
      for (const v of todasVendas) {
        if (!vendasMap[v.comprador_id]) vendasMap[v.comprador_id] = [];
        vendasMap[v.comprador_id].push(v);
      }
      for (const e of todosEventos) {
        if (!eventosMap[e.comprador_id]) eventosMap[e.comprador_id] = [];
        eventosMap[e.comprador_id].push(e);
      }

      const scored = compradores
        .map(c => ({
          ...c,
          compras: vendasMap[c.id]  || [],
          eventos: eventosMap[c.id] || [],
        }))
        .map(c => ({ ...c, score: calcScore(c, { marca: q.marca, valor: q.valor, veiculo_id: q.veiculo_id || null }) }))
        .sort((a, b) => b.score - a.score);
      return res.status(200).json(scored);
    }

    // ── COMPRADORES CRUD ──────────────────────────────────────
    if (req.method === 'GET') {
      if (q.id) {
        const r = await sb(`compradores?id=eq.${q.id}&select=*`);
        const data = await r.json();
        if (!r.ok) return res.status(r.status).json(data);
        if (!data.length) return res.status(404).json({ error: 'Não encontrado' });
        return res.status(200).json(data[0]);
      }
      const filtros = ['select=*', 'order=nome.asc'];
      if (q.ativo !== undefined) filtros.push(`ativo=eq.${q.ativo}`);
      const r = await sb(`compradores?${filtros.join('&')}`);
      const data = await r.json();
      return res.status(r.ok ? 200 : r.status).json(data);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const payload = limpar(body, CAMPOS_COMPRADOR);
      if (!payload.nome) return res.status(400).json({ error: 'nome obrigatório' });
      const r = await sb('compradores', {
        method: 'POST',
        body: JSON.stringify(payload),
        prefer: 'return=representation',
      });
      const data = await r.json();
      return res.status(r.ok ? 201 : r.status).json(r.ok ? data[0] : data);
    }

    if (req.method === 'PATCH') {
      if (!q.id) return res.status(400).json({ error: 'id obrigatório' });
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const payload = limpar(body, CAMPOS_COMPRADOR);
      const r = await sb(`compradores?id=eq.${q.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
        prefer: 'return=representation',
      });
      const data = await r.json();
      return res.status(r.ok ? 200 : r.status).json(r.ok ? data[0] : data);
    }

    if (req.method === 'DELETE') {
      if (!q.id) return res.status(400).json({ error: 'id obrigatório' });
      // Soft delete — preserva histórico
      const r = await sb(`compradores?id=eq.${q.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ativo: false }),
        prefer: 'return=representation',
      });
      const data = await r.json();
      return res.status(r.ok ? 200 : r.status).json(r.ok ? data[0] : data);
    }

    return res.status(405).json({ error: 'Método não permitido' });

  } catch (err) {
    console.error('compradores error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
