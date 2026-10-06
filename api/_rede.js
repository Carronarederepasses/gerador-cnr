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
                 // `bloqueios` entrou em 06/out. Esqueci dele na primeira
                 // versão e o teste pegou: o `temBloqueio` tratava a recusa
                 // desta lista como "migration pendente" e respondia
                 // "ninguém bloqueado". A tela diria "Bloqueada." e a loja
                 // continuaria falando — a pior forma de falhar, porque
                 // ninguém descobre até alguém se queixar.
                 'bloqueios',
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
async function destinatarios(contaId, listaId, grupoId) {
  // ── Grupo ────────────────────────────────────────────────────────
  // Caminho próprio, e ANTES do de contatos, porque num grupo o filtro
  // "é meu contato?" não se aplica: no grupo as lojas se alcançam por
  // estarem no grupo, não por se conhecerem. Exigir contato ali
  // esvaziaria o grupo em silêncio para quem acabou de entrar.
  if (grupoId) {
    const g = await rsb(`grupos?id=eq.${grupoId}&select=id,nome&limit=1`);
    if (!g.length) return { erro: 'Grupo não encontrado.' };
    if (!(await souDoGrupo(grupoId, contaId))) return { erro: 'Grupo não encontrado.' };
    const membros = await rsb(`grupo_membros?grupo_id=eq.${grupoId}&saiu_em=is.null&select=conta_id`);
    // Os ids ficam aqui dentro e não saem em resposta nenhuma — a lista
    // de participantes continua oculta, que é o diferencial do produto.
    return { contas: membros.map((m) => m.conta_id).filter((c) => c !== contaId), grupo: g[0] };
  }

  const contatos = await rsb(`contatos?conta_id=eq.${contaId}&estado=eq.ativo&select=contato_conta_id`);
  const ativos = new Set(contatos.map((x) => x.contato_conta_id));

  // Bloqueado não recebe carro, nos dois sentidos (06/out). Sem este
  // filtro, bloquear calaria a conversa e o carro continuaria chegando —
  // meio bloqueio, que é o mesmo que nenhum.
  const bloqueadas = await quemEstaBloqueado(contaId);
  const passa = (c) => !bloqueadas.has(c);

  if (!listaId) return { contas: [...ativos].filter(passa), lista: null };

  const l = await rsb(`listas?id=eq.${listaId}&conta_id=eq.${contaId}&arquivada_em=is.null&select=id,nome&limit=1`);
  if (!l.length) return { erro: 'Lista não encontrada.' };

  const membros = await rsb(`lista_membros?lista_id=eq.${listaId}&select=conta_id`);
  return { contas: membros.map((m) => m.conta_id).filter((c) => ativos.has(c) && passa(c)), lista: l[0] };
}

// Todas as lojas bloqueadas nos dois sentidos, de uma vez. Em consulta só,
// porque chamar `temBloqueio` para cada destinatário de uma transmissão
// seria uma ida ao banco por loja.
async function quemEstaBloqueado(contaId) {
  try {
    const r = await rsb(
      `bloqueios?select=conta_id,bloqueada_conta_id` +
      `&or=(conta_id.eq.${contaId},bloqueada_conta_id.eq.${contaId})`
    );
    return new Set(r.map((b) => (b.conta_id === contaId ? b.bloqueada_conta_id : b.conta_id)));
  } catch (e) {
    // Migration pendente: ninguém bloqueado, e a Rede continua de pé.
    console.error('[rede] bloqueios indisponível (migration pendente?):', e.message);
    return new Set();
  }
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

  // `publico`: vai direto para o FEED da rede, sem destinatário nenhum.
  // É outro movimento do negócio — a lista e o grupo são o carro quente,
  // mandado para quem se escolheu; o feed é o carro que não saiu na hora
  // e segue disponível, aberto para todo mundo (decisão do Yuri, 28/set:
  // "tipo um autoavaliar, que as pessoas publiquem pra geral").
  const { veiculo_id, lista_id, grupo_id, mensagem, publico } = req.body || {};
  if (!UUID.test(String(veiculo_id || ''))) {
    return res.status(400).json({ error: 'veiculo_id inválido.' });
  }
  if (lista_id && !UUID.test(String(lista_id))) {
    return res.status(400).json({ error: 'lista_id inválido.' });
  }
  if (grupo_id && !UUID.test(String(grupo_id))) {
    return res.status(400).json({ error: 'grupo_id inválido.' });
  }
  if (lista_id && grupo_id) {
    return res.status(400).json({ error: 'Escolha a lista OU o grupo, não os dois.' });
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

  // No feed não há destinatário: o carro fica aberto e quem quiser
  // levanta a mão. Por isso a checagem de "ninguém receberia" é pulada —
  // ali ela impediria justamente o que se quer fazer.
  const alvo = publico ? { contas: [], publico: true } : await destinatarios(eu.conta_id, lista_id, grupo_id);
  if (alvo.erro) return res.status(404).json({ error: alvo.erro });
  const destinos = alvo.contas;
  if (!publico && !destinos.length) {
    return res.status(400).json({
      error: grupo_id
        ? 'Você é o único no grupo — ninguém receberia este carro.'
        : lista_id
          ? 'Essa lista não tem ninguém que ainda seja seu contato.'
          : 'Você ainda não tem contatos — ninguém receberia este carro.',
      codigo: 'lista_vazia',
    });
  }

  // A FOTOGRAFIA. Só o que pode atravessar: nada de placa, renavam,
  // chassi, valor de compra, avaliação ou documentos.
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
        // De qual GRUPO saiu, quando saiu de um. Vai em `dados` e não
        // numa coluna porque é o primeiro caso que pede isso — texto
        // primeiro, estrutura quando a ausência começar a limitar
        // (Princípio da Estrutura Emergente, §6). O nome viaja junto
        // pelo mesmo motivo do `lista_nome`: o grupo pode ser renomeado,
        // e o histórico tem de continuar explicando por que o carro
        // chegou.
        grupo: alvo.grupo ? { id: alvo.grupo.id, nome: alvo.grupo.nome } : null,
      },
      // SÓ o publicar coloca carro no feed. A graduação automática —
      // "abre para a vitrine em 6 horas" — foi desligada em 28/set por
      // decisão do Yuri: o feed é ato da loja, não consequência de ter
      // mandado para uma lista. Com ela ligada, o carro mandado para a
      // lista de confiança virava público sozinho, e a loja descobria
      // depois.
      vitrine_em: publico ? new Date().toISOString() : null,
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
  // Publicado no feed não tem destino nenhum — o PostgREST recusa lista
  // vazia, então nem se chama.
  if (destinos.length) {
    await rsb('oferta_destinos', {
      method: 'POST',
      body: JSON.stringify(destinos.map((c) => ({ oferta_id: oferta.id, conta_id: c }))),
    });
  }

  // No grupo, o carro também aparece NA CONVERSA do grupo, não só no
  // feed de cada um — senão o grupo ficaria mudo justamente quando
  // alguém posta um carro, que é para o que ele serve.
  if (alvo.grupo) {
    await rsb('mensagens_rede', {
      method: 'POST',
      body: JSON.stringify({
        grupo_id: alvo.grupo.id,
        de_conta_id: eu.conta_id,
        de_usuario_id: eu.usuario_id,
        texto: String(mensagem || '').trim().slice(0, 500)
          || `${veic.marca || ''} ${veic.modelo || ''}`.trim() || 'Carro',
        oferta_id: oferta.id,
      }),
    });
    await rsb(`grupos?id=eq.${alvo.grupo.id}`, {
      method: 'PATCH', body: JSON.stringify({ ultima_em: new Date().toISOString() }),
    });
  }

  // Avisa quem recebeu. Com  e nao fire-and-forget: a Vercel
  // encerra o worker ao responder, e o aviso morreria pela metade —
  // lição de 19/ago, que custou uma etapa inteira para entender.
  // Falha de aviso nunca derruba a oferta:  nao lanca.
  const { avisarConta } = require('./_aviso');
  for (const c of destinos) await avisarConta(rsb, c, null);

  return res.status(201).json({
    ok: true, oferta_id: oferta.id, enviada_para: destinos.length,
    publico: Boolean(publico),
  });
}

// ── O FEED DA REDE ────────────────────────────────────────────────
//
// Esta é a ÚNICA leitura da rede que atravessa contas de propósito: o
// feed é público dentro da rede, e é para isso que ele existe. Decisão
// do Yuri em 28/set — "tipo um autoavaliar, que as pessoas publiquem pra
// geral… os carros que não são vendidos na hora e estão disponíveis".
//
// A diferença para a lista e o grupo é o movimento do negócio, não a
// tela: lista e grupo são o carro quente, mandado para quem se escolheu;
// o feed é o carro parado, aberto para todos.
//
// O que atravessa é a MESMA fotografia que a lista já entrega — placa,
// renavam, chassi e valor de compra não têm sequer coluna em `ofertas`,
// então não vazam nem por descuido de um `select *`.
//
// Vai o NOME e a CIDADE da loja, decisão dele: sem saber de quem é o
// carro, ninguém fecha negócio, e o feed viraria enfeite.
async function vitrine(req, res) {
  const eu = quem(req);
  if (!eu) return semSessao(res);
  if (!eu.podeVerRede) {
    return res.status(403).json({ error: 'Seu acesso não inclui o feed da rede.' });
  }

  const agora = new Date().toISOString();
  const ofertas = await rsb(
    `ofertas?estado=eq.aberta&vitrine_em=not.is.null&vitrine_em=lte.${agora}` +
    `&select=id,conta_id,marca,modelo,ano,km,preco,cidade,uf,dados,mensagem,criado_em,vitrine_em` +
    `&order=vitrine_em.desc&limit=100`
  );
  if (!ofertas.length) return res.status(200).json({ ofertas: [] });

  const ids = ofertas.map((o) => o.id);
  const [interesses, reservas, lojas] = await Promise.all([
    // `criado_em` e a ordem vêm junto porque a POSIÇÃO na fila é o dado que
    // faz a pessoa agir: ser o 1º é correr, ser o 5º é deixar passar. Sem
    // ordenar aqui, a contagem existe e a posição não.
    rsb(`interesses?oferta_id=in.(${ids.join(',')})&estado=eq.quer&select=oferta_id,conta_id,criado_em&order=criado_em.asc`),
    rsb(`reservas?oferta_id=in.(${ids.join(',')})&desfeita_em=is.null&select=oferta_id,com_sinal`),
    // `contas` não tem cidade — conferido, não suposto. A cidade que
    // aparece é a DO CARRO (`ofertas.cidade`), que é a que interessa a
    // quem vai buscar. Cidade da loja viraria coluna no dia em que uma
    // loja anunciar carro de outra praça.
    rsb(`contas?id=in.(${[...new Set(ofertas.map((o) => o.conta_id))].join(',')})&select=id,nome`),
  ]);

  const loja = {};
  for (const l of lojas) loja[l.id] = l;
  const fila = {}; const meu = {}; const reservada = {};
  for (const i of interesses) {
    fila[i.oferta_id] = (fila[i.oferta_id] || 0) + 1;
    // A posição é a contagem no momento em que a MINHA mão aparece — a
    // lista já vem na ordem de chegada, que é a ordem que vale.
    if (i.conta_id === eu.conta_id) meu[i.oferta_id] = fila[i.oferta_id];
  }
  for (const r of reservas) reservada[r.oferta_id] = r.com_sinal ? 'sinal' : 'palavra';

  return res.status(200).json({
    ofertas: ofertas.map((o) => ({
      id: o.id, marca: o.marca, modelo: o.modelo, ano: o.ano, km: o.km,
      preco: o.preco, cidade: o.cidade, uf: o.uf, dados: o.dados,
      mensagem: o.mensagem, criado_em: o.vitrine_em,
      loja: (loja[o.conta_id] || {}).nome || '—',
      // Para a tela saber se é meu: carro próprio não mostra "Quero",
      // mostra quem levantou a mão.
      minha: o.conta_id === eu.conta_id,
      conta_id: o.conta_id === eu.conta_id ? o.conta_id : undefined,
      na_fila: fila[o.id] || 0,
      eu_quero: !!meu[o.id],
      minha_posicao: meu[o.id] || null,
      reservado: reservada[o.id] || null,
    })),
  });
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

  // As três dependem só dos ids, não uma da outra — então saem juntas.
  // Em fila, a tela esperava a soma; assim espera a mais lenta. Continuam
  // sendo consultas por LOTE, nunca uma por oferta: a tela mostra dezenas
  // de cartões.
  const [ofertas, interesses, reservas] = await Promise.all([
    rsb(`ofertas?id=in.(${ids.join(',')})&estado=neq.encerrada&select=*&order=criado_em.desc`),
    // Ordenado pela chegada: é o que permite dizer a POSIÇÃO, e não só
    // quantos são. Mesma razão do feed da vitrine.
    rsb(`interesses?oferta_id=in.(${ids.join(',')})&select=oferta_id,conta_id,estado,criado_em&order=criado_em.asc`),
    rsb(`reservas?oferta_id=in.(${ids.join(',')})&desfeita_em=is.null&select=oferta_id,com_sinal`),
  ]);

  // ── O visto ──────────────────────────────────────────────────
  // Marca as que ESTE pedido está de fato mostrando, e só as ainda não
  // vistas — reescrever a hora a cada abertura apagaria quando foi a
  // primeira vez, que é o dado que interessa.
  //
  // COM `await`, e não solto: a Vercel encerra o worker assim que a
  // resposta sai, então trabalho sem espera é cancelado e não acontece —
  // em silêncio. Foi o que derrubou o `VEICULO_EXCLUIDO` em 19/ago e o
  // `NEGOCIACAO_CONVERTIDA` em 20/ago. O padrão do projeto é este.
  //
  // O `try` existe porque o visto é acessório: se falhar, o feed já está
  // montado e a tela não pode parar por causa disso. Mas o erro vai para
  // o registro em vez de sumir — "não marcou" é diferente de "não abriu",
  // e confundir as duas é o que custou caro aqui a semana inteira.
  const mostradas = ofertas.map((o) => o.id);
  if (mostradas.length) {
    try {
      await rsb(`oferta_destinos?conta_id=eq.${eu.conta_id}&oferta_id=in.(${mostradas.join(',')})&visto_em=is.null`, {
        method: 'PATCH', body: JSON.stringify({ visto_em: new Date().toISOString() }),
      });
    } catch (e) {
      // Coluna ausente (migration não rodada) cai aqui e não quebra nada.
      console.error('[rede] não consegui marcar como visto:', e.message);
    }
  }

  const fila = {}; const meu = {}; const reservada = {};
  for (const i of interesses) {
    if (i.estado !== 'quer') continue;
    fila[i.oferta_id] = (fila[i.oferta_id] || 0) + 1;
    if (i.conta_id === eu.conta_id) meu[i.oferta_id] = fila[i.oferta_id];
  }
  for (const r of reservas) reservada[r.oferta_id] = r.com_sinal ? 'sinal' : 'palavra';

  return res.status(200).json({
    ofertas: ofertas.map((o) => ({
      id: o.id, marca: o.marca, modelo: o.modelo, ano: o.ano, km: o.km,
      preco: o.preco, cidade: o.cidade, uf: o.uf, dados: o.dados,
      mensagem: o.mensagem, lista_nome: o.lista_nome, criado_em: o.criado_em,
      na_fila: fila[o.id] || 0,
      eu_quero: !!meu[o.id],
      minha_posicao: meu[o.id] || null,
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

  // Dois caminhos legítimos para levantar a mão:
  //   1. o carro foi mandado PARA MIM (lista ou grupo) — há linha em
  //      `oferta_destinos`;
  //   2. o carro está NO FEED, aberto para a rede toda.
  // O segundo é a razão de o feed existir: sem ele, ver o carro no feed
  // e não poder querer seria uma vitrine com a porta trancada.
  // O carro é meu? Levantar a mão para o próprio carro não é erro de
  // digitação — é o feed deixando a loja entrar na própria fila e
  // estragar a ordem de chegada, que é o que a fila existe para guardar.
  const dono = await rsb(`ofertas?id=eq.${oferta_id}&conta_id=eq.${eu.conta_id}&select=id&limit=1`);
  if (dono.length) {
    return res.status(400).json({ error: 'Este carro é seu.', codigo: 'carro_proprio' });
  }

  const destino = await rsb(
    `oferta_destinos?oferta_id=eq.${oferta_id}&conta_id=eq.${eu.conta_id}&select=oferta_id&limit=1`
  );
  if (!destino.length) {
    const publica = await rsb(
      `ofertas?id=eq.${oferta_id}&estado=eq.aberta&vitrine_em=not.is.null` +
      `&vitrine_em=lte.${new Date().toISOString()}&select=id&limit=1`
    );
    // Mesma resposta de "não existe": dizer "não é para você" confirmaria
    // que a oferta existe.
    if (!publica.length) return res.status(404).json({ error: 'Oferta não encontrada.' });
  }

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
    rsb(`oferta_destinos?oferta_id=in.(${ids.join(',')})&select=oferta_id,visto_em`),
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
      // Para quem MANDOU: de qual grupo saiu. Só o nome do grupo, nunca
      // quem está nele.
      grupo_id:   o.dados && o.dados.grupo ? o.dados.grupo.id   : null,
      grupo_nome: o.dados && o.dados.grupo ? o.dados.grupo.nome : null,
      criado_em: o.criado_em, vitrine_em: o.vitrine_em,
      destinos: (dest[o.id] || []).length,
      // Quantos ABRIRAM. "Ninguém quer" e "ninguém viu" pedem decisões
      // opostas — a primeira é baixar o preço, a segunda é mandar de novo
      // ou por outra lista. Só o NÚMERO sai daqui: QUEM viu é da loja que
      // viu, e entregar isso transformaria o aviso de leitura numa lista
      // de quem está olhando o mercado.
      vistos: (dest[o.id] || []).filter((d) => d.visto_em).length,
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

  // ── Pelo NÚMERO, como na agenda do WhatsApp (06/out) ────────────
  // `telefone` é o caminho da tela; `para_conta_id` continua valendo para
  // quem já é contato e pede para entrar numa lista conhecida.
  //
  // A resolução passa por `_sessao.js` porque `usuarios` não está na lista
  // branca deste arquivo — e não vai entrar.
  const { para_conta_id, telefone } = req.body || {};
  let destino = para_conta_id;

  if (telefone) {
    const sessao = require('./_sessao');
    destino = await sessao.contaPeloTelefone(telefone);

    // ── A RESPOSTA É IGUAL, EXISTA O NÚMERO OU NÃO ────────────────
    // Sem isto a tela vira um detector de quem está cadastrado: digita
    // mil números, lê mil respostas, descobre a rede inteira. É a mesma
    // decisão que `_sessao.js` já tomou para o login — "responde SEMPRE
    // igual, exista ou não o telefone" —, e ela só vale se valer aqui
    // também, porque senão basta trocar de tela para contornar.
    //
    // Pedir para si mesmo também cai aqui: dizer "esse número é teu"
    // confirmaria o cadastro de quem pergunta de fora com o número de
    // outro. Quem fez isso por engano não perde nada — nenhum pedido
    // nasce, e o próprio número ele já conhece.
    if (!destino || destino === eu.conta_id) {
      return res.status(200).json({ ok: true, enviado: true });
    }
  } else {
    if (!UUID.test(String(destino || ''))) return res.status(400).json({ error: 'para_conta_id inválido.' });
    if (destino === eu.conta_id) return res.status(400).json({ error: 'Essa lista é sua.' });
  }

  const ja = await rsb(`contatos?conta_id=eq.${destino}&contato_conta_id=eq.${eu.conta_id}&estado=eq.ativo&select=id&limit=1`);
  if (ja.length) {
    // Pelo número, "já sou membro" também não pode ser dito: quem não é
    // da rede aprenderia, do mesmo jeito, que aquele número existe.
    if (telefone) return res.status(200).json({ ok: true, enviado: true });
    return res.status(409).json({ error: 'Você já está nessa lista.', codigo: 'ja_membro' });
  }

  // Pedido repetido é toque repetido, não erro: o índice parcial no banco
  // já garante um pendente por par.
  const pend = await rsb(`solicitacoes?de_conta_id=eq.${eu.conta_id}&para_conta_id=eq.${destino}&estado=eq.pendente&select=id&limit=1`);
  if (pend.length) return res.status(200).json({ ok: true, ja_pedido: true, enviado: true });

  await rsb('solicitacoes', {
    method: 'POST',
    body: JSON.stringify({ de_conta_id: eu.conta_id, para_conta_id: destino }),
  });

  // Pelo número, o CÓDIGO HTTP também tem que ser igual. Escrever a mesma
  // frase e devolver 201 quando o número existe e 200 quando não existe
  // deixa o vazamento de pé: a aba de rede do navegador mostra o número,
  // e um script leria mil números por minuto. Foi o teste de 06/out que
  // pegou isto — o corpo estava idêntico e o status, não.
  return res.status(telefone ? 200 : 201).json({ ok: true, enviado: true });
}

/* ══ A AGENDA — quem da minha agenda já está aqui ════════════════════
 *
 * O telefone manda os números que a pessoa autorizou; a resposta diz quais
 * têm conta. Quem não tem **não volta e não fica**: nada é gravado, nem o
 * número, nem a pergunta, nem quem perguntou (o porquê está escrito em
 * `_sessao.js`, em `contasPorTelefones`).
 *
 * A separação em dois grupos — "já estão" e "convidar" — é feita na TELA,
 * com o que ela já tem: ela sabe os nomes da agenda, que nunca sobem para
 * cá. O servidor só devolve os que casaram. É isso que faz a agenda de 800
 * contatos não virar 800 linhas em lugar nenhum.
 *
 * `usuarios` não está na lista branca deste arquivo, então quem consulta é
 * o `_sessao.js` — o mesmo caminho de `solicitar`.
 */
async function agenda(req, res) {
  const eu = quem(req);
  if (!eu) return semSessao(res);
  if (!eu.podeVerRede) {
    return res.status(403).json({ error: 'Seu acesso não inclui a rede.' });
  }

  const { telefones } = req.body || {};
  if (!Array.isArray(telefones)) {
    return res.status(400).json({ error: 'telefones deve ser uma lista.' });
  }

  const sessao = require('./_sessao');
  const achadas = await sessao.contasPorTelefones(telefones);

  // Bloqueadas saem da resposta: para mim elas não estão aqui.
  const bloqueadas = await quemEstaBloqueado(eu.conta_id);

  // O MEU número volta marcado, em vez de sumir. Se sumisse, a tela o
  // trataria como "ainda não usa o Gerador" — e colar o próprio número é
  // a primeira coisa que qualquer pessoa faz para testar. A tela esconde
  // essa linha; o que ela não pode é mentir sobre ela.
  const lista = achadas
    .filter((c) => !bloqueadas.has(c.conta_id))
    .map((c) => (c.conta_id === eu.conta_id ? { ...c, eu: true } : c));

  return res.status(200).json({
    ok: true,
    // `telefone` volta para a tela saber a QUAL contato da agenda cada
    // loja corresponde — é a única forma de ela casar "João da Oficina"
    // com a loja certa sem o nome dele ter subido.
    contatos: lista,
    limite: sessao.AGENDA_POR_PEDIDO,
  });
}

/* ══ BLOQUEAR E DESBLOQUEAR ══════════════════════════════════════════
 *
 * A válvula da regra nova: se qualquer um com o meu número me chama, tem
 * de haver como calar quem incomoda. Não avisa a outra loja — bloqueio que
 * avisa é discussão, não bloqueio.
 */
async function bloquear(req, res) {
  const eu = quem(req);
  if (!eu) return semSessao(res);

  const { conta_id, bloquear: ligar } = req.body || {};
  if (!UUID.test(String(conta_id || ''))) return res.status(400).json({ error: 'conta_id inválido.' });
  if (conta_id === eu.conta_id) return res.status(400).json({ error: 'Essa loja é sua.' });

  try {
    if (ligar === false) {
      await rsb(`bloqueios?conta_id=eq.${eu.conta_id}&bloqueada_conta_id=eq.${conta_id}`, { method: 'DELETE' });
      return res.status(200).json({ ok: true, bloqueada: false });
    }
    // `resolution=merge-duplicates`: bloquear duas vezes é toque repetido,
    // não erro — a chave primária recusaria o segundo.
    await rsb('bloqueios', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates',
      body: JSON.stringify({ conta_id: eu.conta_id, bloqueada_conta_id: conta_id }),
    });
    return res.status(200).json({ ok: true, bloqueada: true });
  } catch (e) {
    // A tabela pode não existir ainda (migration manual). Aqui NÃO dá para
    // responder "deu certo": a pessoa pensaria que bloqueou e continuaria
    // recebendo mensagem. Então o erro aparece, com o motivo.
    console.error('[rede] bloquear falhou:', e.message);
    return res.status(503).json({
      error: 'O bloqueio ainda não está disponível neste banco.', codigo: 'sem_tabela',
    });
  }
}

async function bloqueadas(req, res) {
  const eu = quem(req);
  if (!eu) return semSessao(res);
  let linhas = [];
  try {
    linhas = await rsb(`bloqueios?conta_id=eq.${eu.conta_id}&select=bloqueada_conta_id,criado_em&order=criado_em.desc`);
  } catch (e) {
    console.error('[rede] bloqueios indisponível:', e.message);
    return res.status(200).json({ ok: true, lojas: [], aviso: 'sem_tabela' });
  }
  const nomes = await nomesDe(linhas.map((b) => b.bloqueada_conta_id));
  return res.status(200).json({
    ok: true,
    lojas: linhas.map((b) => ({
      conta_id: b.bloqueada_conta_id, nome: nomes[b.bloqueada_conta_id] || '—', desde: b.criado_em,
    })),
  });
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

  // Quem saiu da rede continua na linha da lista, mas a tela precisa
  // dizer isso — senão o dono conta com alguém que não recebe mais.
  //
  // Os contatos não dependem das listas, então as duas consultas saem
  // juntas em vez de uma esperar a outra.
  const [listas, contatos] = await Promise.all([
    rsb(`listas?conta_id=eq.${eu.conta_id}&arquivada_em=is.null&select=id,nome,criada_em&order=criada_em.asc`),
    rsb(`contatos?conta_id=eq.${eu.conta_id}&estado=eq.ativo&select=contato_conta_id`),
  ]);
  if (!listas.length) return res.status(200).json({ listas: [] });

  const membros = await rsb(`lista_membros?lista_id=in.(${listas.map((l) => l.id).join(',')})&select=lista_id,conta_id`);
  const nomes = await nomesDe([...new Set(membros.map((m) => m.conta_id))]);
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
/* ── BLOQUEIO ───────────────────────────────────────────────────────
 *
 * Olha nos DOIS sentidos: eu bloqueei ela, ou ela me bloqueou. Um
 * bloqueio que só valesse de um lado deixaria o bloqueado continuar
 * falando, que é exatamente o que ele não pode fazer.
 *
 * A tabela pode ainda não existir — o deploy é automático e a migration é
 * manual. Nesse caso a resposta é "ninguém bloqueado" em vez de derrubar a
 * Rede inteira. Mesma rede de proteção de 08/set e 03/out.
 */
async function temBloqueio(a, b) {
  try {
    const r = await rsb(
      `bloqueios?select=conta_id&limit=1` +
      `&or=(and(conta_id.eq.${a},bloqueada_conta_id.eq.${b}),` +
      `and(conta_id.eq.${b},bloqueada_conta_id.eq.${a}))`
    );
    return r.length > 0;
  } catch (e) {
    console.error('[rede] bloqueios indisponível (migration pendente?):', e.message);
    return false;
  }
}

/* ── QUEM PODE FALAR COM QUEM (reescrito em 06/out) ─────────────────
 *
 * A REGRA MUDOU, e a razão fica escrita porque ela contraria o §3.2.
 *
 * Antes: só falava quem era contato, ou quem já tinha trocado um carro.
 * Ou seja, para conversar era preciso pedir para entrar numa lista e ser
 * aceito. Decisão do Yuri em 06/out: a Rede tem que funcionar como o
 * WhatsApp que o mercado dele já usa — **quem tem o meu número me chama
 * direto**, sem pedir licença, e eu bloqueio quem incomodar.
 *
 * ── COMO "TER O NÚMERO" É VERIFICADO, JÁ QUE NÃO DÁ PARA VERIFICAR ──
 *
 * O servidor não tem como provar que a outra loja tem o meu número na
 * agenda — e o WhatsApp também não prova nada disso. O que segura a regra
 * aqui é outra coisa: para abrir conversa é preciso o `conta_id`, que é um
 * número de 32 dígitos aleatórios. Ele não se adivinha. As duas formas de
 * saber o meu são: perguntar na agenda com o meu telefone, ou já estar
 * numa lista comigo.
 *
 * Então, na prática, **descobrir é a permissão** — e descobrir exige o
 * número. É o mesmo desenho de um link secreto.
 *
 * O preço disso, dito com clareza: se o `conta_id` de alguém circular por
 * fora, quem tiver o número pode chamar essa loja sem nunca ter tido o
 * telefone dela. A saída é a mesma do WhatsApp, e é o que o Yuri escolheu
 * junto com a regra: **bloquear**.
 */
async function podeFalarCom(minhaConta, outra) {
  if (minhaConta === outra) return false;

  // O bloqueio vem PRIMEIRO, e vence tudo o que vier depois — inclusive
  // ser contato antigo e já ter trocado carro. Se ficasse por último, um
  // contato bloqueado continuaria conversando pelo caminho de cima.
  if (await temBloqueio(minhaConta, outra)) return false;

  // A loja tem que existir e estar ativa. Sem isto, um `conta_id` velho
  // abriria conversa com uma loja que saiu do sistema.
  const c = await rsb(`contas?id=eq.${outra}&select=id,ativa&limit=1`);
  if (!c.length || c[0].ativa === false) return false;

  return true;
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

  // Carro postado no grupo aparece COMO CARRO na conversa, não como uma
  // linha de texto. A fotografia é a mesma que o feed já mostra a quem
  // recebeu — nada além dela atravessa, e quem está no grupo já recebeu
  // este carro de qualquer forma.
  const idsOferta = [...new Set(msgs.map((m) => m.oferta_id).filter(Boolean))];
  const carros = {};
  if (idsOferta.length) {
    const os = await rsb(`ofertas?id=in.(${idsOferta.join(',')})&select=id,marca,modelo,ano,km,preco,cidade,dados,estado`);
    const meusInteresses = await rsb(`interesses?oferta_id=in.(${idsOferta.join(',')})&conta_id=eq.${eu.conta_id}&estado=eq.quer&select=oferta_id`);
    const quero = new Set(meusInteresses.map((i) => i.oferta_id));
    for (const o of os) {
      carros[o.id] = {
        id: o.id, marca: o.marca, modelo: o.modelo, ano: o.ano, km: o.km,
        preco: o.preco, cidade: o.cidade, dados: o.dados,
        eu_quero: quero.has(o.id),
      };
    }
  }

  await rsb(`mensagens_rede?grupo_id=eq.${id}&de_conta_id=neq.${eu.conta_id}&lida_em=is.null`, {
    method: 'PATCH', body: JSON.stringify({ lida_em: new Date().toISOString() }),
  }).catch(() => {});

  return res.status(200).json({
    id: g.id, nome: g.nome, aberto: g.aberto, sou_admin: sou.admin === true,
    participantes: quantos,     // só o número. A lista não sai daqui.
    mensagens: msgs.map((m) => ({
      id: m.id, texto: m.texto, oferta_id: m.oferta_id, criado_em: m.criado_em,
      carro: m.oferta_id ? (carros[m.oferta_id] || null) : null,
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
  // ÚNICA rota da rede que atende sem sessão, e a razão está escrita aqui
  // porque é numa exceção à mão que um vazamento nasce:
  //
  //  1. A rota já passou por `exigirChave` — quem chegou aqui tem chave
  //     de aparelho válida ou sessão. Não é caminho aberto.
  //  2. Ela lê SÓ `conta_id`. Não usa `usuario_id`, papel, nem permissão:
  //     o que volta é o mesmo para qualquer pessoa da loja.
  //  3. A chave de aparelho já abre catálogo, vendas e clientes com CPF.
  //     Recusar aqui não protegeria nada — só faria o aviso chegar sem o
  //     carro, que foi o que aconteceu no primeiro teste real (27/set).
  //
  // Sessão continua vencendo: `contaDoPedido` lê dela primeiro.
  const s = quem(req);
  const eu = s || { conta_id: require('./_conta').contaDoPedido(req) };
  if (!eu.conta_id) return semSessao(res);

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
  ofertar, feed, vitrine, quero, filaDaOferta, minhasOfertas, reservar, desfazerReserva,
  assinarAviso, novidades,
  listas, solicitar, responder, sairOuRemover,
  agenda, bloquear, bloqueadas,
  verListasTransmissao, mexerNaLista, membrosDaLista,
  conversas, abrirConversa, mandarMensagem,
  grupos, abrirGrupo, mexerNoGrupo, mandarNoGrupo,
  rsb, quem,
};
