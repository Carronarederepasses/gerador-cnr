# Gerador CNR — contexto do projeto

Documento de handoff. Serve para colocar alguém (ou outra IA) a par do estado
do sistema sem precisar ler o código. Atualizado em **3 de setembro de 2026**.

---

## 1. O negócio

**CNR — Carro na Rede** compra carros de particulares e repassa. Opera no
litoral sul catarinense: **Garopaba, Paulo Lopes, Imbituba e Imaruí**.

Duas pessoas trabalham nisso — Yuri e a mãe dele (que entra no fim de
setembro de 2026, em notebook próprio) — usando **uma única conta da OLX**.

Não é uma revenda com pátio nem uma operação de volume. É um negócio pequeno,
de decisão humana, onde o gargalo sempre foi a repetição, não o julgamento.

**Objetivo declarado do Yuri:** operar todo o ciclo — captação, abordagem,
conversa, venda — **de dentro do Gerador**, sem precisar entrar na OLX.
Ele escreve cada mensagem e conduz cada negociação pessoalmente. Nada de robô.

---

## 2. As três peças

### Gerador (aplicação web)
HTML estático + funções serverless na **Vercel**, banco **Supabase**
(Postgres). Sem framework de front-end: cada página é um `.html` com
`<script>` inline. Sem build step.

Páginas: `home`, `index` (gerador de anúncio com IA), `catalogo`, `anuncios`
(mesa de captação), `radar` (config das buscas), `conversas`, `compradores`,
`vendas`, `negociacoes`, `consultas`, `busca`, `foto`, `ideias`, `entrar`
(liberação do aparelho), `artes`, `site`, `instalar`.

A barra lateral agrupa em **Captar · Vender · Apoio**. Identidade preto e
branco, tema único (ver decisões).

### Extensão Chrome "Captação Inteligente" (Manifest V3)
Roda no navegador do operador, na sessão OLX já autenticada dele.
Não é publicada na Web Store — instalada descompactada, em modo
desenvolvedor.

Repositório **privado** em `github.com/Carronarederepasses/captacao-inteligente`
desde 03/set — antes existia só no notebook do Yuri, sem cópia em lugar
nenhum. Instalar em máquina nova é `git clone` + carregar sem compactação.

- `background/sw.js` — service worker, o núcleo
- `content/olx-search.js` — extrai anúncios das páginas de busca
- `content/olx-chat-monitor.js` — espelha as conversas do chat
- `content/cnr-bridge.js` — ponte `postMessage` entre Gerador e extensão
- `options/` — configuração local (URL do Gerador; buscas só espelhadas)

### Supabase
Tabelas: `veiculos`, `anuncios`, `buscas`, `vendas`, `compradores`,
`negociacoes`, `eventos`, `olx_mensagens`, `ideias`, `historico`,
`observacoes`.

Acesso **exclusivamente** pelas funções serverless, com `SERVICE_ROLE_KEY`.
Nenhuma página fala com o Supabase direto. RLS ligado nas tabelas, sem
policies — o service role ignora RLS e é o único caminho.

---

## 3. O fluxo completo

```
Radar (extensão, 1×/hora)
  └─ abre as buscas da OLX em abas de segundo plano, lê os cards, fecha
     └─ envia os anúncios novos ao Gerador (tabela anuncios)

Mesa de captação (anuncios.html)
  └─ Yuri vê os anúncios novos, clica ABORDAR
     └─ compositor abre no próprio card, com mensagem sugerida
        └─ ele edita e envia → extensão injeta o texto no chat da OLX

Conversa espelhada (anuncios.html + olx-chat-monitor.js)
  └─ mensagens dos dois lados aparecem no card, atualizando a cada 10s
     └─ ele responde de dentro do Gerador

Venda (vendas.html)
  └─ comprador, valores, documentação, anexos (comprovante, ATPV-e,
     cautelar, consulta veicular) — já fora do escopo da OLX
```

Estados de um anúncio: `novo → preparado → enviado → respondeu | morto`.

---

## 4. O que está funcionando hoje

- Radar com 4 buscas, configuráveis pela tela `/radar.html`
- Abordagem a partir do Gerador, sem redirecionar para a OLX
- Conversa espelhada nos dois sentidos, com atualização automática
- Envio de resposta pelo card
- Registro de vendas com anexos, operado **pelo celular**
- Geração de anúncio por IA a partir de link ou texto colado
- Consulta de placa, FIPE, CEP, remoção de fundo de foto
- **API inteira atrás de chave**, com liberação uma vez por aparelho (03/set)
- **Motor de Match não oferece repasse a particular** (03/set)

---

## 5. Restrições técnicas duras

Estas não são preferências. Quebram o sistema se ignoradas.

| Restrição | Consequência |
|---|---|
| **Vercel Hobby: 12 funções serverless, já no teto** | Arquivo novo em `api/` quebra o deploy inteiro. Endpoint novo entra como modo `?param=1` de um arquivo existente. Páginas HTML não contam. |
| **Service Worker MV3 morre após `sendResponse`** | `fetch` disparado sem `await` é cancelado no meio. Sempre `await` + `try/catch` antes do `return`. |
| **Content script vira órfão ao recarregar a extensão** | Toda aba já aberta precisa de F5. Sintoma típico: "a extensão não responde" logo após um reload. |
| **Verificação do radar é serial, 23s de teto por busca** | ~10 buscas é o limite prático antes do navegador cortar o ciclo. |
| **PostgREST: `DESC` é `NULLS FIRST` por padrão** | Já causou um bug em que registros novos sumiam no fim da lista e pareciam não ter salvo. Usar `.desc.nullslast`. |
| **Captação exige a sessão OLX no navegador daquela máquina** | Celular nunca capta. Celular é gestão; desktop é captação. |
| **React ignora `input.value = x`** | Para preencher campos da OLX é preciso o setter nativo do prototype. |
| **`utils?type=ping` tem de continuar SEM chave** | É o cron da Vercel (9h diário) que mantém o Supabase acordado, e cron não manda cabeçalho nosso. Fechar ali derruba o projeto inteiro em ~7 dias, por uma proteção que não protege nada — o ping lê um id e devolve `{ok:true}`. |
| **`transition` + variável de tema congela a propriedade** | Medido em 03/set: elemento com `transition` fica preso no valor antigo quando a variável muda. Resolvido pela raiz ao adotar tema único — sem troca de tema, não há o que congelar. Reintroduzir tema claro traz o defeito de volta. |
| **Parallelum (FIPE) é grátis e sem token, com limite por IP** | Um dia de muito uso pode bater 429 e a FIPE simplesmente para. Pegar token grátis em `fipe.api.br` sobe o limite — pendente. |

---

## 6. Decisões tomadas, com o motivo

Conselhos que contrariem estas decisões já foram considerados e recusados.

**Nada de automação de envio.** Nenhuma mensagem sai sem uma pessoa ter
escrito e clicado. Sem fila, sem agendamento, sem disparo em massa. Isso é
posição do dono, não limitação técnica.

**Nada de disfarce.** Houve a opção de randomizar os intervalos do radar para
não parecer automatizado. Recusada: a intenção é **pedir autorização** à OLX,
e quem pretende pedir não passa antes por invisível. As duas estratégias são
incompatíveis.

**Leitura da OLX acontece no navegador do operador, nunca no servidor.**
Existia um trecho em que o servidor da Vercel buscava a página com
`User-Agent` de Chrome forjado. Era a única coisa parecida com *web crawling*
e foi removida em 02/set; a API hoje **recusa URLs da OLX** de propósito.

**Nunca fingir sucesso.** Se a OLX rejeitar o clique sintético, o erro
aparece. Três bugs caros nasceram de código que reportava sucesso ou silêncio
onde havia falha.

**Sem senha digitada — mas com chave.** *(revisto em 03/set; a versão
anterior deste documento dizia que não havia chave nenhuma)*

Não há tela de login e o Yuri não digita senha durante o uso. Mas a API
inteira exige a chave `CNR_KEY`: o aparelho é liberado **uma vez** em
`/entrar.html` e nunca mais pergunta. A chave viaja no fragmento (`#`) da
URL, que não é enviado ao servidor.

O motivo não foi proteger o Yuri de si mesmo: `/api/compradores` devolvia
**nome, telefone, CPF e dados bancários dos compradores** a quem soubesse a
URL, e não tinha guarda nem para escrita. Dado de terceiro, não dele.

Detalhe que já custou caro: o envelope de `assets/auth.js` só põe o cabeçalho
quando a página não pôs nenhum. Telas com chave própria antiga
(`cnr_vendas_key`) venciam o envelope e se auto-derrubavam.

**Particular nunca recebe oferta de repasse.** Repasse é preço de atacado;
chegar a cliente final expõe a margem a quem compraria no varejo. O Match
filtra `papel` **e** `tipo`, porque o cadastro grava `papel || 'comprador'` —
particular salvo às pressas entrava no pool por omissão.

**Um visual só, fundo preto.** O app não segue mais o tema do sistema. Além
da identidade da marca, tema único elimina a classe de bug do `transition`
congelado e corta pela metade a superfície para erro de contraste.

**A FIPE do anúncio vence a busca quando divergem muito.** A busca por texto
chuta qual carro é; o vendedor sabe. Acima de 20% de diferença o Gerador
mostra os dois e mantém o do anúncio. Caso que originou a regra: `Bmw X6 M
Coupe 2018` — anúncio dizia 298.000, a busca gravou 438.663 (o X6 M
esportivo, não o X6 com pacote M Sport).

**Colar URL da OLX, nunca montar filtro do zero.** Os parâmetros da OLX mudam
sem aviso. A tela decompõe uma URL que já funciona e **preserva intacto o que
não reconhece**. Pior caso: um filtro aparece como "não reconhecido" e a busca
continua rodando.

---

## 7. Situação perante os Termos da OLX

Existe um documento separado, mais detalhado, preparado para uma conversa
comercial. Em resumo:

- **Sem controvérsia:** abrir páginas públicas logado, ler anúncios, conversar
  pelo chat, escrever as próprias mensagens.
- **Zona cinzenta:** abrir as buscas por temporizador (sem clique humano a
  cada carregamento) e guardar conteúdo fora do site. Os Termos vedam isso
  *"sem autorização prévia e expressa"* — a construção contempla autorização.
- **Já corrigido:** a requisição que partia do servidor com identificação
  forjada.

**Pegada:** 1 conta, 4 buscas, 1 verificação por hora, no máximo ~192
carregamentos de página por dia com as duas máquinas ligadas o dia todo — e
esse é o teto, não a média.

**Em andamento:** o irmão do Yuri (formado em marketing, com PJ) vai abrir
contato com a OLX. O enquadramento escolhido não é pedir permissão para
automatizar, e sim perguntar, como revendedor PJ, se existe integração
oficial, API de parceiro ou plano profissional que contemple acompanhar
anúncios e conversas em ferramenta própria.

---

## 8. Pendências conhecidas

| Item | Situação |
|---|---|
| ~~`GET` da API é público~~ | **Resolvido em 03/set.** As 12 funções exigem chave; única exceção nomeada é `utils?type=ping`, para o cron. |
| Multi-tenancy | A API usa `SERVICE_ROLE_KEY` sem escopo de usuário; `seen`/`queue` vivem no storage local de cada máquina. Vender a terceiros exige auth + RLS de verdade. A chave de hoje é **uma só, compartilhada** — não identifica quem é quem. |
| `Access-Control-Allow-Origin: *` em toda a API | Não é explorável com o portão ligado (a chave mora no `localStorage` do domínio do Gerador). Deixado como está para não quebrar a extensão, que fala de outra origem. |
| Token da Parallelum (FIPE) | Grátis, sobe o limite de requisições. Sem ele, um dia de muito uso pode derrubar a FIPE com 429. |
| `host_permissions: ["https://*.vercel.app/*"]` | Amplo demais para passar na revisão da Chrome Web Store. |
| Logs de diagnóstico na extensão | Poluem o console; precisam sair. |
| Mensagens novas em conversas não abertas | O monitor só enxerga a conversa aberta. Ideia: observar a lista lateral do chat. |
| `detected_at` é hora da captura, não da mensagem | Mensagens antigas carregadas por rolagem ordenam no fim. |
| Segunda operadora | Configurar a extensão no notebook da mãe do Yuri no fim de setembro. As buscas vêm do Gerador automaticamente. |

---

## 9. Como colaborar bem neste projeto

Escrito a partir do que já deu errado.

- **Verificar antes de afirmar.** Já se perdeu tempo caçando corrupção de
  dados que não existia, por confiar numa anotação antiga em vez de abrir o
  anúncio e olhar.
- **Feedback invisível é o inimigo.** Os bugs mais caros deste projeto não
  foram lógica errada — foram telas dizendo uma coisa enquanto o sistema fazia
  outra. Erro tem que chegar ao `console.error` (permanente) **e** à tela.
- **Uma correção por vez, quando pedido.** Yuri pede reparos pontuais com
  frequência: *"corrija somente esse problema, não faça outras melhorias"*.
- **Ele testa em produção, no celular.** Não existe console lá. Feedback tem
  que ser visível na interface.
- **Português do Brasil**, direto, sem enrolação.
- **Perguntar como ele trabalha antes de construir para um cenário.** Em
  03/set foram construídas duas versões de uma "lista de transmissão" — uma
  com fila, outra abrindo várias abas — antes de descobrir que ele usa
  **WhatsApp pelo celular**, onde o app mostra uma conversa por vez. O recurso
  foi removido no mesmo dia. A pergunta certa custava uma linha.
- **Procurar o que já existe antes de mandá-lo configurar algo.** Duas vezes
  se construiu o que já estava pronto (editor de `valor_compra`, busca em
  Vendas), e uma vez ele digitou a mesma chave quatro vezes porque uma chave
  antiga em outra tela não tinha sido procurada.
- **"Não funciona" pode ser "funciona e não dá para notar".** Um filtro
  correto parecia quebrado porque a lista não mudava — todos os clientes
  estavam no conjunto filtrado. Perguntar o que apareceu na tela antes de
  investigar o mecanismo.
- **Relato dele vale mais que blog de fornecedor.** Sobre a lista de
  transmissão do WhatsApp, as fontes disponíveis eram conteúdo de marketing de
  empresas que vendem ferramenta de disparo, e se contradiziam. Ele usa.
- **Segredo nunca em campo de texto visível.** Uma chave vazou num print que
  ele mandou para pedir ajuda. Campo de credencial é `type="password"` desde
  a primeira versão.

---

*Sistema em produção e em uso diário. Este documento descreve o estado real,
não um plano.*
