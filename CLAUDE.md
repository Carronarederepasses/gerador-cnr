# CLAUDE.md — Contexto do Projeto (ler sempre ao abrir a pasta)

> **Para o Claude:** Sempre que o Yuri abrir esta pasta, aja como o assistente de desenvolvimento dele neste projeto. Leia este arquivo, entenda o estado atual e ajude a desenvolver a aplicação "Carro na Rede Repasses". Fale em português brasileiro, de forma direta e sem enrolação. Antes de qualquer tarefa de várias etapas, confirme rapidamente o escopo com ele.
>
> **Ler também `IDEIAS.md` no início da sessão.** É onde o Yuri anota o que
> lhe ocorre fora da conversa. Não tratar como fila de trabalho nem começar
> nada por conta própria: mencionar o que há de novo e perguntar se é a hora.
> Quando uma ideia virar trabalho, movê-la para a seção "Já viraram trabalho"
> com a data e onde foi parar.
>
> **NÃO ler o `HISTORICO.md` no início da sessão.** São 7.190 linhas do
> diário do projeto — abrir aquilo por hábito custa ao Yuri o limite da
> semana, que é por que ele foi separado daqui em 04/out. Abrir só quando a
> pergunta for *por que isso foi decidido assim*, procurando o trecho em vez
> de ler o arquivo. O estado de hoje está na seção 12, logo abaixo.

---

> *"O CNR não aprende porque tem IA. O CNR tem IA porque aprendeu a registrar conhecimento."*
>
> *"Na Fase 1, não treinamos modelos. Treinamos os dados."*

---

## 1. O Negócio

**Nome:** Carro na Rede Repasses
**Instagram:** @carronarederepasses
**Responsável:** Yuri
**Região:** Garopaba, Praia da Rosa, Imbituba — Litoral de Santa Catarina

Intermediação de veículos (repasse), modelo **C2B**:
- Pessoa física traz o carro
- Carro na Rede conecta com rede de +200 compradores (dealers, revendas, investidores)
- Cobra taxa de intermediação sobre o negócio fechado
- Sem estoque próprio — 100% intermediação
- Tempo médio de venda ~48h

**Diferencial:** conhecimento profundo do mercado regional do litoral de SC, rede ativa de compradores, operação sem vitrine pública, velocidade.

**Elevator pitch:** "Carro na Rede Repasses é a ponte privada entre veículos certos e compradores certos, com velocidade de repasse e distribuição qualificada."

**Posicionamento de mercado:**
O Carro na Rede Repasses é uma operação de intermediação de veículos focada em conectar vendedores a uma rede qualificada de compradores profissionais. O CNR não compete como marketplace aberto nem como revenda de estoque próprio. Seu diferencial está na combinação entre relacionamento, inteligência operacional e distribuição direcionada. Cada veículo é analisado, estruturado e apresentado aos compradores com maior aderência ao seu perfil, reduzindo ruído, acelerando negociações e aumentando a probabilidade de fechamento. Na prática, o CNR transforma o processo de repasse em uma experiência privada, segmentada e orientada por dados.

**O que estamos construindo:**
O Gerador CNR deixou de ser apenas um gerador de anúncios. Hoje, ele evolui para um sistema operacional da operação de repasse. Sua função não é apenas registrar informações, mas ajudar a responder continuamente: **Qual é a próxima melhor ação?**
- Qual comprador devo contatar primeiro?
- Qual veículo merece atenção agora?
- Qual negociação está esfriando?
- Qual oportunidade não pode ser perdida?

**Princípio central:** O CNR não existe para distribuir anúncios. O CNR existe para distribuir oportunidades. O anúncio é apenas um dos formatos pelos quais uma oportunidade é apresentada.

**Ativo estratégico:** O principal ativo do CNR não é o software, nem o canal de comunicação. É o conhecimento acumulado sobre compradores, veículos, negociações, comportamento do mercado e resultados das decisões tomadas. Cada interação registrada torna o sistema mais capaz de recomendar a próxima ação correta.

**Visão de longo prazo:** O objetivo não é substituir WhatsApp, e-mail ou qualquer outro canal — os canais mudam, o conhecimento permanece. O CNR será a camada de inteligência que identifica a oportunidade certa e a entrega pelo canal mais adequado para cada comprador.

---

## 2. Identidade Visual

> **Regra permanente — escala de medidas (22/set/2026).** Canto, espaçamento e
> tamanho de letra saem da escala em `assets/tokens.css` (`--r*`, `--s-*`,
> `--fs-*`), nunca de número inventado na hora. Sempre com reserva —
> `var(--r-md, 12px)` — porque `entrar.html`, `instalar.html` e `artes.html`
> não carregam o tokens.css. Sem essa regra o app chegou a **23 cantos, 80
> tamanhos de letra e 216 espaçamentos** distintos, 131 deles usados uma vez
> só — é o que dá a sensação de "quase alinhado" entre telas e é uma das
> marcas de código gerado tela a tela.
>
> Os cantos foram normalizados em 22/set. **Letra e espaçamento continuam
> dispersos** e se corrigem quando a tela for tocada por outro motivo: em
> bloco, deslocam layout sem ganho que pague o risco.

- **Cores:** Preto e branco (identidade editorial)
- **Tipografia:** Playfair Display (serif) + DM Sans
- **Tom:** Premium, direto, sem enrolação
- **Logo:** "Carro na Rede" — canto inferior direito nos materiais

---

## 3. Stack Técnica

- **Frontend:** HTML/CSS/JS puro — multi-page app
- **Backend:** Vercel serverless (funções em `api/`)
- **Banco:** Supabase (PostgreSQL via PostgREST)
- **Storage:** Supabase Storage (bucket `veiculos`)
- **IA:** OpenRouter via Vercel API Route (chave em env var — NUNCA no código)
- **Hospedagem:** Vercel — deploy automático a cada push no GitHub
- **API FIPE:** `parallelum.com.br/fipe/api/v1` (gratuita, sem chave, com CORS)

> **Segurança:** chaves NUNCA vão no código. Somente em variáveis de ambiente no painel do Vercel. Quem digita é o Yuri.

### Funções serverless deployadas no Vercel — `api/`
`api/`: catalogo.js, compradores.js, consulta.js, fetch-anuncio.js, fipe-search.js, fipe.js, ia-compor.js, parse.js, placa.js, remove-bg.js, utils.js, vendas.js

> Total: 12 funções. Limite do plano Hobby é 12 — não adicionar novas funções sem antes fundir em uma existente via query param.
> `fipe.js` já absorveu o modo anos/versões: `?marca=<codigo>&base=<modelo_base>` → retorna anos e versões disponíveis (usado em vendas.html cascata FIPE).

Novas features de backend devem reutilizar funções existentes via query params (ex: `?neg=1`, `?foto=1`, `?evento=1`, `?match=1`).

> **Motor de Match — regra arquitetural:** `calcScore` reside **exclusivamente** em `api/compradores.js`. Não recriar esta função no frontend — a duplicação gerava divergência silenciosa de resultados (identificada e corrigida na Reforma 21).

> **Arquivos locais não deployados (não commitar sem revisão):**
> - `api/ping.js` — duplicata morta de `utils.js?type=ping`; o cron do vercel.json bate em `/api/utils?type=ping`
> - `netlify/functions/` — resquícios da migração Netlify→Vercel; formato incompatível com Vercel (Netlify handler). Harmlessos, Vercel ignora.

> **⚠️ Regra permanente — `VENDAS_KEY`:** É uma variável de ambiente da Vercel que protege as operações de escrita da API (`api/vendas.js`). **Não é uma senha de acesso à interface.** `vendas.html` abre diretamente, sem portão visual. O frontend lê `KEY` do `localStorage` (chave `cnr_vendas_key`, sem valor padrão) e envia o header `x-cnr-key` silenciosamente nas chamadas POST/PATCH/DELETE. O usuário nunca digita a chave durante o uso normal. **Configuração inicial (uma única vez por navegador/dispositivo):** executar `localStorage.setItem('cnr_vendas_key', 'VALOR')` no console do DevTools da página em produção — a chave persiste indefinidamente sem repetir a etapa. O valor da `VENDAS_KEY` existe somente no painel da Vercel — nunca registrar em código, Git ou documentação.

---

## 4. Páginas do Sistema

| Página | Descrição |
|---|---|
| `parceiros.html` | **A tela do dia a dia.** Carro vindo de loja parceira: cola o anúncio (texto, link ou print + laudo) e a IA preenche 16 dos 20 campos. Busca FIPE automática, com escolha por preço. `*GASTOS:*` sai no texto do WhatsApp. Botão 📸 Foto. **Não** mostra "Salvar no catálogo" — carro de parceiro não é estoque (decisão do Yuri, 03/set) |
| `captacao.html` | Carro captado pelo Yuri. Formulário completo, abas **Anúncio / Fotos / Checklist**; busca por placa (APiBrasil) preenchendo a cascata FIPE, o RENAVAM e o `emplacado_em`; AVALIAÇÃO e GASTOS no texto do WhatsApp; `salvarNoCatalogo()` faz PATCH quando o veículo já existe, sem duplicar |
| `index.html` | **Só redirecionamento** para `/home.html` desde 08/set/2026. Era o Gerador inteiro — uma tela com duas abas por dentro — e virou as duas telas acima. Continua existindo porque o favorito do Yuri aponta para cá |
| `home.html` | Dashboard: pipeline, KPIs, carros parados, negociações ativas, relatório mensal, histórico 12 meses |
| `catalogo.html` | Catálogo de veículos: fotos, avaliação estruturada com score por categoria, valor_compra + margem, dias em estoque, RENAVAM no card quando disponível; avaliação da captação e gastos no card (ellipsis + "ver mais"); **Match Ativo 2.0:** oferta com 1 clique (abre WA + registra evento + cria negociação automaticamente), chips de resultado (Interessado / Recusou / Não respondeu + sub-chips de motivo), "Não adequado" antes de ofertar; Motor de Match recolhível, fechado por padrão; deep link `?id=<uuid>` rola e destaca o card. **Reforma Visual Etapa 1 (13/ago):** nome do veículo maior (1.25rem), fotos maiores (90px), Registrar Venda em linha própria (destaque visual), botão recolhido exibe teaser "· Comprador Score%" do top match, badge ★ #1 no melhor comprador, Ofertar como CTA verde sólido (primeiro nos botões), placa/RENAVAM com menos dominância visual. `renderMatch()` refatorado para retornar `{html, top}` eliminando dupla chamada de `calcScore`. |
| `negociacoes.html` | CRM de negociações: motivo do match, motivo do descarte (tap), contrato PDF, link para registrar venda |
| `vendas.html` | Registro de vendas + entrada rápida de histórico (⚡), CSV, pré-preenchimento vindo das negociações. **Acesso direto, sem portão de senha.** A `VENDAS_KEY` protege a API (POST/PATCH/DELETE) via header `x-cnr-key`; o frontend a envia silenciosamente — o usuário nunca precisa digitá-la. Não reimplementar portão visual sem aprovação explícita. |
| `compradores.html` | CRM: histórico de compras, taxa acumulada, Motor de Match automático, ranking |
| `busca.html` | Busca global: catálogo, vendas, negociações, compradores |
| `consultas.html` | Histórico veicular por placa (APiBrasil) |
| `foto.html` | Editor de foto: remove fundo + composição padrão CNR |

---

## 5. Banco de Dados (Supabase)

### Tabelas principais
- `veiculos` — ficha técnica, fotos (JSONB), avaliação (JSONB com scores por categoria), valor_compra, gastos (text), gastos_valor (numeric), vendedor_nome, vendedor_telefone, renavam, status
- `vendas` — registro de vendas fechadas, taxa_intermediacao, comprador, anexos
- `negociacoes` — lifecycle de negociações, motivo_match, motivo_descarte, historico (JSONB), valor_proposto, veiculo_id
- `compradores` — CRM: nome, telefone, tags, preferências
- `eventos` — log imutável de tudo (event sourcing)

### Estrutura de `veiculos.avaliacao` (JSONB)

O campo `avaliacao` em `veiculos` é um JSONB com chaves distintas por origem. Nunca sobrescrever uma chave sem incluir as demais no mesmo PATCH — PostgREST substitui o campo inteiro.

| Chave | Origem | Descrição |
|---|---|---|
| `inspecao` | `index.html` — Captação/Anúncio | Texto livre de inspeção comercial digitado pelo Yuri antes de cadastrar |
| `nota` | `catalogo.html` — Checklist | Nota global da avaliação estruturada (`acima` / `media` / `abaixo`) |
| `scores` | `catalogo.html` — Checklist | Scores numéricos por categoria (documentação, lataria, mecânica, etc.) |
| `resultado` | `catalogo.html` — Checklist | Estado de cada item do checklist (`{ sec: { item: { status, sub, foto } } }`) |
| `data` | Qualquer save do Checklist | ISO 8601 da **primeira** avaliação; preservado em edições subsequentes |

### Regras de persistência de campos especiais em `veiculos`

- **`renavam`** — nunca enviar `null` no PATCH. A correção está na origem: `coletarFichaVeiculo()` e `autoSalvarParceiros()` em `index.html` usam spread condicional `...(val ? { renavam: val } : {})`. Se o campo `#renavam` estiver vazio, `renavam` simplesmente não entra no payload e o PostgREST não toca a coluna. A APiBrasil preenche o campo automaticamente quando disponível; se não retornar, o campo preserva o valor existente ou pode ser digitado manualmente.
- **`avaliacao`** (JSONB) — o PATCH em `api/catalogo.js` faz GET do valor existente e shallow-merge antes de gravar, evitando que uma chave sobrescreva as demais. Nunca enviar `avaliacao` diretamente sem passar pela API.
- **`valor_compra`, `gastos_valor`, `vendedor_nome`, `vendedor_telefone`** — coletados em `coletarFichaVeiculo()` (Captação 2.0), presentes no whitelist `CAMPOS` de `api/catalogo.js` e no `CAMPOS_SIMPLES` do localStorage. `gastos` (textarea de descrição textual) e `gastos_valor` (campo numérico para margem) são campos separados e independentes — nunca fundi-los.

> **⚠️ Regra permanente — campo `#gastos` (GASTOS - DESCRIÇÃO):** Este campo é **descritivo de serviços necessários no veículo** ("pintar capô, colocar pneus, trocar lanterna"). **Não é campo financeiro.** Deve aparecer no texto WA gerado pela aba Parceiros (`gerarColetados`) para que o revendedor saiba o que precisa ser feito no carro. Não deve aparecer na Captação (`montarTextoAnuncio`), pois lá é informação interna da operação. Nunca remover do `gerarColetados` em futuras reformas sem aprovação explícita.

### Lógica de save sem duplicata em `salvarNoCatalogo()`
- Se `_catalogoId` existe (veículo criado pelo auto-save de `gerar()`) → faz **PATCH** no mesmo ID
- Se não existe → faz **POST**, captura `veiculoId` da resposta
- Após o save: sincroniza `_catalogoId` e `catalogoId` (abas Fotos e Checklist continuam no mesmo veículo)
- Exibe painel pós-save com link `/catalogo.html?id=<uuid>` e botão "Captar outro"
- `iniciarNovaCaptacao()` limpa apenas localStorage + variáveis JS — não apaga o banco

### Status válidos em negociacoes
`primeiro-contato` | `respondeu` | `negociando` | `aguardando` | **`reservado`** | `comprado` | `descartado`

> `reservado` estava faltando nesta lista e **existe na tela desde antes** —
> filtro, opção no modal e cor própria. A omissão me levou a construir a
> "venda em andamento" no lugar errado em 16/set. **É o status do carro
> travado por sinal**, e o fluxo pretendido (§9.1) sempre foi
> `negociando → reservado → comprado`.
>
> O sinal mora em `negociacoes.valor_sinal` / `sinal_em` (17/set) e viaja para
> `vendas` na conversão. **Venda que não fechou não é venda** — a tabela
> `vendas` alimenta relatório, KPIs, CSV e o espelho no Google Sheets.

### Motivos estruturados (reason codes)
**Descarte:** `PRECO_ALTO` | `NAO_E_O_PERFIL` | `SEM_MERCADO` | `DOCUMENTO` | `VENDEU_POR_FORA` | `OUTRO`
**Match:** `HISTORICO_PERFIL` | `PAGA_RAPIDO` | `CLIENTE_RECORRENTE` | `MELHOR_MARGEM` | `INTUICAO`

---

## 6. Visão Estratégica (fase atual: Ferramenta → Copiloto)

O ativo real não é o software — é a **capacidade de transformar operação em conhecimento reutilizável**. O dataset é o registro. O processo que o gera é o diferencial.

**Evolução do sistema em 3 fases:**
- **Fase 1 — Registrar conhecimento** ✅ 112 vendas reais, compradores com perfil, catálogo estruturado
- **Fase 2 — Usar o conhecimento para ajudar o Yuri a decidir** 🔄 Match Ativo 2.0 em produção desde 05/08/2026 — validação em andamento (≥5 veículos + resultados registrados para fechar a Sprint 1)
- **Fase 3 — Entregar valor diretamente ao comprador** 🔜 Vitrine Pessoal — link único por comprador, sem login, sem app, atualizado automaticamente pelo Motor de Match

**Vitrine Pessoal (próxima evolução — não construir antes de validar Sprint 1):**
Cada comprador recebe um link permanente (`cnr.com.br/u/ABC123`). Ao abrir, vê apenas os carros compatíveis com seu perfil, ordenados por score de match. Sem login, sem app, sem mudança de hábito. O WhatsApp continua como ativador ("Tem novidade — veja aqui"). O link é o destino. O CNR aprende com quem abriu, quem visualizou, quem clicou.

**Meta-princípio (Calibração):** A Constituição existe para servir à realidade, não para substituí-la. Quando a operação mostrar, de forma consistente, que um princípio precisa evoluir, evolua o princípio. A única coisa imutável é o compromisso de aprender com a realidade.

---

**Princípio norteador:** cada funcionalidade deve responder 5 perguntas:
1. O que aconteceu? (evento)
2. Qual foi o resultado? (output)
3. Por que essa decisão foi tomada? (contexto)
4. O sistema consegue aprender com isso? (aprendizado)
5. Que capacidade esse dado desbloqueia? (alavancagem)

Se uma feature responde só 1 e 2, ela registra operação. Se responde as 5, ela constrói inteligência.

**Princípio da Estrutura Emergente:** nenhum dado deve virar campo estruturado porque parece importante. Ele vira campo estruturado quando sua ausência começa a limitar a inteligência do sistema. O gatilho não é volume — é fricção. Texto livre primeiro. Estrutura depois, e só quando a realidade exigir.

**Princípio do Sprint:** "O que o sistema saberá fazer depois desta sprint que hoje só o Yuri sabe?" E cada Sprint responde uma única pergunta mensurável — só é considerada concluída quando essa pergunta puder ser respondida com dados reais, não com opiniões.

**Princípio do Timing:** "Nenhuma melhoria de arquitetura vale mais do que dados reais entrando no sistema."

**Princípio da Instrumentação:** "Instrumentação antes de inteligência. Antes de IA, ML, dashboards ou otimizações — a pergunta é: estamos registrando os dados necessários para aprender? Se a resposta for não, não adianta sofisticar."

**Princípio da Abstração:** "Toda abstração deve nascer de um caso real, nunca de uma hipótese." (complementa a Estrutura Emergente: um fala sobre dados, o outro sobre código e arquitetura.)

**Regra de fechamento de sprint:** "Toda decisão estratégica do CNR deve terminar em uma ação operacional que aumente a qualidade do dataset." Princípio sem ação é filosofia. Ação sem princípio é ruído. A ponte entre os dois é o que faz o flywheel girar.

**Ciclo de Aprendizado do CNR** (como o projeto evolui sem perder coerência):
```
Observação do mundo real → Princípio → Decisão de produto
→ Implementação → Uso pelo Yuri → Novos dados
→ Conhecimento → Novo princípio (quando necessário) → [volta ao início]
```
O último passo sempre volta para o primeiro. É um ciclo vivo.

**Critério de saída da Fase 1 (Ferramenta):** 30+ transações reais no banco com dados completos.
**Critério de entrada na Fase 2 (Copiloto):** Motor de Match acertando comprador certo em ≥60% dos casos.

---

## 7. Próximos Passos

### Prioritário agora
- [ ] **Completar validação da Sprint 1 — Match Ativo**: usar em ≥5 veículos, registrar todos os resultados (chips pós-oferta), calcular taxa de acerto Top 1 e Top 3. Ver `SPRINT_1_MATCH_ATIVO.md`.
- [ ] **Preencher perfis dos compradores** — marcas, faixa de preço e "O que sabemos" em compradores.html. Dados ricos melhoram diretamente o score do Match.
- [ ] **Retroalimentar histórico** — meta é 30+ transações reais com dados completos.
- [ ] **Reforma Visual Etapa 2** — melhorias de UX/UI em `index.html` (Captação). Escopo definido, não iniciado. Iniciar somente após validar Sprint 1.

### Concluído recentemente (30/ago/2026)
- [x] **Fix 43.3 — sincronizar seen da extensão ao marcar ENVIEI**: `avancar(id,'enviado')` em `anuncios.html` passava a atualizar o Supabase mas deixava `seen['olx:LISTING_ID'].status = 'preparado'` na extensão — fazendo `CHECK_ENVIADO` retornar `{enviado:false}` e o monitor parar. Fix: após PATCH Supabase bem-sucedido, `avancar()` dispara `window.postMessage({cnr_type:'CNR_CONFIRMAR_ENVIO', key})`. `cnr-bridge.js` recebe e encaminha `{type:'CONFIRMAR_ENVIO', key, sent:true}` ao SW, que já tinha `confirmarEnvio()` para fazer `seen[key].status = 'enviado'`. Fire-and-forget — falha da extensão não afeta o Gerador. Commits: extensão `83a82f3`, gerador `ffcede9`.

- [x] **Fix 43.2b — aceitar list-id diretamente (chat-id como fallback)**: a OLX não redireciona `?list-id=` para `?chat-id=` no fluxo real — o Fix 43.2 havia quebrado o monitor ao exigir `chat-id` obrigatório. Correção mínima em `olx-chat-monitor.js`: Caminho A (principal) tenta `?list-id=` primeiro e usa o valor diretamente sem consultar o SW; Caminho B (fallback) usa `?chat-id=` + `GET_LISTING_BY_CHAT_ID` (infraestrutura da 43.2, preservada). Função `prosseguir()` unifica o `CHECK_ENVIADO → iniciarMonitor()` entre os dois caminhos. `sw.js` intocado. Commit extensão: `9b649e4`.

### Concluído recentemente (28/ago/2026 — noite III)
- [x] **Reforma 43.2 — Fix listing_id via chat-id map (OLX redirect)**: corrige a causa raiz por que mensagens não apareciam no Supabase — a OLX redireciona `?list-id=<id>` → `?chat-id=<opaque>` antes de `document_idle`, fazendo `olx-chat-monitor.js` sair silenciosamente. Solução: durante ABORDAR (`tabs.onUpdated`), o SW extrai `chat-id` da URL final e chama `salvarChatIdMap()`, que persiste `{ listing_id, platform, saved_at }` no `chrome.storage.local['chat_id_map']`. O content script agora lê `?chat-id=`, envia `GET_LISTING_BY_CHAT_ID` ao SW e só prossegue se receber `listing_id`. Novo handler no listeners block do SW. Logs `[CNR DEBUG 43.2]` nos três pontos críticos. Inclui também a instrumentação diagnóstica `[CNR DEBUG 43.1]` (três pontos de log em `sw.js`, `olx-chat-monitor.js` e `fetch-anuncio.js`). Commit extensão: `b79e4c3`.

### Concluído recentemente (28/ago/2026 — noite II)
- [x] **Reforma 43 — Fundação da Inbox OLX**: extensão agora captura o texto da mensagem do vendedor ao detectar resposta. `olx-chat-monitor.js`: `extrairConteudo(el)` extrai `textContent` (≤500 chars); `registrarResposta(conteudo)` inclui conteúdo no evento `RESPOSTA_DETECTADA`. `sw.js`: `respostaDetectada()` aceita `conteudo` e chama `persistirMensagem()` (fire-and-forget, mesmo padrão de `patchRespondeuNoGerador`). `fetch-anuncio.js`: novo modo `?mensagens=1` — GET lista mensagens por `listing_id`; POST insere com dedup por `msg_hash` (SHA-256 de `listing_id:direction:content`). Tabela `olx_mensagens` no Supabase: `supabase/reforma-43-olx-mensagens.sql` (**Yuri deve rodar no dashboard**). Nenhum fluxo da Reforma 42 tocado. Commits: extensão `f673cfa`, gerador `4de851d`.

### Concluído recentemente (28/ago/2026 — noite)
- [x] **Fix 42b — Guard bridge órfão**: `cnr-bridge.js` ganhava `TypeError: Cannot read properties of undefined (reading 'sendMessage')` quando a extensão era recarregada com a aba do Gerador já aberta (content script órfão: `chrome.runtime` vira `undefined`). Fix mínimo: guard `if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;` logo após checagem de `cnr_type`, antes de qualquer `sendMessage`. Falha silenciosa — Yuri recarrega a aba e tudo volta ao normal. Commit extensão `594deb1`.

### Concluído recentemente (28/ago/2026 — tarde)
- [x] **Reforma 42 — Detecção automática de resposta OLX**: extensão detecta quando o vendedor responde no Chat OLX enquanto Yuri usa normalmente. `olx-chat-monitor.js` (novo content script em `chat.olx.com.br`): MutationObserver + varredura inicial após 3s, 3 heurísticas (classes, data-testid, posição geométrica). SW: `auto_responded` com TTL 24h, PATCH no Supabase via `listing_id`. Gerador: badge `🔥 RESPOSTA NOVA` pulsante nos cards. Yuri não precisa mais marcar RESPONDEU manualmente. Commits: extensão `80abf79`, gerador `5f7bf8c`.

### Concluído recentemente (28/ago/2026)
- [x] **Reforma 41 — Elo enviado→respondeu/morto**: cards `enviado` em `anuncios.html` exibem `💬 RESPONDEU` (PATCH direto para `status=respondeu` sem modal, sem formulário) e `☠️ MORTO` (modal leve de chips existente — motivo opcional). Nenhum campo de data/hora/motivo obrigatório. Commit `506bdce`. Loop Catafrango fechado: novo→enviado→respondeu/morto.

### Concluído recentemente (27/ago/2026 — tarde)
- [x] **Reforma 40 — Mesa de Cata**: `anuncios.html` transformado em mesa de turno operacional. Botão `💬 ABORDAR` aciona a extensão via bridge `window.postMessage → cnr-bridge.js → sw.js:abordar()`. Botão `✅ ENVIEI` separado (ABORDAR≠ENVIADO). Barra de métricas, filtro "Fila do dia", chip HOJE. Nova mensagem de abordagem em `olx-chat.js`. Bridge `cnr-bridge.js` novo na extensão. Commits: gerador `283ce52`, extensão `8b5fb09`. Vercel deploy automático.

### Concluído recentemente (semana de 25–27/ago/2026)
- [x] **Reforma 38 — Catafrango Thumbnails** (extensão + gerador): captura de foto da OLX de ponta a ponta. `olx-search.js`: `querySelectorAll('img')` + prioridade `img.olx.com.br/thumbs` para evitar capturar badge de loja verificada. `fetch-anuncio.js`: upsert em dois grupos (com/sem thumbnail) para não sobrescrever fotos válidas existentes. `on_conflict=origem,listing_id` + deduplicação por Map no lote. 110 anúncios capturados, validado em produção — commits `3e7e792` (gerador), `5bd16de` + `ed22846` (extensão)
- [x] **Reforma 39 — anuncios.html thumbnails funcionais**: diagnóstico completo da CDN OLX → lazy loading via `IntersectionObserver` (`rootMargin:200px`) + correção de bloqueio por `Referer`. Causa raiz confirmada por teste A/B: sem `referrerPolicy` → 2/10 LOAD; com `referrerPolicy='no-referrer'` → 10/10 LOAD. Fix: `referrerpolicy="no-referrer"` no `<img>` em `cardHTML()` + `img.referrerPolicy='no-referrer'` em `_carregarThumb()` antes de definir `img.src`. Validado em produção (notebook + celular) — commits `ad1fd86` + `9cea50c`

### Concluído recentemente (semana de 12–13/ago/2026)
- [x] Reforma 13: `MOTOR_VERSAO = '2.0'`; `motivo_codigo` estruturado no evento `match_nao_adequado`; `preco_fecharia` em recusas; `versao_motor` no payload — commit `777c378`
- [x] Reforma 14: Central de Distribuição (fila de compradores, pular sem registrar, oferta em lote); reversal da Reforma 13 (motivo e preço voltaram a ser diretos, sem form); `_registrarOferta()` extraído como helper compartilhado — commit `e8eb898`
- [x] Fix Central: `_ofertadosNaSessao` (Set em memória) evita reoferta sem reload; isolamento por veículo via chave composta `veiculoId:compradorId` — commit `7ba3d94`
- [x] Reforma 15: loop Oferta → Negociação → Venda fechado; `irParaVenda()` em negociacoes.html passa `veiculo_id` e `comprador_id` pela URL; `vendas.html` lê os IDs, popula campos ocultos e inclui no evento `venda_registrada` — commit `2710207`
- [x] Reforma 16: `buscarPlacaGerador()` em index.html exibe aviso amarelo quando APiBrasil não retorna `fipe.marca`, evitando anúncio gerado sem nome do veículo — commit `477b4dd`
- [x] Reforma 16b: ofertas pendentes persistem via localStorage (`cnr_ofertas_pendentes`); `_addPendente`/`_removePendente`/`_isPendente`; card mostra chips de resultado até resultado registrado, mesmo após reload — commit `b056d39`
- [x] Reforma Visual Etapa 1 (catalogo.html): card h3 1.25rem; fotos 90px; Registrar Venda linha própria (order:-1, flex-basis:100%); teaser do top comprador no botão recolhido; badge ★ #1; Ofertar como CTA verde sólido; placa/RENAVAM menos dominantes; `renderMatch()` refatorado para `{html, top}` — commit `6b548f7`
- [x] Reforma 20c: campo Valor Proposto em negociacoes.html exibe sempre 2 casas decimais no padrão pt-BR; sem tocar em `parseBRv`, banco ou regra de negócio
- [x] Auditoria Arquitetural: relatório com 4 achados (2 críticos → corrigidos na Reforma 21; 2 amarelos → aceitos como trade-off consciente da fase atual)
- [x] Reforma 21: `calcScore` fonte única em `api/compradores.js`; `toggleMatch`/`abrirCentral` viram async consumindo `?match=1`; endpoint `?limpar=1` removido permanentemente de `api/vendas.js` — commit `8307589`
- [x] Reforma 22 (Visual): overflow dos valores nos cards corrigido com `.card{overflow:hidden}` + `.precos{flex-wrap:wrap}` + refinamentos de toque/responsividade; CSS-only, zero toque em lógica — commit `9a4ef1e`
- [x] Reforma 23: corrige bug de status + `VENDAS_KEY` configurada na Vercel como env var; `api/vendas.js` protege POST/PATCH/DELETE via header `x-cnr-key`; gitignore atualizado — commit `8a20d05`
- [x] Decisão definitiva `vendas.html` (16/ago/2026): acesso direto ao módulo, sem portão visual. `VENDAS_KEY` é credencial de bastidores da API, não senha de interface. Portão visual foi implementado (`5666eb1`) e removido (`9badd40`) na mesma sessão. Estado final e correto: commit `9badd40`, em produção na Vercel.

### Concluído anteriormente
- [x] Captação 2.0: vendedor, valor_compra, gastos_valor, margem estimada, pós-save com deep link — commit `c5efbb6`
- [x] Match Ativo 2.0: oferta 1 clique + negociação automática + chips de resultado — commit `bbc5454`
- [x] Fix Match: normMarca unifica VW-VolksWagen ↔ Volkswagen — commit `ee0a477`
- [x] RENAVAM: campo manual, auto-preenchimento APiBrasil, exibição no catálogo — commits `49282d8`, `fe18726`
- [x] catalogo.html: avaliação/gastos no card, match recolhível — commit `b4712d0`

### Médio prazo (após Sprint 1 encerrada)
- [ ] Ajuste de pesos/algoritmo do Motor de Match com base nos resultados da Sprint 1
- [ ] Sugestão de preço baseada em transações similares
- [ ] Alerta de timing: "esse perfil de carro costuma vender em X dias"
- [ ] Vitrine Pessoal — link único por comprador (Fase 3)

### Histórico de Reformas (agosto/2026)

| Reforma | Descrição | Commit |
|---|---|---|
| 1–3 | Scores do checklist preservados; campo `gastos` no banco; data da primeira avaliação | `bfff583` |
| 4 | RENAVAM: coluna no banco, captura via APiBrasil na variável `placaRenavam` | `242467f` |
| 5 | `avaliacao.inspecao` persistido a partir da Captação (index.html) | `1e629d8` |
| 6 | Modal do catálogo ampliado; seção "Avaliação da Captação" exibida | `f72d18b` |
| 6b | Fix: PATCH de `avaliacao` faz merge na API para não perder nota/scores | `b290aa3` |
| 7 | Fix crítico: colisão de nomes `salvarNoCatalogo` → renomeada para `autoSalvarParceiros` | `10c2b41` |
| 8 | catalogo.html: avaliação da captação e gastos no card; match recolhível | `b4712d0` |
| 9 | RENAVAM: campo manual na Captação, auto-preenchimento sem apagar valor existente, persistência no localStorage, `placaRenavam` removida | `49282d8` |
| 9b | RENAVAM exibido no card do catálogo abaixo da placa | `fe18726` |
| 10 | Fix Match Ativo: `normMarca()` unifica "VW - VolksWagen" ↔ "Volkswagen" nos 6 pontos de comparação (catalogo.html + api/compradores.js) | `ee0a477` |
| 11 | Captação 2.0: `#vendedor-nome`, `#vendedor-telefone`, `#valor-compra`, `#gastos-valor`, margem estimada em tempo real; AVALIAÇÃO removida do texto WA; GASTOS removido do texto WA (**remoção incorreta em `gerarColetados` — corrigido na Reforma 17**); `salvarNoCatalogo()` PATCH sem duplicata; painel pós-save com deep link | `c5efbb6` |
| 12 | Match Ativo 2.0: ação única WA (abre WA + registra match_notificado + cria negociação em background); `veiculo_id` em negociações; chips de resultado lazy; proteção contra duplo-clique | `bbc5454` |
| 13 | `MOTOR_VERSAO = '2.0'`; motivo_codigo estruturado no naoAdequado; preco_fecharia em recusas | `777c378` |
| 14 | Central de Distribuição: fila de compradores ordenada por score, oferta em lote, pular sem registrar; `_registrarOferta()` helper compartilhado; reversal Reforma 13 (motivo/preço diretos novamente) | `e8eb898` |
| 14b | Fix Central: `_ofertadosNaSessao` (Set em memória de sessão) exclui reofertados sem reload; chave composta `veiculoId:compradorId` isola por veículo | `7ba3d94` |
| 15 | Loop rastreável Oferta → Negociação → Venda: `irParaVenda()` passa `veiculo_id`+`comprador_id` pela URL; vendas.html lê IDs via `lerParams()` e inclui no evento `venda_registrada` | `2710207` |
| 16 | Fix `buscarPlacaGerador()`: quando APiBrasil não retorna `fipe.marca`, exibe aviso amarelo explícito em vez de gerar anúncio silenciosamente incompleto | `477b4dd` |
| 16b | Ofertas pendentes persistem via localStorage (`cnr_ofertas_pendentes`); helpers `_addPendente`/`_removePendente`/`_isPendente`; card mostra chips de resultado (não botão Ofertar) até resultado registrado, mesmo após reload | `b056d39` |
| Visual E1 | Reforma Visual Etapa 1 — catalogo.html: hierarquia do card melhorada (nome maior, repasse dominante, fotos maiores, placa/RENAVAM discretos); Registrar Venda linha própria; Match: teaser no botão recolhido, badge ★ #1, Ofertar CTA verde sólido; `renderMatch()` retorna `{html, top}` (calcScore executado uma única vez por card) | `6b548f7` |
| 20c | negociacoes.html: campo Valor Proposto exibe sempre 2 casas decimais no padrão pt-BR; sem alterar `parseBRv`, banco ou qualquer regra de negócio | — |
| 21 | Motor de Match — fonte única de verdade: `calcScore` removido de catalogo.html, reside exclusivamente em `api/compradores.js`; `toggleMatch` e `abrirCentral` viram async consumindo `/api/compradores?match=1`; endpoint `?limpar=1` removido permanentemente de `api/vendas.js` (DELETE em massa eliminado) | `8307589` |
| 22 | Reforma Visual — correção de overflow dos valores nos cards: `.card{overflow:hidden}` + `.precos{flex-wrap:wrap;gap:.55rem .9rem}` + refinamentos de toque e responsividade; CSS-only, zero alteração de lógica, JS ou API | `9a4ef1e` |
| 23 | VENDAS_KEY: `api/vendas.js` protege POST/PATCH/DELETE com header `x-cnr-key`; gitignore atualizado; `vendas.html` com acesso direto (sem portão visual) | `8a20d05` + `9badd40` |
| 26 | `irParaVenda` async em `negociacoes.html`: busca `/api/catalogo?id=` antes de navegar para `vendas.html`, passa todos os campos do veículo via URL params; `vendas.html` lê mais campos em `iniciarApp` | `23c3fca` |
| 27 | Módulo "Compradores" → "Clientes": sidebar, KPIs, badges, toasts, empty state, botão e filtro atualizados; `tipo` select reduzido a 4 opções (Lojista/Repassador/Investidor/Particular); DB preservado | `b19625b` |
| 28 | Reorganização completa da ficha cadastral de Clientes: 8 seções com emoji, Tipo de cliente primeiro, campos condicionais por tipo, label Nome/Nome fantasia dinâmico, Proprietário só para Lojista e Repassador, campo cidade duplicado removido, nenhum campo obrigatório | `83476c4` |
| 29 | Máscaras de CPF (`XXX.XXX.XXX-XX`), CNPJ (`XX.XXX.XXX/XXXX-XX`) e Telefone (`(XX) XXXXX-XXXX`) em `compradores.html`: formatação progressiva no oninput, aplicada no load do modal; `salvar()` normaliza para dígitos puros antes de enviar ao banco; helpers `fmtCPF`/`fmtCNPJ`/`fmtTel` para exibição em `copiarDadosBancarios()`; `escolherContato()` aplica máscara após importar | `97139e8` |
| 30 | Auto-preenchimento CRM formatado em `vendas.html`: adiciona `fmtTelV()`/`fmtDocV()` (espelha compradores.html); `selecionarCRM` e `selecionarVendedor` formatam telefone e CPF/CNPJ ao preencher (banco armazena dígitos puros desde Reforma 29); `selecionarVendedor` alinha strip do estado na cidade com comprador; dropdown CRM exibe telefone formatado e cidade; histórico também exibe CPF/tel formatados | `3b3c5b6` |
| 38 | Catafrango Thumbnails: `olx-search.js` captura URL da foto via `querySelectorAll('img')` priorizando `img.olx.com.br/thumbs` (evita badge de loja verificada); `fetch-anuncio.js` upsert dois grupos (com/sem thumbnail), `on_conflict=origem,listing_id`, deduplicação por Map. Fluxo OLX→extensão→API→Supabase validado em produção com 110 anúncios | `3e7e792` (gerador), `5bd16de`+`ed22846` (extensão) |
| 39 | anuncios.html thumbnails: `IntersectionObserver` lazy loading (`rootMargin:200px`) + `referrerpolicy="no-referrer"` em `cardHTML()` e `img.referrerPolicy='no-referrer'` em `_carregarThumb()`. Causa raiz: CDN OLX hotlink protection por Referer — bloqueava requests de `gerador-cnr.vercel.app` após 2 concorrentes. Diagnóstico via teste A/B (sem/com no-referrer: 2/10 vs 10/10 LOAD). Validado em produção (notebook + celular) | `ad1fd86`+`9cea50c` |
| 40 | Mesa de Cata — `anuncios.html`: botão `💬 ABORDAR` (aciona extensão via bridge ou fallback clipboard), botão `✅ ENVIEI` (ABORDAR≠ENVIADO), barra de métricas, filtro "Fila do dia" (first_seen_at<24h), chip HOJE nos cards recentes, toast de feedback. `manifest.json`: content_scripts injeta `cnr-bridge.js` em `*.vercel.app`. `cnr-bridge.js` (novo): bridge `window.postMessage→chrome.runtime.sendMessage→abordar()`. `olx-chat.js`: nova mensagem aprovada. Thumbnails intocados. | gerador `283ce52`, extensão `8b5fb09` |
| 41 | Elo enviado→respondeu/morto — `anuncios.html`: cards `enviado` exibem `💬 RESPONDEU` (PATCH direto via `avancar(id,'respondeu')`) e `☠️ MORTO` (modal leve de chips existente via `abrirIgnorar`). Sem formulário, sem campos de data/hora/motivo obrigatório, sem preenchimento manual. Métricas e filtros já atualizavam — intocados. | `506bdce` |
| 42 | Detecção automática de resposta OLX — `olx-chat-monitor.js` (NOVO): content script em `chat.olx.com.br`, MutationObserver + varredura inicial (3s), 3 heurísticas em cascata (classes, data-testid, posição geométrica). SW: handlers `CHECK_ENVIADO`/`RESPOSTA_DETECTADA`/`GET_AUTO_RESPONDED` + `respostaDetectada` (marcarRespondeu + auto_responded TTL 24h + patchRespondeuNoGerador). `fetch-anuncio.js` PATCH aceita `?listing_id&origem` além de `?id`. `anuncios.html`: badge `🔥 RESPOSTA NOVA` pulsante + topo no filtro Responderam. Ext NUNCA envia. | ext `80abf79`, gerador `5f7bf8c` |
| Fix 42b | Guard bridge órfão — `cnr-bridge.js`: `TypeError: chrome.runtime undefined` ao recarregar extensão com aba do Gerador aberta (content script órfão). Fix: `if (typeof chrome === 'undefined' \|\| !chrome.runtime?.sendMessage) return;` antes de qualquer `sendMessage`. Falha silenciosa; Yuri recarrega a aba. | ext `594deb1` |
| 43 | Fundação da Inbox OLX — captura e persiste mensagens do vendedor. `olx-chat-monitor.js`: `extrairConteudo(el)` + `registrarResposta(conteudo)`. `sw.js`: `respostaDetectada(conteudo)` + `persistirMensagem()` (fire-and-forget). `fetch-anuncio.js`: modo `?mensagens=1` (GET lista, POST insere com `msg_hash` SHA-256 UNIQUE). `supabase/reforma-43-olx-mensagens.sql`: DDL da tabela `olx_mensagens` (**rodar no Supabase Dashboard**). Nenhum fluxo Reforma 42 tocado. | ext `f673cfa`, gerador `4de851d` |
| 43.1 | Instrumentação diagnóstica (3 pontos de log `[CNR DEBUG 43.1]`) para rastrear por que mensagens não chegavam ao Supabase. Incluída no commit 43.2 sem commit próprio. | (incluída em `b79e4c3`) |
| 43.2 | Fix listing_id via chat-id map — infraestrutura para o caso de redirect OLX. `sw.js tabs.onUpdated`: captura `chat-id` da URL e chama `salvarChatIdMap()`. `salvarChatIdMap()` (nova): persiste `chat_id → { listing_id, platform, saved_at }` em `chrome.storage.local['chat_id_map']`. Handler `GET_LISTING_BY_CHAT_ID` (novo): content script pode resolver listing_id pelo chat-id. Logs `[CNR DEBUG 43.2]` em 3 pontos. | ext `b79e4c3` |
| Fix 43.2b | Correção: OLX não redireciona `?list-id=` na prática. `olx-chat-monitor.js` agora tenta `?list-id=` primeiro (Caminho A, direto); só usa `?chat-id=` + `GET_LISTING_BY_CHAT_ID` como Caminho B (fallback). `prosseguir()` unifica `CHECK_ENVIADO → iniciarMonitor`. `sw.js` intocado. | ext `9b649e4` |

---

## 8. URLs

- **App publicado:** https://gerador-cnr.vercel.app
- **GitHub:** https://github.com/Carronarederepasses/gerador-cnr
- **GitHub Pages (NÃO usar — FIPE quebrada sem serverless):** https://carronarederepasses.github.io/gerador-cnr/

---

## 9. Decisões de Produto — Fluxo Negociação → Venda → Contrato

> **Status:** Visão definida em 15/ago/2026. **NÃO implementar agora.** Registrado aqui para evitar perda de contexto e impedir que futuras reformas criem um fluxo burocrático ou incompatível com a operação real.

### 9.1 Negociação

- A aba Negociação deve ser tratada principalmente como **resumo e rastreabilidade** — não como formulário burocrático da operação diária.
- O fluxo ideal é: `negociando` → `reservado` (quando houver sinal ou reserva do comprador) → `comprado`.
- Não adicionar campos, etapas ou validações que tornem o preenchimento mais lento do que o WhatsApp. A operação não pode esperar pelo sistema.

### 9.2 Venda

- Ao marcar uma negociação como "Comprado/Vendido", o veículo deve seguir para a etapa **Nova Venda**.
- Nova Venda é onde ficam os dados efetivos do fechamento da operação, entre eles: comprador, vendedor/quem recebe, valor negociado, comissão CNR e demais dados necessários para formalizar a venda.
- **Princípio anti-retrabalho:** o operador não deve precisar preencher novamente informações que o sistema já possui. Os dados da negociação devem pré-preencher a Nova Venda automaticamente.

### 9.3 Contrato (requisito futuro)

- Existe a visão de futuramente ter um botão **"Criar Contrato"** dentro da Nova Venda.
- O Gerador deve montar automaticamente o contrato utilizando os dados já cadastrados na venda, sem redigitação.
- O contrato **NÃO deve exibir o valor da comissão da CNR** — é informação interna da operação.
- O contrato deve poder ser gerado e posteriormente anexado/associado à venda (PDF ou similar).
- **Prioridade atual: baixa.** A operação hoje é feita como PF; o contrato formal não é bloqueador. A estrutura deve ser preservada como requisito futuro para não exigir refatoração disruptiva quando chegar a hora.

### 9.4 Papéis no Contrato e na Venda (requisito futuro)

> Não assumir que "comprador" é necessariamente quem paga ou quem recebe/fatura.

Uma mesma operação pode envolver pessoas distintas para cada papel:

| Papel | Descrição |
|---|---|
| **Comprador** | Quem está adquirindo o veículo (dono legal) |
| **Pagador** | Quem efetua o pagamento (pode ser diferente do comprador) |
| **Faturado para** | Nome/CPF/CNPJ para fins de nota ou recibo |
| **Proprietário/vendedor** | Quem vende e recebe o valor do veículo |

Essa flexibilidade será necessária futuramente no contrato e na Nova Venda. Não criar estruturas rígidas que assumam 1 pessoa = 1 papel.

### 9.5 Princípio de implementação

Nenhum dos itens acima (9.1 a 9.4) deve ser implementado antes de:
1. Encerrar a validação da Sprint 1 (Match Ativo).
2. O fluxo de Negociação → Venda estar operacionalmente estável com dados reais.
3. A necessidade ser confirmada pela operação, não por antecipação.

---

## 10. CNR — Skills Disponíveis

> **Princípio:** Ter uma skill instalada **não** significa que ela deve ser aplicada em toda tarefa. Skills são ferramentas de apoio — acionar quando a situação se encaixar, não por padrão. Elas não abrem novas frentes de trabalho; confirmam e guiam quando uma necessidade já identificada precisa de suporte especializado.

Skills instaladas em `.claude/skills/` (projeto) + bundled globais. Total: 22 instaladas no projeto.

---

### 🗄️ Banco de Dados / Supabase

| Skill | Origem | Quando usar no CNR | Acionamento |
|---|---|---|---|
| `supabase-postgres-best-practices` | `supabase/agent-skills` | **Carregar ANTES de qualquer mudança em schema, colunas, índices, triggers, funções, queries ou RLS.** Skill mais crítica do projeto. | Manual |
| `supabase` | `supabase/agent-skills` | Trabalhar com Supabase CLI, migrações declarativas, MCP Supabase, autenticação, debugging de erros da plataforma. | Manual |

---

### 🏗️ Arquitetura / Engenharia

| Skill | Origem | Quando usar no CNR | Acionamento |
|---|---|---|---|
| `improve-codebase-architecture` | `mattpocock/skills` | Auditorias arquiteturais periódicas (como a que identificou a duplicação de `calcScore`). Usar sob demanda, nunca automaticamente. | Manual |
| `codebase-design` | `mattpocock/skills` | Vocabulário de arquitetura: módulos profundos vs. rasos, fronteiras de responsabilidade, acoplamento. Complementa `improve-codebase-architecture` — usar antes de refatorações para nomear o problema. | Manual |
| `domain-modeling` | `mattpocock/skills` | Formaliza o vocabulário de domínio do CNR (veículo, comprador, negociação, score, oferta). Usar quando uma nova entidade ou conceito for introduzido para garantir consistência de nomenclatura. | Manual |
| `systematic-debugging` | `obra/superpowers` | Bug sem causa óbvia após primeira leitura. Protocolo: 4 fases obrigatórias — não pular para fix sem completar fase 1. Regra dos 3 fixes: se ≥3 tentativas, parar e questionar arquitetura. | Manual |
| `diagnosing-bugs` | `mattpocock/skills` | Complementa `systematic-debugging`: guia para leitura de stack traces, mensagens de erro e logs antes de qualquer tentativa de fix. Usar quando o bug vier com mensagem de erro que precisa ser interpretada. | Manual |
| `code-review` | `mattpocock/skills` | Review pós-reforma em 2 eixos: conformidade com padrões do projeto + fidelidade ao requisito. Usar após reformas maiores. **Nota:** sobrepõe-se ao `/code-review` built-in, que tem outro foco. | Manual |
| `verification-before-completion` | `obra/superpowers` | Antes de declarar qualquer tarefa concluída. Exige evidência fresca antes de afirmar "está funcionando". Nunca declarar conclusão por confiança ou fadiga. | Manual (sempre que Claude for declarar conclusão) |
| `writing-plans` | `obra/superpowers` | Planejar reformas multi-etapas antes de implementar. Produz planos com tarefas de 2–5 min, testáveis individualmente, sem placeholders. | Manual |
| `executing-plans` | `obra/superpowers` | Par obrigatório de `writing-plans`: garante que a execução siga o plano passo a passo, com verificação e desvios explícitos. Usar em conjunto com `writing-plans` em reformas maiores. | Manual |
| `git-guardrails-claude-code` | `mattpocock/skills` | Protege contra operações git destrutivas: rebase interativo, force push, reset --hard. Sempre ativo em operações git — previne perda acidental de histórico. | Automático (Claude aplica sempre em operações git) |

---

### 🧪 Testes

| Skill | Origem | Quando usar no CNR | Acionamento |
|---|---|---|---|
| `tdd` | `mattpocock/skills` | Referência arquitetural sobre o que constitui um bom teste: seams (interfaces públicas), anti-padrões (acoplamento de implementação, slices horizontais), ciclo vertical. | Manual |
| `test-driven-development` | `obra/superpowers` | Protocolo Red-Green-Refactor estrito. "Se não viu o teste falhar, não sabe se ele testa a coisa certa." Complementa `tdd` com disciplina mais rígida. | Manual |
| `webapp-testing` | `anthropics/skills` | Testes de UI com Playwright (Python). Quando precisar automatizar verificações no browser — catálogo, formulários, fluxos de navegação do CNR. | Manual |
| `playwright-cli` | `microsoft/playwright-cli` | Motor CLI do Playwright: gravação de testes, codegen, execução headless. Engine de runtime que suporta `webapp-testing`. Usar quando for executar testes Playwright no terminal. | Manual |

> `tdd` e `test-driven-development` são complementares: o primeiro foca em o quê é um bom teste (arquitetura); o segundo em como conduzir o ciclo corretamente (processo).
> `webapp-testing` define os padrões de teste de UI; `playwright-cli` é o motor que executa esses testes.

---

### 🎨 Frontend / Design Visual

| Skill | Origem | Quando usar no CNR | Acionamento |
|---|---|---|---|
| `frontend-design` | `anthropics/skills` | **Carregar em toda Reforma Visual.** Guia de design lead: escolhas opinionadas, evitar padrões genéricos. Aplicado nas Reformas Visuais E1 e E2. | Manual |
| `web-design-guidelines` | `vercel-labs/agent-skills` | Auditar HTML/CSS contra guidelines Vercel Labs: acessibilidade, tipografia, responsividade, anti-padrões. Usar após reformas de UI. | Manual |

---

### 🤖 Agentes / Skills / MCP

| Skill | Origem | Quando usar no CNR | Acionamento |
|---|---|---|---|
| `find-skills` | `vercel-labs/skills` | Descobrir novas skills quando surgir necessidade sem ferramenta disponível. Usa `npx skills find [query]` com curadoria por installs e reputação. | Manual |
| `skill-creator` | `anthropics/skills` | Criar skills customizadas para o CNR se houver workflow repetitivo que mereça ser encapsulado. Ciclo: intenção → entrevista → SKILL.md → teste → refinar. | Manual |
| `agent-browser` | `vercel-labs/agent-browser` | Automação de browser por agente. Para tarefas que exigem navegação real — verificar deploy em produção, scraping, validação de UI automatizada. | Manual |
| `mcp-builder` | `anthropics/skills` | Construir novos MCP servers. Usar se o CNR precisar integrar com ferramentas externas via protocolo MCP no futuro. | Manual |

---

### 📄 Documentos (bundled — sempre disponíveis, sem instalação de projeto)

| Skill | Acionamento |
|---|---|
| `pdf` (`anthropic-skills:pdf`) | Automático quando o prompt mencionar PDF |
| `xlsx` (`anthropic-skills:xlsx`) | Automático quando o prompt mencionar Excel/planilha |
| `docx` (`anthropic-skills:docx`) | Automático quando o prompt mencionar Word/documento |

---

### Resumo de skills NÃO instaladas (e motivo)

| Solicitada | Status | Motivo |
|---|---|---|
| Vercel Optimize | ❌ Não existe | Nenhuma skill com esse nome no skills.sh. Skills Vercel existentes são React/Next.js — incompatível com stack do CNR. |
| Vercel CLI | ❌ Não existe | Não há skill específica para Vercel CLI no skills.sh. Gerenciado diretamente pelo Claude Code via Bash/PowerShell. |
| Frontend Testing Best Practices | ⚠️ Não existe por esse nome | `webapp-testing` (anthropics/skills) cobre o escopo mais próximo. Instalada como substituta. |

## 11. URLs

- **App publicado:** https://gerador-cnr.vercel.app
- **GitHub:** https://github.com/Carronarederepasses/gerador-cnr
- **GitHub Pages (NÃO usar — FIPE quebrada sem serverless):** https://carronarederepasses.github.io/gerador-cnr/

---

## 12. Checkpoint — onde o projeto está hoje

> **Regra permanente (16/ago/2026, repartida em 04/out/2026).**
>
> O registro contínuo do projeto vive em **dois** arquivos:
>
> | | |
> |---|---|
> | **esta seção** | o ESTADO de hoje. Curta. Reescrita, não acrescentada |
> | **`HISTORICO.md`** | o diário dia a dia, do mais novo para o mais velho |
>
> **Por que repartiu:** o `CLAUDE.md` chegou a **428 KB** (7.664 linhas, 314
> checkpoints) e é lido inteiro na abertura de cada sessão, indo junto em
> toda mensagem — uns 100 mil tokens por dia antes de ler uma linha de
> código, e crescendo sozinho a cada registro. O Yuri bateu no limite
> semanal por causa disso: *"desse jeito não vai dar pra trabalhar"*.
>
> **Como manter, daqui em diante:**
> - o detalhe do dia vai para o **topo** do `HISTORICO.md`, como sempre foi
>   escrito: o que foi feito, as decisões e os motivos, os erros e o que
>   ensinaram;
> - esta seção é **reescrita** para dizer onde as coisas estão agora. Ela
>   não acumula — se ela crescer, o problema volta;
> - `HISTORICO.md` **não é lido automaticamente**. Abrir só quando a
>   pergunta for *por que isso foi decidido assim*, e ler só o trecho.
>
> Segue valendo: registrar só o que aconteceu de verdade; **nunca** gravar
> senha, token, chave ou valor de variável de ambiente; atualizar sem pedir
> autorização; e a atualização nunca altera código do produto por conta
> própria.

### Estado em 4 de outubro de 2026

**Em produção** (`gerador-cnr.vercel.app`, deploy automático no push):
captação e parceiros, catálogo, vendas, clientes, negociações, agenda,
busca, consulta de placa, FIPE avulsa, importador de planilha, modelo de
anúncio, artes, story e a Rede.

**Quem usa:** o Yuri (todo dia) e a mãe dele, na abordagem, desde 25/set.
**Bruno (BHM Autos)** tem conta no banco principal, com a marca dele, como
**lojista** — e ainda não entrou. **Fabio Nogueira** recebeu convite em
29/set e nunca abriu. **Ninguém de fora jamais abriu uma conta nova aqui.**

**Arquitetura, em uma linha:** um site, um banco, e cada loja é uma
**conta** — `conta_id` em cada linha (fase 0, 23/set), funil único em
`api/_db.js`, sessão por telefone (fase 1, 27/set) e marca por conta
(27/set). **Loja nova não precisa de SQL nem de projeto novo.**

**Só o lojista vê:** preparação do carro, varejo × repasse (`valor_varejo`
e `destino_venda`) e o filtro "Catálogo". `valor` sempre foi o preço de
**repasse** — anúncio, Rede, Match e story leem dele.

**"Ver como"** no topo da barra lateral alterna a visão entre repassador e
lojista. É só visualização, no aparelho, e **só para a loja dona da
instalação**.

**O que ainda roda separado:** o projeto `cnr-piloto` no Supabase, vazio,
no ar só até o Bruno confirmar que entrou pelo endereço novo. Apagar
depois disso libera o espaço que trava a terceira loja.

**Limites que moldam decisões:** 12 funções serverless na Vercel (teto
atingido — modo novo entra como query param ou arquivo `_`), 2 projetos no
Supabase grátis, FIPE 1.000 consultas/dia com token.

### Pendências

| | |
|---|---|
| Link do Bruno | mandar pelo **Safari**; mensagem pronta na conversa de 04/out. Depois que ele entrar, apagar o `cnr-piloto` |
| Teto na chave do OpenRouter | está **sem teto** e o Bruno passou a usar ela na migração. US$ 4,99 gastos desde agosto — risco pequeno, mas o teto não deveria faltar. Painel do OpenRouter → Keys |
| Extensão da mãe | recarregar no notebook dela — cidade limpa e logs só valem depois |
| 2FA | códigos de recuperação fora do celular |
| CNPJ | **parado por decisão dele** até depois das eleições. Trava consulta veicular camada 2, RENAVE, integrador da OLX e qualquer cobrança |
| `CONTEXTO.md` | desatualizado — não tem a Rede como está, a migração do Bruno nem esta separação. Atualizar antes de consultar os "sócios" |
| Fila do `IDEIAS.md` | prestadores de serviço (**pesquisa antes de tela**, decisão dele); convidar liberado para as outras lojas; *"o sistema se adapta à loja"*, a amadurecer |

---
