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

### Limite crítico — Vercel 12 funções serverless (já no limite)
`api/`: catalogo.js, compradores.js, consulta.js, fetch-anuncio.js, fipe-search.js, fipe.js, ia-compor.js, parse.js, placa.js, remove-bg.js, utils.js, vendas.js

Novas features de backend devem reutilizar funções existentes via query params (ex: `?neg=1`, `?foto=1`, `?evento=1`, `?match=1`).

---

## 4. Páginas do Sistema

| Página | Descrição |
|---|---|
| `index.html` | Gerador de anúncio WhatsApp (modo manual + colar anúncio com IA, cascata FIPE) |
| `home.html` | Dashboard: pipeline, KPIs, carros parados, negociações ativas, relatório mensal, histórico 12 meses |
| `catalogo.html` | Catálogo de veículos: fotos, avaliação estruturada com score por categoria, valor_compra + margem, dias em estoque, Motor de Match, edição inline |
| `negociacoes.html` | CRM de negociações: motivo do match, motivo do descarte (tap), contrato PDF, link para registrar venda |
| `vendas.html` | Registro de vendas + entrada rápida de histórico (⚡), CSV, pré-preenchimento vindo das negociações |
| `compradores.html` | CRM: histórico de compras, taxa acumulada, Motor de Match automático, ranking |
| `busca.html` | Busca global: catálogo, vendas, negociações, compradores |
| `consultas.html` | Histórico veicular por placa (APiBrasil) |
| `foto.html` | Editor de foto: remove fundo + composição padrão CNR |

---

## 5. Banco de Dados (Supabase)

### Tabelas principais
- `veiculos` — ficha técnica, fotos (JSONB), avaliação (JSONB com scores por categoria), valor_compra, status
- `vendas` — registro de vendas fechadas, taxa_intermediacao, comprador, anexos
- `negociacoes` — lifecycle de negociações, motivo_match, motivo_descarte, historico (JSONB), valor_proposto
- `compradores` — CRM: nome, telefone, tags, preferências
- `eventos` — log imutável de tudo (event sourcing)

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
- **Fase 2 — Usar o conhecimento para ajudar o Yuri a decidir** ✅ Match Ativo (Sprint 1 em validação)
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

**Princípio do Sprint:** "O que o sistema saberá fazer depois desta sprint que hoje só o Yuri sabe?"

**Princípio do Timing:** "Nenhuma melhoria de arquitetura vale mais do que dados reais entrando no sistema."

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
- [ ] **Preencher perfis dos compradores** — marcas, faixa de preço e "O que sabemos" em compradores.html. Isso desbloqueia o Motor de Match.
- [ ] **Retroalimentar mais histórico** — 20 registros feitos via ⚡, meta é 30+ transações reais.
- [x] Testar modo "Colar Anúncio" — validado e funcionando
- [x] Validar FIPE no app publicado — confirmado funcionando

### Médio prazo (Fase 2 — Copiloto)
- [ ] Motor de Match baseado em histórico real (quando tiver 30+ transações)
- [ ] Sugestão de preço baseada em transações similares
- [ ] Alerta de timing: "esse perfil de carro costuma vender em X dias"

---

## 8. URLs

- **App publicado:** https://gerador-cnr.vercel.app
- **GitHub:** https://github.com/Carronarederepasses/gerador-cnr
- **GitHub Pages (NÃO usar — FIPE quebrada sem serverless):** https://carronarederepasses.github.io/gerador-cnr/

---

*Atualizado em agosto/2026. Manter este arquivo atualizado conforme o projeto evolui.*
