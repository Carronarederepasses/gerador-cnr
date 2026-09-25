# Chaves do sistema — onde cada uma vive

> **Este arquivo não guarda valor de chave nenhuma, e nunca vai guardar.**
> Ele responde outra pergunta: *quais chaves existem, onde cada uma mora, o
> que ela abre, e o que fazer quando ela se perder.*
>
> Os valores ficam no **gerenciador de senhas**. Arquivo de texto no
> computador entrega tudo a quem tiver o notebook — inclusive a chave do
> banco, que lê dado de cliente.

Levantado em 25/set/2026 lendo o código, não de memória.

---

## A regra que evita a busca

**Quase nenhuma chave precisa ser "encontrada".** Chave marcada como
*Sensitive* na Vercel **não se relê** — nem por ti. Então, perdida a
cópia, o caminho nunca é procurar: é **gerar outra e trocar**.

Isso é barato para quase todas, e caro só para duas (ver a coluna
"perdeu?" abaixo).

---

## As chaves do Gerador

| Variável | O que abre | Onde vive | Perdeu? |
|---|---|---|---|
| `CNR_KEY` | O Gerador inteiro (a chave do Yuri) | Vercel · `gerador-cnr` | Gera outra em `/entrar.html` e troca. **Todo aparelho precisa ser liberado de novo** |
| `CNR_KEY_2` … `_9` | Um operador a mais (formato `Nome:chave`) | Vercel · `gerador-cnr` | Gera outra e troca. Só aquela pessoa é afetada |
| `CNR_OPERADOR` | O nome que aparece no card (não é segredo) | Vercel | — |
| `SUPABASE_SERVICE_ROLE_KEY` | **O banco inteiro.** É a mais séria da lista | Vercel + `.env` local | Rotaciona no painel do Supabase. Trocar exige atualizar Vercel **e** `.env` |
| `APIBRASIL_TOKEN` | Consulta de placa (**paga por consulta**) | Vercel | Painel da APiBrasil |
| `OPENROUTER_API_KEY` | A IA que lê anúncio e print (**paga**) | Vercel | Painel do OpenRouter. A do piloto tem teto de US$ 5 |
| `FIPE_TOKEN` | Cota da FIPE (1.000/dia em vez de 500) | Vercel | `fipe.api.br`. Sem ela o sistema **continua funcionando**, com cota menor |
| `REMOVE_BG_API_KEY` | Recorte de fundo da foto (**paga**) | Vercel | Painel do remove.bg |
| `RADAR_KEY`, `VENDAS_KEY`, `CATALOGO_KEY` | Herança de antes do portão único | Vercel (podem nem existir mais) | Não recriar. Hoje quem manda é a `CNR_KEY` |
| `MARCA_*` | Nome, logo, Instagram e telas de cada site | Vercel | Não são segredo |

## Fora da Vercel

| O quê | Onde | Observação |
|---|---|---|
| Chave do **piloto** (BHM) | Vercel · `cnr-piloto` | É **diferente** da tua, de propósito. Provado em 22/set |
| Chave no **Apps Script** da planilha | Propriedades do Script, na planilha de vendas | É o backup das vendas. Se parar, o Google manda e-mail |
| Chave dentro da **extensão** | `chrome.storage.local` de cada computador | Digitada na tela de opções. Não existe em arquivo nenhum |
| Chave no **navegador** de cada aparelho | `localStorage`, posta por `/entrar.html` | O Safari apaga depois de dias sem uso — normal pedir de novo |

---

## As duas que doem

1. **`SUPABASE_SERVICE_ROLE_KEY`** — abre todo o banco. Trocar é possível,
   mas mexe em dois lugares ao mesmo tempo e derruba o sistema se ficar
   pela metade.
2. **Senha do e-mail da empresa** — não é do Gerador, é a raiz de tudo:
   recupera Vercel, Supabase, OLX e Instagram. Tem verificação em duas
   etapas desde 05/set. **Falta guardar os códigos de recuperação fora do
   celular** — hoje os dois fatores moram no mesmo aparelho, e perder o
   celular tranca a conta que destranca todas as outras.

---

## Onde guardar os valores

Gerenciador de senhas, não arquivo de texto. Serve para o computador e
para o celular, e o que está lá dentro continua fechado se o notebook for
roubado.

Se for guardar em nota do Google (que já tem verificação em duas etapas),
é melhor que um `.txt` na área de trabalho — mas concentra tudo na mesma
conta que recupera todas as outras. Gerenciador separado é mais seguro.

**Nunca dentro da pasta do projeto.** O `.gitignore` tem uma rede de
segurança para nomes óbvios (`chaves*`, `senha*`, `*.key`), mas rede de
segurança não é lugar de guardar coisa.
