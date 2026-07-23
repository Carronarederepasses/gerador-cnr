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

O ativo real não é o software — é o **dataset proprietário** de transações reais do mercado de repasse do litoral de SC. O software é o mecanismo de captura.

**Princípio norteador:** cada funcionalidade deve responder 4 perguntas:
1. O que aconteceu? (evento)
2. Qual foi o resultado? (output)
3. Por que essa decisão foi tomada? (contexto)
4. O sistema consegue aprender com isso? (aprendizado)

Se uma feature responde só 1 e 2, ela registra operação. Se responde as 4, ela constrói inteligência.

**Princípio da Estrutura Emergente:** nenhum dado deve virar campo estruturado porque parece importante. Ele vira campo estruturado quando sua ausência começa a limitar a inteligência do sistema. O gatilho não é volume — é fricção. Texto livre primeiro. Estrutura depois, e só quando a realidade exigir.

**Princípio do Sprint:** "O que o sistema saberá fazer depois desta sprint que hoje só o Yuri sabe?"

**Princípio do Timing:** "Nenhuma melhoria de arquitetura vale mais do que dados reais entrando no sistema."

**Princípio da Abstração:** "Toda abstração deve nascer de um caso real, nunca de uma hipótese." (complementa a Estrutura Emergente: um fala sobre dados, o outro sobre código e arquitetura.)

**Regra de fechamento de sprint:** "Toda decisão estratégica do CNR deve terminar em uma ação operacional que aumente a qualidade do dataset." Princípio sem ação é filosofia. Ação sem princípio é ruído. A ponte entre os dois é o que faz o flywheel girar.

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

*Atualizado em julho/2026. Manter este arquivo atualizado conforme o projeto evolui.*
