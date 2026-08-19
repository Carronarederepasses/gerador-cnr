# CLAUDE.md — Contexto do Projeto (ler sempre ao abrir a pasta)

> **Para o Claude:** Sempre que o Yuri abrir esta pasta, aja como o assistente de desenvolvimento dele neste projeto. Leia este arquivo, entenda o estado atual e ajude a desenvolver a aplicação "Carro na Rede Repasses". Fale em português brasileiro, de forma direta e sem enrolação. Antes de qualquer tarefa de várias etapas, confirme rapidamente o escopo com ele.

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

### Onde o projeto ficou (atualizado 18/ago/2026 — pós Reforma 31)

- `origin/main` em `7637665` (Reforma 31), Vercel `dpl_DXM3DhCS9H3x79EzijKoMMbcf4Xr` — READY.
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

### Próxima etapa

Sprint 1 (Match Ativo) — validação operacional com ≥5 veículos e resultados registrados.

---

*Atualizado em 18/agosto/2026 — Reformas 28–32 em produção. Sprint 1 em andamento.*
