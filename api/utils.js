// Utilitários gratuitos: CEP (BrasilAPI), preços ML (Mercado Livre), ping
// Supabase, "quem é este aparelho", a mensagem de abordagem e a marca do site.
// Rota por ?type=cep | ?type=mercado | ?type=ping | ?type=quem | ?type=abordagem | ?type=marca

const { exigirChave, operadorDe, portaoLigado, comSessao } = require('./_auth');
const { MSG_ABORDAGEM, ANCORA } = require('./_abordagem');
const { marca, marcaDaConta, manifesto } = require('./_marca');
const { CNR } = require('./_conta');

const ML_CATEGORIA = 'MLB1744'; // Carros e Caminhonetes
const PRECO_MINIMO = 8000;

async function handleCep(cep, res) {
  const limpo = (cep || '').replace(/\D/g, '');
  if (limpo.length !== 8) return res.status(400).json({ error: 'CEP deve ter 8 dígitos' });
  const r = await fetch(`https://brasilapi.com.br/api/cep/v2/${limpo}`);
  const data = await r.json();
  if (!r.ok) return res.status(r.status).json({ error: data.message || 'CEP não encontrado' });
  return res.status(200).json({
    cep:        data.cep,
    logradouro: data.street       || '',
    bairro:     data.neighborhood || '',
    cidade:     data.city         || '',
    estado:     data.state        || '',
  });
}

async function handlePing(res) {
  const url = process.env.SUPABASE_URL;
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(500).json({ ok: false, error: 'Supabase não configurado.' });
  const r = await fetch(`${url}/rest/v1/veiculos?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  return res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status, at: new Date().toISOString() });
}

async function handleMercado(q, res) {
  if (!q) return res.status(400).json({ error: 'q obrigatório' });
  const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(q)}&category=${ML_CATEGORIA}&limit=20`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`ML HTTP ${r.status}`);
  const data = await r.json();
  const precos = (data.results || [])
    .map(i => i.price)
    .filter(p => typeof p === 'number' && p >= PRECO_MINIMO)
    .sort((a, b) => a - b);
  if (!precos.length) return res.status(200).json({ found: false });
  return res.status(200).json({
    found: true,
    count: precos.length,
    min: precos[0],
    max: precos[precos.length - 1],
    med: precos[Math.floor(precos.length / 2)],
    searchUrl: `https://www.mercadolivre.com.br/jm/search?q=${encodeURIComponent(q)}&category=${ML_CATEGORIA}`,
  });
}

/**
 * É a loja DONA desta instalação que está pedindo?
 *
 * `contaDoPedido(req)` lê a sessão quando há uma; `contaDoPedido(null)`
 * ignora a sessão e devolve a conta configurada no ambiente — a casa.
 * Iguais quer dizer que quem pede é a casa, e não uma loja convidada.
 *
 * Vale igual no site do piloto, onde a casa é outra: a regra é "a dona
 * da instalação", não "a Carro na Rede".
 */
function podeConvidar(req) {
  try {
    const { contaDoPedido } = require('./_conta');
    return contaDoPedido(req) === contaDoPedido(null);
  } catch (e) {
    return false;   // sem conta resolvida, ninguém convida
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const type = req.query.type;

    // O ping fica ABERTO de propósito. Quem o chama é o cron da Vercel
    // (vercel.json, todo dia às 9h), e cron não manda cabeçalho nosso —
    // fechar aqui pararia o ping, e o Supabase pausa sozinho depois de ~7
    // dias parado no plano grátis. O ping lê um id e devolve {ok:true}:
    // não expõe nada e não gasta nada.
    if (type === 'ping')    return await handlePing(res);

    // A marca também fica aberta: é o que já está escrito na tela de quem
    // abre o site, e a tela de liberação precisa dela ANTES de o aparelho
    // ter chave. Não lê banco e não gasta nada.
    if (type === 'marca') {
      // ── NUNCA cache compartilhado aqui, nem quando não há sessão ─────
      // Descoberto testando em 27/set: a resposta sem sessão tinha sido
      // guardada como pública na borda da Vercel. O pedido seguinte, COM
      // sessão, recebeu a cópia guardada — a função nem foi chamada,
      // porque o cabeçalho de sessão não entra na chave do cache.
      //
      // Apareceu como "a marca da loja não aparece". O mesmo mecanismo,
      // com duas lojas, serve a marca de uma para a outra. Por isso a
      // regra é `no-store` SEMPRE, e não só quando há sessão: uma resposta
      // pública guardada antes envenena as seguintes.
      //
      // O custo é uma chamada por carregamento de página — que já
      // acontecia. E a tela não pisca porque `assets/marca.js` guarda a
      // última marca no próprio navegador.
      res.setHeader('Cache-Control', 'private, no-store');
      // Quem entrou traz a própria loja: a marca sai de `contas`, não da
      // variável de ambiente. É o que tira a necessidade de um site por
      // cliente — a sessão já separava os dados; faltava o logo no topo.
      await comSessao(req);
      if (req.cnrSessao) {
        try {
          const { contaDaSessao } = require('./_sessao');
          const conta = await contaDaSessao(req.cnrSessao.conta_id);
          if (conta) return res.status(200).json(marcaDaConta(conta, CNR));
        } catch (e) {
          // Banco fora ou coluna ainda não criada: cai na variável, que é
          // o comportamento de sempre. Marca é tela — não pode derrubar.
          console.error('[marca] não consegui ler a conta:', e.message);
        }
      }
      return res.status(200).json(marca());
    }
    if (type === 'manifesto') {
      res.setHeader('Content-Type', 'application/manifest+json');
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.status(200).send(JSON.stringify(manifesto()));
    }

    // ── Entrar por telefone (fase 1) ──────────────────────────────
    // Ficam ABERTAS, como o ping e a marca: quem está entrando ainda não
    // tem com que se identificar. Desenho e riscos em `FASE1-ENTRAR.md`.
    if (type === 'codigo' || type === 'sessao') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
      const { pedirCodigo, conferirCodigo, VIDA_CODIGO_MIN } = require('./_sessao');
      const corpo = req.body || {};
      const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null;

      if (type === 'codigo') {
        const r = await pedirCodigo(corpo.telefone, ip);
        if (!r.ok) return res.status(400).json({ error: 'Telefone inválido.', codigo: r.erro });
        // Resposta IGUAL para telefone cadastrado ou não, e para quando o
        // freio segurou o envio. Resposta diferente transformaria esta
        // rota numa lista de clientes: bastaria testar números.
        return res.status(200).json({
          ok: true,
          minutos: VIDA_CODIGO_MIN,
          // Só aparece quando o SMS está desligado (desenvolvimento), para
          // o código poder ser lido no registro do servidor.
          simulado: r.simulado === true || undefined,
        });
      }

      const r = await conferirCodigo(corpo.telefone, corpo.codigo, {
        ip,
        aparelho: req.headers['user-agent'],
      });
      if (!r.ok) {
        // Mensagem única para código errado, vencido, queimado ou telefone
        // desconhecido. Dizer qual dos quatro foi entrega informação a quem
        // está tentando adivinhar.
        return res.status(401).json({ error: 'Código inválido ou vencido.', codigo: 'codigo_invalido' });
      }
      return res.status(200).json({ ok: true, token: r.token, nome: r.nome });
    }

    // CEP e Mercado Livre são gratuitos, mas proxy aberto é proxy de todo
    // mundo — e o tráfego sai com o nome do projeto dele.
    await comSessao(req);        // sessão vale tanto quanto chave, se houver
    if (exigirChave(req, res)) return;

    // Quem é este aparelho, pela chave que ele mandou. Passou pelo portão
    // acima, então já tem acesso a tudo — o nome não conta nada novo a
    // ninguém.
    //
    // Existe porque em 08/set o Yuri cadastrou a chave da mãe sem o prefixo
    // do nome. A chave abria a porta normalmente, e não havia como descobrir
    // o engano até alguém marcar ENVIEI e o card sair com "operador 2".
    // A tela de liberação agora responde sozinha.
    if (type === 'quem') {
      return res.status(200).json({
        ok: true,
        operador:    operadorDe(req),        // null = chave legada ou portão desligado
        portaoLigado: portaoLigado(),
        // Quem entrou pelo telefone sabe de que loja é e o que pode fazer.
        // Null para quem entrou por chave — ela não diz nada disso.
        sessao: req.cnrSessao ? {
          nome:  req.cnrSessao.nome,
          papel: req.cnrSessao.papel,
        } : null,
        // A tela esconde o que não vai funcionar. Botão que aparece e
        // depois recusa é pior que botão que não aparece.
        podeConvidar: podeConvidar(req),
      });
    }

    // ── Modelo do anúncio, por loja ───────────────────────────────
    // GET devolve o modelo desta loja (nulo = usa o padrão do sistema).
    // POST grava. Fica aqui, e não num arquivo novo, porque o teto de 12
    // funções da Vercel segue cheio.
    if (type === 'modelo') {
      const { db } = require('./_db');
      const { contaDoPedido } = require('./_conta');
      const sb = db(contaDoPedido(req));

      if (req.method === 'GET') {
        const r = await sb('contas?select=modelo_anuncio&limit=1');
        if (!r.ok) {
          // Coluna ainda não criada (migration não rodada): responde
          // "sem modelo" em vez de derrubar a tela. Quem não tem modelo
          // usa o padrão, que é o texto de sempre.
          return res.status(200).json({ ok: true, modelo: null, aviso: 'sem_coluna' });
        }
        const linha = (await r.json())[0] || {};
        return res.status(200).json({ ok: true, modelo: linha.modelo_anuncio || null });
      }

      if (req.method === 'POST') {
        const texto = String((req.body || {}).modelo || '');
        // Vazio volta ao padrão do sistema — é como se desfaz, sem
        // precisar de um botão "restaurar" que ninguém acha.
        const valor = texto.trim() ? texto.slice(0, 4000) : null;
        const r = await sb('contas', {
          method: 'PATCH', body: JSON.stringify({ modelo_anuncio: valor }),
        });
        if (!r.ok) {
          return res.status(400).json({
            error: 'Não consegui salvar o modelo. A coluna pode não existir ainda.',
            codigo: 'sem_coluna',
          });
        }
        return res.status(200).json({ ok: true, modelo: valor });
      }

      return res.status(405).json({ error: 'Use GET ou POST.' });
    }

    // Abrir a própria sessão neste aparelho, usando a chave mestra.
    // Existe porque o SMS está desligado e, sem isto, a Rede não abre no
    // notebook de quem entrou pelo telefone só no celular — foi o que
    // aconteceu com o Yuri em 29/set.
    if (type === 'entrar-aqui') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
      // Já passou pelo portão acima. Quem tem a chave lê e escreve tudo
      // desta loja de qualquer forma; a sessão acrescenta identidade, não
      // acesso.
      const { sessaoDoDono } = require('./_sessao');
      const { contaDoPedido } = require('./_conta');
      const r = await sessaoDoDono(contaDoPedido(req), req.headers['user-agent']);
      if (!r.ok) {
        return res.status(400).json({
          error: 'Esta instalação ainda não tem dono cadastrado.', codigo: r.erro,
        });
      }
      return res.status(200).json({ ok: true, token: r.token, nome: r.nome });
    }

    // Convidar uma loja. Só quem já está dentro convida — a rota está
    // atrás do portão como todas, e isso basta hoje: o sistema tem um
    // dono. No dia em que houver loja de cliente, aqui entra "só o dono
    // da PRÓPRIA loja convida, e para a própria loja".
    if (type === 'convite') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
      // Só a loja DONA desta instalação convida. Quem foi convidado não
      // convida ninguém — por ora (decisão do Yuri, 29/set: "depois que
      // estiver tudo ok, disponibilizamos para os demais").
      //
      // `contaDoPedido(req)` lê a sessão; `contaDoPedido(null)` ignora a
      // sessão e devolve a conta da instalação. Iguais = é a casa.
      // Assim a regra vale igual no site do piloto, onde a casa é outra.
      if (!podeConvidar(req)) {
        return res.status(403).json({
          error: 'Só a loja desta instalação pode convidar.', codigo: 'nao_e_a_casa',
        });
      }
      const { convidarLoja } = require('./_sessao');
      const c = req.body || {};
      const r = await convidarLoja({
        loja: c.loja, pessoa: c.pessoa, telefone: c.telefone, esconder: c.esconder,
        tipo: c.tipo,
      });
      if (!r.ok) {
        return res.status(400).json({
          error: r.erro === 'telefone_em_uso'
            ? 'Esse telefone já está em outra loja.'
            : 'Informe o nome da loja e o nome da pessoa.',
          codigo: r.erro,
        });
      }
      // O link é montado aqui para o token nunca voltar solto e acabar
      // colado num lugar errado. O `#` mantém o token fora do registro
      // de acesso do servidor.
      const base = `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
      return res.status(201).json({
        ok: true, loja: r.loja, pessoa: r.pessoa,
        link: `${base}/entrar.html#sessao=${r.token}`,
      });
    }

    // Encerrar a sessão no servidor, não só sumir do navegador. Sair que
    // só apaga daqui deixa o token valendo para quem o tiver copiado.
    if (type === 'sair') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
      const { encerrarSessao } = require('./_sessao');
      await encerrarSessao(req);
      return res.status(200).json({ ok: true });
    }

    // Mensagem de abordagem. O servidor é a fonte; o Gerador e a extensão
    // perguntam. Antes o texto vivia nos dois, e mudá-lo exigia recarregar a
    // extensão em cada máquina — passo manual que falha em silêncio, porque a
    // máquina não recarregada segue mandando o texto velho.
    //
    // Na linha de venda cada cliente tem a própria mensagem: com o texto
    // dentro da extensão, seria um pacote por cliente.
    if (type === 'abordagem') {
      return res.status(200).json({ texto: MSG_ABORDAGEM, ancora: ANCORA });
    }

    if (type === 'cep')     return await handleCep(req.query.cep, res);
    if (type === 'mercado') return await handleMercado(req.query.q, res);
    return res.status(400).json({ error: 'type deve ser cep, mercado, ping, quem, abordagem ou marca' });
  } catch (err) {
    console.error('utils error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
