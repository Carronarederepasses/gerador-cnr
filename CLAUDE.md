# CLAUDE.md — Contexto do Projeto (ler sempre ao abrir a pasta)

> **Para o Claude:** Sempre que o Yuri abrir esta pasta, aja como o assistente de desenvolvimento dele neste projeto. Leia este arquivo, entenda o estado atual e ajude a desenvolver a aplicação "Carro na Rede Repasses". Fale em português brasileiro, de forma direta e sem enrolação. Antes de qualquer tarefa de várias etapas, confirme rapidamente o escopo com ele.
>
> **Ler também `IDEIAS.md` no início da sessão.** É onde o Yuri anota o que
> lhe ocorre fora da conversa. Não tratar como fila de trabalho nem começar
> nada por conta própria: mencionar o que há de novo e perguntar se é a hora.
> Quando uma ideia virar trabalho, movê-la para a seção "Já viraram trabalho"
> com a data e onde foi parar.

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
| `index.html` | Gerador de anúncio WhatsApp (modo manual + colar anúncio com IA, cascata FIPE); campo RENAVAM com auto-preenchimento via APiBrasil e edição manual; persistência no localStorage. **Captação 2.0:** campos `#vendedor-nome`, `#vendedor-telefone`, `#valor-compra`, `#gastos-valor` e margem estimada em tempo real; AVALIAÇÃO removida do texto WA (fica só no banco); GASTOS (descrição de serviços necessários) aparece no texto WA da aba Parceiros (`gerarColetados`), mas não na Captação (`montarTextoAnuncio`); `salvarNoCatalogo()` faz PATCH se veículo já existe (sem duplicata) + painel pós-save com deep link `/catalogo.html?id=<uuid>` |
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
`primeiro-contato` | `respondeu` | `negociando` | `aguardando` | `comprado` | `descartado`

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

---

## 12. Checkpoint — caixa-preta do projeto

> **Regra permanente (estabelecida em 16/ago/2026):** Esta seção é o registro contínuo do estado do projeto. Deve ser atualizada:
> - Aproximadamente a cada **1 hora de trabalho ativo** na sessão.
> - **Imediatamente** após mudança de arquitetura, funcionalidade, decisão, correção, descoberta relevante ou definição de próximo passo.
>
> Registrar apenas o que realmente aconteceu: o que foi feito, decisões e motivos, problemas e resoluções, estado atual, próximos passos, e o que outra sessão precisa saber para continuar de onde parou.
> **Nunca registrar** senhas, tokens, chaves de API ou valores de variáveis de ambiente.
> O Claude pode atualizar esta seção sem interromper o Yuri para pedir autorização.
> A atualização do checkpoint **nunca altera código do produto** por conta própria.

---

### Checkpoint — sessão de 16/ago/2026

### O que foi feito nesta sessão

- **Push e deploy da Reforma 23** (`8a20d05`): `VENDAS_KEY` configurada na Vercel; `api/vendas.js` protege POST/PATCH/DELETE com o header `x-cnr-key`. Commit estava local desde sessão anterior e foi enviado ao GitHub nesta sessão. Deploy na Vercel ocorreu automaticamente.

- **Decisão definitiva sobre `vendas.html`**: a página **não tem portão visual**. O acesso é direto. Um portão de senha foi implementado (`5666eb1`) e depois removido (`9badd40`) na mesma sessão, após confirmação do objetivo correto. O estado final em produção é o do `9badd40`.

- **`VENDAS_KEY` — papel correto**: variável de ambiente da Vercel usada exclusivamente como credencial técnica da API. O frontend lê a chave do `sessionStorage` e a envia silenciosamente nas operações de escrita. Nenhuma tela de senha, nenhum portão visual, nenhuma interação do usuário. Valor da chave existe somente no painel da Vercel.

### Onde o projeto ficou (atualizado 19/ago/2026 — pós Reforma 35 completa)

- `origin/main` em `ed397e3` (Reforma 35 Etapa 5), Vercel `dpl_6AawkxGPAEzNbrLM1UZXSmQUi9iV` — READY.
- **Caixa Preta (Reforma 35)** — totalmente operacional: Etapas 1–5 concluídas e em produção. 6 eventos cobertos: VENDA_CRIADA, VENDA_EDITADA, VENDA_EXCLUIDA, VEICULO_CRIADO, VEICULO_STATUS_ALTERADO, VEICULO_EXCLUIDO, NEGOCIACAO_EXCLUIDA (E4), NEGOCIACAO_CRIADA, NEGOCIACAO_STATUS_ALTERADO (E5).
- **Próxima etapa da Reforma 35 (Etapa 6, não aprovada)**: `NEGOCIACAO_CONVERTIDA` — ligação explícita negociação → venda. Após: `COMPRADOR_CRIADO`, `COMPRADOR_DESATIVADO` se houver valor real.
- Sprint 1 (Match Ativo): aguardando validação operacional com ≥5 veículos e resultados registrados. Não foi tocada.
- Reforma Visual Etapa 2 (`index.html`): escopo definido, não iniciada. Aguarda encerramento da Sprint 1.

### Reformas desta sessão (18/ago/2026)

- **Reforma 26** (`23c3fca` — sessão anterior): `irParaVenda` async em `negociacoes.html` — busca `/api/catalogo?id=` antes de navegar para `vendas.html`, passando todos os campos do veículo via URL params. `vendas.html` lê mais parâmetros no array `campos`.
- **Reforma 27** (`b19625b`): Módulo "Compradores" → "Clientes" em toda a interface. `tipo` select reduzido a 4 opções (Lojista/Repassador/Investidor/Particular) — DB preservado. Sidebar, KPIs, badges, toasts e empty state atualizados.
- **Reforma 28** (`83476c4`): Reorganização completa da ficha cadastral de Clientes em `compradores.html`. 8 seções com emoji separadores. Tipo de cliente como primeiro campo controlando visibilidade condicional. Nenhum campo obrigatório. Label "Nome fantasia" somente para Lojista. Proprietário/Responsável apenas para Lojista e Repassador. Documentação condicional: PJ (razão social/CNPJ/IE), PF (CPF/RG/data nasc), Investidor (CPF/CNPJ). Campo cidade duplicado (`m-cidade`) removido — único campo no endereço (`m-cidade2`). `atualizarBlocoFat()` reescrita para os 4 tipos.
- **Reforma 29** (`97139e8`): Máscaras CPF/CNPJ/Telefone em `compradores.html`. `telMask`, `cpfMask`, `cnpjMask` progressivas no oninput. Aplicadas no load do modal para dados existentes (mesmo os sem máscara). `salvar()` normaliza para dígitos puros. Helpers `fmtCPF`/`fmtCNPJ`/`fmtTel` para exibição. **Efeito cascata:** DB passou a armazenar CPF/CNPJ/Telefone de clientes como dígitos puros a partir desta reforma.
- **Reforma 30** (`3b3c5b6`): Auto-preenchimento CRM formatado em `vendas.html`. Adiciona `fmtTelV()`/`fmtDocV()` (espelha compradores.html). `selecionarCRM` e `selecionarVendedor` formatam telefone e CPF/CNPJ ao preencher. `selecionarVendedor` agora usa o mesmo strip de estado na cidade que o comprador. Dropdown CRM exibe telefone formatado + cidade; histórico exibe CPF/tel também formatados.

### Decisões e diagnóstico da Reforma 30

- O autocomplete de comprador e vendedor em `vendas.html` JÁ estava funcional antes da Reforma 30. `_buscarContatos()` retorna clientes do CRM (qualquer tipo/papel) + histórico de vendas para ambos os dropdowns. Os dados do CRM já incluíam telefone, CPF/CNPJ e cidade.
- O único gap real era formatação: depois da Reforma 29, o banco armazena dígitos puros, mas `vendas.html` exibia sem máscara. A Reforma 30 corrigiu isso.
- Campos do cadastro de clientes SEM correspondente em vendas.html (por decisão do spec): `razao_social`, `proprietario`, `cep`, `logradouro`, `numero`, `bairro`, `complemento_end`. Não foram criados novos campos — apenas os existentes foram preenchidos melhor.
- Não foi adicionado `vendedor_id` hidden porque exigiria alteração de schema no Supabase. Decisão documentada aqui para referência futura.

### Reforma 31 (7637665 — 18/ago/2026)

- **`api/vendas.js`**: auto-update pós-venda agora usa `veiculo_id` como chave primária (PATCH em `veiculos?id=eq.{id}`). Fallback por `placa` mantido para vendas sem ID. Antes usava placa como único identificador.
- **`catalogo.html` — `registrarVenda()`**: passa `veiculo_id` via URL param para `vendas.html`, garantindo que o POST da venda sempre inclua o ID do veículo.
- **`catalogo.html` — rodapé do card**: 7 botões comerciais (📦 Pacote WhatsApp, Copiar texto, 🤝 Negociar, 💰 Registrar Venda, Status ▾, 📜 Histórico, Excluir) ocultados quando `v.status === 'vendido'`. Botão 📋 Avaliação sempre visível (é histórico operacional, não ação comercial). Gatilho exclusivo: POST bem-sucedido em `/api/vendas`.

### Diagnóstico da Reforma 31 — o que já existia

- CSS `.badge.vendido`, função `renderVendido(v)`, e `VENDAS_MAP` já existiam no catálogo.
- Condicional do match-box por status já existia (`card(v)` linha ~667).
- Infraestrutura de status `vendido` no DB: sem migração necessária.
- Bug: `api/vendas.js` usava só `placa` no auto-update (falha silenciosa quando placa era nula ou divergia). Corrigido com `veiculo_id` primário.

### Reforma 32 (9382085 — 18/ago/2026)

- **`assets/selo-vendido.svg`**: banner SVG vetorial vermelho sólido (`#CC0000`), texto "VENDIDO" branco Impact, sem inclinação, fundo transparente.
- **`catalogo.html` — CSS**: `.selo-vendido` com `width:55%; max-width:200px`, centralizado, proporção preservada.
- **`catalogo.html` — topo do card**: badge de nota geral e badge de status **ocultados somente para `v.status === 'vendido'`**. Todos os outros status inalterados.
- **`catalogo.html` — selo**: `<img>` inserida após `.topo`, somente quando `v.status === 'vendido'`. Não sobrepõe foto, não remove badge textual, não altera lógica de status.

### Reforma 33 (9cd9362 — 19/ago/2026)

- **`vendas.html` — handler de salvar**: auto-match de `comprador_id` por nome exato ao salvar a venda. Se `comprador_id` estiver vazio mas `comprador_nome` bater exatamente (case-insensitive) com um registro em `COMPRADORES_CRM`, o UUID do CRM é inserido em `body.comprador_id` antes do POST/PATCH. Sem mudança na API, no banco ou em outros módulos.
- **Diagnóstico da lacuna**: não era bug de código — o campo `m-comprador_id` (hidden), `selecionarCRM()` e a whitelist `CAMPOS` em `api/vendas.js` já funcionavam. O vínculo se perdia quando o operador digitava o nome sem clicar no dropdown.
- **Limitação documentada**: o auto-match usa comparação exata de nome. Nomes digitados com sufixos ou variações ("Willian / California Motors") não fazem match automático — requerem seleção explícita do dropdown. A venda do C3 (primeira venda real) precisa ser editada manualmente para vincular a Califórnia Motors.

### Reforma 34 (c1b1254 — 19/ago/2026)

- **`api/compradores.js` — endpoint `/match`**: filtro `papel=in.(comprador,ambos)` adicionado à query de busca de candidatos. Clientes com `papel=fonte` não entram mais no pool de pontuação do Motor de Match. Alteração cirúrgica: 1 arquivo, 1 linha. `calcScore`, threshold 40, Top 3, cadastro, vendas, catálogo e banco intocados. Sem migration necessária (campo `papel` já existia e estava populado).

### Reforma 35 — Etapa 1 (19/ago/2026) — APENAS BANCO, SEM CÓDIGO

- **Tabela `historico`** criada no Supabase via conexão direta Postgres. Schema idêntico ao definido na auditoria. Nenhum arquivo de código alterado. Nenhuma API modificada.
- **13 colunas**: `id` (UUID PK), `created_at` (TIMESTAMPTZ NOT NULL), `evento` (TEXT NOT NULL), `entidade` (TEXT NOT NULL), `entidade_id` (UUID NOT NULL), `veiculo_id`, `venda_id`, `cliente_id` (UUID nullable), `dados_antes`, `dados_depois`, `metadata` (JSONB nullable), `origem` (TEXT NOT NULL DEFAULT 'web'), `versao_app` (TEXT nullable).
- **5 índices** criados: `idx_historico_entidade`, `idx_historico_veiculo_id`, `idx_historico_venda_id`, `idx_historico_cliente_id`, `idx_historico_evento` — todos com `created_at DESC`.
- **Sem FK** para as tabelas operacionais — decisão intencional para proteger eventos históricos de exclusões em cascata.
- **Sem RLS** nesta etapa — acesso via SERVICE_ROLE (server-side only).
- Registro de validação inserido (`REFORMA35_TESTE`, entidade_id `00000000-0000-0000-0000-000000000035`) — mantido como primeiro registro da Caixa Preta (append-only, não deletado).
- **Próxima etapa (Etapa 2)**: instrumentar as APIs com a função `registrarHistorico` para os 7 eventos de Nível 1.

### Reforma 35 — Etapa 2 (19/ago/2026) — api/vendas.js instrumentado

- **Arquivo alterado**: `api/vendas.js` — 1 função adicionada + 3 handlers instrumentados.
- **`registrarHistorico()`**: função fire-and-forget inserida após `limpar()`. Nunca bloqueia a operação principal. Falha silenciosa com `console.error`. Retorna `undefined` sem `await`.
- **Eventos registrados**:
  - `VENDA_CRIADA` — dispara no POST após obter o ID da venda criada; `dados_antes=null`, `dados_depois=snapshot completo`.
  - `VENDA_EDITADA` — dispara no PATCH; GET-before-PATCH captura `dados_antes`; `dados_depois=snapshot pós-PATCH`.
  - `VENDA_EXCLUIDA` — dispara no DELETE; GET-before-DELETE captura snapshot; `dados_antes=snapshot`, `dados_depois=null`.
- **`versao_app`**: preenchido automaticamente com `VERCEL_GIT_COMMIT_SHA` injetado pelo Vercel.
- **Commit**: `014f2f6c3432c107ca7602dcec73515f4680915d` — push para `origin/main`.
- **Deploy Vercel**: `dpl_mWqtXds1iCWqM5YSWmZ5mYZcWdxa` — READY.
- **Testes executados** (via API de produção):
  - Teste A (VENDA_CRIADA): ✅ — `dados_antes=null`, `dados_depois.marca=TESTE_R35`, versao_app correto.
  - Teste B (VENDA_EDITADA): ✅ — `dados_antes.valor_venda=35000`, `dados_depois.valor_venda=38500`, diff correto.
  - Teste C (VENDA_EXCLUIDA): ✅ — `dados_antes.marca=TESTE_R35`, `dados_depois=null`, venda removida do banco.
  - `venda_id` de teste: `72836515-0d84-43e4-9b63-7ac6683de9e1` (excluída após os testes).
- **Não alterado**: `vendas.html`, `api/catalogo.js`, `api/compradores.js`, schema do banco, RLS, regras de negócio.
- **Etapa 3**: concluída — ver seção abaixo.

### Reforma 35 — Etapa 3 (19/ago/2026) — api/catalogo.js instrumentado

- **Arquivo alterado**: `api/catalogo.js` — 1 função adicionada + 3 handlers instrumentados.
- **`registrarHistorico()`**: mesma função fire-and-forget da Etapa 2. Adicionada após `limpar()`.
- **Eventos registrados**:
  - `VEICULO_CRIADO` — dispara no POST após INSERT bem-sucedido; `dados_antes=null`, `dados_depois=snapshot completo`.
  - `VEICULO_STATUS_ALTERADO` — dispara no PATCH **somente se `status` está no payload E o valor mudou**; GET-before-PATCH seletivo (`?select=status`); `dados_antes={status:anterior}`, `dados_depois={status:novo}`. Bloco `avaliacao` (deep-merge) intocado.
  - `VEICULO_EXCLUIDO` — dispara no DELETE com `await` explícito + try/catch (necessário: serverless encerra worker ao enviar response, cancelando Promises pendentes); GET-before-DELETE captura snapshot completo; `dados_antes=snapshot`, `dados_depois=null`.
- **Fix técnico (VEICULO_EXCLUIDO)**: fire-and-forget puro falha no DELETE porque o Vercel encerra o worker imediatamente após `res.json()`. Solução: `await` com `try/catch` inline antes do `return`. Falha no historico é capturada e logada, nunca propaga. Commit `c515db5`.
- **Commits**: `d1ec635` (implementação) + `c515db5` (fix await no DELETE).
- **Deploy Vercel**: `dpl_5KgPRPTov2Z2m1RT6eeDfih7GMx9` — READY.
- **Testes executados** (verificação direta no Supabase):
  - Teste A (VEICULO_CRIADO): ✅ `dados_antes=null`, `dados_depois.marca=TESTE_R35E3`, `versao_app=c515db56`.
  - Teste B (VEICULO_STATUS_ALTERADO): ✅ `dados_antes.status=captacao`, `dados_depois.status=em-anuncio`.
  - Teste C (edição sem status): ✅ apenas 1 VEICULO_STATUS_ALTERADO no banco; PATCH de `km` não gerou evento extra.
  - Teste D (VEICULO_EXCLUIDO): ✅ `dados_antes.marca=TESTE_R35E3`, `dados_depois=null`, veículo removido da tabela.
  - `veiculo_id` de teste: `ff7c8cc8-e480-4e70-8f87-f052f0dcb19c` (excluído após os testes).
- **Não alterado**: `catalogo.html`, `api/vendas.js`, `api/compradores.js`, fotos, documentos, avaliação, Match, scoring, schema.

### Reforma 35 — Etapa 4 (19/ago/2026) — api/compradores.js instrumentado (NEGOCIACAO_EXCLUIDA)

- **Arquivo alterado**: `api/compradores.js` — bloco `DELETE` dentro de `'neg' in q`.
- **Evento registrado**:
  - `NEGOCIACAO_EXCLUIDA` — dispara no DELETE de negociação com `await` explícito + try/catch (mesmo padrão da Etapa 3); GET-before-DELETE captura snapshot completo da negociação (incluindo `historico[]` interno); `dados_antes=snapshot`, `dados_depois=null`. `cliente_id` preenchido com `comprador_id` do snapshot quando disponível.
- **Campos mapeados**: `entidade='negociacao'`, `entidade_id=q.id`, `veiculo_id=snapshot.veiculo_id||null`, `cliente_id=snapshot.comprador_id||null`.
- **Tratamento de falha**: GET falho → `snapshot=null` → operação continua normalmente. Registro no historico falho → log silencioso → operação retorna `{ ok: true }` normalmente.
- **Commit**: `d2f0232`.
- **Deploy Vercel**: `dpl_2zQng6e5fVQb3ATCABmKvGjj5yK6` — READY.
- **Testes executados** (3/3 ✅):
  - Teste A (criação): ✅ negociação criada com `historico[]` (2 entradas) e status `negociando`.
  - Teste B (NEGOCIACAO_EXCLUIDA): ✅ `entidade=negociacao`, `entidade_id=747aefae-…`, `dados_antes.status=negociando`, `dados_antes.historico` preservado (2 entradas), `dados_depois=null`, row removido da tabela, `versao_app=d2f02324`.
  - Teste C (outras negociações intactas): ✅ contagem antes=2, depois=2; diferença=0.
  - `neg_id` de teste: `747aefae-a8c6-4d2c-967f-57811530228c` (excluído pelos testes).
  - `historico.id`: `55429bee-b3e8-4308-ab28-7f7a0038c86b`.
- **Não alterado**: `negociacoes.html`, criação/edição de negociações, `historico[]` interno, compradores, Motor de Match, vendas, catálogo, schema.

### Fix: Parceiros + GASTOS negrito (19/ago/2026) — commit `0705b7d`

- **Arquivo alterado**: `index.html` — `processarParceiro()` e `gerarColetados()`.
- **Arquivo alterado**: `api/parse.js` — ambos os prompts (`PROMPT` e `PROMPT_PARCEIRO`).
- **`processarParceiro()` — opcionais**: substituído loop bugado (buscava `data-id` com nomes longos da IA que não existem no DOM) por `mapOpcionais(data.opcionais)` — igual ao fluxo Texto/Link.
- **`processarParceiro()` — extras**: corrigido `obs-extra` (id inexistente) → `obs-custom`.
- **`processarParceiro()` — campos novos**: adicionados `revisoes_km`, `blindagem_marca/nivel/vidro` (com show do `blind-wrap` e marcação do toggle blindado) e `colet-fipe`.
- **`gerarColetados()`**: `'GASTOS: ' + gastos` → `` `*GASTOS: ${gastos}*` `` — agora em negrito no WhatsApp (igual a VALOR e FIPE).
- **`api/parse.js`**: instrução de ano expandida para cobrir formato abreviado `XX/XX` (ex: `24/25` → `2025`) em ambos os prompts.
- **Testes**: 7 verificações DOM/JS passadas localmente; GASTOS negrito confirmado via `renderPreview()` → `#wa-txt`; `mapOpcionais()` com 5 nomes reais da IA → 5 toggles corretos marcados.
- **Deploy**: `dpl_EiuEVq5EN92wj7xzaZnSRmasUy2w` — READY.
- **Não alterado**: Caixa Preta/Reforma 35, Motor de Match, cadastro de Clientes, negociações, formulário de venda, autenticação, VENDAS_KEY, catálogo, banco/schema.

### Reforma 35 — Etapa 5 (19/ago/2026) — api/compradores.js: NEGOCIACAO_CRIADA + NEGOCIACAO_STATUS_ALTERADO

- **Arquivo alterado**: `api/compradores.js` — bloco `POST` e bloco `PATCH` dentro de `'neg' in q`.
- **Eventos registrados**:
  - `NEGOCIACAO_CRIADA` — fire-and-forget após POST bem-sucedido; `dados_antes=null`, `dados_depois=snapshot completo da negociação`; `entidade='negociacao'`; `cliente_id=comprador_id` da negociação.
  - `NEGOCIACAO_STATUS_ALTERADO` — `await+try/catch` antes do `return` no PATCH; GET-before-PATCH seletivo (`?select=status,motivo_descarte,ultimo_contato,valor_proposto`) **somente quando `payload.status !== undefined`**; registra somente quando `snapAntes.status !== negDepois.status`; `dados_antes` e `dados_depois` com os 4 campos: `status`, `motivo_descarte`, `ultimo_contato`, `valor_proposto`. Falha no historico → log silencioso, PATCH retorna normalmente.
- **Padrão por método**:
  - `POST`: fire-and-forget (window natural dada pela resposta `return=representation` do Supabase).
  - `PATCH`: `await+try/catch` antes do response (padrão Etapa 3/4: worker encerra ao enviar response).
- **Commit**: `ed397e3`.
- **Deploy Vercel**: `dpl_6AawkxGPAEzNbrLM1UZXSmQUi9iV` — READY.
- **Testes executados** (3/3 ✅):
  - Teste A (NEGOCIACAO_CRIADA): ✅ confirmado no historico (`id=77837bc3`, `dados_antes=null`, `dados_depois.veiculo_nome=TESTE_R35E5_Etapa5`, `dados_depois.status=negociando`). Fire-and-forget chegou ao Supabase com latência >24s — comportamento esperado para serverless após encerramento do worker.
  - Teste B (NEGOCIACAO_STATUS_ALTERADO): ✅ `dados_antes.status=negociando`, `dados_depois.status=proposta-enviada`, `dados_antes.valor_proposto=55000`, `dados_depois.valor_proposto=54000` — 4 campos corretos.
  - Teste C (PATCH sem mudança de status): ✅ contagem de NEGOCIACAO_STATUS_ALTERADO inalterada (1→1). Nenhum evento gerado para PATCH sem `status` no payload.
  - Cleanup: `neg_id=c4fabc70-1695-4dd7-863e-43951bfbeeb3` excluído ao final (gerou NEGOCIACAO_EXCLUIDA via Etapa 4, confirmando cadeia de eventos completa).
- **Não alterado**: `negociacoes.html`, compradores, Motor de Match, vendas, catálogo, schema, outras APIs.

### Reforma 35 — Etapa 6 (20/ago/2026) — NEGOCIACAO_CONVERTIDA — CONCLUÍDA

- **Arquivos alterados**: `negociacoes.html`, `vendas.html`, `api/vendas.js`
- **Commit implementação**: `def46cd` — **Deploy implementação**: `dpl_8eN87UF5dampp5nDU55MBfLkxUpe` — READY
- **O que foi implementado**:
  - `negociacoes.html` — `irParaVenda()`: adiciona `p.set('negociacao_id', n.id)` → transporta o ID da negociação para `vendas.html` via URL
  - `vendas.html` — variável de módulo `let _negociacao_id = null` (padrão `_rapContador`); `iniciarApp()` lê `negociacao_id` da URL e armazena em `_negociacao_id`; `fecharModal()` limpa `_negociacao_id = null`; handler salvar inclui `if (!id && _negociacao_id) body.negociacao_id = _negociacao_id` — somente em POST (nova venda), nunca em PATCH (edição)
  - `api/vendas.js` — `registrarHistorico()` recebe `entidade = 'venda'` como default (chamadas existentes intactas); bloco POST captura `negociacao_id` **antes** de `limpar()` (não existe na tabela `vendas`); se `negociacao_id` presente, dispara `NEGOCIACAO_CONVERTIDA` fire-and-forget com `entidade='negociacao'`, `entidade_id=negociacao_id`, `venda_id=venda.id`, `dados_antes={status:'comprado', negociacao_id}`, `dados_depois={venda_id, valor_venda, comprador_id, veiculo_id}`
- **Não alterado**: `VENDA_CRIADA`, `VENDA_EDITADA`, `VENDA_EXCLUIDA`, `salvarRapida()`, Motor de Match, schema da tabela `vendas`, negociações, compradores — zero migration

#### Fix Etapa 6 — race condition fire-and-forget (20/ago/2026)

- **Diagnóstico**: Teste A falhou na primeira execução — `NEGOCIACAO_CONVERTIDA` não encontrado no `historico`. Causa-raiz: dois fire-and-forgets sequenciais no bloco POST de `api/vendas.js`. O worker Vercel encerra imediatamente após `res.json()`. O primeiro fetch (`VENDA_CRIADA`) completa dentro da janela de drenagem; o segundo (`NEGOCIACAO_CONVERTIDA`) é cancelado. Mesmo padrão diagnosticado na Etapa 3 para `VEICULO_EXCLUIDO`.
- **Fix**: `NEGOCIACAO_CONVERTIDA` migrado de `registrarHistorico()` (fire-and-forget) para `await sb('historico', {...})` com `try/catch`, posicionado **antes** do `return res.status(201).json(venda)`. `VENDA_CRIADA` permanece fire-and-forget (é o primeiro call e completa naturalmente). Comentário inline explica a decisão.
- **Arquivo alterado**: `api/vendas.js` — apenas o bloco `if (negociacao_id)` dentro do POST.
- **Commit fix**: `1ae6123` — **Deploy fix**: `dpl_CTMJWbQPpxZK5DE3PXyASJEaFdQr` — READY (produção, atual)
- **Testes executados** (script `reforma35_etapa6_testes.mjs`, segunda rodada, 3/3 ✅):
  - Teste A (venda via `irParaVenda()`): ✅ `NEGOCIACAO_CONVERTIDA` no historico; `entidade_id=neg.id`, `venda_id=venda.id`, `dados_antes.negociacao_id` correto, `dados_depois.venda_id` correto.
  - Teste B (venda direta, sem `negociacao_id`): ✅ `NEGOCIACAO_CONVERTIDA` ausente no historico.
  - Teste C (`salvarRapida()`): ✅ `NEGOCIACAO_CONVERTIDA` ausente no historico.
  - Cleanup: 3 vendas de teste excluídas, HTTP 200.
- **Padrão consolidado**: eventos que rodam em segundo ploco no POST/PATCH (exceto o primeiro fire-and-forget natural) devem usar `await + try/catch` antes do `return`. Fire-and-forget puro só é seguro para o primeiro call ou quando há window garantida (return=representation do Supabase nos POSTs de negociação).

---

### Reforma 36 (20/ago/2026) — VENDAS_KEY restaurada

- **Arquivos alterados**: `api/vendas.js`, `vendas.html`
- **Commit**: `52388f4` — **Deploy**: `dpl_Fxsg443U8JsvPyNyy3VCv53Y1ip2` — READY
- **Contexto histórico**: `VENDAS_KEY` foi removida intencionalmente na Reforma 25 ("por enquanto — módulo de vendas funciona sem autenticação"). Restauração mínima da Reforma 23 final (commit `9badd40`), sem portão visual, sem tela de senha.
- **`api/vendas.js`** — 2 linhas adicionadas:
  - `const VENDAS_KEY = process.env.VENDAS_KEY;` — após `SERVICE_KEY`
  - Guard: `if (VENDAS_KEY && ['POST','PATCH','DELETE'].includes(req.method) && req.headers['x-cnr-key'] !== VENDAS_KEY) return res.status(401).json({ error: 'Acesso negado.' })` — opcional: sem `VENDAS_KEY` no ambiente, a proteção é desativada; GET permanece público
- **`vendas.html`** — `headers()` expandida: lê `localStorage.getItem('cnr_vendas_key')` silenciosamente; se presente, injeta `x-cnr-key` em todas as requisições de escrita — sem prompt, sem portão visual
- **Rotação da chave**: nova chave de 32 chars alfanuméricos gerada em PowerShell (`Get-Random` sobre ASCII 48–122, sem especiais para evitar issues em HTTP headers); definida no painel Vercel (Sensitive/Hidden, Production+Preview); redeploy manual; browser configurado via `localStorage.setItem('cnr_vendas_key', '...')` no DevTools
- **Validação**: `localStorage.getItem('cnr_vendas_key')?.length` retornou `32`; fetch de teste no Console retornou HTTP 400 (autenticação aceita, body inválido — nenhuma venda criada)
- **VENDAS_KEY**: nunca registrada em código, Git, CLAUDE.md ou qualquer arquivo versionado — existe somente no painel da Vercel e no localStorage do browser do operador

---

### Reforma 37 (20/ago/2026) — Match Ativo mensurável (Patches A+B+C) — CONCLUÍDA

- **Arquivos alterados**: `api/compradores.js` (Patch A), `catalogo.html` (Patches B+C)
- **Commit**: `fbe120f` — "fix: Reforma 37 — Match Ativo mensurável (Patches A+B+C)"
- **Deploy Vercel**: `gerador-q73um35qg-carronarederepasses-projects.vercel.app` — READY (produção, atual)

**Contexto**: Sprint 1 do Match Ativo estava inanalisável — 3 bugs impediam coleta de dados úteis:
1. Score inflado para compradores sem faixa de preço (+40 indevido)
2. Top 3 não persistido nos eventos → impossível medir acerto do ranking
3. Gap Central × Card: oferta via Central não bloqueava `naoAdequado` no card (bug Jackson Veículos)

#### Patch A — `calcScore()` — faixa de preço `null → Infinity` (api/compradores.js)

- **Bug**: `const max = parseFloat(comprador.preco_max) || Infinity` — `null` → `Infinity` → `v <= Infinity` sempre verdadeiro → comprador sem faixa recebia +40 pts de faixa indevidamente.
- **Fix**: `hasFaixa = preco_min != null && preco_max != null` — se sem faixa, nenhum dos dois blocos pontua. Sem faixa → score = base (histórico + comportamento), sem bônus de preço.
- **Impacto medido**: Betinho e Jackson: 100 → 60 no Celta R$26k. Compradores com faixa: inalterados.

#### Patch B — `_rankingCache` — Top 3 persistido nos eventos (catalogo.html)

- **Problema**: `match_notificado` guardava apenas `score_match` e `motivos_match`. Sem saber quem era Top 1/2/3, impossível medir acerto do ranking.
- **Fix**: `_rankingCache = {}` (module-level); populado em `renderMatchHtml()` após calcular `top3`; lido em `_registrarOferta()` → adiciona `ranking_top3` (array com `comprador_id`, `score`, `posicao`) e `posicao_no_ranking` (1/2/3 ou `null` para Central) ao campo `dados` do evento `match_notificado`.
- **Central**: `_rankingCache[veiculoId]` = `undefined` → `|| []` = `[]`; `findIndex` = -1 → `(-1+1)||null` = `null`. Correto — Central não inventa ranking.

#### Patch C — `naoAdequado()` — guard `_ofertadosNaSessao` (catalogo.html)

- **Bug**: `naoAdequado()` verificava apenas `container.dataset.ofertado === '1'`. Oferta via Central não atualizava o DOM do card → `data-ofertado` permanecia `'0'` → `naoAdequado` era executado indevidamente (bug confirmado no evento de Jackson Veículos de 13/ago).
- **Fix**: adicionado `|| _ofertadosNaSessao.has(\`${veiculoId}:${compradorId}\`)` ao guard — impede `naoAdequado` mesmo quando o card não foi atualizado pelo fluxo da Central.

**Testes executados (6/6 ✅ — 20/ago/2026):**

| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | Celta + compradores sem faixa → sem +40 | **PASS** — Betinho 60, Jackson 60 (antes: 100) |
| 2 | Compradores com faixa → pontuam normalmente | **PASS** — Autoconfirma 80, L.Vargas 90 (inalterados) |
| 3 | Offer Top 1 → `posicao_no_ranking=1` + `ranking_top3[3]` | **PASS** — payload verificado via fetch intercept |
| 4 | Offer Top 2 → `posicao_no_ranking=2` | **PASS** — RR Automobile posicao=2 correto |
| 5 | Offer via Central (sem renderMatchHtml) → `[] / null` | **PASS** — `undefined\|\|[]`=`[]`, `(-1+1)\|\|null`=`null` |
| 6 | Offer via Central → `naoAdequado` bloqueado | **PASS** — `fetchesFired=0`, bloqueado por `_ofertadosNaSessao` |

3 eventos `match_notificado` + 3 negociações criadas em produção (todos HTTP 201). `ranking_top3` e `posicao_no_ranking` persistidos no Supabase.

---

### Onde o projeto ficou (atualizado 20/ago/2026 — Reforma 37 concluída)

- `origin/main` em `fbe120f` (Reforma 37 — Match Ativo mensurável), Vercel `gerador-q73um35qg-carronarederepasses-projects.vercel.app` — READY (produção, atual).
- **Caixa Preta (Reforma 35)** — totalmente operacional: Etapas 1–6 concluídas e testadas.
- **VENDAS_KEY (Reforma 36)** — restaurada, rotacionada, validada.
- **Match Ativo mensurável (Reforma 37)** — Patches A+B+C aplicados e testados. Score corrigido, Top 3 persistido, gap Central×Card fechado. Sprint 1 pode agora coletar dados úteis.
- **Sprint 1 (Match Ativo)**: coleta oficial iniciada. Critérios de saída: ≥5 veículos com `match_notificado` pós-Patch B (com `posicao_no_ranking`), ≥80% ofertas com `match_resultado` registrado, taxa de acerto Top 1 e Top 3 calculáveis, 0 compradores com `preco_max=null`.
- **Fix Parceiros (2ª rodada)** — IPVA fallback + prompt gastos aplicados ao fluxo `processarParceiro()`. 22/22 testes.
- **Pendente operacional**: preencher perfis dos 8 compradores sem faixa de preço (tarefa do Yuri).
- Reforma Visual Etapa 2 (`index.html`): escopo definido, não iniciada.

---

### Fix Gerador Parceiros — 20/ago/2026

**Commit:** `0c9f9e2` · **Deploy:** `dpl_542QeZAoVCeYGLfNDMbxpdcMTkZY` — READY

**Fix A — GASTOS formato** (`index.html:gerarColetados()`)
- Antes: `*GASTOS: descrição*` (tudo em negrito, uma linha)
- Depois: `*GASTOS:*` / `descrição` (label negrito, descrição na linha seguinte sem negrito)

**Fix B — IPVA fallback** (`index.html:processarIA()`)
- Ponto cego: `EXTRAS_BLOQUEADOS` removia "IPVA pago" de `extras` sem marcar o toggle — dado desaparecia silenciosamente.
- Fix: se `extras` contém padrão IPVA e `opcionais` não traz `ipva-pago`, o fallback injeta antes de `mapOpcionais()`.
- Regex: `/ipva[\s_-]*(pago|quitado|em\s*dia|ok|\d{4})/i`

**Fix C — PROMPT_PARCEIRO** (`api/parse.js`)
- Antes: `"IPVA 2024/2025/2026 pago"` (notação compacta)
- Depois: `"IPVA 2024 pago, IPVA 2025 pago, IPVA 2026 pago"` (explícito por ano)

**Testes:** 26/26 passaram (Fix A: 8, Fix B: 10, Fix C: 8).

---

### Fix Gerador Parceiros — 20/ago/2026 (segunda rodada)

**Commit:** `93e36a0` · **Deploy:** `gerador-cnr.vercel.app` — READY (produção, atual)

**Causa raiz diagnosticada:** Fix B (IPVA fallback) e o tratamento de `extras` foram aplicados apenas em `processarIA()` (fluxo Texto/Link) na rodada anterior. O fluxo `processarParceiro()` (aba Parceiros → imagem/laudo) nunca recebeu os equivalentes. 26 testes anteriores só cobriam `processarIA()`.

**Fix 1 — IPVA fallback em `processarParceiro()`** (`index.html`)
- Adicionado `IPVA_RE_PARC` idêntico ao Fix B de `processarIA()` — recupera `'ipva-pago'` de `data.extras` antes de chamar `mapOpcionais()`.
- Quando IA classifica IPVA no campo errado (`extras` em vez de `opcionais`), o toggle `ipva_pago` agora é ativado no fluxo Parceiros também.

**Fix 2 — `PROMPT_PARCEIRO` campo `gastos`** (`api/parse.js`)
- Antes: `"null se laudo não tiver reprovações ou não houver laudo"` → IA retornava `gastos: null` para cards sem laudo; dados de reparo do card iam para `extras` → `obs-custom` como texto plano sem formatação `*GASTOS:*`.
- Depois: definição cobre tanto laudo quanto card. IA classifica custos visíveis no card em `gastos` diretamente → `gerarColetados()` formata com `*GASTOS:*` em negrito.
- `gerarColetados()` (Fix A da rodada anterior) não foi alterado — estava correto.

**Não alterado:** `processarIA()`, `gerarColetados()`, `EXTRAS_BLOQUEADOS`.

**Testes:** 22/22 passaram (Parceiros: 15, regressão: 7).

---

*Atualizado em 20/agosto/2026 — Fix Gerador Parceiros (2ª rodada): IPVA fallback + prompt gastos no fluxo Parceiros. Commit `93e36a0`, deploy `gerador-cnr.vercel.app` — READY.*

---

### Checkpoint — sessão de 27/ago/2026 — Thumbnails OLX validados em produção

### O que foi feito nesta sessão

#### Reforma 38 — Captura de thumbnail na extensão Catafrango

**Problema**: anúncios chegavam ao Supabase sem foto. O Catafrango não capturava a URL da imagem da OLX.

**`olx-search.js` (extensão)**:
- `extractAll()`: seleção via `querySelectorAll('img')` + `find()` priorizando `img.olx.com.br/thumbs700x500`. Fallback exclui `_next/image` (badge de loja). `currentSrc` preferido sobre `src`.
- `sendOrRetry()`: mesma lógica no retry path.
- Stub de incompletos inclui `thumbnail: ''`.
- Log atualizado: `thumb=✓/✗`.
- Commits: `5bd16de` (captura inicial) + `ed22846` (fix store badge — lojas verificadas têm 2 imgs, badge primeiro no DOM).

**`fetch-anuncio.js` (gerador)** — Reforma 38b:
- `on_conflict=origem,listing_id` adicionado (sem ele, PostgREST usa PK auto-gerada → erro 23505).
- Deduplicação por `Map` antes do upsert (mesmo `listing_id` em múltiplas buscas colide no INSERT).
- Upsert em dois grupos: `rowsWithThumb` (inclui coluna `thumbnail`) e `rowsWithoutThumb` (omite a coluna, preserva foto já salva). Sem os grupos, re-scan sem foto sobrescrevia foto válida com `null`.
- Commit: `3e7e792`.

#### Reforma 39 — anuncios.html: lazy loading + no-referrer

**Problema A — throttle da CDN**: OLX serve thumbnails por `img.olx.com.br`. Com 95%+ de anúncios com thumbnail, os 110 cards disparavam requests simultâneos ao carregar a página. CDN rejeita requests concorrentes de origem externa após os 2 primeiros.

**Evidência do throttle (teste de 10 imgs simultâneas)**:
- Sem `referrerPolicy`: 2 LOAD / 8 ERROR em ~180–196 ms (rejeição ativa, não timeout)
- Com `referrerPolicy='no-referrer'`: 10 LOAD / 0 ERROR em 217–414 ms

**Causa raiz confirmada**: hotlink protection por header `Referer`. CDN bloqueia requests com `Referer: gerador-cnr.vercel.app`. Sem Referer → CDN trata como acesso direto.

**`anuncios.html` (3 alterações)**:
1. `cardHTML()`: `src="${thumbnail}"` → `data-src="${thumbnail}" referrerpolicy="no-referrer"` + classe `lazy-thumb`. Cards com `null` preservam `<div class="card-thumb-placeholder">🚗</div>` inalterado.
2. `renderGrid()`: `observarThumbs()` chamado ao final de cada render (filtro incluído).
3. Novo bloco lazy loading:
   - `_thumbObserver`: `IntersectionObserver` singleton, `rootMargin:'200px'`
   - `_carregarThumb(img, tentativa)`: define `img.referrerPolicy='no-referrer'` **antes** de `img.src=src`. `onerror`: `img.removeAttribute('src')` + retry em 2 s, máx 2 tentativas, sem loop infinito.
   - `observarThumbs()`: escaneia `.lazy-thumb[data-src]` e registra no observer. Fallback inline para browsers sem IntersectionObserver.
- Commits: `ad1fd86` (lazy loading) + `9cea50c` (no-referrer fix).

#### Diagnóstico e aprendizado

- `img.src` no DOM da OLX retorna URL real mesmo para `loading="lazy"` — OLX não usa `data-src`.
- `currentSrc` fica vazio se a aba está em background (não renderiza). `src` tem a URL.
- Sem CSP restritivo na Vercel. Problema era 100% no CDN da OLX.
- IntersectionObserver não dispara em browser oculto/headless — teste de produção foi necessário.
- `referrerpolicy` como atributo HTML + `img.referrerPolicy` em JS: redundância intencional para cobrir retries.

### Onde o projeto ficou (atualizado 27/ago/2026)

- `origin/main` em `9cea50c` (Reforma 39 — no-referrer fix), Vercel — READY.
- **Thumbnails OLX**: fluxo completo validado em produção (notebook + celular). 110 anúncios com fotos carregando corretamente. Etapa encerrada.
- **Caixa Preta (Reforma 35)**: Etapas 1–6 concluídas, em produção.
- **Sprint 1 (Match Ativo)**: aguardando validação operacional (≥5 veículos, resultados registrados). Patches A+B+C aplicados (Reforma 37).
- **Reforma Visual Etapa 2 (`index.html`)**: escopo definido, não iniciada. Aguarda encerramento da Sprint 1.
- **Pendente operacional**: preencher perfis dos compradores sem faixa de preço.
- **Próxima decisão estratégica**: definir próxima evolução do Catafrango após validação dos thumbnails.

*Atualizado em 27/agosto/2026 — Reforma 38 + 39: thumbnails OLX funcionando em produção. Commits `3e7e792` + `9cea50c`, deploy `gerador-cnr.vercel.app` — READY.*

---

### Checkpoint — sessão de 27/ago/2026 (tarde) — Mesa de Cata: ABORDAR integrado ao Gerador

### O que foi feito nesta sessão

#### Reforma 40 — Mesa de Cata: botão ABORDAR + bridge Gerador→extensão + métricas

**Contexto**: Sprint "Mesa de Cata" — transformar `anuncios.html` na mesa de turno operacional. Auditoria arquitetural completa entregue antes de qualquer implementação (mapa dos dois sistemas, gaps, proposta, riscos, plano de teste).

**`olx-chat.js` (extensão)** — nova mensagem de abordagem aprovada:
- Anterior: "Trabalho com compradores e lojistas parceiros do setor automotivo e acredito que seu veículo possa interessar a alguns deles."
- Nova: "Olá! Tudo bem? Meu nome é Yuri, sou de Garopaba e vi seu anúncio na OLX. Trabalho com compradores e parceiros do setor automotivo e achei que seu veículo pode ter um bom perfil para alguns dos negócios que acompanho. O veículo ainda está disponível? Se sim, qual seria o melhor valor para uma negociação à vista?"
- Commit extensão: `8b5fb09` (inclui manifest + bridge + nova msg)

**`manifest.json` (extensão)** — `content_scripts` adicionado:
- `matches: ["https://*.vercel.app/*"]` (host_permission já existia)
- Injeta `content/cnr-bridge.js` em `document_start`
- Exige reload da extensão em `chrome://extensions` para entrar em vigor

**`content/cnr-bridge.js` (extensão — arquivo novo)**:
- Escuta `window.postMessage({ cnr_type: 'CNR_ABORDAR', listing })` da página do Gerador
- Encaminha para `chrome.runtime.sendMessage({ type: 'ABORDAR', listing })` → `abordar()` do SW
- Devolve `CNR_ABORDAR_ACK` para a página confirmar que a extensão recebeu

**`anuncios.html` (gerador)** — commit `283ce52`:
- **Botão `💬 ABORDAR`**: primário (fundo escuro) no card `novo`. Aciona `abordar(id)` → `postMessage → bridge → SW → abordar() → chat.olx.com.br/?list-id=<id> → olx-chat.js`. **ABORDAR ≠ ENVIADO** — não altera status.
- **Fallback inteligente**: timeout 600ms sem ACK → abre chat diretamente + copia `MSG_ABORDAGEM` para clipboard. Toast contextual em ambos os casos.
- **Botão `✅ ENVIEI`**: separado, estilo success (verde suave). Aciona `avancar(id,'enviado')` → PATCH Supabase. Yuri clica SOMENTE após ter enviado manualmente no OLX.
- **Barra de métricas**: topo da página — `📡 total · 🔴 novos · 🕐 hoje · 📬 enviados · 💬 responderam · 🏆 autorizados`. Calculada dos dados já carregados, sem nova chamada à API.
- **Filtro `🔴 Fila do dia`**: novos com `first_seen_at < 24h`. Os 110 seeds antigos NÃO aparecem — distinção sem alterar schema ou `first_seen_at`.
- **Chip `HOJE`**: badge discreto nos cards recentes. Seeds antigos sem marcador.
- **Dados enviados à extensão**: `{ listing_id, platform:'olx', url, title (←titulo), price (←preco), location (←localizacao) }` — mapeado para os nomes que o `abordar()` do SW espera.
- **Thumbnails intocados**: `_carregarThumb`, `_thumbObserver`, `referrerPolicy`, `observarThumbs` preservados linha a linha.

#### Arquitetura do fluxo completo

```
anuncios.html (postMessage CNR_ABORDAR)
  → cnr-bridge.js (content script, injected)
    → chrome.runtime.sendMessage (ABORDAR)
      → sw.js abordar()
        → chrome.tabs.create(chat.olx.com.br/?list-id=X)
          → olx-chat.js (injetado via tabs.onUpdated)
            → preenche mensagem (NÃO envia)
              → Yuri revisa e envia manualmente
                → volta ao Gerador, clica ✅ ENVIEI
                  → PATCH Supabase: status novo → enviado
```

### Onde o projeto ficou (atualizado 27/ago/2026 — tarde)

- **Gerador** `origin/main` em `283ce52` (Reforma 40 — Mesa de Cata), Vercel — READY (deploy automático no push).
- **Extensão** em `8b5fb09` (bridge + nova msg + manifest). ⚠️ Requer reload manual em `chrome://extensions` para `content_scripts` entrar em vigor.
- **Thumbnails OLX (Reforma 39)**: intocados, em produção.
- **Caixa Preta (Reforma 35)**: intocada, em produção.
- **Sprint 1 (Match Ativo)**: não tocada, aguardando validação operacional.
- **Próximo passo operacional**: recarregar a extensão → testar fluxo ABORDAR completo (card → chat OLX → mensagem preenchida → Yuri envia → ENVIEI → status enviado).

*Atualizado em 27/agosto/2026 (tarde) — Reforma 40: Mesa de Cata — ABORDAR integrado ao Gerador. Commits gerador `283ce52`, extensão `8b5fb09`.*

---

### Checkpoint — sessão de 28/ago/2026 — Reforma 41: elo enviado→respondeu/morto

### O que foi feito nesta sessão

#### Reforma 41 — Botões RESPONDEU + MORTO no card enviado

**Contexto**: o fluxo Catafrango tinha o elo `novo→enviado` fechado (Reforma 40). Faltava fechar `enviado→respondeu` e `enviado→morto`.

**Diagnóstico antes de tocar qualquer arquivo**:
- `avancar(id, 'respondeu')` já existia em `anuncios.html` linha 294, rotulado "Respondeu ✓".
- `abrirIgnorar(id)` já existia na linha 295, rotulado "Ignorar" — abre modal leve com chips de motivo (todos opcionais, incluindo "Sem motivo").
- Métricas, filtros e re-render já funcionavam via `avancar()` → `atualizarMetricas()` → `renderGrid()`.

**Alteração**: 2 labels no bloco `a.status === 'enviado'` de `cardHTML()`:
- `"Respondeu ✓"` → `"💬 RESPONDEU"` (mesma função `avancar(id,'respondeu')`, PATCH direto, sem modal)
- `"Ignorar"` → `"☠️ MORTO"` (mesma função `abrirIgnorar(id)`, modal existente com chips)

**Sem alterar**: mecanismo de PATCH, modal de motivos, `avancar()`, métricas, filtros, thumbnails, bridge, extensão, ABORDAR, ENVIEI.

**Princípio aplicado**: "O CNR registra o máximo possível automaticamente e pergunta o mínimo possível ao Yuri." — Yuri decide QUANDO algo mudou, o sistema registra o timestamp da mudança automaticamente (Supabase `updated_at`).

**Loop Catafrango completo após Reforma 41**:
```
novo
  ↓ 💬 ABORDAR (extensão abre OLX chat, NÃO muda status)
  ↓ Yuri revisa e envia manualmente na OLX
  ↓ ✅ ENVIEI → PATCH status=enviado
enviado
  ↓ 💬 RESPONDEU → PATCH status=respondeu (sem modal, sem formulário)
  ↓ OU ☠️ MORTO → abrirIgnorar → chips de motivo (todos opcionais) → PATCH status=morto
respondeu | morto
```

### Onde o projeto ficou (28/ago/2026)

- `origin/main` em `506bdce` (Reforma 41), Vercel — READY (deploy automático no push).
- **Catafrango**: loop completo. novo→enviado→respondeu/morto fechado.
- **Caixa Preta (Reforma 35)**: intocada, em produção.
- **Sprint 1 (Match Ativo)**: não tocada, aguardando validação operacional (≥5 veículos, resultados registrados).
- **Reforma Visual Etapa 2 (`index.html`)**: escopo definido, não iniciada.
- **Extensão**: commit `8b5fb09` local apenas (sem remote configurado). Sem alteração na Reforma 41.

*Atualizado em 28/agosto/2026 — Reforma 41: elo enviado→respondeu/morto fechado. Commit `506bdce`, deploy `gerador-cnr.vercel.app` — READY.*

---

### Checkpoint — sessão de 28/ago/2026 (tarde) — Reforma 42: detecção automática de resposta

### O que foi feito nesta sessão

#### Reforma 42 — Monitor de resposta automática do Chat OLX

**Problema**: Yuri precisava entrar manualmente no Gerador para marcar RESPONDEU sempre que um vendedor respondia no OLX. Com 5+ abordagens simultâneas, isso virava gargalo.

**Solução**: extensão detecta a resposta automaticamente enquanto Yuri usa o Chat OLX normalmente.

**`content/olx-chat-monitor.js` (NOVO)**:
- Injeta em `chat.olx.com.br` via `content_scripts` no manifest
- Extrai `listing_id` de `?list-id=<id>` na URL
- Consulta SW: `CHECK_ENVIADO` — só monitora conversas com status local `enviado`
- **MutationObserver** (`childList: true, subtree: true`): detecta novos nós no DOM em tempo real
- **Varredura inicial** (setTimeout 3s): detecta respostas que já existiam quando Yuri abriu a aba
- **3 heurísticas em cascata** para distinguir vendedor (incoming) vs. Yuri (outgoing):
  1. Class names: `incoming|received|opponent` vs. `outgoing|sent|mine`
  2. `data-testid` attributes (padrão React)
  3. Posição geométrica: bolha centrada à esquerda da viewport → incoming; à direita → outgoing. Margens de 22% para evitar falso-positivo. Elementos com largura >85% da viewport (containers) são ignorados.
- Guard: dispara `RESPOSTA_DETECTADA` apenas **uma vez por page load** (idempotente)
- NUNCA envia mensagens. NUNCA lê chats que Yuri não abriu. NUNCA faz polling.

**`manifest.json`**: adicionado content_scripts para `chat.olx.com.br`, `run_at: document_idle`. `host_permissions: *.olx.com.br` já existia.

**`background/sw.js`** — 3 handlers novos:
- `CHECK_ENVIADO`: lê `seen[key].status` → responde `{enviado: bool}`
- `RESPOSTA_DETECTADA`: chama `respostaDetectada(listing_id, platform)`
- `GET_AUTO_RESPONDED`: chama `getAutoRespondidos()` → array de listing_ids recentes

3 funções novas:
- `respostaDetectada()`: `marcarRespondeu(key)` + grava `auto_responded[key]=timestamp` + `patchRespondeuNoGerador()` (fire-and-forget)
- `getAutoRespondidos()`: retorna listing_ids com timestamp ≤24h, limpa entradas antigas automaticamente
- `patchRespondeuNoGerador()`: PATCH no endpoint Gerador via `listing_id+origem` (extensão não conhece UUID do Supabase)

**`content/cnr-bridge.js`**: adicionado handler `CNR_GET_AUTO_RESPONDED` → `GET_AUTO_RESPONDED` → `CNR_AUTO_RESPONDED`. Mesmo padrão do `CNR_ABORDAR` existente.

**`api/fetch-anuncio.js`** (Gerador): PATCH aceita dois modos:
- `?id=<uuid>` — usado por `anuncios.html` (já existia)
- `?listing_id=<id>&origem=olx` — usado pela extensão (novo; extensão nunca conhece o UUID)

**`anuncios.html`** (Gerador):
- `AUTO_RESPONDIDOS = new Set()` — listing_ids com badge ativo
- `carregarAutoRespondidos()`: postMessage → bridge → SW → lista → re-render. Timeout 1.5s (falha silenciosa se extensão ausente)
- CSS `.chip-resposta-nova`: fundo vermelho (#dc2626), animação pulsante, texto branco
- `cardHTML()`: cards `respondeu` com listing_id no set → prefixo `🔥 RESPOSTA NOVA`
- `renderGrid()`: no filtro `respondeu`, cards com 🔥 ordenados ao topo

#### Arquitetura de dados (sem DB migration)

Badge 🔥 vive em `chrome.storage.local.auto_responded` da extensão:
```
{ 'olx:1234567890': '2026-08-28T15:30:00Z', ... }
```
TTL de 24h gerenciado pelo SW na próxima consulta `GET_AUTO_RESPONDED`.
Sem nova coluna no Supabase. Sem nova tabela. Sem migration.

### Onde o projeto ficou (28/ago/2026 — tarde)

- **Gerador** `origin/main` em `5f7bf8c` (Reforma 42), Vercel — READY (deploy automático).
- **Extensão** em `80abf79` (Reforma 42) — local apenas (sem remote). ⚠️ Requer reload em `chrome://extensions`.
- **Catafrango — loop completo**:
  ```
  novo → ABORDAR (extensão preenche msg) → ENVIEI → enviado
  enviado → [vendedor responde] → extensão detecta → respondeu (automático 🔥)
         OU → RESPONDEU (manual) → respondeu
         OU → MORTO → morto
  respondeu → AUTORIZADO → autorizado
  ```
- **Pendente operacional**: recarregar extensão + testar detecção com conversa real. Se heurística de posição geométrica não funcionar no DOM específico da OLX, ajustar seletores após inspecionar via DevTools.
- **Sprint 1 (Match Ativo)**: não tocada.
- **Reforma Visual Etapa 2**: não iniciada.

*Atualizado em 28/agosto/2026 (tarde) — Reforma 42: detecção automática de resposta OLX. Ext `80abf79`, gerador `5f7bf8c`.*

---

### Checkpoint — sessão de 01/set/2026 — Diagnóstico CNR Chat (Fix 43.7b, 43.8 e falso positivo de extração)

> **Status desta sessão: SOMENTE DIAGNÓSTICO + LOGS TEMPORÁRIOS. Nenhum patch de lógica aplicado.**

---

#### O que está comprovadamente funcionando

- **CHECK_ENVIADO → `{enviado: true}`** após ENVIEI: confirmado no log `[CNR DEBUG 43.1] CHECK_ENVIADO resp: {enviado: true} key: olx:1531235695`. O problema de timing (CHECK_ENVIADO retornando false antes da confirmação do ENVIEI) está resolvido. **Não tratar mais como causa ativa.**
- **`iniciarMonitor()` é chamado**: o monitor inicia corretamente quando status é `enviado`.
- **MutationObserver dispara**: logs DIAG A1–A8 aparecem, confirmando que o observer está ativo e detecta mudanças no DOM.
- **`RESPOSTA_DETECTADA` → SW → `{ok: true}`**: a cadeia de envio ao SW funciona quando a detecção dispara.
- **Fix 43.8 (ABORDAR preenche mensagem)**: confirmado funcionando em teste real (VW Gol, listing_id `1531235695`).
- **Fix 43.7b (baseline)**: baselineApos está sendo capturado e passado — o mecanismo de baseline existe e funciona.
- **Fluxo ENVIEI → CNR_CONFIRMAR_ENVIO → SW**: logs DIAG ENVIO adicionados mas ainda não testados — o problema de timing original foi contornado antes de usar esses logs.

---

#### O que foi diagnosticado (causa raiz confirmada)

**Falso positivo na captura da "resposta do vendedor":**

`encontrarChatBody()` retorna `document.body` (nenhum iframe detectado na sessão de teste). O MutationObserver observa **o corpo inteiro da página OLX**, não só a área de mensagens. Quando o React re-renderizou o painel lateral de "Detalhes da conversa" (botões "Acessar perfil completo", "Marcar como não lido", "Denunciar conversa", "Bloquear usuário", "Excluir conversa"), esses elementos de UI adicionaram 100 chars ao `body.innerText` numa posição APÓS o ANCORA da nossa mensagem. A heurística de crescimento disparou corretamente (`aposAtual.length > aposAnt.length + 10`), mas o crescimento era de **UI, não de mensagem do vendedor**.

**Evidência direta dos logs:**
- `aposAnt.length: 660` → `aposAtual.length: 760` (delta = 100 chars)
- delta final: `"on\nAcessar perfil completo\nMarcar como não lido\nDenunciar conversa\nBloquear usuário\nExcluir conversa"`
- Isso é o painel lateral da OLX, não uma mensagem

---

#### O que ainda está pendente

1. **Inspeção do DOM real da OLX** — Para definir o patch, precisamos saber:
   - Qual elemento é o container de mensagens (não `document.body`)
   - Se mensagens incoming têm `data-testid`, `aria-label`, `role` ou atributo que as distingue de outgoing
   - Qual elemento contém o texto real de cada bolha
   - **Método**: no DevTools do chat OLX, inspecionar uma mensagem do vendedor e uma do Yuri; rodar os dois snippets JS documentados na análise (listagem de `data-testid`s e inspecção de bolhas)

2. **Definição e implementação do patch** — Após inspeção do DOM, o patch deve:
   - Substituir a extração de conteúdo de `body.innerText` por leitura de bolhas incoming específicas
   - Manter o MutationObserver como **trigger** (pode continuar observando body)
   - Mudar apenas **o que é lido como conteúdo** no momento de chamar `registrarResposta()`
   - Não tocar em `RESPOSTA_DETECTADA`, `CHECK_ENVIADO`, `confirmarEnvio`, `persistirMensagem`, ABORDAR, badge

3. **Remoção dos logs temporários** — Após diagnóstico completo e patch validado:
   - Remover DIAG A1–A8 e B1–B5 de `olx-chat-monitor.js`
   - Remover DIAG ENVIO 1–9 de `anuncios.html`, `cnr-bridge.js` e `sw.js`
   - Os backups `.bak-diag43` e `.bak-diag-envio` podem ser excluídos junto

---

#### Arquivos alterados nesta sessão (somente logs temporários)

| Arquivo | O que foi adicionado | Backup |
|---|---|---|
| `content/olx-chat-monitor.js` | Logs DIAG A1–A8 (em `checarDelta`) e B1–B5 (em `verificarExistente`) | `olx-chat-monitor.js.bak-diag43` |
| `content/cnr-bridge.js` | Logs DIAG ENVIO 2 e 3 (handler CNR_CONFIRMAR_ENVIO; erro agora visível em vez de silenciado) | `cnr-bridge.js.bak-diag-envio` |
| `background/sw.js` | Logs DIAG ENVIO 4–9 (handler CONFIRMAR_ENVIO, função confirmarEnvio, leitura pós-write, CHECK_ENVIADO) | `sw.js.bak-diag-envio` |
| `anuncios.html` (gerador) | Log DIAG ENVIO 1 (antes do postMessage CNR_CONFIRMAR_ENVIO em `avancar()`) | `anuncios.html.bak-diag-envio` |

**Sintaxe verificada**: `node --check cnr-bridge.js` → OK; `node --check sw.js` → OK.

**Nenhum patch de lógica foi aplicado nesta sessão. Nenhum arquivo de produção foi alterado (somente logs temporários).**

---

#### Testes realizados e resultados

| Teste | Listing | Resultado |
|---|---|---|
| Ford Ka (anterior) — CHECK_ENVIADO | `1530494530` | `{enviado: false}` — causa: ENVIEI ainda não havia sido processado; problema de timing |
| VW Gol — fluxo completo ABORDAR+ENVIEI | `1531235695` | CHECK_ENVIADO `{enviado: true}` ✅; monitor inicia ✅; MutationObserver dispara ✅ |
| VW Gol — captura de "resposta" | `1531235695` | ❌ Falso positivo: capturou elementos do painel lateral OLX ("Acessar perfil completo") em vez de mensagem do vendedor |

---

#### O que NÃO deve ser alterado até retomarmos

- `olx-chat.js` (Fix 43.8 — ABORDAR preenche mensagem): **INTOCADO**
- `sw.js` — handlers `RESPOSTA_DETECTADA`, `respostaDetectada`, `persistirMensagem`, `marcarRespondeu`, `confirmarEnvio`: **INTOCADOS** (somente logs DIAG adicionados)
- `anuncios.html` — toda lógica exceto o log DIAG ENVIO 1 adicionado: **INTOCADA**
- Badge `🔥 RESPOSTA NOVA` e `auto_responded`: **INTOCADOS**
- MutationObserver em `olx-chat-monitor.js`: **INTOCADO** (pode permanecer como trigger)
- Tabela `olx_mensagens` no Supabase: **INTOCADA**
- Fix 43.2b (Caminho A `?list-id=`, Caminho B `?chat-id=`): **INTOCADO**

---

#### Próximo passo ao retomar

**Etapa 1 — Inspeção do DOM (5 min, feita pelo Yuri no DevTools do OLX)**

Com o chat de um anúncio aberto, rodar no console:
```javascript
[...new Set([...document.querySelectorAll('[data-testid]')].map(el => el.dataset.testid))].sort()
```
E também inspecionar uma bolha do vendedor e uma do Yuri no painel Elements, copiando o HTML do elemento que representa cada bolha.

**Etapa 2 — Definir seletor correto** com base nos dados do DOM real.

**Etapa 3 — Implementar patch** na função `registrarResposta()` ou em uma nova função `extrairMensagemIncoming()`, substituindo a extração de conteúdo por leitura de bolhas específicas.

**Etapa 4 — Validar** com conversa real onde o vendedor respondeu.

**Etapa 5 — Remover logs temporários** (DIAG A/B e DIAG ENVIO).

*Atualizado em 01/setembro/2026 — Diagnóstico CNR Chat: causa raiz do falso positivo confirmada (UI panel OLX capturado em body.innerText). Nenhum patch aplicado. Próximo passo: inspeção do DOM real da OLX.*

---

### Fix 43.9 — Extração de mensagem incoming via DOM real (01/set/2026)

**Problema corrigido:** `olx-chat-monitor.js` usava `body.innerText` (delta após ANCORA) como conteúdo da resposta detectada. Quando o React re-renderizava o painel lateral de detalhes da conversa OLX, os elementos de UI ("Acessar perfil completo", "Marcar como não lido", "Denunciar conversa"...) cresciam APÓS o ANCORA no innerText — disparando `registrarResposta()` com lixo de UI em vez de mensagem real.

**DOM real inspecionado (01/set/2026):**
- Span de texto de bolhas: `span.self-start.wrap-anywhere` (Tailwind — estável)
- Pai da bolha INCOMING (vendedor): `div.sc-iUKrAm.sc-efQVjI.jQpSbC.dlIyBd`
- Pai da bolha OUTGOING (Yuri): `div.sc-iUKrAm.sc-iAKZmh.jQpSbC.jlWyFh`
- Diferenciador: `sc-iAKZmh` / `jlWyFh` presentes apenas na bolha outgoing

**Solução (patch mínimo em `olx-chat-monitor.js`):**
- MutationObserver permanece como **trigger** — continua comparando `body.innerText` para detectar mudança
- O **conteúdo** enviado a `registrarResposta()` agora vem de `coletarMensagensIncoming()` — nova função que:
  1. Seleciona `span.self-start.wrap-anywhere` no `chatDoc` (main ou iframe)
  2. Filtra spans cujo pai contém `CLASSE_OUTGOING` → exclui bolhas do Yuri
  3. Exclui spans com início do texto da ANCORA
  4. Retorna array de textos incoming — `registrarResposta` recebe o último
- `CLASSE_OUTGOING = ['sc-iAKZmh', 'jlWyFh']` centralizado como constante — atualizar se OLX reconstruir

**Arquivo alterado:** `content/olx-chat-monitor.js`
**Backup:** `olx-chat-monitor.js.bak-fix43.9`
**Sintaxe:** `node --check` → OK

**Funções alteradas:**
- `iniciarMonitor()` — +1 linha: `chatDoc = chatBody.ownerDocument || document`
- `coletarMensagensIncoming()` — NOVA função (seção 6)
- `verificarExistente()` — trigger permanece; conteúdo agora via `coletarMensagensIncoming()`
- `checarDelta()` — idem

**Funções intocadas:** `encontrarChatBody`, `extrairApos`, `limpar`, `registrarResposta`, `prosseguir`, `tentarUrl`, MutationObserver config, `jaDetectou`, CHECK_ENVIADO, RESPOSTA_DETECTADA, persistirMensagem, ABORDAR, olx-chat.js

**Logs temporários ainda presentes:** DIAG A1–A8, B1–B5 (para validação do próximo teste)

**Próximo passo:** recarregar extensão → ABORDAR → enviar msg → ENVIEI → abrir/recarregar chat OLX → verificar console:
- `[CNR Monitor] checarDelta DOM incoming: 1 ['"O valor para o carro..."']` → extração funcionou
- `[CNR Monitor] 🔥 Resposta detectada — "O valor para o carro..."` → conteúdo correto
- Verificar no Supabase (`olx_mensagens`) que a mensagem real do vendedor foi persistida

**Após validação:** remover logs DIAG A/B e DIAG ENVIO (todos temporários).*

---

### Checkpoint — sessão de 01–02/set/2026 — CNR Chat + correções em Vendas

#### Parte 1 — CNR Chat (extensão, não versionada nesta sessão)

Espelhamento da conversa OLX no Gerador passou a funcionar. Sequência de causas encontradas e corrigidas, em ordem:

1. **`processListings` sobrescrevia writes concorrentes** — read-modify-write no `seen` sem guarda; corrida com `confirmarEnvio` revertia `status` para `novo`. Fix: entradas conhecidas não são mais atualizadas; só grava quando há listing novo.
2. **`_enviarTextoNaAba` fingia sucesso** — retornava `ok:true` logo após `btn.click()`, sem verificar envio. Violava a regra de compliance "nunca fingir sucesso". Fix: aguarda até 2,4s a limpeza do campo (sinal de que a OLX aceitou); só então `ok:true`. Removido o encadeamento botão→Enter (risco de envio duplicado).
3. **Caixa de resposta inalcançável** — só abria pelo chip `RESPOSTA NOVA`, que exige auto-detecção. Fix: botão `✏️ Responder` em `enviado` e em `respondeu` manual.
4. **Fix 43.7 nunca havia sido publicado** — ~400 linhas (CSS, `toggleResponder`, `enviarResposta`) só existiam local. Commit `a09125c`.
5. **Monitor observava iframe de anúncio** — `encontrarChatBody()` pegava o primeiro iframe same-origin, que na OLX é um GPT/DoubleClick vazio. Fix: escolhe o documento por evidência (bolhas de mensagem, depois âncora), com fallback no documento principal; `coletarMensagens` varre todos os documentos acessíveis.
6. **Retry infinito da âncora** — reagendava para sempre (visto rodando 46×). Teto de 15 tentativas.
7. **Portão errado bloqueava o espelhamento** — `CHECK_ENVIADO` governava espelhar E detectar. Separado: espelhar roda sempre; detectar continua exigindo estado pós-envio.
8. **Ordem do DOM não é cronológica** — a OLX renderiza "Novas mensagens" em bloco separado, que aparece antes no documento. Fix: ordenar por posição visual (`getBoundingClientRect().top`).
9. **Cartão do anúncio virava mensagem** — título+preço do topo casam com `SEL_TEXTO_MSG`. Filtrado.
10. **Identidade do anúncio pela URL era não-confiável** — URL vinha só com `?chat-id`, ou apontando para outro anúncio. Fix: resolução em cascata — link do anúncio na página → tabela `anuncios` do Gerador → `seen` local (fraco).

Falso alarme registrado: interpretei três fontes concordantes (`seen`, Supabase, Gerador) como corrompidas por confiar numa anotação de sessão anterior ("Ford Ka = 1530494530"). Verificação abrindo o anúncio provou que **1530494530 é o Corolla** e não havia corrupção alguma.

**Pendente:** teste de envio pelo Gerador (nunca executado), `chat.html` dedicada, remoção dos logs DIAG.

#### Parte 2 — Vendas (commits `c6ba2ca`, `03d2002`, `9daca70`, `096a42b`, `085dc1c`)

- **Ordenação** — `order=created_at.desc` colocava NULOS PRIMEIRO (padrão do Postgres em DESC). Vendas históricas com `created_at` nulo ocupavam o topo e empurravam registros novos para o fim. Agora `data_venda.desc.nullslast,created_at.desc.nullslast`.
- **Placa Mercosul** — `renderPlaca` só removia espaços; o hífen de `LMX-1J26` quebrava o regex e exibia como placa antiga. Agora remove tudo que não é alfanumérico.
- **Máscaras BR em vendas.html** — as funções existiam desde a Reforma 30, mas só formatavam dados vindos do CRM; nunca foram ligadas ao digitar. Agora `oninput` em telefone, CPF/CNPJ e nos 4 campos de valor. CEP ganhou máscara em compradores.html.
- **Telefone `(XX)9XXXX-XXXX`** — sem espaço após o parêntese, padrão definido pelo Yuri, aplicado nos dois módulos.
- **DELETE de mensagens** — `?mensagens=1` agora aceita DELETE por `listing_id`, com botão 🗑 na thread. Necessário porque o dedupe por `msg_hash` impede que re-espelhar corrija linhas já gravadas.
- **Confirmação de salvamento** — a venda gravada pisca em verde e a tela rola até ela; tarja de sucesso de 2,8s → 5s.
- **Autopreenchimento por nome** — dados de contato só vinham ao clicar na sugestão. Agora, no blur, nome que bate exatamente preenche campos vazios (nunca sobrescreve).

**Diagnóstico honesto:** o botão Salvar nunca esteve quebrado. O que existia era retorno visual fraco somado à ordenação que enterrava o registro. A causa da falha original (Renegade) não foi comprovada — hipótese remanescente é aba aberta desde antes de a chave existir, com `KEY` vazia.

**⚠️ Pendência de segurança:** o valor da `VENDAS_KEY` foi exposto em conversa. **Rotacionar no painel da Vercel** e reconfigurar o `localStorage` do navegador.

*Atualizado em 02/setembro/2026.*

---

### Checkpoint — 02/set/2026 (madrugada) — Compliance: fontes verificadas e decisão

> Sessão de pesquisa e decisão. **Nenhum código do Radar ou do Chat foi alterado.**

#### Correção de premissa

As regras de `compliance-extensao.md` são **decisões de projeto do Yuri** (linha 13: "Estabelecidas pelo usuário em 2026-08-30"), **não são Termos da OLX**. Claude vinha citando-as como "fundação jurídica" e bloqueou desenvolvimento com base nisso. Erro corrigido nesta sessão.

O documento também afirma, na linha 52, que "toda a extensão está dentro do escopo" — **isso é falso**: 4 das 11 regras conflitam com o Radar (abrir abas sozinho, scraping, varrer anúncios, operar em abas não abertas pelo Yuri). Todas as regras cumpridas se referem a mensagens; todas as conflitantes, a coleta. **O documento precisa ser reescrito** declarando escopo real.

#### Fontes verificadas (primárias)

**Termos do Chat** — https://ajuda.olx.com.br/s/article/termos-uso-do-chat — lido diretamente, cláusulas confirmadas:
- *"A finalidade do Chat é o fornecimento de uma ferramenta adicional para que o usuário interessado em um anúncio... possa buscar maiores esclarecimentos sobre a oferta"* + *"Você deverá utilizar o Chat exclusivamente para esta Finalidade."*
- Proíbe *"publicidade não solicitada ou autorizada, material publicitário, 'spam'... ou qualquer outra forma de solicitação."*
- Proíbe *"assediar, aliciar, abordar, direcionar ou induzir outros usuários a acessarem, utilizarem ou migrarem para outras plataformas, concorrentes ou não, sem a devida autorização expressa da OLX."*
- *"A identificação será feita, em regra, por meio de ferramentas tecnológicas automatizadas."*

**Termos Gerais** — PDF (Claude não conseguiu decodificar; **Yuri leu e enviou print**). Bloco "Você não poderá, exceto com autorização prévia e expressa dos titulares":
- *"Realizar web crawling no Site, reproduzir, exibir, copiar, transformar, modificar, desmontar, realizar engenharia reversa, distribuir, alugar, fornecer, colocar à disposição do público... qualquer dos elementos protegidos."*
- *"Utilizar de textos, imagens, anúncios e qualquer outro elemento incluído ou disponível no Site para sua posterior inclusão em quaisquer veículos alheios ao Site sem a autorização prévia e por escrito do Grupo OLX."*

Nota: a proibição é **"sem autorização prévia e expressa"** — não é vedação absoluta. Autorização é contemplada.

#### Decisão do Yuri (02/set/2026)

**Manter a arquitetura atual do Radar e do Chat.** Razões declaradas: opera sozinho, precisa de volume, a prática é comum no mercado (lojistas e repassadores prospectam manualmente), e ele escreve pessoalmente cada mensagem e conduz cada negociação.

Concordado: **não implementar aleatorização de intervalo** nem qualquer camuflagem. Disfarce e futura conversa com a plataforma são estratégias incompatíveis. Comportamento deve permanecer previsível e explicável.

Argumentos de defesa mais fortes (para uso futuro): "outras plataformas" num contrato de marketplace aponta para concorrentes (Webmotors, ML), não para aplicativo de mensagem; e migração para WhatsApp costuma ser mútua, não induzida. O argumento de "ausência de dano à monetização" é fraco — dano e permissão são testes diferentes.

#### Ponto crítico de timing

A janela para conversar com a OLX **não fecha por tempo — fecha na distribuição**. Enquanto é o Yuri sozinho, na própria conta, é ferramenta pessoal. No momento em que um parceiro instala, vira software distribuído (outra conta, outro volume) e a defesa de caso único desaparece.

Movimento barato sugerido: abrir chamado no suporte perguntando se existe **API ou programa de parceiros** — é pergunta, não negociação, não expõe nada. Canais oficiais costumam exigir PJ (Yuri é PF hoje).

#### Ordem acordada dos próximos passos

1. **Fechar a ponte** — teste do ENVIAR pelo Gerador (único caminho nunca executado)
2. **Filtro do Radar dentro do Gerador** (antecipado a pedido do Yuri)
3. Uso diário para achar defeitos reais
4. Varredura geral do Catafrango, correção de bugs
5. **Conversa com a OLX** — antes do parceiro, não depois
6. Oferecer a 1–2 parceiros

Recomendação anterior de adiar o item 2 fica **revogada**: com parceiros no horizonte, cada um precisa configurar buscas próprias, e sem essa tela seria necessário editar a extensão na máquina de cada um.

Restrição a respeitar: **limite de 12 funções serverless (Hobby) já atingido** — o endpoint de buscas deve entrar como modo em `fetch-anuncio.js` (`?buscas=1`), não como arquivo novo. Página HTML nova não conta no limite.

#### Pendências

- [ ] Teste do ENVIAR (adiado por horário — não enviar mensagem a vendedor de madrugada)
- [ ] **Rotacionar `VENDAS_KEY`** — valor foi exposto em conversa
- [ ] Reescrever `compliance-extensao.md` separando regra da OLX de decisão de projeto e corrigindo a afirmação de conformidade total
- [ ] Remover logs DIAG da extensão

*Atualizado em 02/setembro/2026, madrugada.*

#### Nota adicional (02/set, madrugada) — remover a exigência da aba do chat aberta

Yuri pediu: **fazer de modo que NÃO seja obrigatório manter a aba do chat aberta.**

Hoje `enviarRespostaOLX` exige uma aba de `chat.olx.com.br` já aberta e retorna
`aba_nao_encontrada` caso contrário. Isso obriga o Yuri a deixar abas abertas
e quebra a ideia de operar tudo pelo Gerador.

**É viável — mas a aba não desaparece, ela deixa de ser responsabilidade dele.**
A extensão só age através do navegador com a sessão do Yuri; não existe caminho
sem uma aba da OLX em algum momento (o contrário exigiria API privada ou
cookies, ambos proibidos pelas regras internas).

Dois desenhos possíveis:

1. **Aba sob demanda** — clique em ENVIAR abre a aba do chat em background
   (`active:false`), aguarda carregar, injeta, envia, confirma e fecha.
   Mantém 1 aba por 1 clique humano, mesma proporção do ABORDAR.

2. **Aba-hub persistente** — uma única aba de `chat.olx.com.br` fica aberta e
   é reaproveitada para todas as conversas (o chat da OLX é SPA; trocar de
   conversa não recarrega a página). Menos abas abrindo e fechando.

Pontos de atenção para a implementação:
- O SPA da OLX leva de 8 a 24s para hidratar (medido no monitor). O envio não é
  instantâneo — precisa de estado "enviando…" com tempo realista, não spinner de 1s.
- A verificação de envio real (aguardar o campo limpar) já está implementada e
  cobre o caso de a OLX recusar o clique sintético.
- Ainda falta o **teste do ENVIAR** com a aba aberta. Fazer isso primeiro: se o
  clique sintético não funcionar nem com a aba aberta, abrir aba sozinho não
  resolve nada.

---

### Checkpoint — 02/set/2026 (manhã) — CNR Chat completo: da abordagem à resposta pelo Gerador

**Marco: o ciclo fecha.** Yuri capta, aborda, acompanha e responde sem abrir a OLX. A aba da OLX existe apenas como transporte, em segundo plano, gerenciada pela extensão.

#### Defeitos encontrados e corrigidos (nesta ordem)

1. **Guarda de atribuição barrava o anúncio certo** — `conversaConfere` comparava título/preço vindos do `seen` local, enquanto a identificação vinha do Gerador. Bases divergentes (preço alterado na OLX) faziam a guarda bloquear o espelhamento do próprio anúncio identificado. Fix: `metaAnuncio` passa a ser preenchido pela mesma fonte que identificou.

2. **Mensagens de Yuri recusadas pelo banco** — gravadas como `outbound`, valor que o `CHECK (direction IN ('incoming','outgoing'))` da tabela `olx_mensagens` rejeita. Todo insert dele retornava 500. Só as do vendedor apareciam na thread.

3. **O erro era engolido** — `persistirMensagem` não lançava em HTTP não-2xx, então `sincronizarConversa` contava `salvas++` mesmo com o banco recusando. `falhas: 0` mentia e escondia os itens 1 e 2. Fix: lança com corpo da resposta.

4. **`detected_at` é hora da captura, não da mensagem** — grupos capturados em momentos diferentes ficam fora de ordem. Contornável com 🗑 + reespelhar. Limitação conhecida: mensagens antigas carregadas por rolagem semanas depois entram com carimbo de hoje. Resolver exige guardar a posição na conversa (mudança de schema) — não feito.

5. **Bolhas quase idênticas** — dois tons lavados sobre o mesmo fundo. Agora vendedor com bolha clara e contorno, Yuri com bolha sólida escura, mesmo contraste do toast. Por token, funciona nos dois temas.

#### Funcionalidades adicionadas

- **Conversa se atualiza sozinha** enquanto o card está aberto (10s). Modo silencioso: não redesenha se nada mudou, preserva a rolagem de quem lê mensagens antigas, e falha de rede não apaga a tela.
- **Aba-hub** — `garantirAbaConversa()` reaproveita UMA aba: adota a que já está na conversa, navega a hub, ou cria em background. `esperarCarregar` + `esperarCampoPronto` garantem que o chat montou antes de escrever. `enviarRespostaOLX` deixou de exigir aba aberta.
- **`ABRIR_CONVERSA`** — o Gerador prepara a aba ao abrir a conversa no card, escondendo os ~10s de montagem do SPA enquanto Yuri escreve. Estado visível: "abrindo conversa na OLX…" → "chat pronto".
- **Primeira abordagem pelo Gerador** — ABORDAR abre a caixa no card com a mensagem padrão pronta e prepara a aba em segundo plano (`active:false`). Enviar avança o status para `enviado` sozinho.
- **Erros traduzidos** — todas as falhas de envio dizem o que fazer, não só o que falhou.

#### Decisão de arquitetura

Escolhida a opção **B**: a extensão abre a aba-hub quando necessário, em vez de Yuri manter uma aberta. Segue 1 aba por ação dele, e reaproveitada. Registrado em `compliance-extensao` na memória.

#### Pendências

- [ ] **Documentos da venda do Renegade** — falha ao carregar comprovante, cautelar e documentos. Próximo item. Falta detalhar o sintoma.
- [ ] Filtro do Radar dentro do Gerador (adiado a pedido do Yuri)
- [ ] Observar a lista lateral do chat para saber de mensagens novas em conversas não abertas
- [ ] **Rotacionar `VENDAS_KEY`** — valor exposto em conversa
- [ ] Remover logs DIAG da extensão
- [ ] Reescrever `compliance-extensao.md` no repo separando regra da OLX de decisão de projeto

*Atualizado em 02/setembro/2026, manhã.*

---

### Checkpoint — 02/set/2026 (tarde) — Causa real das falhas de gravação: celular sem VENDAS_KEY

**Fato que fecha o caso:** Yuri registra vendas e anexa documentos **pelo celular** (recebe tudo por WhatsApp). O celular **nunca teve a `VENDAS_KEY` configurada**.

Como `GET` é público e só `POST/PATCH/DELETE` são protegidos, o aparelho abria tudo normalmente e recusava **toda gravação** com 401 "Acesso negado" — sem nada na tela explicando.

Isso explica os **anexos** que não carregavam, e por que nada se reproduzia no notebook, onde a chave existe. Parte da investigação foi feita no ambiente errado, porque a informação "isso é feito no celular" só apareceu depois.

**Correção — NÃO explica a venda do Renegade.** Yuri confirmou (02/set, tarde) que aquele lançamento **foi salvo do celular sem chave nenhuma**. Logo o guard não estava ativo naquele momento. A causa do Renegade continua sendo a já confirmada: `order=created_at.desc` com `NULLS FIRST` enterrava o registro novo no fim da lista.

Hipótese a verificar: a `VENDAS_KEY` foi adicionada na Vercel **depois** daquela venda. O guard passou a valer, e o celular — que nunca teve chave — perdeu a permissão de gravar sem nenhum aviso.

> Lição: eu atribuí um bug antigo a uma causa nova só porque a causa nova era real e recente. Duas falhas próximas no tempo não são a mesma falha.

#### Falha de desenho corrigida

A `VENDAS_KEY` só podia ser configurada por `localStorage.setItem` no console do navegador — que **no celular não existe**. O aparelho onde ele mais trabalha era o único impossível de configurar.

- Faixa de aviso aparece quando falta a chave, com campo para colá-la. **Não é portão**: a página funciona e a leitura continua livre; a faixa só aparece quando a gravação não funcionaria.
- Erros 401 em salvar e anexar reabrem a faixa, rolam até ela e explicam o que fazer.
- No salvar, o preenchimento é preservado para tentar de novo sem redigitar.

#### Correções de mobile no mesmo caminho

- `input[type=file]` estava com `display:none` — vários navegadores móveis não abrem o seletor nesse estado.
- Toast usava `white-space:nowrap` — mensagem saía pela lateral da tela do celular, justamente onde não há console.
- `accept` limitava a imagem e PDF; documentos em outros formatos nem apareciam como selecionáveis.
- Toast ao tocar em "+ anexar", para distinguir "toque não registrou" de "seletor não abriu".

#### Lição recorrente da sessão

Três bugs diferentes (salvar venda, espelhar mensagens, anexar documentos) tiveram o mesmo padrão: **o sistema reportava sucesso ou silêncio onde havia falha**. O tempo foi gasto procurando o defeito, não corrigindo — porque o defeito estava escondido atrás de um retorno mentiroso.

#### Pendências

- [ ] **Rotacionar `VENDAS_KEY`** (valor exposto em conversa) e colá-la nos dois aparelhos pela nova faixa
- [ ] Confirmar que anexo funciona no celular após configurar a chave
- [ ] Remover o `alert()` temporário do erro de anexo
- [ ] Filtro do Radar no Gerador
- [ ] Observar lista lateral do chat para mensagens novas em conversas não abertas
- [ ] Remover logs DIAG da extensão

*Atualizado em 02/setembro/2026, tarde.*

---

### Checkpoint — 02/set/2026 (fim de tarde) — Chave removida e leitura da OLX sai do servidor

#### 1. Fim da VENDAS_KEY

Yuri é o operador único e não quer senha. A `VENDAS_KEY` foi removida das
variáveis de ambiente da Vercel — o guard é `if (VENDAS_KEY && ...)`, então
sem a variável ele fica inerte, sem mudança de código. Isso também neutraliza
a chave que vazou em conversa.

O aviso no topo de `vendas.html` **não aparece mais sozinho**; ficou só como
reação a um 401 real, caso a chave volte um dia.

> Exposição conhecida, não resolvida: o `GET` da API é público. Quem souber a
> URL lê vendas e compradores, incluindo CPF e telefone de terceiros. Isso
> antecede esta mudança. Assunto em aberto.

#### 2. Leitura de anúncio da OLX passa para o navegador

O modo padrão de `api/fetch-anuncio.js` buscava a página do anúncio **a partir
do servidor da Vercel, com `User-Agent` de Chrome forjado**. Não era o
navegador do Yuri, não era a sessão dele, e a identificação era falsa — o
único trecho do sistema que se parecia com *web crawling*, vedado pelos Termos
da OLX sem autorização prévia.

Descoberto ao conferir o código para escrever o documento da captação. Não
estava em nenhuma auditoria anterior porque as auditorias olharam a extensão,
e este trecho estava do lado do servidor.

- Novo handler `LER_ANUNCIO` no SW: abre o anúncio em aba de segundo plano, na
  sessão logada, lê o texto renderizado, fecha a aba. Repete até o texto parar
  de crescer (teto 10 ciclos) porque `complete` não significa React montado.
- Ponte `CNR_LER_ANUNCIO` → `CNR_ANUNCIO_LIDO`.
- `index.html`: links da OLX vão pela extensão; outros domínios seguem pelo
  servidor (os Termos da OLX não os alcançam, e abrir aba para qualquer
  domínio exigiria host permission irrestrita).
- `api/fetch-anuncio.js` **recusa URLs da OLX explicitamente**. Sem fallback
  silencioso: cair no servidor quando a extensão falha reintroduziria
  exatamente o que saímos de lá para evitar.

#### 3. Documento da captação

Artefato publicado descrevendo o sistema, a pegada real (~72 páginas/dia, 1
conta, 0 mensagens automáticas) e a situação perante os Termos em três níveis.
Destinado ao irmão do Yuri (marketing, PJ), que vai abrir contato com a OLX.

Enquadramento definido: **não pedir permissão para automatizar**. Pedir como
revendedor PJ se existe integração oficial, API de parceiro ou plano
profissional. Se houver, a zona cinzenta desaparece inteira.

#### Pendências

- [ ] **Filtro do Radar dentro do Gerador** — próximo item; vai em
      `api/fetch-anuncio.js?buscas=1` (teto de 12 funções na Hobby já atingido)
- [ ] Testar a leitura de link da OLX pela extensão (exige recarregar a
      extensão **e dar F5 nas abas abertas**)
- [ ] Observar lista lateral do chat para mensagens novas em conversas fechadas
- [ ] Remover logs DIAG da extensão (A1–A8, B1–B5, ENVIO 1–9, 43.1/43.2)
- [ ] Reescrever `compliance-extensao.md` do repo (a cópia da memória já está)
- [ ] Decidir o que fazer com o `GET` público da API

*Atualizado em 02/setembro/2026, fim de tarde.*

---

### Checkpoint — 02/set/2026 (noite) — Radar configurável pelo Gerador (concluído)

Buscas saíram do `chrome.storage.local` de cada máquina e passaram para a
tabela `buscas`, editadas em `/radar.html`. **Em produção com 4 buscas:**
Garopaba, Paulo Lopes, Imbituba, Imaruí.

- Tabela `buscas` (`supabase/migration-buscas.sql`), id gerado pelo cliente
- Endpoint `?buscas=1` em `api/fetch-anuncio.js` (teto de 12 funções na Hobby)
- Tela `/radar.html` + item no `sidebar.js`
- `carregarBuscas()` no SW, com cópia local como resiliência a queda da Vercel

**Desenho:** o usuário cola uma URL que já funciona na OLX; a tela decompõe
em campos e **preserva intacto o que não reconhece**. Não monta URL do zero —
os params da OLX mudam sem aviso. Testado: round-trip não perde param
desconhecido, editar um campo não afeta os outros, path preservado.

Mapeamento confirmado contra as buscas reais do Yuri: `ps`/`pe` preço,
`rs`/`re` ano. Preservados sem interpretação: `f`, `gb`, `hgnv`, `sp`.

#### Três armadilhas encontradas nesta etapa

1. **POST substitui o conjunto inteiro.** Yuri perguntou "salvar não apaga as
   demais?" antes de eu explicar — e teria apagado. Agora a tela avisa com os
   números quando o salvamento remove buscas, e diz no topo que a lista é a
   configuração completa.
2. **A página de opções mentia por construção:** 3 campos fixos no HTML e
   `searches.slice(0,3)`. Com 4 buscas mostrava 3, parecendo que a quarta não
   salvou. Pior: era editável, competindo como segunda fonte de verdade. Agora
   só espelha, com qualquer número, e aponta para o Radar.
3. **Recarregar a extensão não sincronizava.** O alarme é de 60min e reload
   não o dispara, então a config nova só chegaria até uma hora depois. Agora
   sincroniza em `onInstalled`/`onStartup`, mais botão manual.

> Padrão que se repetiu a sessão inteira: **a tela dizia uma coisa e o sistema
> fazia outra**. Aconteceu no envio que fingia sucesso, no `persistirMensagem`
> que engolia 500, no anexo sem feedback, na dica que mandava não colar link
> da OLX, e aqui duas vezes. Em nenhum caso o Yuri tinha como descobrir
> olhando de fora — o custo caiu todo sobre ele.

#### Pendências

- [ ] **`GET` público da API** — expõe vendas e compradores (CPF, telefone) a
      quem souber a URL. A mais importante das pendências.
- [ ] Irmão do Yuri (marketing, PJ) abrindo contato com a OLX; documento
      pronto e atualizado
- [ ] Observar lista lateral do chat para mensagens em conversas fechadas
- [ ] Remover logs DIAG da extensão (A1–A8, B1–B5, ENVIO 1–9, 43.1/43.2)
- [ ] Reescrever `compliance-extensao.md` do repo
- [ ] Filtro de quilometragem no Radar, se o Yuri usar

*Atualizado em 02/setembro/2026, noite.*

---

### Planejado — fim de setembro/2026: segunda operadora (mãe do Yuri)

Yuri vai comprar um notebook para a mãe, que passará a fazer a **abordagem
dos anúncios**. Segundo operador, segunda máquina.

**Não é multi-tenancy.** Mesma empresa, mesmos dados, compartilhados de
propósito. O `GET` público e o `SERVICE_ROLE_KEY` sem escopo continuam
aceitáveis aqui — o que muda de verdade é o número de máquinas e,
possivelmente, de contas OLX.

#### O que a configuração dela exige

- Extensão carregada (modo desenvolvedor, pasta descompactada)
- `gerador_url` nas opções apontando para o app publicado
- **As buscas não precisam ser configuradas** — vêm do Gerador
  automaticamente. É o retorno direto da tela Radar feita em 02/set: sem ela,
  seria preciso digitar as 4 URLs à mão na máquina dela.
- `seen`/`queue` são locais por máquina: os dois radares rodam independentes
  e alimentam a mesma tabela `anuncios` por upsert de `listing_id`. Sem
  conflito, mas com trabalho duplicado.

#### Decisão em aberto — conta OLX dela ou dele?

Afeta duas coisas e precisa ser resolvida antes do contato com a OLX:

1. **O documento da captação afirma "1 conta OLX" e "~72 páginas/dia".** Com
   duas máquinas viram ~144/dia, e com conta própria dela deixam de ser uma
   conta. Se o irmão já tiver aberto conversa com a OLX, os números
   apresentados precisam bater com a realidade — a força daquele documento
   está inteira na precisão dele.
2. **Conta própria dela** = as conversas dela ficam na sessão dela. O espelho
   no Gerador continua funcionando (é por `listing_id`), mas responder pelo
   card só funciona na máquina de quem tem a conversa aberta.
   **Conta compartilhada** = mais simples operacionalmente, mas é
   compartilhamento de credencial, que costuma ser vedado em termos de uso.

Vale checar os Termos da OLX sobre conta compartilhada antes de decidir.

#### Reclassificação: `GET` público da API

Sai de "prioridade". Yuri argumentou, corretamente, que o app não está
indexado (`noindex,nofollow`) e a URL não é adivinhável — o risco prático
hoje é baixo, e eu havia exagerado o quadro. Fica como **pré-requisito do
primeiro parceiro externo**, junto do trabalho de multi-tenancy, que é quando
a URL passa a circular de verdade e os dados deixam de ser todos da mesma
empresa.

*Registrado em 02/setembro/2026, noite.*

---

### Checkpoint — 02/set/2026 — Painel de desempenho da captação

Adicionado em `anuncios.html` (colapsável, abaixo das métricas). Por busca:
trazidos, abordados, viraram carro, conversão — mais a quebra dos motivos de
morte. Sem migration: `search_name`, `vehicle_id` e `motivo_morte` já eram
gravados; faltava somar.

**Primeira leitura real (132 anúncios):** Imbituba 60/17 abordados, Garopaba
60/5, Paulo Lopes 12/1. Mesmo volume trazido, atenção muito diferente.

**Dois zeros que importam:**
- `Viraram carro: 0` — nenhum anúncio foi vinculado a veículo do catálogo. O
  `vehicle_id` existe e o botão existe, mas não vinha sendo usado. Enquanto
  não for, a coluna de conversão não significa nada.
- `Sem motivo anotado: 7` — mortes registradas sem motivo.

Decisão: **deixar rodar sem forçar nada.** Não tornar o vínculo obrigatório
nem mexer no fluxo diário antes do Yuri ver o painel funcionando por alguns
dias. Se ele quiser, o passo seguinte é dar mais destaque ao vínculo com o
catálogo no card — mas isso altera o fluxo dele e a decisão é dele.

**Nota sobre os "sócios" (ChatGPT, Grok, Gemini, Perplexity):** consultados
com o `CONTEXTO.md`. Nenhum contrariou as decisões da seção 6 — o documento
cumpriu a função. Grok perguntou sobre o `CHECK_ENVIADO` recusar status
`respondeu`: **já estava corrigido** (`sw.js:152`, aceita enviado/respondeu/
morto ou `sent_at`). Perplexity sugeriu 3 colunas que já existiam, e sugeriu
criptografar campos sensíveis no Supabase — recusado: a API descriptografaria
para o mesmo `GET` público, então não protegeria de nada e custaria busca e
ordenação no banco.

*Atualizado em 02/setembro/2026.*

---

### Teste completo do Gerador — 02/set/2026

Varredura em produção: 13 endpoints, 14 páginas, render vs API, 7 filtros,
viewport 375px em 9 páginas, contraste em modo escuro, e o circuito
Radar → extensão → Gerador.

#### Bugs encontrados e corrigidos

1. **`vendas.html` estourava 98px no celular.** Chips de anexo sem
   `max-width` nem truncamento; nomes vindos do WhatsApp passam de 400px.
   Rolagem horizontal na tela que ele mais usa no celular. Só apareceu agora
   porque anexar pelo celular só passou a funcionar hoje. → `e520479`
2. **Faixa de aviso ilegível no modo escuro.** `color:#fff` fixo sobre
   `--severity-warn`, que no escuro vira âmbar claro: contraste 2,24.
   Trocado por `var(--surface)`, que acompanha o tema. → `9b83623`

#### Falsos positivos investigados (não mexer)

- `/api/ping` devolve 404 — **correto**. Está no `.vercelignore` e fora do
  git de propósito, para segurar exatamente 12 funções. O cron usa
  `/api/utils?type=ping`, que responde OK.
- `anuncios.html` com 134 elementos de contraste 1,39 — são os pontinhos `·`
  separadores das métricas. Decorativos.
- Busca em `vendas.html` "não filtra" — a página não tem busca de lista; o
  campo que peguei era `m-vendedor_nome`, do formulário.

#### Observações (não são defeitos)

- `home.html` faz 7 chamadas de API, com `/api/catalogo` e `/api/vendas`
  **duplicadas**. Dobra a latência de cold start no painel.
- `vendas.html` não tem busca na lista — 114 registros e crescendo.
- Cold start medido: `fetch-anuncio` 1,2s · `utils?type=cep` 3,4s ·
  `parse` 4,5s · `fipe-search` 2,8s.

#### Confirmação ao vivo

O painel de desempenho passou a mostrar **Imaruí com 4 anúncios** durante o
teste. A busca criada hoje na tela Radar foi puxada pela extensão, o radar
rodou e os anúncios chegaram — o circuito fechou sozinho, sem teste
artificial.

*Registrado em 02/setembro/2026.*

---

### Auditoria de fricção — 02/set/2026

Pedido do Yuri: *"o que tem duplicidade, o que ao invés de me facilitar, me
atrapalha. Criamos o gerador para facilitar a minha vida, não para me
atrapalhar e ter que ficar alimentando IA."*

#### Erro de método que cometi primeiro

Medi taxa de preenchimento dos campos e tratei "vazio" como "inútil". Errado:
as 114 vendas são majoritariamente anteriores aos campos existirem, e o Yuri
voltou a vender agora. Ele corrigiu: *"são informações importantes para um
futuro pós-venda"*. **Campo vazio ≠ campo desnecessário.** A pergunta certa
não é onde está vazio — é onde ele digita a mesma coisa duas vezes.

#### Fricções corrigidas

1. **`+ Catálogo` jogava fora o que a IA acabara de ler.** O título traz
   marca, modelo, versão, ano e combustível, e o Gerador tem `/api/parse` que
   extrai isso. Mesmo assim o veículo nascia só com observações/valor/região,
   e tudo era redigitado na tela seguinte. Testado em 5 anúncios reais: 5/5
   corretos. Se o parse falhar, cria como antes. → `8119b91`
2. **`valor_compra` não viajava do catálogo para a venda.** `vendas.html`
   sempre soube receber o parâmetro; `catalogo.html` nunca enviava. → `924c8e9`
3. **Lucro era conta de cabeça.** Campo vazio agora é calculado; campo
   preenchido só ganha uma dica de conferência. **Não sobrescreve** — a
   divergência pode ser despesa ou desconto. → `924c8e9`
4. **Painel buscava `/api/catalogo` e `/api/vendas` duas vezes.** 7 → 5
   chamadas. `buscar()` guarda a Promise, não a resposta. → `9099c4d`

#### Divergência encontrada nos dados reais

Citroën C3: venda 26.500 − repasse 25.000 = 1.500, mas lucro anotado 1.000.
Renegade confere. Pode haver motivo; a dica agora mostra a diferença sem
alterar nada.

#### Já estava bem-feito — não mexer

- Busca por placa preenche 9 campos do formulário de venda
- Autocomplete do CRM preenche comprador e vendedor (nome, telefone, CPF)
- `registrarVenda` do catálogo já carregava 9 campos
- `busca.html` (busca global) e `consultas.html` (placa) não se sobrepõem
- `/api/compradores` ×3 no painel devolve dados genuinamente diferentes
  (17 compradores, 6 negociações, 1 agregado) — não é duplicação

#### Em aberto

- `vendas.html` não tem busca na lista — 114 registros e crescendo
- `_partirVeiculo` erra em "Land Rover Range Rover Evoque" (modelo vira
  "Range"). Carro raro no mercado dele; corrigível na tela

*Registrado em 02/setembro/2026.*

---

### Gerador de anúncio do WhatsApp — bugs de formatação (02/set/2026)

Sete defeitos, todos corrigidos e verificados em produção.

#### Linhas em branco (`198b8c0`)

Cada seção decidia sozinha se abria com linha em branco, e ninguém arrumava o
resultado. Quatro sintomas visíveis:

1. Sem valor e sem FIPE → duas linhas em branco antes do link
2. Sem veículo (só região) → o texto **abria** em branco, porque a linha da
   região trazia um `\n` no começo
3. Observação livre com várias quebras → vários brancos seguidos
4. Formulário vazio → duas linhas em branco antes do link

Corrigido com `_normalizarAnuncio()` no fim da montagem, em vez de acertar
seção por seção e errar de novo na próxima que surgisse.

#### Três montadores do mesmo texto (`198b8c0`)

- `montarTextoAnuncio()` — o de referência
- `gerar()` — repetia a composição linha por linha. **Unificado**: agora chama
  a função. Eram duas cópias que podiam divergir sem ninguém notar, já que só
  uma aparecia no preview.
- `gerarColetados()` — terceira cópia, e **já havia divergido**: só ela tem a
  seção `*GASTOS:*`. Não foi unificada porque a diferença é real; recebeu a
  mesma normalização final.

#### Caixa do nome do veículo (`865a177`)

`toTitleCase` rebaixava a palavra inteira antes de capitalizar, destruindo as
siglas. **Isso já saía errado nos anúncios do modo Coletados** (o do link e da
IA): `XEI`→"Xei", `16V`→"16v", `MPI`→"Mpi", `LTZ`→"Ltz".

E no modo normal a função nem era aplicada, então a inconsistência da FIPE ia
direto para o WhatsApp: `VIRTUS 1.6 MSI Flex 16V 4p Aut.` gritando ao lado de
`Corolla Altis`, e `ASTON MARTIN` ao lado de `Audi`.

Regra nova — só muda o que está claramente fora do lugar:

| Entrada | Ação |
|---|---|
| palavra com dígito | intocada (`16V`, `1.4`, `4p`, `250TSI`, `320i`) |
| CAIXA ALTA, 4+ letras | é modelo → `VIRTUS` vira `Virtus` |
| CAIXA ALTA, até 3 | é sigla → `XEI`, `MSI`, `LTZ`, `CS`, `RAM`, `BMW` |
| já misturada | intocada (`Flex`, `Aut.`, `GR-S`, `Corolla`) |
| toda minúscula | capitaliza (`strada` → `Strada`) |

Testado em 10 nomes reais: 8 intactos, 2 corrigidos.

#### Verificado e correto — não mexer

- `wa.me/?text=` com `encodeURIComponent`: o texto chega idêntico ao gerado
- Preview HTML corresponde ao texto (negrito, link, quebras)
- Asterisco solto numa observação não cria negrito falso
- Valor já formatado (`R$ 45.000,00`) e km com sufixo (`80.000 km`) não duplicam

*Registrado em 02/setembro/2026.*

---

### Busca FIPE — erros de combustível e lentidão (02/set/2026)

Reportado pelo Yuri: *"ainda dá alguns erros na busca da FIPE"*.

#### Erro de resultado — o combustível pedido era ignorado (`d9efba7`)

O combustível só era usado para escolher entre os **anos** de um modelo já
definido, nunca para escolher o modelo. Como o laço parava no primeiro
candidato com o ano certo, o pedido era descartado:

| Pedido | Devolvia | Deveria |
|---|---|---|
| Hilux SRV 2.8 **diesel** 2020 | CD SRV 4x2 2.7 **Flex** — R$ 167.870 | CD SRV 4x4 2.8 TDI **Diesel** — R$ 186.483 |
| Corolla 2023 **flex** | Altis 1.8 **(Híbrido)** | Altis 2.0 **Flex** |

**R$ 18.613 de diferença** no Hilux. Agora a 1ª passada exige ano E
combustível; a lógica antiga virou recuo, não regra.

#### Lentidão — três causas (`f246de4`, `03bc6fc`)

Diagnóstico por medição, não por suposição: a Parallelum responde em
0,5–0,9s e **não** devolve 429 com 8 chamadas simultâneas. Era volume.

1. Quando a marca não aparece no texto ("Hilux SRV 2.8", "Gol 1.0"), o código
   varre até ~35 marcas populares — **em série**. Títulos da OLX trazem a
   marca e por isso caíam no caminho rápido; o que ele digita à mão, não.
2. Os anos de cada candidato também eram buscados um a um.
3. Nenhum cache: cada consulta refazia as mesmas dezenas de chamadas.

Corrigido com `emParalelo()` (limite 12) nos dois laços e cache em memória
por instância, TTL 6h — a tabela FIPE muda uma vez por mês.

| Consulta | Antes | Agora |
|---|---|---|
| Hilux SRV 2.8 diesel | 21,2s | 3,3s |
| Gol 1.0 (1ª vez) | 11,8s | 3,3s |
| Gol 1.0 (repetida) | 11,8s | **0,5s** |
| Renegade | 10,4s | 4,4s |

*Registrado em 02/setembro/2026.*

---

### Varredura das telas restantes — 02/set/2026

#### Falha silenciosa: varredura limpa

Procurei `catch` vazio em todo o app. As ocorrências são deliberadas e
comentadas — envio de evento fire-and-forget, cópia auxiliar antes de
compartilhar, `localStorage.removeItem`. **Nenhuma esconde falha que afete o
Yuri.** O padrão que custou caro nas reformas anteriores não está mais
espalhado.

#### Corrigidos

- **`busca.html`: data em ISO** (`f543bba`). `data_venda` ia crua para a tela
  — "2026-09-01" no meio do resultado. `fmtData` usa `T00:00:00` de propósito:
  sem isso o navegador lê como UTC e mostra o dia anterior no nosso fuso.
- **`negociacoes.html`: "999 dias atrás"** (`29a5ce8`). Sentinela de
  `diasDesde` vazando para a tela quando `ultimo_contato` é nulo. Três
  negociações de 20/08 apareciam com 999 quando o certo eram 13. Agora cai em
  `created_at`; sem data nenhuma devolve `null` e quem exibe decide.
  `diasDesde` também passou a aceitar o ISO completo do banco — concatenar
  `'T00:00:00'` num timestamp completo produzia data inválida.

#### Falso positivo verificado

Os três "Celta Spirit" nas negociações **não são duplicata**: são três
compradores diferentes (V11 Motors, RR Automobile, Autoconfirma) para o mesmo
carro. Quase reportei como bug.

#### Verificado e correto

- Busca global cruza catálogo, vendas, negociações e compradores; achou o
  Renegade nas três bases com o selo VENDIDO certo
- `home`, `catalogo`, `vendas`, `compradores`: contagem renderizada bate
  exatamente com a da API
- Filtros de `anuncios.html`: 113+8+6+2+7 = 136 = total

*Registrado em 02/setembro/2026.*

---

### Conferência ponta a ponta — 02/set/2026

#### Varredura estrutural (9 páginas)

Zero ID duplicado e zero handler inline apontando para função inexistente em
`home`, `index`, `catalogo`, `anuncios`, `vendas`, `compradores`,
`negociacoes`, `consultas`, `artes`, `foto`.

#### Endpoints: validação de entrada

Oito endpoints testados com corpo vazio — todos devolvem 400 com mensagem
clara em português, nenhum 500: `remove-bg`, `placa` (POST e GET),
`ia-compor`, `parse`, `consulta`, `vendas?anexo=1`, `catalogo`.

#### Telas exercitadas

- **Artes**: canvas 1080×1080, três modelos gerando artes distintas, presets
  de dica funcionando (3 assinaturas distintas; o placeholder corretamente
  não altera nada)
- **Foto**: `input[type=file]` com `display:block` (a lição do bug de anexo no
  celular já estava aplicada aqui), canvas presente, `remove-bg` integrado
- **Catálogo**: `abrirEdicao` popula os 10 campos corretamente

#### Erro que cometi e revertido (`46f5a61` → `b378abc`)

Concluí que `valor_compra` não era editável porque não está no payload do
modal de edição, e adicionei um campo. **Estava errado**: já existe
`editarValorCompra`, acionado clicando em "Captado por" no card ou no botão
"+ Custo".

Além de duplicar, minha versão criava risco real: se o modal abrisse com o
campo não populado, salvar gravaria `null` por cima de um valor existente.
Revertido.

> Lição: olhei o payload de uma função e concluí sobre o sistema inteiro.
> A funcionalidade estava a 60 linhas de distância, no mesmo arquivo.

*Registrado em 02/setembro/2026.*

---

### Integridade de dados e fechamento — 02/set/2026

#### Vínculo quebrado encontrado (`05e07da`)

Checagem cruzada das cinco tabelas: **três negociações do Celta apontam para
um `veiculo_id` que não existe mais no catálogo.**

O impacto não era o vínculo em si — era o que acontecia ao converter em
venda. O recuo vivia dentro do `catch`, e o caso real não gera exceção:
veículo apagado devolve **HTTP 200 com corpo `null`**. A requisição "dá
certo", `if (v)` falha em silêncio, e a venda abria sem nem o nome do carro —
que estava ali em `n.veiculo_nome`.

Agora o resultado é avaliado em vez de presumido. Testado nos dois caminhos:
negociação com veículo puxa do catálogo (Renegade + placa + valor_compra);
órfã cai no nome.

> Mesmo padrão de sempre: sucesso presumido a partir de "não deu erro".

#### Resto da integridade: limpo

Zero venda apontando para veículo ou comprador inexistente, zero anúncio com
`vehicle_id` órfão, zero placa repetida em vendas.

#### Divergência que permanece em aberto

Citroën C3: venda 26.500 − repasse 25.000 = 1.500, lucro anotado 1.000.
Investiguei a hipótese de despesa: **o C3 não tem `gastos` nem `gastos_valor`
registrados**. Só o Yuri sabe se houve desconto, despesa fora do sistema ou
erro de digitação. A dica adicionada hoje passa a mostrar a diferença.

#### Nota: dois cálculos de margem convivem

- `index.html` (captação): `venda − compra − gastos`
- `vendas.html` (conferência do lucro): `venda − compra`

Coerente com os campos que cada tela tem — vendas não tem campo de gastos —
mas os dois números podem divergir para o mesmo carro. Não é bug; é para
saber antes de estranhar.

#### Verificado e correto

- **Consultas**: valida a placa no cliente antes de chamar a API paga
- **PWA**: manifest íntegro, `display: standalone`, ícone 512 + maskable,
  service worker registrado

#### Decisão: manter os logs DIAG da extensão por enquanto

Estavam na lista para remover, mas foram justamente eles que permitiram
diagnosticar o radar e o envio hoje. Removê-los enquanto FIPE e captação
ainda estão sendo observados troca ruído por cegueira. Fica para quando
estabilizar.

*Registrado em 02/setembro/2026.*

---

### Busca em Vendas — e o mesmo erro meu, duas vezes (02/set/2026)

#### O erro

Eu tinha concluído que `vendas.html` não tinha busca e construí uma
(`b07673d`). **Já existia**: o campo `f-q`, no cartão de filtros, com busca no
servidor via `/api/vendas?q=`. Minha sondagem não o achou porque procurei por
placeholder contendo "buscar", e o dele é *"ex: João, Onix, ABC1D23..."*.

Foi o **segundo** caso idêntico no mesmo dia — antes eu havia duplicado o
editor de `valor_compra`, que já existia como `editarValorCompra`. Nos dois,
sondei por um padrão estreito, não achei, e concluí sobre o sistema inteiro.

> Regra para as próximas: antes de construir algo que "não existe", listar o
> que a página realmente tem — `[...document.querySelectorAll('input')]`,
> `grep -n "function "` — em vez de procurar pelo nome que eu esperava.

#### O que ficou (`7747452`)

Em vez de escolher entre as duas, o campo original recebeu a lógica nova:

- **Filtra no cliente, instantâneo.** Antes era ida-e-volta de rede a cada
  pausa de 350ms para filtrar dados já carregados. Medido: zero chamadas à
  API durante a busca.
- **Ignora acento** — "citroen" acha "Citroën". O `ilike` do Postgres não faz.
- **Placa com ou sem hífen** — "lmx1j26" acha "LMX-1J26".
- **Múltiplos termos se somam** — "renegade douglas" acha aquela venda.
- Passou a olhar também ano, cor, forma de pagamento e observações.
- Olha o histórico mesmo oculto — não achar uma venda antiga porque estava
  escondida seria pior do que não ter busca.
- Contador vira "N de 114" com filtro ativo.

O parâmetro `q` deixou de ser enviado: mantê-lo faria o servidor filtrar
antes com regra mais pobre, e "citroen" voltaria vazio do banco sem chance de
o cliente casar "Citroën". O filtro de **status** continua no servidor, porque
define quais vendas são carregadas.

Testado em produção, incluindo 375px: sem estouro horizontal, um único campo
de busca na tela.

*Registrado em 02/setembro/2026.*

---

### Tela de Conversas + negociações encerradas — 02/set/2026

#### Negociação comprada oferecia venda duplicada (`583c93b`)

Levantado pelo Yuri no screenshot: duas negociações marcadas COMPRADO ainda
na lista, com o botão **Registrar Venda** — e as duas vendas já existiam.
Clicar criaria uma venda duplicada; o botão não tinha como saber, porque a
ligação negociação→venda só é gravada como evento em `historico`, não fica na
venda.

Cruzamento por `veiculo_id`, que as duas guardam. Conferido nos dados reais.

**"Todas" passou a significar "o que ainda pede ação".** Comprada COM venda
registrada sai da lista; comprada SEM venda continua, porque é justamente ela
que precisa do próximo passo. A aba "Comprado" mostra todas. No card, quando
a venda existe, o botão vira o link "✓ Venda registrada — ver".

#### `/conversas.html` (`9da9565`, `61452ff`)

Lista lateral com todos os chats espelhados, thread à direita, campo de
resposta — como a OLX. Montada com dados que já existiam; nenhuma migration.

Endpoint novo como modo de `?mensagens=1` sem `listing_id` (`c090fc9`):
resumo com uma linha por anúncio. Agrupamento na função porque PostgREST não
faz `DISTINCT ON` e são centenas de linhas, não milhões.

- Thread atualiza a cada 10s, lista a cada 30s
- Atualização silenciosa não remonta o campo de texto nem rouba a rolagem
- Falha de rede na atualização automática não apaga a conversa da tela
- Sem ACK em 15s o botão volta com erro (travado, ele reenviaria sem saber)
- Celular: uma coluna por vez, com botão voltar

**Bug encontrado no próprio teste:** `grid-template-columns: 1fr` equivale a
`minmax(auto,1fr)`, e o `auto` deixa a coluna crescer com o conteúdo. Títulos
longos empurravam a página **1480px** para fora da tela no celular. Corrigido
com `minmax(0,1fr)` + `min-width:0`. Medido: 1480px → 0.

#### Falta para fechar

Detecção de mensagem nova em conversa fechada. A lista mostra o que já foi
espelhado, mas não acende sozinha — o monitor só enxerga a aba aberta.

#### Dado sujo observado

Uma conversa antiga (Gol) tem como "mensagem" o menu da OLX capturado:
*"on\nAcessar perfil completo\nMarcar como não lido..."*. Captura antiga; os
seletores do monitor foram refinados depois. Limpável com o DELETE de
`?mensagens=1&listing_id=`.

*Registrado em 02/setembro/2026.*

---

### Caixa de entrada da OLX — a peça que fechou o ciclo (02/set/2026)

Última coisa que ainda obrigava o Yuri a entrar na OLX: descobrir que alguém
respondeu numa conversa que ele não abriu.

#### Descobertas sobre a página da OLX

- A extensão sempre abre o chat com `?list-id=` ou `?chat-id=`, que é a
  **visão de conversa única** — nela não existe lista lateral nenhuma. A
  lista só existe em `chat.olx.com.br` **sem parâmetros**.
- As linhas da lista **não têm link nem atributo com o `listing_id`**.
- Não há `__NEXT_DATA__`.
- O `innerText` de cada linha é: inicial do avatar, título do anúncio,
  vendedor, prévia, hora. **A prévia vem completa, não cortada.**

#### Desenho que evita depender do HTML deles

1. `listing_id` vem de casar o **título** com a tabela `anuncios`. Título
   repetido em dois anúncios vira ambíguo e é descartado — errar a identidade
   acenderia a conversa errada.
2. "Não lida" **não** é lido do estilo da OLX. Compara-se a prévia com a
   última mensagem já espelhada. Diferente = novidade. Nenhuma mudança visual
   deles quebra isso.
3. A lista é achada pela **forma** (maior grupo de irmãos com altura de
   linha), porque as classes são geradas por build.

Zero carregamento extra: lê o que a OLX já desenhou, só quando a aba está
aberta.

#### O bug que custou 5 idas e vindas

18 de 18 conversas não casavam. Causa: eu pegava a **primeira linha** do
`innerText` como título, e a primeira linha é a **inicial do avatar** —
`olx_diz` vinha como `["S","R","Z"]`. Linhas de até 3 caracteres passaram a
ser descartadas.

> Lição de processo: quando algo "não casa", mostrar **os dois lados** antes
> de investigar o mecanismo. Gastei quatro probes mapeando estrutura de
> página quando um diagnóstico lado a lado resolvia no primeiro.
>
> Lição 2: o service worker tem console próprio. Escrevi o log num e mandei
> olhar no outro. Diagnóstico agora volta dentro da resposta.

#### Dois defeitos meus, corrigidos no mesmo dia em que os criei

- A tarja dizia **"Sem novidades na OLX"** quando não conseguia verificar
  nada. Lê-se como "ninguém respondeu" quando era "não consegui conferir" —
  o mesmo padrão de falso sucesso que custou caro a sessão inteira. Agora
  distingue as três situações.
- A tarja dizia **"16 conversas com mensagem nova"** enquanto 3 linhas
  acendiam. As outras 13 são conversas nunca espelhadas, onde tudo conta como
  novo. Separado em acionável × não espelhada.

#### Estado

Funcionando em produção. Falta remover os logs DIAG quando estabilizar.

*Registrado em 02/setembro/2026.*

---

### Caixa de entrada — três bugs de leitura, todos pelo mesmo motivo (02/set/2026)

Depois de a leitura funcionar, os alarmes vinham errados. Três causas, todas
encontradas pelo mesmo método: **imprimir os dois lados da comparação**.

1. **Título vinha como a inicial do avatar** (`"S"`, `"R"`, `"Z"`).
   `sem_casar` era 18 de 18. → descartar linhas de até 3 caracteres.
2. **Prévia vinha como o carimbo de data.** O log dizia `OLX diz: "Terça"`.
   A regra só reconhecia hora `11:18`, mas a OLX escreve "Terça", "Segunda",
   "Ontem" ou "24/08/2026" conforme a largura da janela e a idade da conversa.
   → `ehCarimbo()` cobre as quatro formas.
3. **Avisos da própria OLX viravam prévia.** *"Na Garantia OLX, pague com o
   código PIX…"* é injetado pela OLX acima da última mensagem real. Não é
   mensagem de ninguém e nunca existiria no espelho — acendia para sempre.
   Confirmado pelo Yuri: não havia nada depois de "120000 no pix".
   → lista `AVISOS_OLX`.

Também: a comparação passou a olhar as **5 mensagens mais recentes**, não só a
última, e o trecho comparado caiu de 40 para 20 caracteres — "120000 no pix"
nem chega a 40.

#### Resultado

`lidas: 18 · sem_casar: 0 · novidades: 14`, sendo **1 acionável** (Ford KA,
com resposta real do vendedor) e 13 de conversas nunca espelhadas.

#### Padrão que se repetiu três vezes

Nos três casos eu **inferi a estrutura** em vez de olhar o que de fato vinha.
O que resolveu, sempre, foi o log lado a lado — que por isso ficou no código.

> Para a próxima: quando algo "não bate", imprimir os dois lados **antes** de
> investigar o mecanismo. Custou cinco idas e vindas descobrir isso.

#### Limpeza de dados

Apagadas 2 conversas cujo único conteúdo era menu da OLX capturado como
mensagem (Gol `1531235695`, Fiat Pulse `1530882659`). Conferido item a item
antes de apagar. Sobrou a Subaru, no mesmo estado, aguardando decisão.

Corolla mantido: tem 3 mensagens reais do vendedor, mas a abordagem do Yuri
não foi espelhada. Reespelha sozinho se ele reabrir a conversa.

#### Aberto

- Prévia vem como nome do vendedor em 2 conversas (`"Junior"`,
  `"jor.correa"`) — provavelmente última mensagem sem texto. Sem efeito hoje.
- Logs `[CNR Inbox]` mantidos: se pagaram duas vezes hoje.

*Registrado em 02/setembro/2026.*

═══════════════════════════════════════════════════════════════════

# CHECKPOINT DO DIA — 2 de setembro de 2026

**56 commits de código** (43 no Gerador, 13 na extensão), fora documentação.
Tudo em produção e verificado na própria aplicação, não só no editor.

## O objetivo do dia, nas palavras do Yuri

> *"Usar a interface do gerador, mas usando a OLX por trás. Serei eu quem
> irei escrever a msg e desenrolar a conversa com cada vendedor."*

Ao fim do dia isso está de pé, ponta a ponta: o radar traz os anúncios das 4
cidades → ABORDAR pelo card → conversa espelhada nos dois sentidos →
resposta pelo Gerador → **aviso quando alguém responde numa conversa
fechada** → venda registrada com anexos, pelo celular.

## O que mudou de fato

| Frente | O que era | O que é |
|---|---|---|
| Anexos e vendas no celular | 401 invisível: nada salvava | funciona sem chave nenhuma |
| Leitura de anúncio da OLX | servidor com `User-Agent` forjado | aba do próprio navegador |
| Radar | 3 slots fixos na extensão de cada máquina | tela `/radar.html`, 4 cidades |
| `+ Catálogo` | descartava o que a IA lia do título | veículo nasce preenchido |
| Anúncio do WhatsApp | siglas destruídas, linhas em branco duplas | corrigido |
| FIPE | combustível ignorado; até 21s | respeitado; 3–4s, 0,5s repetido |
| Vendas | 114 registros sem busca | busca instantânea, sem acento |
| Conversas | uma por card, sem saber de respostas | `/conversas.html` + aviso |

## Erros meus, e o que aprendi com cada um

- **Duas vezes** construí algo que já existia (editor de `valor_compra`, busca
  em Vendas), por sondar com um padrão estreito e concluir sobre o sistema.
  → Listar o que a página tem, não procurar pelo nome que espero.
- **Três vezes** inferi a estrutura da página da OLX em vez de olhar o que
  vinha (inicial do avatar como título, dia da semana como mensagem, aviso da
  OLX como conversa). → Imprimir os dois lados **antes** de investigar.
- Escrevi log no console do service worker e mandei olhar no da página.
- Criei uma tarja que dizia **"sem novidades"** quando não conseguia
  verificar — o mesmo falso sucesso que passei o dia corrigindo em código
  antigo, reproduzido em código feito na mesma hora.
- Afirmei que o 401 explicava a venda do Renegade. Não explicava — ele
  corrigiu. Duas falhas próximas no tempo não são a mesma falha.
- Tratei "campo vazio no histórico" como "campo inútil". Ele corrigiu: são
  registros anteriores aos campos existirem.

## Resolvido ainda na noite do dia

**A extensão não era instalável a partir do repositório.** `icons/`, `popup/`
e `setup/` nunca haviam sido versionados, embora o `manifest.json` referencie
os três — clonar produzia uma extensão que o Chrome recusa carregar, e o
código existia só na máquina do Yuri. Ia aparecer da pior forma no fim de
setembro, ao montar o notebook da mãe dele.

Junto, foi commitado `content/olx-chat.js`, modificado desde sessão anterior:
`findField()` passou a procurar o campo de mensagem também dentro de iframes
same-origin e a rodar `execCommand` no documento correto — no documento
errado ele não insere nada e o preenchimento falha em silêncio.

Conferido antes de adicionar: nenhum token ou segredo nos arquivos.
Verificado depois: **todo caminho citado no manifest está versionado.**

## Pendências, por ordem de consequência

1. **`GET` público da API** — expõe vendas e compradores (CPF, telefone).
   Pré-requisito do primeiro parceiro externo, junto de multi-tenancy.
2. Contato do irmão com a OLX — documento pronto; decidir conta compartilhada.
3. Subaru com lixo espelhado; 13 conversas nunca espelhadas.
4. Logs DIAG antigos (envio, radar) — mantidos enquanto se observa.

*Fechado em 2 de setembro de 2026, 22h.*

═══════════════════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════════════

### Checkpoint — 03/set/2026 (manhã) — API fechada: liberação por aparelho

**A pendência nº 1 do dia anterior está resolvida.** O `GET` público saiu do ar.

#### O que estava aberto

Sem chave nenhuma, qualquer um com a URL baixava:

| Rota | O que saía |
|---|---|
| `/api/vendas` | 142 KB — placa, renavam, chassi, valor de compra, lucro |
| `/api/compradores` | 13 KB — nome, telefone, CPF, banco e Pix de terceiros |
| `/api/catalogo` | estoque inteiro com valores de compra |
| `?buscas=1` / `?ideias=1` | buscas do Radar e caderno de ideias |

`/api/compradores` **não tinha guarda nem para escrita**: dava para criar,
alterar e apagar comprador e negociação sem nada. Vendas e catálogo ao menos
protegiam gravação.

#### Desenho: liberação por aparelho, não senha

Yuri havia recusado senha em 02/set (*"não preciso de senha"*), e a recusa
continua respeitada: **ele não digita nada durante o uso.** O aparelho é
liberado uma vez em `/entrar.html` e nunca mais pergunta.

- `api/_auth.js` — portão único. Começa com `_`, então a Vercel não roteia:
  **não consome função** (o teto de 12 já estava atingido). Aceita as chaves
  legadas (`RADAR_KEY`, `VENDAS_KEY`, `CATALOGO_KEY`) de propósito, para nada
  instalado quebrar no instante em que o portão ligar.
- `assets/auth.js` — envolve `window.fetch` num lugar só, em vez de editar as
  ~100 chamadas das 13 telas. Chamada esquecida quebraria em silêncio, e o
  jeito de descobrir seria uma venda não salvando no meio do negócio.
  Sem `defer`: script inline no fim do `<body>` roda **antes** de script com
  `defer`, e várias telas disparam fetch já na carga.
- `entrar.html` — libera o aparelho e **gera a chave ali mesmo**
  (`crypto.getRandomValues`). A primeira versão exigia rodar um comando no
  terminal, e foi exatamente ali que o Yuri travou: *"não to achando a aba
  terminal, ela esta onde?"*.
- A chave viaja pelo **fragmento** (`#`), nunca pela query: fragmento não é
  enviado ao servidor, então não entra nos logs de acesso da Vercel.
- Ordem de implantação deliberada: subiu com o portão **desligado**, aparelhos
  liberados, e só então a `CNR_KEY` entrou na Vercel. Nunca existiu um minuto
  com o operador trancado do lado de fora.

Verificado em produção, de fora, sem chave: 401 em `vendas`, `compradores`,
`catalogo`, `buscas`, `ideias`, `radar`, `mensagens`; 401 em `POST` de
comprador e `DELETE` de ideia; chaves óbvias (`admin`, `123456`) recusadas;
telas e assets continuam servindo normalmente.

#### O bug que custou a manhã dele

Depois de tudo liberado, `entrar.html` dizia **"Aparelho liberado"** e
`vendas.html` dizia **"não foi liberado"** — mesmo navegador, mesmo instante.

Causa: `vendas.html` e `anuncios.html` liam uma chave própria do localStorage
(`cnr_vendas_key`, `cnr_catalogo_key`), de antes do portão único, e a punham
em `x-cnr-key`. O envelope só preenche o header quando a página **não** pôs
nenhum — de propósito, para nunca sobrescrever decisão explícita da tela. Com
um valor velho esquecido na gaveta, a página se auto-derrubava; as telas sem
gaveta abriam normalmente.

Corrigido: as duas páginas não mandam mais header; `auth.js` apaga as gavetas
antigas ao carregar; a faixa de "colar chave" saiu de `vendas.html` (era o
botão que reintroduzia o problema); os avisos de 401 apontam para
`/entrar.html`.

> **Erro meu, e é o mesmo de ontem:** não procurei o que já existia antes de
> mandar o Yuri configurar. O mecanismo estava no arquivo que eu tinha aberto,
> a 25 linhas do trecho que editei. Prometi "uma vez por aparelho" e ele
> digitou a chave quatro vezes na mesma manhã.

#### Dois falsos sucessos fechados na extensão

- **3 leituras iam sem chave** (`resolverPeloGerador`, `conferirCaixaEntrada`).
  Parariam no instante em que o portão ligasse — e **em silêncio**: a lista
  voltaria vazia, parecendo "nada novo".
- **"Salvar Gerador" dizia ✓ sem nunca ter falado com o servidor.** Com a
  chave errada por um caractere, o mesmo ✓ — e `carregarBuscas()` cai na cópia
  local em caso de erro, então o Radar seguiria rodando com buscas velhas,
  parecendo normal. Agora testa de verdade e reporta os quatro casos
  (conectado com contagem / chave recusada / erro do servidor / sem rede).
  Confirmado em produção: *"✓ Conectado. 4 busca(s) ativa(s)"*.
- O texto do campo dizia **"Radar Key (opcional) — deixe em branco"**, que
  virou instrução para quebrar a extensão. Corrigido. Importa além de hoje:
  em setembro essa é a única tela que a mãe do Yuri vai ler.

#### Verificação que derrubou meu próprio argumento

Ao explicar o risco do `GET` aberto, eu ia afirmar que os certificados HTTPS
publicam o subdomínio em registro público. Conferido antes de afirmar:

```
subject=CN=*.vercel.app   /   SAN: DNS:*.vercel.app
```

É **certificado curinga** — `gerador-cnr` não aparece em lugar nenhum.
A afirmação estava errada e teria sido mais uma inferência não verificada.

O que resta de real: `Referer` vazando para WhatsApp e OLX a cada link que
sai do Gerador; a URL circulando por conversas e por outras máquinas; e
`/api/vendas` ser chute óbvio a partir do domínio. Ninguém está caçando o
Yuri — o argumento que se sustenta não é probabilidade, é que **o CPF, o
telefone e os dados bancários ali não são dele.**

#### Chave exposta e decisão do Yuri

O campo da chave nas opções era `type="text"`. Yuri mandou um print para
confirmar que a conexão funcionou e **a chave foi junto, legível**. Campo
mudado para `type="password"` — essa é justamente a tela que alguém abre
quando algo não funciona, ou seja, a com mais chance de virar screenshot.

**Yuri optou por não rotacionar** (*"Deus me livre, pode deixar assim mesmo"*).
Decisão registrada: para usar seria preciso ter a URL **e** o print. A troca
acontece naturalmente quando entrar o primeiro parceiro externo, junto do
multi-tenancy — aí a chave vira credencial compartilhada de qualquer jeito.

#### Descoberto no caminho, não tratado

**O repositório da extensão não tem remote.** Existe só nesta máquina. Se o
notebook morrer, a extensão inteira se perde — e é ela que sustenta a captação
e as conversas. Ontem descobriu-se que ela não era instalável a partir do
repositório; hoje, que o repositório não sai daqui.

**`Access-Control-Allow-Origin: *` continua em tudo.** Com o portão ligado não
é explorável (a chave mora no `localStorage` do domínio do Gerador, e site
nenhum lê o de outro). Deixado como está de propósito: apertar arriscava
quebrar a extensão, que fala de outra origem.

#### Commits

Gerador: `3b52077` (portão + envelope + entrar.html), gerar chave na tela,
`cnr_vendas_key` removida das telas.
Extensão (local, sem remote): chave nas 3 leituras, texto das opções,
teste real no Salvar, campo mascarado.

#### Pendências

- [ ] Extensão sem cópia fora desta máquina
- [ ] Ideia 4 — pesquisa sobre software de concessionária (pedida para hoje,
      **precisa ser pesquisada com fonte, não respondida de memória**)
- [ ] Contato do irmão com a OLX; decidir conta compartilhada
- [ ] Subaru com lixo espelhado; 13 conversas nunca espelhadas
- [ ] Logs DIAG antigos
- [ ] Reescrever `compliance-extensao.md` do repo

*Registrado em 3 de setembro de 2026, manhã.*

### 03/set/2026 (tarde) — a extensão saiu desta máquina

Descoberto pela manhã: o repositório da extensão não tinha remote. Existia só
no notebook do Yuri — se o disco morresse, iam junto a captação e o espelho de
conversas. Yuri: *"Não podemos perder isso em hipótese alguma."*

**Repositório:** `github.com/Carronarederepasses/captacao-inteligente` —
**privado**, 31 commits, branch `main` (era `master`, renomeada para bater com
o Gerador). Privado importa: os comentários do código descrevem exatamente
como a extensão lê a página da OLX.

Conferido **antes** de publicar: 14 arquivos versionados, nenhum faltando no
disco, e nenhum segredo nos arquivos nem nos 30 commits do histórico. A chave
de acesso vive em `chrome.storage.local`, nunca em arquivo.

Conferido **depois**: clonado do GitHub do zero — 11 caminhos do manifest
presentes, todo o JS passa na sintaxe. O clone carrega no Chrome como extensão
funcional. Backup não testado não é backup.

Também gerados `captacao-inteligente-2026-09-03.bundle` (92 KB, repositório
inteiro, clonável) e `.tar.gz` (571 KB, pasta como está) e entregues ao Yuri
para guardar fora do notebook. São curativo — congelam hoje, não protegem
amanhã; o repositório é o que protege daqui pra frente.

`.gitignore` adicionado para os dez `.bak` soltos na pasta: rascunho de sessão,
não histórico. Sem isso um `git add .` distraído subiria dez versões antigas
dos mesmos arquivos.

**Ganho colateral para setembro:** instalar no notebook da mãe do Yuri passa a
ser `git clone`, em vez de copiar pasta na mão.

*Registrado em 3 de setembro de 2026, tarde.*

═══════════════════════════════════════════════════════════════════

# CHECKPOINT DO DIA — 3 de setembro de 2026

**20 commits** (15 no Gerador, 5 na extensão). Tudo em produção e conferido
na própria aplicação — nenhuma afirmação de funcionamento sem medida.

## O que o dia entregou

| Frente | O que era | O que é |
|---|---|---|
| API | `GET` aberto: vendas, catálogo, CPF e Pix de compradores | 401 em tudo; liberação uma vez por aparelho |
| `/api/compradores` | sem guarda nem para escrita — qualquer um apagava | fechado |
| Extensão | repositório só neste notebook, sem remote | GitHub privado, 31 commits, clone testado |
| Barra lateral | 13 itens em lista única | Captar · Vender · Apoio |
| Catálogo | todo Gerar Anúncio criava um carro | nasce só por ato do Yuri |
| Painel | carro vendido como "COMPRADO! urgente" | sai da lista quando a venda existe |
| Paleta | creme, bege e azul | preto e branco, tema único |
| Marca | ausente | marca d'água no notebook, nome no topo do celular |

## Erros meus, e o que cada um ensinou

- **Prometi "uma vez por aparelho" e ele digitou a chave quatro vezes.**
  `vendas.html` tinha sistema de chave próprio (`cnr_vendas_key`), 25 linhas
  acima do trecho que editei, e vencia o novo. É a lição de ontem outra vez —
  sondagem estreita — mas agora o custo caiu sobre ele, em passos manuais que
  não deviam existir. → Procurar o mecanismo em TODOS os arquivos **antes** de
  escrever o roteiro. O roteiro é a última coisa.

- **Pedi segredo em campo de texto visível.** Ele mandou print para confirmar
  que funcionou e a chave foi junto, legível. Segunda vez que uma chave vaza
  assim aqui. → `type="password"` em credencial, desde a primeira versão.

- **Ia justificar o fechamento da API com um fato falso.** Afirmaria que
  certificados HTTPS publicam o subdomínio; conferi antes e a Vercel usa
  curinga `*.vercel.app` — o subdomínio dele não aparece em lugar nenhum.
  → Afirmação técnica que sustenta recomendação se verifica com comando. Vale
  mais ainda quando confirma o que eu já queria concluir.

- **A regra da negociação vendida foi escrita ontem — no arquivo errado.**
  `negociacoes.html` recebeu, `home.html` não, porque cada tela tem cópia
  própria da lista. Mesmo padrão do `cnr_vendas_key`.

- **Apostei que 5,5% de opacidade seria imperceptível sobre o texto.** Eu tinha
  avisado que a marca ficava por cima e apostei mesmo assim. "O logo comeu as
  letras." → Quando eu mesmo identifico o risco, ele não vira aposta.

- **Errei o diagnóstico do logo escuro no celular** e disse que era linha fina
  clareando menos. Medi desenhando o SVG em canvas: no celular a tinta por
  pixel é 213% da do notebook. Era cobertura, não brilho.

## Defeitos que apareceram por perseguir outra coisa

- **"Salvar no catálogo" chamava a função sem argumento** — a requisição ia sem
  corpo. Passava despercebido porque o registro já existia, então virava PATCH
  vazio: sem efeito e sem erro. Ia criar veículo VAZIO com a mudança do dia.

- **Transição CSS + variável de tema congela a propriedade.** Isolado com três
  elementos: só o que tinha `transition` travou. O botão "+ Nova negociação"
  ficava preto sobre preto quando o Windows virava para o escuro. Resolvido
  pela raiz ao adotar tema único — sem troca, não há o que congelar.

- **Extensão pararia em silêncio.** Três leituras iam sem chave; a captação
  voltaria lista vazia, parecendo "nada novo".

- **"Salvo" não significava "funcionando"** nas opções da extensão: o ✓
  aparecia sem nunca ter falado com o servidor.

## Medidas que decidiram desenho

- Marca d'água descoberta: **83%** no notebook, **0%** no celular. Aumentar
  para 200% da largura da tela sobe para 9-11%. Numa tela que o conteúdo
  preenche, não existe "atrás e visível".
- Marca d'água centrada na janela caía **110px** fora do centro da área de
  trabalho — a barra lateral come 220px.
- Contraste auditado em **14 telas**: nenhum texto abaixo de 3:1.
- Gerador: 3,2 telas de rolagem, 7 de 27 campos sem rolar, duas barras de aba
  empilhadas, editor de foto fantasma de ~150 linhas que nenhum botão chama.

## Decisões do Yuri

- **Não rotacionar a chave exposta.** Para usar seria preciso ter a URL **e** o
  print. A troca acontece com o primeiro parceiro externo, junto do
  multi-tenancy.
- **Carro de parceiro não é estoque.** "Só vão para o relatório de vendas caso
  eu venda, caso contrário é lixo mesmo."
- **Tema único, fundo preto.** O app não segue mais o Windows.
- **Marca no topo do celular** em vez de insistir na marca d'água lá.

## Pesquisa entregue (ideia 4)

Sete sistemas brasileiros de gestão para revenda, com preços e fontes.
**Nenhum tem captação ativa** — todos partem do carro já estar com o lojista;
"gestão de leads" é o contrário disso, são compradores que chegam depois do
anúncio. Verificado em três fontes independentes.

Corrigido o que eu havia dito de memória: **não é caro nem pesado.** R$ 299/mês
não é caro para quem repassa 3 carros. O que falta não é preço — é que o
software desse mercado **começa no cadastro do veículo**.

A OLX tem três APIs oficiais (Anúncios, Leads, Chat) e canal
`suporteintegrador@olxbr.com`. Mas as três são para **quem anuncia** — o Yuri
faz o inverso. O caminho oficial cobre virar integrador; **não cobre a
captação**. Isso reordena o pedido do irmão.

## Pendências

1. Ideia 1 — integrador de anúncios na OLX (caminho técnico mapeado; a
   documentação **não menciona exigência de CNPJ**)
2. Contato do irmão com a OLX — pedir integrador, e captação como pergunta
3. UX do Gerador: etapas viram passos; um montador de texto só (itens 4 e 5 da
   proposta); editor fantasma para remover
4. Subaru com lixo espelhado; 13 conversas nunca espelhadas
5. Logs DIAG antigos
6. Reescrever `compliance-extensao.md` do repo

*Fechado em 3 de setembro de 2026.*

### 03/set/2026 (tarde) — lista de envio: construída e removida no mesmo dia

Registrado porque **"isto foi tentado e não serviu" vale tanto quanto o que
ficou.** Sem isso, alguém reconstrói daqui a três meses.

#### O pedido

O WhatsApp tirou/limitou a lista de transmissão. Yuri quis a dele no Gerador:
*"selecionava os contatos, abria cada um no WhatsApp e eu ia clicando em
enviar"*.

#### O que já existia e eu não sabia

A **Central de Distribuição** (Reforma 14) já faz fila de compradores com
mensagem pronta. Mas responde outra pergunta — "quem casa com este carro?" —
e filtra por score, corta abaixo de 40, para em 12. O pedido dele era sem
filtro: quem escolhe é ele.

#### Por que foi removido

Ele usa **WhatsApp pelo celular** — informação que só apareceu depois de eu
ter construído **duas versões**. No celular o `wa.me` chama o aplicativo, que
mostra **uma conversa por vez**. Abrir várias não existe; cada envio obriga a
sair do navegador e voltar.

> *"Fica indo e vindo pra mim, não rola."*

Dava para melhorar a volta (a fila chegou a persistir em `sessionStorage`).
Não dava para eliminar a ida. Função que dá mais trabalho do que tira não
merece espaço na tela.

#### O erro de método, que é o que importa guardar

**Construí para o cenário errado sem perguntar como ele trabalha.** A
pergunta certa — *"tu usa WhatsApp por onde?"* — custava uma linha e teria
evitado o recurso inteiro. Duas versões e um refactor foram gastos antes dela.

É parente do erro da manhã (mandar configurar sem procurar o que já
configurava), com a mesma forma: **agi antes de olhar.**

#### O que ficou

- `mensagemDoAnuncio()` — o anúncio padrão em Ofertar e na Central, decisão
  dele. Antes cada ponto montava a sua. `gerarMensagemMatch` segue no arquivo,
  sem uso, com o motivo anotado: nomeava por que o carro casava com o
  comprador, e era o argumento mais forte do Match. **Se a taxa de resposta
  cair, é o primeiro lugar para olhar.**
- **IA: motivo real da falha.** Ele levou "Serviço temporariamente
  indisponível" na aba Parceiros. Não foi mudança nossa (`parse.js` intocado
  desde 02/set 19:04) — foi sobrecarga do OpenRouter. Mas o código **já sabia**
  o motivo (`rate_limit:429`, `http_error:402`, `no_json`) e jogava fora: a
  mesma frase para sobrecarga, chave vencida, sem crédito e imagem grande.
  Agora traduz por ação, e o detalhe por modelo vai para o console.

#### Fatos verificados que valem além deste recurso

- **Contact Picker API**: Chrome no Android (6+) sim; Safari do iPhone só
  experimental, desligado de fábrica; navegador de mesa não. Abre o seletor
  nativo — a página recebe só os contatos marcados, nunca a agenda inteira.
- **Restrição de produto declarada pelo Yuri:** *"não podemos restringir as
  funções somente para Android, o app tem que ser para ambos"*. Vale para o
  que vier: recurso exclusivo de uma plataforma entra como atalho, nunca como
  fundação.
- **Lista de transmissão do WhatsApp**: minhas fontes eram blogs de empresas
  que vendem ferramenta de disparo, e se contradiziam. Yuri usa e disse que
  saiu do app comum. **O relato dele vale mais que aquelas fontes** — não
  tratar blog de fornecedor como fato.

*Registrado em 3 de setembro de 2026, tarde.*

### 03/set/2026 (noite) — Particular sai do pool de ofertas

Encontrado pelo Yuri ao olhar a lista de contatos: *"os contatos dos
particulares apareceram no meio, temos que separar"*. Parecia arrumação de
tela. Era vazamento de preço.

#### A causa

A consulta do Motor de Match filtrava só por `papel`:

```
compradores?ativo=eq.true&papel=in.(comprador,ambos)
```

E o cadastro grava `papel: valor || 'comprador'`. Ou seja: **particular
cadastrado às pressas — justamente quem VENDEU um carro para ele — virava
comprador por omissão e entrava no pool de ofertas.**

Repasse é preço de atacado. Chegar a cliente final expõe a margem a quem
compraria no varejo.

#### O que mudou

- **Match exclui `pessoa_fisica`**, mesmo com `papel=comprador` explícito.
  `or=(tipo.is.null,tipo.neq.pessoa_fisica)` e não `neq` puro: em SQL
  `NULL <> 'x'` é NULL, então o neq sozinho sumiria com todo cliente sem tipo.
- **Tela de Clientes mostra o pool.** Faixa com a contagem, filtro "Recebem
  ofertas" que espelha o filtro da API, e o aviso de quantos entraram **sem
  papel definido** — que é onde o particular se esconde.
- **Cadastro de Particular** esconde Relação com a CNR e Perfil de compra
  (faixa de preço e marcas), que só servem a quem compra repasse. No lugar do
  papel entra a frase explicando a regra — campo que some sem explicação
  parece defeito. `papel` **não é alterado**: escolher "ambos" como Lojista,
  trocar para Particular e voltar preserva "ambos".
- `Relação com **o** CNR` → `com **a** CNR`. Carro na Rede é nome feminino.
- `Contato e endereço` → `Endereço`. O telefone está na seção Cliente; o
  título mandava procurar onde não tinha.

#### O botão que "não funcionava"

Ele reportou que "Ver quem são" não fazia nada. **Fazia — e não dava para
notar**, que na prática é o mesmo. Com todos os clientes no pool, ligar o
filtro não muda a lista.

E isso revelou o estado real: **os particulares dele não estão marcados como
`pessoa_fisica`.** São clientes comuns com "(particular)" escrito no nome. Sem
a marcação não há o que filtrar, e a proteção nova ainda não protege ninguém.

A tela agora diz isso: *"Mostrando 17 de 17 — ou seja, todos recebem ofertas
hoje. Ninguém está marcado como Particular ou Fonte."*

> **Padrão do dia inteiro, terceira vez:** a tela sabia e não contava. Aqui não
> era nem erro de lógica — era ausência de um número na tela.

#### Concluído na mesma noite

Eram **dois**: Tania Maria Minini Caldeira (vendedora do Renegade, 01/set) e
Ruan (vendedor do C3, 17/ago) — os dois particulares de quem ele comprou.
Marcados por ele como `pessoa_fisica`.

**Confirmado pela própria tela:** a faixa em Clientes passou de "17 de 17" para
**15 clientes recebem ofertas**. A proteção deixou de ser teórica.

Ferramenta de marcação em massa foi cogitada e **não** foi feita: eram dois.
E deduzir "é particular" do nome continua fora de cogitação — é conhecimento
do negócio dele, não regra que dê para chutar.

*Registrado em 3 de setembro de 2026, noite.*

### 03/set/2026 (noite II) — APIs auditadas, fechadas, e três defeitos de FIPE

#### As 12 portas, listadas

Levantamento função por função, conferido em produção. Publicado como
artefato para o Yuri. O achado:

**O portão da manhã cobriu as 4 que devolvem dados. Ficaram 8 abertas — e 5
delas cobram por chamada na conta dele.** Testado de fora, sem chave:

```
GET /api/consulta?placa=ABC1D23   →   HTTP 200
```

Consultar Placa cobra por consulta. As outras quatro pagas (APiBrasil,
OpenRouter ×2, remove.bg) pedem POST com corpo — que está no JavaScript da
página, à vista.

**Todas fechadas.** Exceção deliberada e nomeada: `utils?type=ping`, que é o
cron da Vercel mantendo o Supabase acordado. Cron não manda cabeçalho nosso;
fechar ali derrubaria o projeto em ~7 dias por uma proteção que não protege
nada.

Conferido depois: as 12 devolvem 401 sem chave, e o ping devolve `{ok:true}`.

#### FIPE — três defeitos, todos com caso real

O Yuri perguntou se existe API melhor. **Não** — a FIPE não tem API oficial
pública, e a BrasilAPI estava fora do ar na parte que importa no momento do
teste. Mas trocar não resolveria: **quando ele busca pela placa, a FIPE já vem
exata** (a APiBrasil resolve a placa). O erro está no caminho que adivinha a
partir de texto livre.

1. **A pontuação somava a mesma palavra várias vezes.** `Gol 1.0` casava com
   `Gol GL 1.6 Mi/Star 1.6 e 1.8/Atlanta 1.6` porque o `1` aparece quatro
   vezes nesse nome. Agora cada palavra conta uma.

2. **Ano distante virava "aproximação".** Sem 2018 naquele modelo, pegava o
   "mais próximo": **1998**, R$ 17.219, com `found:true` — indistinguível de
   um acerto. Acima de 2 anos agora recusa e explica.

3. **A busca sobrescrevia a FIPE que o anúncio trazia.** Caso do Yuri:
   `Bmw X6 M Coupe 2018` — anúncio dizia 298.000, busca gravou 438.663 (47%
   acima). Na BMW o "M" é tanto o modelo esportivo quanto o pacote M Sport.
   O código fazia isso **de propósito**, com o argumento de que valor de
   anúncio vem arredondado. O argumento erra o essencial: **arredondado do
   carro certo vale mais que exato do carro errado.** Acima de 20% de
   divergência, mostra os dois e mantém o do anúncio.

   Os dois comentários naquele ponto se contradiziam — "se não veio no texto"
   e "sempre busca, ignora o texto" — e o que valia era o segundo.

4. **A tela passou a dizer qual carro casou**, não só o valor. É como o
   MasterFipe (o app que ele usa) evita errar: lá ele escolhe da lista e vê o
   que escolheu.

Verificado: 12 buscas reais e 8 casos da regra de divergência. Testado e
**descartado por medição**: olhar 24 candidatos em vez de 12 não acha o Gol e
dobra o tempo.

#### Achado colateral

Bati em **429 da Parallelum** testando. Não afetou a produção (os testes saem
desta máquina; o Gerador chama da Vercel), mas revela fragilidade: a API é
grátis **sem token**, com limite por IP. Token grátis em `fipe.api.br` sobe o
limite. Pendente.

#### CONTEXTO.md atualizado

O documento dos "sócios" (as outras IAs) afirmava duas coisas que hoje são
falsas: *"a VENDAS_KEY foi removida, sem senha na interface"* e *"o GET da API
é público"*. Documento desatualizado ali não é só desleixo — vira **conselho
errado** vindo deles. Corrigido, com as decisões e lições do dia.

*Registrado em 3 de setembro de 2026, noite.*

---

## Checkpoint — 4 de setembro de 2026, manhã

### Faxina no `index.html`: 418 linhas de editor de foto duplicado

O `index.html` tinha **três modos**: Captação, Parceiros e um terceiro,
`'editor'`, com o editor de foto inteiro dentro dele — CSS, markup e JS.

Esse editor **também vive em `foto.html`**, a tela "Arte" da barra lateral. E o
terceiro botão do topo do Gerador já é um `<a href="/foto.html">`, não um
`setMode('editor')`. Ou seja: a migração para a página própria já tinha sido
feita em algum momento, e **o cadáver ficou para trás**. Nada no arquivo
chamava `setMode('editor')`; o modo era inalcançável.

Removidos:

| o quê | linhas |
|---|---|
| CSS `.editor-*`, `.canvas-*`, `.btn-download` | 23 |
| markup `<div id="modo-editor">` | 74 |
| JS de `setEditorMode` a `downloadFoto` | 321 |
| `pushSecao()`, helper sem nenhuma chamada | 7 |

`index.html`: **3555 → 3115 linhas.**

`setMode()` agora só conhece `'captacao'` e `'coletados'`, e **normaliza
qualquer outro valor para `'captacao'`**. Isso não é zelo à toa: o auto-save
grava `mode` no `localStorage`, e um rascunho salvo antes desta mudança traz
`mode:'editor'`. Sem a normalização, `restaurarEstado()` chamaria
`setMode('editor')` e a página quebraria na primeira linha que procurasse um
elemento que não existe mais.

### O que eu tinha dito de manhã e estava errado

Anunciei "três construtores de texto de anúncio" para unificar. **São dois** —
`montarTextoAnuncio()` e `gerarColetados()` — e eles diferem de verdade: só o
de Parceiros tem a seção `*GASTOS:*`. Já havia um comentário no código
explicando exatamente isso, escrito por mim numa sessão anterior. Ficam os
dois.

Também anunciei "~150 linhas" de editor fantasma. Eram 418.

**A lição:** número de memória, dito antes de abrir o arquivo, é chute com cara
de fato. O Yuri escolheu por qual tarefa começar ouvindo a minha estimativa.

### Varredura de código morto

Escrevi `orfas.js` (scratchpad) para listar funções declaradas que ninguém
chama. Antes: 109 funções, 1 órfã (`pushSecao`). Depois: 108, nenhuma.

Errei o escape do regex **duas vezes** tentando rodar isso como one-liner pelo
shell — os dois resultados vieram falsos (marcaram as 109 como órfãs) e eu
quase reportei. É exatamente a lição de 3/set que eu tinha acabado de
registrar: **teste em arquivo, nunca em one-liner pelo shell.**

### Conferido no navegador, não só no diff

Servidor estático em `localhost:3000` (`scratchpad/serve.js`; o
`.claude/launch.json` da raiz aponta para `vercel dev`, que não sobe aqui).

- Captação ↔ Parceiros trocam certo — visibilidade dos blocos e botão ativo
- `gerarColetados()` gera o anúncio completo com `*GASTOS:*`
- `gerar()` gera o anúncio de captação
- `setMode('editor')` cai em captação **sem erro**
- `foto.html` intacto: zona de upload, canvas, 6 sliders, as três funções
- único 404: `/api/fipe` — o servidor de teste não tem API

### Os três `.bak` de `anuncios.html` — conferidos e apagados

`bak-diag-envio`, `bak-entrada-responder` e `bak-thread` (30/ago e 1/set),
sobras da construção da conversa espelhada da OLX, fora do git.

Antes de apagar, comparei os três contra **as 20 versões** que o git guarda do
arquivo (`scratchpad/baks.js`, `difbak.js` — hash por conteúdo, CRLF
normalizado):

- `bak-thread`: **idêntico** ao commit `a09125c`
- os outros dois: **4 linhas** inéditas — três comentários e um rascunho mais
  estreito da caixa de resposta (`a.status === 'respondeu'`, contra
  `'respondeu' || 'enviado' || 'novo'` no arquivo de hoje)

Nada único, nada mais novo. Apagados com autorização do Yuri; cópia de rede no
scratchpad da sessão.

O risco não era o espaço: `anuncios.html.bak-entrada-responder` ficava a um
duplo-clique de `anuncios.html`, com quase 500 linhas de diferença e o mesmo
começo de nome. **Backup indistinguível do arquivo real deixou de ser backup.**

Errei o escape do shell pela terceira vez no dia montando essa checagem: a
primeira versão carregou 1 versão em vez de 20 e concluiu, errado, que os três
eram cópias únicas. Quase reportei. A correção que funcionou foi `execFileSync`
com argumentos em array — **nada passando pelo shell.**

*Registrado em 4 de setembro de 2026, manhã.*

### Recorte grátis no navegador: testado e DESCARTADO

Proposta minha: trocar a `remove.bg` (paga por imagem) por um modelo rodando
dentro do navegador — custo zero, sem upload. **Medido e reprovado.**

| Modelo | Licença | Resultado |
|---|---|---|
| BiRefNet_lite | MIT | **Estourou a memória do WASM** — `model execution: "350824064"` |
| ormbg | Apache-2.0 | Rodou em **29,5 s** e **não recortou o carro** |
| BEN2 | MIT | +2 min só baixando; não concluiu |
| RMBG 1.4 / 2.0 | não-comercial | Fora por licença |
| `@imgly/background-removal` | **AGPL** | Obrigaria a abrir o código do Gerador |

O BiRefNet era o único com licença certa **e** treino certo para carro (DIS5K,
objetos em geral) — e é transformer, não cabe no WASM a 1024×1024. A ormbg cabe,
mas é treinada em **pessoas**: devolveu máscara mole, com parede, palmeiras e
piso ainda visíveis. E 29,5 s num notebook significa muito pior no celular, que
é onde o Yuri usa.

**Decisão do Yuri: fica como está.** A `remove.bg` continua.

Ressalva registrada: a foto do teste era uma saída do editor (carro já dentro do
estúdio), input atípico. Com foto crua de pátio o resultado pode mudar. A página
de teste (`scratchpad/recorte.html`) roda no navegador e não custa nada — se um
dia houver 3 ou 4 fotos de origem, dá para fechar a questão com dado.

### O que continua valendo (não dependia do recorte)

- **Melhorar a composição do modo Fiel**: borda, sombra de contato, luz. A
  diferença entre Fiel e IA **não é o recorte, é a iluminação** — o gpt-image
  redesenha o carro sob as spots; o Fiel cola o carro chapado.
- **`bg-cnr.jpg` tem 1537 × 1023 px** e o canvas é dimensionado por ele: esse é
  o teto de toda foto exportada hoje, nos dois modos. Um estúdio maior levanta
  a saída inteira de graça.
- O modo IA **redesenha o carro** — o próprio código avisa "confira a placa".
  Em anúncio de repasse isso é risco, não estética.

### Lição

Eu recomendei a troca de manhã dizendo "mesma qualidade, custo zero", com base
em pesquisa de licença e arquitetura — sem ter rodado nada. Três de cinco
opções morreram no primeiro contato com o navegador. **Pesquisa de fonte não
substitui execução;** ela só diz o que vale a pena testar.

*Registrado em 4 de setembro de 2026.*

### Encerrado por decisão do Yuri: nada de "instalar" no computador

Eu vinha oferecendo desde 3/set acrescentar a seção **desktop** à
`instalar.html` — instalar o Gerador como janela própria (PWA) no notebook,
para tirá-lo da conta das abas do navegador.

**Ele organizou as abas na mão e dispensou.** Não é falta de tempo: é decisão.
O problema que a instalação resolveria já não existe.

**Não voltar a propor isso** — nem eu, nem os sócios via CONTEXTO.md. O PWA
segue íntegro no manifest para quem usa pelo celular; o que está encerrado é a
instalação no computador.

*Registrado em 4 de setembro de 2026.*

---

## Checkpoint — 4 de setembro de 2026, tarde

### Ficha do anúncio no card do Radar

Ideia do Yuri, no meio do uso: *"antes de abordar preciso abrir o anúncio para
ler se tem alguma informação que valha a pena."* O card mostrava título, preço,
local e foto — nada do que decide a abordagem.

**Onde estava a descrição.** Não estava em lugar nenhum. O upsert do Radar
grava só `titulo/preco/localizacao/thumbnail`, a página de busca da OLX não
traz descrição nos cards, e a extensão nunca tocava na página do anúncio (os
content scripts rodam em `*.vercel.app` e `chat.olx.com.br`, só).

**A descoberta.** Pedi ao Yuri um diagnóstico no console de um anúncio aberto.
A página **não tem `__NEXT_DATA__`** (a OLX saiu do Next.js, ou mudou de lugar),
mas tem um `<script type="application/ld+json">` de 2492 chars — schema.org,
publicado para o Google. Dentro dele:

| campo | valor no anúncio testado |
|---|---|
| `description` | texto do vendedor, 319 chars |
| `mileageFromOdometer` | `130236` — número |
| `brand` / `model` / `modelDate` | Renault / Expression Flex 1.0 12V 5P / 2018 |
| `fuelType` / `vehicleTransmission` | Flex / Manual |
| `name` (Person) | nome público do anunciante |
| `image` | 18 fotos |

**Por que o ld+json e não o HTML.** As classes da OLX são hashes de
styled-components (`ad__sc-1nl326o-0`) e mudam a cada deploy deles — os cards
esvaziariam sem aviso. O ld+json é contrato público: quebrá-lo estragaria o
próprio SEO da OLX.

### A regra que moldou o desenho

Buscar a ficha dos ~40 anúncios de cada varredura seria **4 páginas → 44**, dez
vezes o peso na OLX. Isso deixa de ser "as minhas buscas" e vira varredura do
site, que é a regra que o Yuri me deu. Então:

> **Botão 👁 no card. Uma página por clique dele.** Mesma forma do ABORDAR.

Ganho honesto: **não economiza o carregamento da página, economiza a viagem.**
Ele já abria o anúncio; agora não sai do Gerador. E o dado fica salvo — lido uma
vez, é dele para sempre.

### O que foi construído

- `supabase/migration-anuncio-detalhes.sql` — 9 colunas nullable + índice
  parcial para "ainda não lidos". Rodada pelo Yuri.
- `lerFichaNaAba()` + `LER_FICHA` no `sw.js`, irmãs de `lerAnuncioNaAba` — a
  máquina de abrir/ler/fechar aba **já existia**, com o raciocínio de
  conformidade documentado nela.
- `CNR_LER_FICHA` / `CNR_FICHA_LIDA` no `cnr-bridge.js`
- PATCH do `?radar=1` com **lista fechada** de campos: o corpo vem do navegador
  e não pode escolher que coluna escrever. `status` e `first_seen_at` de fora.
- Botão + chips + caixa de descrição no `anuncios.html`

**Três decisões que valem lembrar:**

`detalhes_em` separa *"nunca li"* de *"li e o vendedor não escreveu nada"*. Sem
essa coluna os dois casos ficariam NULL e o 👁 reapareceria para sempre num
anúncio sem texto — ele clicaria de novo, gastaria outra página, e nada viria.

`km` é `integer`. O `preco` é `text` desde o começo e por isso não ordena nem
filtra. Não repeti.

O carimbo de leitura é feito **no servidor**, não com o relógio do navegador.

### Conferido

Extrator rodado contra o **ld+json real** do anúncio (`scratchpad/ficha.js`,
que extrai a função de dentro do `sw.js` — se eu mudar o código e esquecer, o
teste quebra) mais 4 casos de borda: json quebrado antes do bom, anúncio sem
descrição, página sem ld+json, ld+json que não é veículo. Os 5 bateram.

Card renderizado nos quatro estados no navegador. Descrição longa **rola dentro
da caixa** em vez de esticar o card e quebrar o alinhamento do grid.

Peguei um erro meu antes de subir: usei `var(--border)`, que **não existe**
neste projeto — o token é `--line`. Um `var()` inválido não dá erro, só pinta
errado. Agora `scratchpad/checa.js` compara todo `var(--x)` do HTML contra os
tokens realmente definidos, e também confere se as colunas da migration batem
com o que o PATCH aceita.

### Próximo, ainda não feito

Medir se `brand`/`model`/`modelDate`/`fuelType` **separados** melhoram a busca
FIPE. Hoje o `fipe-search.js` recebe um título solto e adivinha — foi daí que
saiu o X6 a R$ 438 mil. É hipótese com boa razão para ser verdadeira, mas é
hipótese: **medir antes de afirmar.**

*Registrado em 4 de setembro de 2026, tarde.*

### Em produção, funcionando — e uma pendência aberta

Primeiro uso real (Jeep Compass): o card trouxe **189.000 km, Diesel,
Automático, vendedor e a descrição completa**. O caminho inteiro funciona.

**Não era bug:** o Yuri estranhou que só o Compass mostrasse km. É o desenho —
a ficha só é lida no clique do 👁, um anúncio por vez. Os outros cards ainda
estavam com o botão. Vale como aviso de UX: *"aparece só onde tu clicou"* não
é óbvio olhando a tela.

**PENDENTE — emoji viram `?` na descrição.** No Compass a descrição saiu:

```
? Manual chave reserva
? Cautelar aprovado
? Mecânica revisada
```

Os `?` deviam ser os emojis do vendedor. **"Mecânica" e "econômico" saíram com
acento correto** — logo não é problema geral de UTF-8, é específico com emoji
(fora do BMP, pares substitutos). Suspeitos a verificar, sem chutar:

1. o próprio ld+json da OLX já vir assim
2. `lerFichaNaAba` — a limpeza de `<br>`/tags não deveria tocar neles
3. a gravação (PATCH → PostgREST → coluna `text`)
4. a renderização no card (`esc()` + innerHTML)

O jeito de descobrir é comparar o texto nos quatro pontos, no mesmo anúncio.
Não diagnosticar por screenshot.

*Registrado em 4 de setembro de 2026, tarde.*

### Pendência dos emojis: ENCERRADA — não era nossa

O Yuri respondeu de imediato: **os `?` são erro da própria OLX**, que troca por
`?` os caracteres que o sistema deles não identifica. Conhecido de quem usa a
plataforma. Não é o `lerFichaNaAba`, não é a gravação, não é o card.

Lição: eu já tinha listado quatro suspeitos técnicos e um plano de comparar o
texto nos quatro pontos. **Nenhum deles era a resposta, e o Yuri sabia antes de
qualquer medição.** Perguntar a quem usa a plataforma vem antes de instrumentar
o código.

### O km deveria aparecer em todos os cards?

O Yuri: *"tinha entendido que iria aparecer em todos os cards."*

Eu tinha explicado o mecanismo — clique por clique, uma página por vez — e ele
entendeu. O que não bate é a **expectativa sobre o resultado**: km não é
detalhe de ficha, é dado básico de card, do nível do preço. Para repassador é
filtro primário. A explicação do mecanismo não muda isso.

Pergunta que ficou aberta desde o começo e nunca foi testada: **a página de
BUSCA da OLX já traz o km?** O diagnóstico do `__NEXT_DATA__` foi rodado por
engano numa página de anúncio, não de busca. O `olx-search.js` lê hoje só
título, preço, localização e thumbnail de `section.olx-adcard` — nunca procurou
km.

Se o km estiver no card da busca, ele vem **na varredura normal, em todos os
anúncios, sem clique e sem página extra** — exatamente o que o Yuri esperava. O
👁 continua valendo para a descrição.

*Registrado em 4 de setembro de 2026, tarde.*

### O km vem de graça — o Yuri estava certo

Testado: **a página de busca da OLX já traz o km no card** ("125.000 km", ao
lado da cor). O `olx-search.js` lia título, preço, localização e thumbnail e
passava batido por ele.

Agora o km vem **na varredura normal, em todos os anúncios, sem clique e sem
página extra.** O 👁 continua necessário só para a **descrição**, que de fato
só existe na página do anúncio.

**O primeiro diagnóstico que eu mandei estava errado** e quase encerrou a
questão com "não dá": ele só olhava elementos sem filhos (`children.length === 0`),
e o km da OLX vem num span junto com um ícone. Reportou "nenhum" enquanto o km
estava no texto do card, ali na mesma saída. **O texto bruto do card salvou** —
eu tinha pedido para imprimir junto, e foi ele que mostrou. Diagnóstico que só
responde sim/não pode mentir; junto o material cru, dá para conferir.

Lido do **texto**, não de seletor: as classes da OLX são hashes de
styled-components e mudam a cada deploy deles.

Armadilhas que os testes pegaram:

- **Sem `\b` no fim do regex.** O caminho de retry do `olx-search.js` usa
  `textContent`, que cola os nós vizinhos: `"125.000 kmBranco"`.
- **A alternância testa o formato com milhar primeiro.** Senão o `125` de
  `125.000` venceria e gravaria 125 km.
- `kmDoCard` mora no escopo externo, não dentro de `extractAll()` — o retry é
  função irmã. Estava errado e teria dado `ReferenceError` só no retry, que é
  o caminho raro, ou seja: quebraria em produção e quase nunca no teste.

### O upsert agora agrupa sozinho

Havia um cuidado antigo: linhas **com** e **sem** thumbnail iam em dois upserts
separados, porque `columns` diz o que o Postgres pode sobrescrever — uma
varredura sem foto apagaria a foto boa já salva.

Com o km seriam quatro grupos; cinco campos opcionais dariam 32. Virou
genérico: agrupa pela combinação de opcionais **presentes** e cada grupo
declara só as suas colunas.

**O teste do agrupamento revelou um buraco real:** `km: 0` passava pela
validação (`!== null && !== ''` aceita zero) e sobrescreveria a quilometragem
boa. O `kmDoCard` nunca devolve 0, mas **a API é a fronteira** — a extensão
pode estar numa versão velha, alterada, ou o corpo pode vir de outro lugar.
Faixa conferida nos dois lados.

*Registrado em 4 de setembro de 2026, fim de tarde.*


### Por que a resposta do Fastback não chegou

O Yuri respondeu no **celular**, pelo app da OLX. A Captação Inteligente é uma
**extensão de Chrome de desktop** — ela não existe no telefone. Nenhum dos dois
caminhos de detecção estava lá para ver.

O diagnóstico descartou a hipótese que eu tinha levantado (título ambíguo):
`títulos iguais no banco: 1`, `status: enviado`, `mensagens espelhadas: 0`.

**Os dois caminhos de detecção, ambos dependentes de o Yuri abrir a OLX no
notebook:**

| caminho | o que faz | o que NÃO faz |
|---|---|---|
| conversa aberta (`RESPOSTA_DETECTADA`) | status → `respondeu` + espelha | — |
| caixa de entrada (`CAIXA_ENTRADA`) | acende a novidade em Conversas | **não muda o status** |

### Achado colateral: a novidade não sai do notebook

`conferirCaixaEntrada` guarda o resultado em **`chrome.storage.local`** — o
armazenamento da extensão, naquela máquina. Não vai para o banco.

Ou seja: mesmo quando o notebook detecta, **o celular nunca fica sabendo.** A
tela Conversas no telefone sempre parece vazia. Isso é anterior a qualquer
conversa sobre notificação e tem a mesma raiz.

### Notificação no celular: descartada pelo Yuri, com boa razão

A corrente seria `alguém detecta → o servidor sabe → push no celular`. O
primeiro elo hoje é o próprio Yuri, no notebook — o push avisaria de respostas
que ele já leu no telefone.

Ele decidiu não fazer: *"quando eu estiver na rua, o app da OLX vai me avisar.
E quando eu estiver em casa, o app também avisa."* Está certo — seria duplicar
um aviso que já existe. **Não voltar a propor.**

Fica registrado o limite estrutural, que vale para outras decisões: enquanto a
OLX só é alcançável pelo navegador logado do Yuri, **nada detecta enquanto ele
está na rua com o celular.** Isso encosta no que ele já disse sobre o app
precisar servir Android e iOS.

### Notificação no notebook: onde havia buraco de verdade

O app da OLX avisa de mensagem, mas **não avisa de anúncio novo** que casa com
as buscas. Esse buraco é do Radar — que rodava de hora em hora e só mexia num
badge no ícone da extensão, perdido entre as outras trinta.

Feito: `chrome.notifications` ao fim de cada varredura, com os títulos dos
carros. Decisões que valem lembrar:

- **Não avisa na primeira execução.** Ali todo anúncio é novo: a mensagem seria
  "139 carros novos", que não é notícia, é o inventário inicial.
- **Id fixo** (`cnr-radar-novos`): o aviso novo substitui o anterior em vez de
  empilhar. Depois de uma tarde fora seriam seis balões para ler em sequência;
  o que ele quer saber é quantos há **agora**.
- **Mostra os títulos, não só o número.** "3 carros novos" obriga a abrir para
  saber se vale a pena.
- O listener de clique fica **no topo, fora de async**: em MV3 o service worker
  morre e renasce, e listener registrado dentro de promise se perde.

Conferido com o payload montado a partir do arquivo real em 5 casos.

### Lição do dia, repetida

Errei o escape do shell pela **quarta** vez hoje — agora um here-string do
PowerShell numa mensagem de commit, que virou dezenas de `pathspec did not
match`. As quatro vezes tinham a mesma forma: texto longo passando por shell.
A regra já estava escrita e eu não segui. **Texto longo vai para arquivo;
comando recebe o caminho.**

*Registrado em 4 de setembro de 2026, noite.*

