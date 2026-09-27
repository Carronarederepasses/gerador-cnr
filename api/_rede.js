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
                 'interesses', 'reservas', 'contas', 'listas', 'lista_membros',
                 'conversas', 'mensagens_rede', 'grupos', 'grupo_membros',
                 'push_assinaturas'];
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

  const { veiculo_id, horas_antes_da_vitrine, lista_id, mensagem } = req.body || {};
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

  // Carro sem preço de repasse não é oferta — é um anúncio pela metade
  // chegando na tela de outra loja. Aconteceu no primeiro uso real
  // (27/set): dois carros do catálogo tinham só a FIPE, e o app mandou
  // os dois calado. Melhor recusar e dizer o que falta.
  const preco = Number(veic.valor);
  if (!(preco > 0)) {
    return res.status(400).json({
      error: 'Este carro está sem preço de repasse. Preencha o valor no catálogo antes de mandar.',
      codigo: 'sem_preco',
    });
  }

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
      preco,   // repasse, nunca valor_compra — conferido acima
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
      // O texto que vai junto com o carro, como ele já faz no WhatsApp:
      // "entrou esse hoje", "aceito troca", "só à vista".
      mensagem: String(mensagem || '').trim().slice(0, 500) || null,
    }),
  }))[0];

  // Destino linha a linha, e não "foi para a lista": a lista muda, e o
  // feed de ontem de quem saiu não pode mudar junto.
  await rsb('oferta_destinos', {
    method: 'POST',
    body: JSON.stringify(destinos.map((c) => ({ oferta_id: oferta.id, conta_id: c }))),
  });

  // Avisa quem recebeu. Com  e nao fire-and-forget: a Vercel
  // encerra o worker ao responder, e o aviso morreria pela metade —
  // lição de 19/ago, que custou uma etapa inteira para entender.
  // Falha de aviso nunca derruba a oferta:  nao lanca.
  const { avisarConta } = require('./_aviso');
  for (const c of destinos) await avisarConta(rsb, c, null);

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
      mensagem: o.mensagem, lista_nome: o.lista_nome, criado_em: o.criado_em,
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
      preco: o.preco, mensagem: o.mensagem, lista_id: o.lista_id, lista_nome: o.lista_nome,
      criado_em: o.criado_em, vitrine_em: o.vitrine_em,
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

// ══ CONVERSAS 1 A 1 ════════════════════════════════════════════════
//
// O outro lado do WhatsApp [YURI, 27/set]: a transmissão vai para muitos,
// e quem se interessa responde numa conversa que é só entre os dois.
//
// ── Quem pode falar com quem ──────────────────────────────────────
// Não é qualquer um: conversa aberta para toda a rede vira caixa de spam
// no dia em que ela crescer. Só fala quem já tem relação:
//
//   • um é contato do outro (em qualquer direção), OU
//   • um mandou carro para o outro (existe oferta com ele como destino)
//
// A segunda existe porque o carro chega ANTES de a pessoa virar contato:
// quem recebeu uma transmissão precisa poder responder, que é
// exatamente como funciona lá.
async function podeFalarCom(minhaConta, outra) {
  if (minhaConta === outra) return false;

  const contatos = await rsb(
    `contatos?estado=eq.ativo&select=conta_id,contato_conta_id` +
    `&or=(and(conta_id.eq.${minhaConta},contato_conta_id.eq.${outra}),` +
    `and(conta_id.eq.${outra},contato_conta_id.eq.${minhaConta}))`
  );
  if (contatos.length) return true;

  // Mandei carro para ela?
  const minhas = await rsb(`ofertas?conta_id=eq.${minhaConta}&select=id&limit=200`);
  if (minhas.length) {
    const d = await rsb(`oferta_destinos?conta_id=eq.${outra}&oferta_id=in.(${minhas.map((o) => o.id).join(',')})&select=oferta_id&limit=1`);
    if (d.length) return true;
  }
  // Ela mandou carro para mim?
  const dela = await rsb(`ofertas?conta_id=eq.${outra}&select=id&limit=200`);
  if (dela.length) {
    const d = await rsb(`oferta_destinos?conta_id=eq.${minhaConta}&oferta_id=in.(${dela.map((o) => o.id).join(',')})&select=oferta_id&limit=1`);
    if (d.length) return true;
  }
  return false;
}

// Acha ou cria a conversa do par. O par é guardado em ordem para que
// (X,Y) e (Y,X) sejam a MESMA linha — senão cada lado teria a sua thread
// e as mensagens se perderiam entre as duas.
async function acharConversa(a, b, criar) {
  const [x, y] = a < b ? [a, b] : [b, a];
  const achada = await rsb(`conversas?conta_a=eq.${x}&conta_b=eq.${y}&select=*&limit=1`);
  if (achada.length) return achada[0];
  if (!criar) return null;
  return (await rsb('conversas', {
    method: 'POST', prefer: 'return=representation',
    body: JSON.stringify({ conta_a: x, conta_b: y }),
  }))[0];
}

// ── As minhas conversas, para a coluna da esquerda ────────────────
async function conversas(req, res) {
  const eu = quem(req);
  if (!eu) return semSessao(res);

  const lista = await rsb(
    `conversas?or=(conta_a.eq.${eu.conta_id},conta_b.eq.${eu.conta_id})&select=*&order=ultima_em.desc&limit=100`
  );
  if (!lista.length) return res.status(200).json({ conversas: [] });

  const ids = lista.map((c) => c.id);
  const msgs = await rsb(
    `mensagens_rede?conversa_id=in.(${ids.join(',')})&select=conversa_id,de_conta_id,texto,criado_em,lida_em&order=criado_em.desc&limit=500`
  );
  const outras = lista.map((c) => (c.conta_a === eu.conta_id ? c.conta_b : c.conta_a));
  const nomes = await nomesDe([...new Set(outras)]);

  return res.status(200).json({
    conversas: lista.map((c) => {
      const outra = c.conta_a === eu.conta_id ? c.conta_b : c.conta_a;
      const daConversa = msgs.filter((m) => m.conversa_id === c.id);
      const ultima = daConversa[0] || null;
      return {
        id: c.id,
        conta_id: outra,
        nome: nomes[outra] || '—',
        ultima: ultima ? { texto: ultima.texto, criado_em: ultima.criado_em, minha: ultima.de_conta_id === eu.conta_id } : null,
        nao_lidas: daConversa.filter((m) => m.de_conta_id !== eu.conta_id && !m.lida_em).length,
        ultima_em: c.ultima_em,
      };
    }),
  });
}

// ── Abrir uma conversa ────────────────────────────────────────────
// Regra: só quem é uma das duas contas. E abrir MARCA COMO LIDAS as
// mensagens da outra — é o que faz a bolinha sumir, como no WhatsApp.
async function abrirConversa(req, res) {
  const eu = quem(req);
  if (!eu) return semSessao(res);

  const outra = req.query.conta_id;
  if (!UUID.test(String(outra || ''))) return res.status(400).json({ error: 'conta_id inválido.' });
  if (!(await podeFalarCom(eu.conta_id, outra))) {
    return res.status(404).json({ error: 'Conversa não encontrada.' });
  }

  const c = await acharConversa(eu.conta_id, outra, false);
  const nomes = await nomesDe([outra]);
  if (!c) return res.status(200).json({ conversa_id: null, nome: nomes[outra] || '—', mensagens: [] });

  const msgs = await rsb(
    `mensagens_rede?conversa_id=eq.${c.id}&select=id,de_conta_id,texto,oferta_id,criado_em&order=criado_em.asc&limit=300`
  );

  // Marca como lidas as que a outra mandou. Fire-and-forget seria perder
  // a marcação quando a Vercel encerra o worker — então espera.
  await rsb(`mensagens_rede?conversa_id=eq.${c.id}&de_conta_id=neq.${eu.conta_id}&lida_em=is.null`, {
    method: 'PATCH', body: JSON.stringify({ lida_em: new Date().toISOString() }),
  }).catch(() => {});

  return res.status(200).json({
    conversa_id: c.id,
    conta_id: outra,
    nome: nomes[outra] || '—',
    mensagens: msgs.map((m) => ({
      id: m.id, texto: m.texto, oferta_id: m.oferta_id,
      criado_em: m.criado_em, minha: m.de_conta_id === eu.conta_id,
    })),
  });
}

// ── Mandar mensagem ───────────────────────────────────────────────
async function mandarMensagem(req, res) {
  const eu = quem(req);
  if (!eu) return semSessao(res);

  const { conta_id, texto, oferta_id } = req.body || {};
  if (!UUID.test(String(conta_id || ''))) return res.status(400).json({ error: 'conta_id inválido.' });
  const limpo = String(texto || '').trim().slice(0, 2000);
  if (!limpo) return res.status(400).json({ error: 'Escreva alguma coisa.' });
  if (!(await podeFalarCom(eu.conta_id, conta_id))) {
    // Mesma resposta de "não existe": dizer "vocês não têm relação"
    // confirmaria que a loja existe.
    return res.status(404).json({ error: 'Conversa não encontrada.' });
  }

  const c = await acharConversa(eu.conta_id, conta_id, true);
  await rsb('mensagens_rede', {
    method: 'POST',
    body: JSON.stringify({
      conversa_id: c.id, de_conta_id: eu.conta_id, de_usuario_id: eu.usuario_id,
      texto: limpo, oferta_id: UUID.test(String(oferta_id || '')) ? oferta_id : null,
    }),
  });
  // `ultima_em` é o que ordena a coluna da esquerda: sem isto, a conversa
  // com mensagem nova não sobe para o topo.
  await rsb(`conversas?id=eq.${c.id}`, {
    method: 'PATCH', body: JSON.stringify({ ultima_em: new Date().toISOString() }),
  });

  const { avisarConta } = require('./_aviso');
  await avisarConta(rsb, conta_id, null);

  return res.status(201).json({ ok: true, conversa_id: c.id });
}

// ══ GRUPOS ═════════════════════════════════════════════════════════
//
// A terceira peça, com o diferencial que o Yuri definiu em 27/set:
//
//   *"No grupo, quero que os membros sejam ocultos, o que será
//     diferencial do WhatsApp."*
//
// No WhatsApp, entrar num grupo entrega a agenda de todo mundo: qualquer
// um abre a relação de participantes e copia 200 contatos. É por isso
// que o grupo de 188 pessoas dele é um ativo em risco permanente.
//
// Aqui a conversa é coletiva e **a lista não existe para ninguém**, nem
// para quem está dentro. Quem só observa — a maioria — fica invisível.
// Quem fala se identifica pela própria mensagem, e é assim que dá para
// chamar no privado.
//
// ── A REGRA QUE NÃO PODE CAIR ─────────────────────────────────────
// **Nenhuma função abaixo devolve `grupo_membros`.** Só a CONTAGEM, e só
// para quem está dentro. Se um dia alguém precisar da lista para alguma
// tela, a resposta é não: é o diferencial inteiro do produto.
//
// `aberto` é decisão do admin: fechado (padrão) só entra por convite;
// aberto, qualquer loja da rede entra sozinha. Nos dois, o autor da
// mensagem aparece e a lista continua oculta.

async function souDoGrupo(grupoId, contaId) {
  const r = await rsb(`grupo_membros?grupo_id=eq.${grupoId}&conta_id=eq.${contaId}&saiu_em=is.null&select=admin&limit=1`);
  return r.length ? r[0] : null;
}

// ── Meus grupos, para a coluna da esquerda ────────────────────────
async function grupos(req, res) {
  const eu = quem(req);
  if (!eu) return semSessao(res);

  const meus = await rsb(`grupo_membros?conta_id=eq.${eu.conta_id}&saiu_em=is.null&select=grupo_id,admin`);
  if (!meus.length) return res.status(200).json({ grupos: [] });

  const ids = meus.map((m) => m.grupo_id);
  const gs = await rsb(`grupos?id=in.(${ids.join(',')})&arquivado_em=is.null&select=*&order=ultima_em.desc`);
  const msgs = await rsb(`mensagens_rede?grupo_id=in.(${ids.join(',')})&select=grupo_id,de_conta_id,texto,criado_em,lida_em&order=criado_em.desc&limit=400`);
  // Contagem, nunca a lista — ver a regra no topo deste bloco.
  const todos = await rsb(`grupo_membros?grupo_id=in.(${ids.join(',')})&saiu_em=is.null&select=grupo_id`);
  const nomes = await nomesDe([...new Set(msgs.map((m) => m.de_conta_id))]);

  return res.status(200).json({
    grupos: gs.map((g) => {
      const doGrupo = msgs.filter((m) => m.grupo_id === g.id);
      const ultima = doGrupo[0] || null;
      return {
        id: g.id, nome: g.nome, aberto: g.aberto,
        sou_admin: (meus.find((m) => m.grupo_id === g.id) || {}).admin === true,
        participantes: todos.filter((t) => t.grupo_id === g.id).length,
        ultima: ultima ? {
          texto: ultima.texto, criado_em: ultima.criado_em,
          quem: ultima.de_conta_id === eu.conta_id ? 'Você' : (nomes[ultima.de_conta_id] || '—'),
        } : null,
        nao_lidas: doGrupo.filter((m) => m.de_conta_id !== eu.conta_id && !m.lida_em).length,
      };
    }),
  });
}

// ── Abrir um grupo ────────────────────────────────────────────────
// Regra: só quem está dentro. E a resposta traz a CONTAGEM de
// participantes, jamais quem são.
async function abrirGrupo(req, res) {
  const eu = quem(req);
  if (!eu) return semSessao(res);

  const id = req.query.grupo_id;
  if (!UUID.test(String(id || ''))) return res.status(400).json({ error: 'grupo_id inválido.' });
  const sou = await souDoGrupo(id, eu.conta_id);
  if (!sou) return res.status(404).json({ error: 'Grupo não encontrado.' });

  const g = (await rsb(`grupos?id=eq.${id}&select=*&limit=1`))[0];
  const msgs = await rsb(`mensagens_rede?grupo_id=eq.${id}&select=id,de_conta_id,texto,oferta_id,criado_em&order=criado_em.asc&limit=300`);
  const nomes = await nomesDe([...new Set(msgs.map((m) => m.de_conta_id))]);
  // `select=grupo_id` e não `conta_id`: só o número interessa, e os ids
  // dos participantes nem chegam a existir aqui dentro. Um dia alguém
  // acrescenta um campo na resposta sem pensar — e o que não foi lido não
  // pode vazar.
  const quantos = (await rsb(`grupo_membros?grupo_id=eq.${id}&saiu_em=is.null&select=grupo_id`)).length;

  await rsb(`mensagens_rede?grupo_id=eq.${id}&de_conta_id=neq.${eu.conta_id}&lida_em=is.null`, {
    method: 'PATCH', body: JSON.stringify({ lida_em: new Date().toISOString() }),
  }).catch(() => {});

  return res.status(200).json({
    id: g.id, nome: g.nome, aberto: g.aberto, sou_admin: sou.admin === true,
    participantes: quantos,     // só o número. A lista não sai daqui.
    mensagens: msgs.map((m) => ({
      id: m.id, texto: m.texto, oferta_id: m.oferta_id, criado_em: m.criado_em,
      minha: m.de_conta_id === eu.conta_id,
      // O autor aparece — é o que permite chamar no privado. Quem nunca
      // fala nunca aparece, e é essa a proteção.
      quem: m.de_conta_id === eu.conta_id ? 'Você' : (nomes[m.de_conta_id] || '—'),
      conta_id: m.de_conta_id,
    })),
  });
}

// ── Criar, entrar, sair, acrescentar ──────────────────────────────
async function mexerNoGrupo(req, res) {
  const eu = quem(req);
  if (!eu) return semSessao(res);
  const { acao, grupo_id, nome, aberto, conta_id } = req.body || {};

  if (acao === 'criar') {
    const limpo = String(nome || '').trim().slice(0, 60);
    if (!limpo) return res.status(400).json({ error: 'Dê um nome ao grupo.' });
    const g = (await rsb('grupos', { method: 'POST', prefer: 'return=representation',
      body: JSON.stringify({ criado_por: eu.conta_id, nome: limpo, aberto: aberto === true }) }))[0];
    await rsb('grupo_membros', { method: 'POST',
      body: JSON.stringify({ grupo_id: g.id, conta_id: eu.conta_id, admin: true }) });
    return res.status(201).json({ ok: true, grupo: { id: g.id, nome: g.nome, aberto: g.aberto } });
  }

  if (!UUID.test(String(grupo_id || ''))) return res.status(400).json({ error: 'grupo_id inválido.' });
  const g = (await rsb(`grupos?id=eq.${grupo_id}&arquivado_em=is.null&select=*&limit=1`))[0];
  if (!g) return res.status(404).json({ error: 'Grupo não encontrado.' });
  const sou = await souDoGrupo(grupo_id, eu.conta_id);

  // Entrar sozinho: só em grupo aberto.
  if (acao === 'entrar') {
    if (sou) return res.status(200).json({ ok: true, ja_estava: true });
    if (!g.aberto) return res.status(403).json({ error: 'Este grupo é fechado — só entra por convite.' });
    await rsb('grupo_membros?on_conflict=grupo_id,conta_id', {
      method: 'POST', prefer: 'resolution=merge-duplicates',
      body: JSON.stringify({ grupo_id, conta_id: eu.conta_id, admin: false, saiu_em: null }),
    });
    return res.status(200).json({ ok: true });
  }

  if (!sou) return res.status(404).json({ error: 'Grupo não encontrado.' });

  if (acao === 'sair') {
    await rsb(`grupo_membros?grupo_id=eq.${grupo_id}&conta_id=eq.${eu.conta_id}`, {
      method: 'PATCH', body: JSON.stringify({ saiu_em: new Date().toISOString() }),
    });
    return res.status(200).json({ ok: true });
  }

  // Daqui para baixo, só admin.
  if (!sou.admin) return res.status(403).json({ error: 'Só quem administra o grupo pode fazer isso.' });

  if (acao === 'acrescentar') {
    if (!UUID.test(String(conta_id || ''))) return res.status(400).json({ error: 'conta_id inválido.' });
    // Só dá para acrescentar quem é seu contato: sem isso, o grupo viraria
    // um jeito de alcançar loja que nunca aceitou falar com você.
    const c = await rsb(`contatos?conta_id=eq.${eu.conta_id}&contato_conta_id=eq.${conta_id}&estado=eq.ativo&select=id&limit=1`);
    if (!c.length) return res.status(400).json({ error: 'Essa loja não é seu contato.' });
    await rsb('grupo_membros?on_conflict=grupo_id,conta_id', {
      method: 'POST', prefer: 'resolution=merge-duplicates',
      body: JSON.stringify({ grupo_id, conta_id, admin: false, saiu_em: null }),
    });
    return res.status(200).json({ ok: true });
  }

  if (acao === 'abrir' || acao === 'fechar') {
    await rsb(`grupos?id=eq.${grupo_id}`, { method: 'PATCH', body: JSON.stringify({ aberto: acao === 'abrir' }) });
    return res.status(200).json({ ok: true, aberto: acao === 'abrir' });
  }

  if (acao === 'apagar') {
    await rsb(`grupos?id=eq.${grupo_id}`, {
      method: 'PATCH', body: JSON.stringify({ arquivado_em: new Date().toISOString() }),
    });
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'acao deve ser criar, entrar, sair, acrescentar, abrir, fechar ou apagar.' });
}

// ── Falar no grupo ────────────────────────────────────────────────
async function mandarNoGrupo(req, res) {
  const eu = quem(req);
  if (!eu) return semSessao(res);

  const { grupo_id, texto, oferta_id } = req.body || {};
  if (!UUID.test(String(grupo_id || ''))) return res.status(400).json({ error: 'grupo_id inválido.' });
  const limpo = String(texto || '').trim().slice(0, 2000);
  if (!limpo) return res.status(400).json({ error: 'Escreva alguma coisa.' });
  if (!(await souDoGrupo(grupo_id, eu.conta_id))) {
    return res.status(404).json({ error: 'Grupo não encontrado.' });
  }

  await rsb('mensagens_rede', {
    method: 'POST',
    body: JSON.stringify({
      grupo_id, de_conta_id: eu.conta_id, de_usuario_id: eu.usuario_id,
      texto: limpo, oferta_id: UUID.test(String(oferta_id || '')) ? oferta_id : null,
    }),
  });
  await rsb(`grupos?id=eq.${grupo_id}`, {
    method: 'PATCH', body: JSON.stringify({ ultima_em: new Date().toISOString() }),
  });

  // Avisa os outros participantes. Os ids são lidos aqui dentro e não
  // saem em resposta nenhuma — a lista continua oculta (ver a regra no
  // topo do bloco de grupos).
  const { avisarConta } = require('./_aviso');
  const participantes = await rsb(`grupo_membros?grupo_id=eq.${grupo_id}&saiu_em=is.null&select=conta_id`);
  for (const p of participantes) {
    if (p.conta_id === eu.conta_id) continue;
    await avisarConta(rsb, p.conta_id, null);
  }

  return res.status(201).json({ ok: true });
}

// ══ AVISO NO CELULAR ═══════════════════════════════════════════════

// Guardar o endereço que o navegador deu. Um por aparelho.
async function assinarAviso(req, res) {
  const eu = quem(req);
  if (!eu) return semSessao(res);

  const { endpoint, p256dh, auth } = req.body || {};
  if (!endpoint || !/^https:\/\//.test(String(endpoint))) {
    return res.status(400).json({ error: 'endpoint inválido.' });
  }
  // `merge-duplicates` porque o mesmo aparelho reassina toda vez que o
  // navegador renova a permissão — sem isto, a pessoa receberia o mesmo
  // aviso três vezes.
  await rsb('push_assinaturas?on_conflict=endpoint', {
    method: 'POST', prefer: 'resolution=merge-duplicates',
    body: JSON.stringify({
      conta_id: eu.conta_id, usuario_id: eu.usuario_id,
      endpoint: String(endpoint), p256dh: p256dh || null, auth: auth || null,
      aparelho: String(req.headers['user-agent'] || '').slice(0, 120) || null,
      ultimo_erro: null,
    }),
  });
  // `ligado` diz se o servidor CONSEGUE mandar (a chave privada está no
  // ambiente). Sem isto a tela diria "pronto, você será avisado" e nada
  // chegaria — o assinante ficaria esperando um aviso que não existe.
  const { ligado } = require('./_aviso');
  return res.status(200).json({ ok: true, ligado: ligado() });
}

// O que o service worker pergunta quando o aviso chega: o texto a
// mostrar. Devolve a coisa mais recente que interessa a esta loja.
async function novidades(req, res) {
  const eu = quem(req);
  if (!eu) return semSessao(res);

  // 1. Mensagem nova ganha da oferta: alguém falando com você é mais
  //    urgente que um carro no feed.
  const convs = await rsb(`conversas?or=(conta_a.eq.${eu.conta_id},conta_b.eq.${eu.conta_id})&select=id&limit=100`);
  if (convs.length) {
    const naoLidas = await rsb(
      `mensagens_rede?conversa_id=in.(${convs.map((c) => c.id).join(',')})&de_conta_id=neq.${eu.conta_id}` +
      `&lida_em=is.null&select=de_conta_id,texto&order=criado_em.desc&limit=20`
    );
    if (naoLidas.length) {
      const nomes = await nomesDe([...new Set(naoLidas.map((m) => m.de_conta_id))]);
      const ultima = naoLidas[0];
      return res.status(200).json({
        titulo: nomes[ultima.de_conta_id] || 'Nova mensagem',
        corpo: naoLidas.length > 1 ? `${naoLidas.length} mensagens novas` : ultima.texto.slice(0, 120),
        url: '/rede.html',
      });
    }
  }

  // 2. Carro que chegou e você ainda não olhou. O texto leva preço e a
  //    distância da FIPE: é o que permite decidir SEM abrir o app.
  const meus = await rsb(`oferta_destinos?conta_id=eq.${eu.conta_id}&select=oferta_id&order=criado_em.desc&limit=30`);
  if (meus.length) {
    const ids = meus.map((x) => x.oferta_id);
    const ofertas = await rsb(`ofertas?id=in.(${ids.join(',')})&estado=eq.aberta&select=*&order=criado_em.desc&limit=10`);
    const jaQuis = await rsb(`interesses?oferta_id=in.(${ids.join(',')})&conta_id=eq.${eu.conta_id}&select=oferta_id`);
    const vistos = new Set(jaQuis.map((i) => i.oferta_id));
    const nova = ofertas.find((o) => !vistos.has(o.id));
    if (nova) {
      const fipe = Number(nova.dados?.fipe) || 0;
      const abaixo = fipe && nova.preco ? Math.round((1 - nova.preco / fipe) * 100) : 0;
      return res.status(200).json({
        titulo: `${nova.marca} ${nova.modelo} · ${nova.ano || ''}`.trim(),
        corpo: `R$ ${Number(nova.preco).toLocaleString('pt-BR')}`
          + (abaixo > 0 ? ` — ${abaixo}% abaixo da FIPE` : '')
          + (nova.cidade ? ` · ${nova.cidade}` : ''),
        url: '/rede.html',
      });
    }
  }

  return res.status(200).json({ titulo: 'Carro na Rede', corpo: 'Você tem novidade na rede.', url: '/rede.html' });
}

module.exports = {
  ofertar, feed, quero, filaDaOferta, minhasOfertas, reservar, desfazerReserva,
  assinarAviso, novidades,
  listas, solicitar, responder, sairOuRemover,
  verListasTransmissao, mexerNaLista, membrosDaLista,
  conversas, abrirConversa, mandarMensagem,
  grupos, abrirGrupo, mexerNoGrupo, mandarNoGrupo,
  rsb, quem,
};
