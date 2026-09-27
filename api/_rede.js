// A rede — mandar carro para a lista, receber, levantar a mão.
//
// ══ LEIA ISTO ANTES DE MEXER ═══════════════════════════════════════
//
// Todo o resto do sistema é isolado pelo funil `api/_db.js`, que põe
// `conta_id=eq.<minha conta>` em cada consulta. **Aqui não dá.** A rede
// existe justamente para um dado atravessar de uma loja para outra: a
// loja A manda um carro e a loja B precisa ver.
//
// Então as tabelas da rede ficam FORA do funil, e cada consulta carrega a
// própria regra, escrita à mão. **É aqui que um vazamento nasceria** — e
// por isso cada função abaixo diz, em uma linha, qual é a regra dela.
//
// As três travas que sobram, e que valem mais que a boa intenção:
//
//   1. O que atravessa é a FOTOGRAFIA do carro, guardada na oferta. A
//      tabela `veiculos` da outra loja nunca é lida. Placa e valor de
//      compra não têm coluna em `ofertas`, então não vazam nem por
//      descuido de um `select *`.
//   2. Quem pode o quê vem da SESSÃO (papel + `pode_ofertar`), nunca do
//      corpo do pedido.
//   3. Toda leitura começa pela minha conta e caminha para fora — nunca
//      o contrário. "Quais ofertas chegaram para mim" é uma busca em
//      `oferta_destinos` pela minha conta; não é varrer ofertas e filtrar.
//
// Prefixo `_`: não é rota, não consome função (teto de 12 na Hobby).

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

// `contas` entra na lista porque a tela precisa do NOME da loja ("Vale Car
// Repasses · Joinville"), e o cadastro das lojas fica fora do funil desde a
// fase 0 — não é dado de loja, é o registro delas. Só leitura daqui.
const TABELAS = ['contatos', 'solicitacoes', 'ofertas', 'oferta_destinos',
                 'interesses', 'reservas', 'contas', 'listas', 'lista_membros'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fala com as tabelas da rede, e só com elas. A trava de tabela é contra
 * mim mesmo: este arquivo existe fora do funil, então não pode virar a
 * porta dos fundos para o resto do banco.
 */
async function rsb(caminho, opcoes = {}) {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Supabase não configurado.');
  const tabela = String(caminho).split(/[?/]/)[0];
  if (!TABELAS.includes(tabela)) throw new Error(`_rede.js não fala com a tabela ${tabela}`);
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${caminho}`, {
    ...opcoes,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(opcoes.prefer ? { Prefer: opcoes.prefer } : {}),
      ...(opcoes.headers || {}),
    },
  });
  const corpo = await r.text();
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${corpo}`);
  return corpo ? JSON.parse(corpo) : null;
}

// ── Quem está pedindo, e o que essa pessoa alcança ────────────────
// Espelha a tabela decidida com o Yuri em 25/set (PROJETO-APP §8.2.1).
// `dono` fora das listas de propósito: ele pode tudo na loja dele.
const PODE_COMPRAR  = ['dono', 'gerente'];              // ver repasse, levantar a mão, reservar
const PODE_VER_REDE = ['dono', 'gerente', 'vendedor'];  // vendedor alcança a vitrine

function quem(req) {
  const s = req.cnrSessao;
  if (!s) return null;
  return {
    conta_id: s.conta_id,
    usuario_id: s.usuario_id,
    papel: s.papel || '',
    // Mandar carro para a lista NÃO é função de cargo — varia de loja
    // para loja (decisão do Yuri, 25/set). É chave por pessoa. O dono
    // sempre pode: a loja é dele.
    podeOfertar: s.papel === 'dono' || s.pode_ofertar === true,
    podeComprar: PODE_COMPRAR.includes(s.papel),
    podeVerRede: PODE_VER_REDE.includes(s.papel),
  };
}

const semSessao = (res) => res.status(401).json({
  error: 'Entre com o seu telefone para usar a rede.', codigo: 'sem_sessao',
});

// ── Para quem vai o carro ─────────────────────────────────────────
// Sem `listaId`, vai para TODOS os contatos — é o comportamento de quem
// nunca criou uma lista, e tem de continuar funcionando (padrão WhatsApp:
// dá para mandar sem transmissão nenhuma).
//
// Com `listaId`, vai para o recorte — mas só para quem AINDA é contato
// ativo. Uma loja que saiu da rede não recebe mais, mesmo que o nome dela
// tenha ficado para trás numa lista antiga.
//
// Regra: a lista tem de ser minha. Mandar pela lista de outro seria usar
// a agenda alheia.
async function destinatarios(contaId, listaId) {
  const contatos = await rsb(`contatos?conta_id=eq.${contaId}&estado=eq.ativo&select=contato_conta_id`);
  const ativos = new Set(contatos.map((x) => x.contato_conta_id));
  if (!listaId) return { contas: [...ativos], lista: null };

  const l = await rsb(`listas?id=eq.${listaId}&conta_id=eq.${contaId}&arquivada_em=is.null&select=id,nome&limit=1`);
  if (!l.length) return { erro: 'Lista não encontrada.' };

  const membros = await rsb(`lista_membros?lista_id=eq.${listaId}&select=conta_id`);
  return { contas: membros.map((m) => m.conta_id).filter((c) => ativos.has(c)), lista: l[0] };
}

// ── Mandar um carro para a lista ──────────────────────────────────
// Regra: só quem tem a chave de ofertar, e o carro tem de ser da minha
// loja — quem confirma isso é o funil, no `sb` que vem de fora.
async function ofertar(sb, req, res) {
  const eu = quem(req);
  if (!eu) return semSessao(res);
  if (!eu.podeOfertar) {
    return res.status(403).json({ error: 'Você não tem permissão para mandar carro para a lista.' });
  }

  const { veiculo_id, horas_antes_da_vitrine, lista_id } = req.body || {};
  if (!UUID.test(String(veiculo_id || ''))) {
    return res.status(400).json({ error: 'veiculo_id inválido.' });
  }
  if (lista_id && !UUID.test(String(lista_id))) {
    return res.status(400).json({ error: 'lista_id inválido.' });
  }

  // O carro é meu? Quem responde é o funil — `sb` já filtra por dono.
  const rv = await sb(`veiculos?id=eq.${veiculo_id}&select=*`);
  if (!rv.ok) return res.status(502).json({ error: 'Não consegui ler o veículo.' });
  const veic = (await rv.json())[0];
  if (!veic) return res.status(404).json({ error: 'Veículo não encontrado.' });

  const alvo = await destinatarios(eu.conta_id, lista_id);
  if (alvo.erro) return res.status(404).json({ error: alvo.erro });
  const destinos = alvo.contas;
  if (!destinos.length) {
    return res.status(400).json({
      error: lista_id
        ? 'Essa lista não tem ninguém que ainda seja seu contato.'
        : 'Você ainda não tem contatos — ninguém receberia este carro.',
      codigo: 'lista_vazia',
    });
  }

  // A FOTOGRAFIA. Só o que pode atravessar: nada de placa, renavam,
  // chassi, valor de compra, avaliação ou documentos.
  const horas = Number(horas_antes_da_vitrine);
  const oferta = (await rsb('ofertas', {
    method: 'POST', prefer: 'return=representation',
    body: JSON.stringify({
      conta_id:   eu.conta_id,
      veiculo_id: veic.id,
      marca:  veic.marca  || null,
      modelo: veic.modelo || null,
      ano:    Number(veic.ano) || null,
      km:     Number(veic.km)  || null,
      preco:  Number(veic.valor) || null,   // repasse, nunca valor_compra
      cidade: veic.regiao || null,
      dados: {
        versao:       veic.versao       || '',
        cor:          veic.cor          || '',
        cambio:       veic.cambio       || '',
        combustivel:  veic.combustivel  || '',
        fipe:         Number(veic.fipe) || null,
        fotos:        Array.isArray(veic.fotos) ? veic.fotos.slice(0, 10) : [],
        observacoes:  veic.observacoes  || '',
      },
      // `null` = não abrir para a vitrine (é uma das opções da tela).
      vitrine_em: Number.isFinite(horas) && horas > 0
        ? new Date(Date.now() + horas * 3600e3).toISOString()
        : null,
      // De qual lista saiu. O NOME fica gravado junto: a lista pode ser
      // renomeada ou apagada, e o histórico tem de continuar explicando
      // por que aquele carro chegou.
      lista_id:   alvo.lista ? alvo.lista.id : null,
      lista_nome: alvo.lista ? alvo.lista.nome : null,
    }),
  }))[0];

  // Destino linha a linha, e não "foi para a lista": a lista muda, e o
  // feed de ontem de quem saiu não pode mudar junto.
  await rsb('oferta_destinos', {
    method: 'POST',
    body: JSON.stringify(destinos.map((c) => ({ oferta_id: oferta.id, conta_id: c }))),
  });

  return res.status(201).json({ ok: true, oferta_id: oferta.id, enviada_para: destinos.length });
}

// ── Chegou para ti ────────────────────────────────────────────────
// Regra: começa em `oferta_destinos` pela MINHA conta e caminha para
// fora. Nunca varre ofertas para filtrar depois — a busca ao contrário é
// como se lê o que não é seu por acidente.
async function feed(req, res) {
  const eu = quem(req);
  if (!eu) return semSessao(res);
  if (!eu.podeComprar) {
    return res.status(403).json({ error: 'Seu acesso não inclui os carros de repasse.' });
  }

  const meus = await rsb(
    `oferta_destinos?conta_id=eq.${eu.conta_id}&select=oferta_id&order=criado_em.desc&limit=100`
  );
  if (!meus.length) return res.status(200).json({ ofertas: [] });

  const ids = meus.map((x) => x.oferta_id);
  const ofertas = await rsb(
    `ofertas?id=in.(${ids.join(',')})&estado=neq.encerrada&select=*&order=criado_em.desc`
  );

  // Meu interesse em cada uma, e o tamanho da fila. Duas consultas, não
  // uma por oferta — a tela mostra dezenas de cartões.
  const interesses = await rsb(`interesses?oferta_id=in.(${ids.join(',')})&select=oferta_id,conta_id,estado`);
  const reservas   = await rsb(`reservas?oferta_id=in.(${ids.join(',')})&desfeita_em=is.null&select=oferta_id,com_sinal`);

  const fila = {}; const meu = {}; const reservada = {};
  for (const i of interesses) {
    if (i.estado !== 'quer') continue;
    fila[i.oferta_id] = (fila[i.oferta_id] || 0) + 1;
    if (i.conta_id === eu.conta_id) meu[i.oferta_id] = true;
  }
  for (const r of reservas) reservada[r.oferta_id] = r.com_sinal ? 'sinal' : 'palavra';

  return res.status(200).json({
    ofertas: ofertas.map((o) => ({
      id: o.id, marca: o.marca, modelo: o.modelo, ano: o.ano, km: o.km,
      preco: o.preco, cidade: o.cidade, uf: o.uf, dados: o.dados,
      criado_em: o.criado_em,
      na_fila: fila[o.id] || 0,
      eu_quero: !!meu[o.id],
      reservado: reservada[o.id] || null,   // null | 'palavra' | 'sinal'
    })),
  });
}

// ── ✋ Quero ───────────────────────────────────────────────────────
// Regra: só levanto a mão em oferta que chegou PARA MIM. Sem esta
// conferência, bastaria conhecer o id de uma oferta para entrar na fila
// de um carro que nunca me foi mandado.
async function quero(req, res) {
  const eu = quem(req);
  if (!eu) return semSessao(res);
  if (!eu.podeComprar) {
    return res.status(403).json({ error: 'Seu acesso não inclui reservar carros.' });
  }

  const { oferta_id } = req.body || {};
  if (!UUID.test(String(oferta_id || ''))) return res.status(400).json({ error: 'oferta_id inválido.' });

  const destino = await rsb(
    `oferta_destinos?oferta_id=eq.${oferta_id}&conta_id=eq.${eu.conta_id}&select=oferta_id&limit=1`
  );
  // Mesma resposta de "não existe": dizer "não é para você" confirmaria
  // que a oferta existe.
  if (!destino.length) return res.status(404).json({ error: 'Oferta não encontrada.' });

  // `on_conflict` porque a mesma loja levantando a mão duas vezes é toque
  // repetido, não erro — e a hora que vale é a primeira.
  await rsb('interesses?on_conflict=oferta_id,conta_id', {
    method: 'POST', prefer: 'resolution=ignore-duplicates',
    body: JSON.stringify({
      oferta_id, conta_id: eu.conta_id, usuario_id: eu.usuario_id,
    }),
  });

  const fila = await rsb(`interesses?oferta_id=eq.${oferta_id}&estado=eq.quer&select=conta_id,criado_em&order=criado_em.asc`);
  const posicao = fila.findIndex((x) => x.conta_id === eu.conta_id) + 1;
  return res.status(200).json({ ok: true, posicao, na_fila: fila.length });
}

// ── A fila do meu carro ───────────────────────────────────────────
// Regra: só o dono da oferta vê quem levantou a mão.
async function filaDaOferta(req, res) {
  const eu = quem(req);
  if (!eu) return semSessao(res);

  const oferta_id = req.query.oferta_id;
  if (!UUID.test(String(oferta_id || ''))) return res.status(400).json({ error: 'oferta_id inválido.' });

  const o = await rsb(`ofertas?id=eq.${oferta_id}&conta_id=eq.${eu.conta_id}&select=id&limit=1`);
  if (!o.length) return res.status(404).json({ error: 'Oferta não encontrada.' });

  const fila = await rsb(
    `interesses?oferta_id=eq.${oferta_id}&select=conta_id,criado_em,estado&order=criado_em.asc`
  );
  return res.status(200).json({ fila });
}

// ── O que eu mandei, com a fila de cada uma ───────────────────────
// Regra: só as ofertas da MINHA loja. A fila vem junto porque é ela que
// o dono precisa ver para decidir — pedir a fila de cada oferta numa
// chamada separada faria a tela disparar uma dúzia de pedidos.
//
// Aqui o nome de quem levantou a mão APARECE, ao contrário do feed: é a
// tela do dono decidindo para quem vai o carro dele. Quem recebe continua
// vendo só "reservado", nunca para quem.
async function minhasOfertas(req, res) {
  const eu = quem(req);
  if (!eu) return semSessao(res);

  const ofertas = await rsb(
    `ofertas?conta_id=eq.${eu.conta_id}&estado=neq.encerrada&select=*&order=criado_em.desc&limit=50`
  );
  if (!ofertas.length) return res.status(200).json({ ofertas: [] });

  const ids = ofertas.map((o) => o.id);
  const [interesses, reservas, destinos] = await Promise.all([
    rsb(`interesses?oferta_id=in.(${ids.join(',')})&estado=eq.quer&select=oferta_id,conta_id,criado_em&order=criado_em.asc`),
    rsb(`reservas?oferta_id=in.(${ids.join(',')})&desfeita_em=is.null&select=oferta_id,para_conta_id,com_sinal,valor_sinal,motivo,criado_em`),
    rsb(`oferta_destinos?oferta_id=in.(${ids.join(',')})&select=oferta_id`),
  ]);

  const nomes = await nomesDe([...new Set(interesses.map((i) => i.conta_id))]);
  const porOferta = (lista) => lista.reduce((acc, x) => {
    (acc[x.oferta_id] = acc[x.oferta_id] || []).push(x); return acc;
  }, {});
  const fila = porOferta(interesses);
  const res_ = porOferta(reservas);
  const dest = porOferta(destinos);

  return res.status(200).json({
    ofertas: ofertas.map((o) => ({
      id: o.id, marca: o.marca, modelo: o.modelo, ano: o.ano, km: o.km,
      preco: o.preco, criado_em: o.criado_em, vitrine_em: o.vitrine_em,
      destinos: (dest[o.id] || []).length,
      fila: (fila[o.id] || []).map((f) => ({
        conta_id: f.conta_id, nome: nomes[f.conta_id] || '—', criado_em: f.criado_em,
      })),
      reserva: (res_[o.id] || [])[0] || null,
    })),
  });
}

// ── Reservar ──────────────────────────────────────────────────────
// Desenhada com o Yuri em 25/set, com as palavras do mercado dele:
//
//   "No WhatsApp, apenas colocamos carro reservado (com sinal na conta)
//    quando tem; quando não tem sinal, somente reservado. Assim, todos
//    veem."
//
// Regra de acesso: só o DONO da oferta reserva, e só para quem levantou
// a mão. Reservar para quem não pediu seria inventar processo que o
// mercado não tem — e tiraria o sentido da fila.
//
// O que NÃO existe aqui, e cada ausência é decisão dele:
//
//   • **Prazo.** Nada de `expira_em`. "Depende de N situações, mas
//     geralmente é o prazo de esperar o resultado da cautelar, a menos
//     que o carro demore a entrar, não tenha documento ainda pra poder
//     pagar." Relógio derrubaria as reservas legítimas, que são a maioria
//     das demoradas. No lugar dele, a tela mostra há quanto tempo está.
//   • **Garantia de dinheiro.** `valor_sinal` é declaração do dono, não
//     pagamento processado. O app registra que ele disse que entrou; não
//     atesta que entrou. Isso precisa ficar claro na tela, senão promete
//     o que não cumpre.
async function reservar(req, res) {
  const eu = quem(req);
  if (!eu) return semSessao(res);
  if (!eu.podeComprar) {
    return res.status(403).json({ error: 'Seu acesso não inclui reservar carros.' });
  }

  const { oferta_id, para_conta_id, com_sinal, valor_sinal, motivo } = req.body || {};
  if (!UUID.test(String(oferta_id || ''))) return res.status(400).json({ error: 'oferta_id inválido.' });
  if (!UUID.test(String(para_conta_id || ''))) return res.status(400).json({ error: 'para_conta_id inválido.' });

  // A oferta é minha? Mesma resposta de "não existe" para oferta de outro.
  const o = await rsb(`ofertas?id=eq.${oferta_id}&conta_id=eq.${eu.conta_id}&select=id,estado&limit=1`);
  if (!o.length) return res.status(404).json({ error: 'Oferta não encontrada.' });

  const naFila = await rsb(
    `interesses?oferta_id=eq.${oferta_id}&conta_id=eq.${para_conta_id}&estado=eq.quer&select=conta_id&limit=1`
  );
  if (!naFila.length) {
    return res.status(400).json({
      error: 'Essa loja não está na fila deste carro.', codigo: 'fora_da_fila',
    });
  }

  const comSinal = com_sinal === true;
  const valor = comSinal ? Number(valor_sinal) : null;
  if (comSinal && !(valor > 0)) {
    return res.status(400).json({ error: 'Com sinal na conta, o valor é obrigatório.' });
  }

  // Uma reserva de pé por oferta — o índice parcial no banco garante,
  // mas conferir aqui dá erro que a tela sabe explicar, em vez de 409 cru.
  const jaTem = await rsb(`reservas?oferta_id=eq.${oferta_id}&desfeita_em=is.null&select=id&limit=1`);
  if (jaTem.length) {
    return res.status(409).json({ error: 'Este carro já está reservado.', codigo: 'ja_reservado' });
  }

  const r = (await rsb('reservas', {
    method: 'POST', prefer: 'return=representation',
    body: JSON.stringify({
      oferta_id, para_conta_id,
      com_sinal: comSinal,
      valor_sinal: valor,
      motivo: (motivo || '').slice(0, 120) || null,
    }),
  }))[0];

  await rsb(`ofertas?id=eq.${oferta_id}`, {
    method: 'PATCH', body: JSON.stringify({ estado: 'reservada' }),
  });

  return res.status(201).json({ ok: true, reserva_id: r.id, com_sinal: comSinal });
}

// ── Desfazer a reserva ────────────────────────────────────────────
// Regra: só o dono da oferta. O carro volta a ficar aberto, e a reserva
// desfeita FICA no banco — é dela que nasce o "0 desistências" do perfil
// da loja. Apagar seria apagar a única defesa contra quem reserva e some.
async function desfazerReserva(req, res) {
  const eu = quem(req);
  if (!eu) return semSessao(res);

  const { oferta_id, motivo } = req.body || {};
  if (!UUID.test(String(oferta_id || ''))) return res.status(400).json({ error: 'oferta_id inválido.' });

  const o = await rsb(`ofertas?id=eq.${oferta_id}&conta_id=eq.${eu.conta_id}&select=id&limit=1`);
  if (!o.length) return res.status(404).json({ error: 'Oferta não encontrada.' });

  const r = await rsb(`reservas?oferta_id=eq.${oferta_id}&desfeita_em=is.null&select=id&limit=1`);
  if (!r.length) return res.status(404).json({ error: 'Este carro não está reservado.' });

  await rsb(`reservas?id=eq.${r[0].id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      desfeita_em: new Date().toISOString(),
      desfeita_motivo: (motivo || '').slice(0, 120) || null,
    }),
  });
  await rsb(`ofertas?id=eq.${oferta_id}`, {
    method: 'PATCH', body: JSON.stringify({ estado: 'aberta' }),
  });

  return res.status(200).json({ ok: true });
}

// ══ AS LISTAS ══════════════════════════════════════════════════════
//
// A regra que separa isto de um grupo de WhatsApp, e que o Yuri
// confirmou em 25/set ao perguntar *"os integrantes não terão acesso aos
// membros né?"*:
//
//   • o DONO da lista vê os membros dele
//   • os MEMBROS não se enxergam, nem sabem quantos são
//   • um membro vê: o nome da lista, quem é o dono, e o botão de sair
//
// Num grupo, qualquer um abre a relação de participantes e copia os 188
// contatos — o ativo do dono indo embora pela porta da frente. Aqui a
// lista não é um lugar onde as pessoas se encontram; é um canal que sai
// do dono para cada uma.

const nomesDe = async (ids) => {
  if (!ids.length) return {};
  const r = await rsb(`contas?id=in.(${ids.join(',')})&select=id,nome`);
  return Object.fromEntries(r.map((c) => [c.id, c.nome]));
};

// ── O que eu vejo na tela Listas ──────────────────────────────────
async function listas(req, res) {
  const eu = quem(req);
  if (!eu) return semSessao(res);

  const [meus, pedidos, ondeEstou] = await Promise.all([
    rsb(`contatos?conta_id=eq.${eu.conta_id}&estado=eq.ativo&select=contato_conta_id,criado_em&order=criado_em.desc`),
    rsb(`solicitacoes?para_conta_id=eq.${eu.conta_id}&estado=eq.pendente&select=id,de_conta_id,criado_em&order=criado_em.asc`),
    rsb(`contatos?contato_conta_id=eq.${eu.conta_id}&estado=eq.ativo&select=conta_id,criado_em&order=criado_em.desc`),
  ]);

  const nomes = await nomesDe([...new Set([
    ...meus.map((x) => x.contato_conta_id),
    ...pedidos.map((x) => x.de_conta_id),
    ...ondeEstou.map((x) => x.conta_id),
  ])]);

  return res.status(200).json({
    // A minha lista: eu sou a dona, então vejo quem está nela.
    membros: meus.map((x) => ({ conta_id: x.contato_conta_id, nome: nomes[x.contato_conta_id] || '—', desde: x.criado_em })),
    pedidos: pedidos.map((x) => ({ id: x.id, conta_id: x.de_conta_id, nome: nomes[x.de_conta_id] || '—', em: x.criado_em })),
    // As listas em que EU estou: só de quem é, nunca quem mais está nela.
    em_que_estou: ondeEstou.map((x) => ({ dono_conta_id: x.conta_id, nome: nomes[x.conta_id] || '—', desde: x.criado_em })),
  });
}

// ── Pedir para entrar ─────────────────────────────────────────────
// "Ninguém é adicionado sem pedir" (§3.2). Consequência aceita: começa
// devagar — em troca, quem está ali quis estar.
async function solicitar(req, res) {
  const eu = quem(req);
  if (!eu) return semSessao(res);
  if (!eu.podeComprar) {
    return res.status(403).json({ error: 'Seu acesso não inclui entrar em listas.' });
  }

  const { para_conta_id } = req.body || {};
  if (!UUID.test(String(para_conta_id || ''))) return res.status(400).json({ error: 'para_conta_id inválido.' });
  if (para_conta_id === eu.conta_id) return res.status(400).json({ error: 'Essa lista é sua.' });

  const ja = await rsb(`contatos?conta_id=eq.${para_conta_id}&contato_conta_id=eq.${eu.conta_id}&estado=eq.ativo&select=id&limit=1`);
  if (ja.length) return res.status(409).json({ error: 'Você já está nessa lista.', codigo: 'ja_membro' });

  // Pedido repetido é toque repetido, não erro: o índice parcial no banco
  // já garante um pendente por par.
  const pend = await rsb(`solicitacoes?de_conta_id=eq.${eu.conta_id}&para_conta_id=eq.${para_conta_id}&estado=eq.pendente&select=id&limit=1`);
  if (pend.length) return res.status(200).json({ ok: true, ja_pedido: true });

  await rsb('solicitacoes', {
    method: 'POST',
    body: JSON.stringify({ de_conta_id: eu.conta_id, para_conta_id }),
  });
  return res.status(201).json({ ok: true });
}

// ── Aceitar ou recusar ────────────────────────────────────────────
// Regra: só o dono da lista responde, e a resposta é sobre a lista dele.
async function responder(req, res) {
  const eu = quem(req);
  if (!eu) return semSessao(res);

  const { solicitacao_id, aceitar } = req.body || {};
  if (!UUID.test(String(solicitacao_id || ''))) return res.status(400).json({ error: 'solicitacao_id inválido.' });

  const s = await rsb(`solicitacoes?id=eq.${solicitacao_id}&para_conta_id=eq.${eu.conta_id}&estado=eq.pendente&select=id,de_conta_id&limit=1`);
  if (!s.length) return res.status(404).json({ error: 'Pedido não encontrado.' });

  await rsb(`solicitacoes?id=eq.${solicitacao_id}`, {
    method: 'PATCH',
    body: JSON.stringify({ estado: aceitar ? 'aceita' : 'recusada', respondido_em: new Date().toISOString() }),
  });

  if (aceitar) {
    // Quem já esteve e saiu volta a ficar ativo, em vez de dar conflito
    // com a linha antiga — sair e voltar é caso normal.
    const antigo = await rsb(`contatos?conta_id=eq.${eu.conta_id}&contato_conta_id=eq.${s[0].de_conta_id}&select=id&limit=1`);
    if (antigo.length) {
      await rsb(`contatos?id=eq.${antigo[0].id}`, {
        method: 'PATCH', body: JSON.stringify({ estado: 'ativo', encerrado_em: null }),
      });
    } else {
      await rsb('contatos', {
        method: 'POST',
        body: JSON.stringify({ conta_id: eu.conta_id, contato_conta_id: s[0].de_conta_id }),
      });
    }
  }
  return res.status(200).json({ ok: true, aceito: !!aceitar });
}

// ── Sair, ou tirar alguém ─────────────────────────────────────────
// "Saída livre" (§3.2): ninguém precisa pedir licença para sair. E o dono
// pode tirar quem quiser da lista dele. As duas coisas param na mesma
// linha de `contatos`, só muda quem manda.
async function sairOuRemover(req, res) {
  const eu = quem(req);
  if (!eu) return semSessao(res);

  const { dono_conta_id, membro_conta_id } = req.body || {};

  // Eu saindo da lista de alguém.
  if (dono_conta_id) {
    if (!UUID.test(String(dono_conta_id))) return res.status(400).json({ error: 'dono_conta_id inválido.' });
    const r = await rsb(`contatos?conta_id=eq.${dono_conta_id}&contato_conta_id=eq.${eu.conta_id}&estado=eq.ativo&select=id&limit=1`);
    if (!r.length) return res.status(404).json({ error: 'Você não está nessa lista.' });
    await rsb(`contatos?id=eq.${r[0].id}`, {
      method: 'PATCH',
      body: JSON.stringify({ estado: 'saiu', encerrado_em: new Date().toISOString() }),
    });
    return res.status(200).json({ ok: true, sai: true });
  }

  // O dono tirando alguém da lista dele.
  if (membro_conta_id) {
    if (!UUID.test(String(membro_conta_id))) return res.status(400).json({ error: 'membro_conta_id inválido.' });
    const r = await rsb(`contatos?conta_id=eq.${eu.conta_id}&contato_conta_id=eq.${membro_conta_id}&estado=eq.ativo&select=id&limit=1`);
    if (!r.length) return res.status(404).json({ error: 'Essa loja não está na sua lista.' });
    await rsb(`contatos?id=eq.${r[0].id}`, {
      method: 'PATCH',
      body: JSON.stringify({ estado: 'removido', encerrado_em: new Date().toISOString() }),
    });
    return res.status(200).json({ ok: true, removido: true });
  }

  return res.status(400).json({ error: 'dono_conta_id (sair) ou membro_conta_id (remover).' });
}

// ══ LISTAS DE TRANSMISSÃO ══════════════════════════════════════════
//
// O padrão do WhatsApp, que o mercado dele já entende [YURI, 27/set]:
//
//   • **Contatos** — quem está na sua agenda (a tabela `contatos`).
//   • **Lista de transmissão** — um recorte nomeado desses contatos.
//     Cada um recebe individualmente e ninguém vê quem mais recebeu.
//   • **Grupo** — não existe aqui, e é decisão: num grupo qualquer um
//     copia a relação de participantes.
//
// Regra de acesso, igual em todas as funções abaixo: a lista é da loja de
// quem pediu, e só ela mexe. Lista de outro responde "não encontrada".

// ── As minhas listas, com quem está em cada uma ───────────────────
async function verListasTransmissao(req, res) {
  const eu = quem(req);
  if (!eu) return semSessao(res);

  const listas = await rsb(`listas?conta_id=eq.${eu.conta_id}&arquivada_em=is.null&select=id,nome,criada_em&order=criada_em.asc`);
  if (!listas.length) return res.status(200).json({ listas: [] });

  const membros = await rsb(`lista_membros?lista_id=in.(${listas.map((l) => l.id).join(',')})&select=lista_id,conta_id`);
  const nomes = await nomesDe([...new Set(membros.map((m) => m.conta_id))]);

  // Quem saiu da rede continua na linha da lista, mas a tela precisa
  // dizer isso — senão o dono conta com alguém que não recebe mais.
  const contatos = await rsb(`contatos?conta_id=eq.${eu.conta_id}&estado=eq.ativo&select=contato_conta_id`);
  const ativos = new Set(contatos.map((x) => x.contato_conta_id));

  return res.status(200).json({
    listas: listas.map((l) => ({
      id: l.id, nome: l.nome, criada_em: l.criada_em,
      membros: membros.filter((m) => m.lista_id === l.id).map((m) => ({
        conta_id: m.conta_id, nome: nomes[m.conta_id] || '—', ativo: ativos.has(m.conta_id),
      })),
    })),
  });
}

// ── Criar, renomear, apagar ───────────────────────────────────────
async function mexerNaLista(req, res) {
  const eu = quem(req);
  if (!eu) return semSessao(res);

  const { acao, lista_id, nome } = req.body || {};

  if (acao === 'criar') {
    const limpo = String(nome || '').trim().slice(0, 60);
    if (!limpo) return res.status(400).json({ error: 'Dê um nome à lista.' });
    try {
      const l = (await rsb('listas', { method: 'POST', prefer: 'return=representation',
        body: JSON.stringify({ conta_id: eu.conta_id, nome: limpo }) }))[0];
      return res.status(201).json({ ok: true, lista: { id: l.id, nome: l.nome } });
    } catch (e) {
      // O índice único é por loja: nome repetido é engano de quem digita,
      // não erro de sistema — então a mensagem diz o que houve.
      if (/23505/.test(e.message)) {
        return res.status(409).json({ error: 'Você já tem uma lista com esse nome.' });
      }
      throw e;
    }
  }

  if (!UUID.test(String(lista_id || ''))) return res.status(400).json({ error: 'lista_id inválido.' });
  const l = await rsb(`listas?id=eq.${lista_id}&conta_id=eq.${eu.conta_id}&arquivada_em=is.null&select=id&limit=1`);
  if (!l.length) return res.status(404).json({ error: 'Lista não encontrada.' });

  if (acao === 'renomear') {
    const limpo = String(nome || '').trim().slice(0, 60);
    if (!limpo) return res.status(400).json({ error: 'Dê um nome à lista.' });
    await rsb(`listas?id=eq.${lista_id}`, { method: 'PATCH', body: JSON.stringify({ nome: limpo }) });
    return res.status(200).json({ ok: true });
  }

  if (acao === 'apagar') {
    // Arquiva, não apaga: as ofertas já mandadas guardam `lista_id`, e o
    // histórico precisa continuar explicando por que o carro chegou.
    await rsb(`listas?id=eq.${lista_id}`, {
      method: 'PATCH', body: JSON.stringify({ arquivada_em: new Date().toISOString() }),
    });
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'acao deve ser criar, renomear ou apagar.' });
}

// ── Quem está na lista ────────────────────────────────────────────
// Só entra quem já é contato: lista de transmissão é recorte da agenda,
// não um jeito de alcançar quem nunca aceitou entrar.
async function membrosDaLista(req, res) {
  const eu = quem(req);
  if (!eu) return semSessao(res);

  const { lista_id, conta_id, dentro } = req.body || {};
  if (!UUID.test(String(lista_id || '')) || !UUID.test(String(conta_id || ''))) {
    return res.status(400).json({ error: 'lista_id e conta_id são obrigatórios.' });
  }

  const l = await rsb(`listas?id=eq.${lista_id}&conta_id=eq.${eu.conta_id}&arquivada_em=is.null&select=id&limit=1`);
  if (!l.length) return res.status(404).json({ error: 'Lista não encontrada.' });

  if (dentro) {
    const c = await rsb(`contatos?conta_id=eq.${eu.conta_id}&contato_conta_id=eq.${conta_id}&estado=eq.ativo&select=id&limit=1`);
    if (!c.length) return res.status(400).json({ error: 'Essa loja não é seu contato.' });
    await rsb('lista_membros?on_conflict=lista_id,conta_id', {
      method: 'POST', prefer: 'resolution=ignore-duplicates',
      body: JSON.stringify({ lista_id, conta_id }),
    });
    return res.status(200).json({ ok: true, dentro: true });
  }

  await rsb(`lista_membros?lista_id=eq.${lista_id}&conta_id=eq.${conta_id}`, { method: 'DELETE' });
  return res.status(200).json({ ok: true, dentro: false });
}

module.exports = {
  ofertar, feed, quero, filaDaOferta, minhasOfertas, reservar, desfazerReserva,
  listas, solicitar, responder, sairOuRemover,
  verListasTransmissao, mexerNaLista, membrosDaLista,
  rsb, quem,
};
