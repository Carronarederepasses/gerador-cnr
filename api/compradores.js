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
  'veiculo_nome','comprador_nome','comprador_id','contato_telefone',
  'valor_proposto','status','ultimo_contato','historico','observacoes',
  'motivo_descarte','motivo_match',
];

const CAMPOS_COMPRADOR = [
  'nome','proprietario','telefone','tipo','cidade','marcas','preco_min','preco_max','observacoes','ativo',
  'razao_social','cnpj','ie',
  'cpf','rg','data_nascimento',
  'cep','estado','logradouro','numero','complemento_end','bairro',
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

// Score de match: 0-100
// 40 pts — valor dentro da faixa de preço
// 30 pts — marca na lista de interesse
// 20 pts — valor abaixo do máximo (mas fora da faixa)
// 10 pts — base (qualquer comprador ativo)
function calcScore(comprador, { marca, valor }) {
  let score = 10;
  const v = parseFloat(valor) || 0;
  const min = parseFloat(comprador.preco_min) || 0;
  const max = parseFloat(comprador.preco_max) || Infinity;
  const marcas = (comprador.marcas || []).map(m => m.toLowerCase());

  if (v > 0 && v >= min && v <= max) score += 40;
  else if (v > 0 && max < Infinity && v <= max) score += 20;

  if (marca && marcas.includes(marca.toLowerCase())) score += 30;

  return Math.min(score, 100);
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

    // ── MATCH ─────────────────────────────────────────────────
    if ('match' in q) {
      const r = await sb('compradores?select=*&ativo=eq.true&order=nome.asc');
      if (!r.ok) throw new Error(await r.text());
      const lista = await r.json();
      const scored = lista
        .map(c => ({ ...c, score: calcScore(c, { marca: q.marca, valor: q.valor }) }))
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
