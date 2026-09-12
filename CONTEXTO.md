# Gerador CNR — contexto do projeto

Documento de handoff. Serve para colocar alguém (ou outra IA) a par do estado
do sistema sem precisar ler o código. Atualizado em **11 de setembro de 2026**.

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

⚠️ **Isso é direção, não estado.** O Gerador é o cockpit; o motor continua
sendo a sessão da OLX no navegador daquela máquina. Sem Chrome logado e com a
extensão carregada, não há radar, não há ficha e não há espelho de conversa.
O que foi eliminado é ele *navegar* na OLX, não a dependência dela.

**Decisão estratégica de 05/set:** o Gerador **vai virar produto**, vendido a
outros repassadores, com consulta veicular embutida. Isso ainda não mudou o
código, mas muda o peso de algumas pendências — ver §8.

---

## 2. As três peças

### Gerador (aplicação web)
HTML estático + funções serverless na **Vercel**, banco **Supabase**
(Postgres). Sem framework de front-end: cada página é um `.html` com
`<script>` inline. Sem build step.

**Páginas (19).** Captação: `radar` (config das buscas), `anuncios` (mesa de
captação), `conversas`, `parceiros`, `captacao`. Venda: `catalogo`,
`compradores`, `negociacoes`, `vendas`. Apoio: `home` (painel), `consultas`,
`busca`, `foto` (Arte), `ideias`, `artes`, `entrar`, `instalar`, `site`.

Duas merecem nota:
- **`index.html` é só um redirecionamento** para `/home.html` desde 08/set.
  Era o Gerador inteiro — uma tela com duas abas — e virou `parceiros.html` +
  `captacao.html`. Continua existindo porque o favorito do Yuri aponta para lá.
- **`gerador-antigo.html` foi removido em 11/set.** Era o Gerador de antes do
  desmembramento, guardado como porta de emergência. As telas novas rodaram
  vários carros desde 08/set. Continua recuperável pelo git.

**Código compartilhado em `assets/`** — fonte única, e cada um deles nasceu de
uma cópia que divergiu em silêncio:
`sidebar.js`/`sidebar.css` (navegação e o lembrete de avaliação),
`gerador-comum.js`/`gerador.css` (cascata FIPE e helpers das duas telas de
anúncio), `mascaras.js` (telefone, CPF/CNPJ, CEP, mês/ano, placa),
`placa.css` (a etiqueta de placa), `story.js` (a arte de story),
`auth.js` (envelope que põe a chave em todo `fetch`), `tokens.css` (cores e
tipografia), `theme-toggle.js` (resíduo: o app tem **tema único** desde
03/set — o arquivo só limpa `data-theme` antigo e expõe no-ops).

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
- `content/olx-search.js` — extrai anúncios das páginas de busca (título,
  preço, local, foto e **km**)
- `content/olx-chat-monitor.js` — espelha as conversas do chat
- `content/olx-chat.js` — preenche a mensagem de abordagem (nunca envia)
- `content/cnr-bridge.js` — ponte `postMessage` entre Gerador e extensão
- `options/` — configuração local: URL do Gerador, chave, e **se este
  computador roda o radar** (11/set). As buscas são só espelhadas — quem
  manda nelas é a tela /radar.html.

### Supabase
Em uso: `veiculos`, `anuncios`, `buscas`, `vendas`, `compradores`,
`negociacoes`, `eventos`, `olx_mensagens`, `ideias`, `historico`,
`observacoes`, **`agenda`**.

São **12, e só essas**. `vistorias` e `listas_envio` foram apagadas em 11/set,
depois de conferido que nenhum código as referenciava. O único registro real
que havia — uma vistoria de 28/06, de um carro cujo dono desistiu de vender —
está guardado em `supabase/vistorias-backup-2026-06-28.json`.

Acesso **exclusivamente** pelas funções serverless, com `SERVICE_ROLE_KEY`.
Nenhuma página fala com o Supabase direto. RLS ligada em **todas** as tabelas,
sem policies — o service role ignora RLS e é o único caminho.

---

## 3. O fluxo completo

```
Radar (extensão, 1×/hora)
  └─ abre as buscas da OLX em abas de segundo plano, lê os cards, fecha
     └─ envia os anúncios novos ao Gerador (tabela anuncios)
        └─ aviso do Chrome quando aparece carro novo

Mesa de captação (anuncios.html)
  └─ 👁 Ficha: abre o anúncio em aba de fundo, lê a descrição e a ficha
     técnica do ld+json, fecha — uma página por clique dele
  └─ 💬 ABORDAR: compositor abre no próprio card, com a mensagem padrão
     └─ ele edita e envia → extensão injeta o texto no chat da OLX
     └─ ✅ ENVIEI marca o status (ABORDAR ≠ ENVIADO)

Conversa espelhada (anuncios.html, conversas.html, olx-chat-monitor.js)
  └─ mensagens dos dois lados aparecem no card, atualizando a cada 10s
     └─ ele responde de dentro do Gerador
  └─ caixa de entrada: lê a lista lateral do chat e acende as conversas com
     mensagem nova, inclusive as que ele não abriu

Virou carro → Captação (captacao.html) ou Parceiros (parceiros.html)
  └─ texto de anúncio para WhatsApp, FIPE, fotos, checklist
     └─ "Salvar no catálogo" só na Captação: carro de parceiro não é estoque

Catálogo (catalogo.html)
  └─ Motor de Match, oferta em 1 clique, story para Instagram

Venda (vendas.html)
  └─ comprador, valores, documentação, anexos (comprovante, ATPV-e,
     cautelar, consulta veicular) — já fora do escopo da OLX

Em paralelo: agenda de avaliações no Painel, com `.ics` para o celular
```

Estados de um anúncio: `novo → preparado → enviado → respondeu | morto`.

---

## 4. O que está funcionando hoje

**Captação**
- Radar com 4 buscas, configuráveis pela tela `/radar.html`
- Aviso do Chrome ao fim da varredura quando há carro novo (04/set)
- Km lido do card da busca, sem custo de página extra (04/set)
- Ficha do anúncio pelo botão 👁 — descrição e dados técnicos (04/set)
- Abordagem a partir do Gerador, sem redirecionar para a OLX
- Conversa espelhada nos dois sentidos, com atualização automática
- Caixa de entrada: mensagem nova em conversa fechada (02/set)
- Painel de desempenho por busca (trazidos, abordados, conversão)

**Anúncio e catálogo**
- Duas telas separadas: Parceiros (IA preenche 16 de 20 campos) e Captação
- Busca FIPE por placa, com cascata marca → modelo → ano → versão
- Catálogo com Motor de Match, oferta em 1 clique e registro de resultado
- **Story do carro** (10/set): botão no card gera a arte 1080×1920 com foto,
  marca, versão, ano, km e preço, pronta para o Instagram

**Operação**
- Registro de vendas com anexos, operado **pelo celular**
- Agenda de avaliações no Painel, com `.ics` para o calendário do celular
  (09/set) e lembrete na barra lateral em todas as telas (11/set)
- **API inteira atrás de chave**, com liberação uma vez por aparelho (03/set)
- **Chave por pessoa**: `CNR_KEY_2..9` no formato `Nome:chave`; a coluna
  `anuncios.operador` é carimbada pelo servidor e o card mostra quem abordou
  (08/set)
- **Motor de Match não oferece repasse a particular** (03/set)

---

## 5. Restrições técnicas duras

Estas não são preferências. Quebram o sistema se ignoradas.

| Restrição | Consequência |
|---|---|
| **Vercel Hobby: 12 funções serverless, já no teto** | Arquivo novo em `api/` quebra o deploy inteiro. Endpoint novo entra como modo `?param=1` de um arquivo existente. **Arquivo com prefixo `_` não é roteado e não conta** — é assim que `_auth.js` e `_fipe.js` existem. Páginas HTML não contam. `api/ping.js` está no `.vercelignore` para segurar exatamente 12. |
| **Service Worker MV3 morre após `sendResponse`** | `fetch` disparado sem `await` é cancelado no meio. Sempre `await` + `try/catch` antes do `return`. |
| **Content script vira órfão ao recarregar a extensão** | Toda aba já aberta precisa de F5. Sintoma típico: "a extensão não responde" logo após um reload. |
| **Verificação do radar é serial, 23s de teto por busca** | ~10 buscas é o limite prático antes do navegador cortar o ciclo. |
| **PostgREST: `DESC` é `NULLS FIRST` por padrão** | Já causou um bug em que registros novos sumiam no fim da lista e pareciam não ter salvo. Usar `.desc.nullslast`. |
| **Captação exige a sessão OLX no navegador daquela máquina** | Celular nunca capta. Celular é gestão; desktop é captação. |
| **React ignora `input.value = x`** | Para preencher campos da OLX é preciso o setter nativo do prototype. |
| **`utils?type=ping` tem de continuar SEM chave** | É o cron da Vercel (9h diário) que mantém o Supabase acordado, e cron não manda cabeçalho nosso. Fechar ali derruba o projeto inteiro em ~7 dias, por uma proteção que não protege nada. |
| **`transition` + variável de tema congela a propriedade** | Medido em 03/set. Resolvido pela raiz ao adotar tema único. Reintroduzir tema claro traz o defeito de volta. |
| **FIPE: 500 requisições/dia sem token, 1.000 com** | Uma busca por placa custa **~45 requisições** (o servidor pede os anos de cada modelo de nome parecido — 43 só para "Corolla"). Desde 10/set há token (`FIPE_TOKEN`) e cache de 6h em `api/_fipe.js`, com cópia de socorro de 7 dias quando a FIPE recusa. |
| **Canvas 2D não tem `font-variant-numeric`** | A Playfair desenha algarismos de estilo antigo. Nas telas resolve-se com `lining-nums` no `:root`; **no canvas não existe a propriedade** — por isso o `story.js` desenha os trechos numéricos em DM Sans. |
| **Nenhuma página da web publica no Instagram nem escreve no calendário do celular** | Não existe permissão para isso em Android nem iPhone. Por isso agenda sai como `.ics` e story sai como imagem para baixar. |
| **RLS ligada SEM policy nenhuma** | É correto *enquanto* o único caminho for o `service_role`, que ignora RLS. Mas é armadilha: no dia em que alguém puser a chave `anon`/`publishable` no front-end, **toda consulta volta vazia sem erro** — tela em branco sem mensagem, que é o pior modo de falha deste projeto. Pôr a anon key no front exige escrever policies ANTES, não depois. |
| **A âncora da mensagem de abordagem** | `olx-chat-monitor.js` usa `'Olá! Tudo bem? Meu nome é Yuri'` para separar o que o operador escreveu do que o vendedor escreveu. Cinco dos seis usos cortam em `slice(0, 20)` = `'Olá! Tudo bem? Meu n'`, que **para antes do nome** e sobrevive a uma troca. O sexto, `extrairApos()`, usa a string inteira — esse quebra. Relevante porque a segunda operadora entra no fim de setembro: ver §8. |

---

## 6. Decisões tomadas, com o motivo

Conselhos que contrariem estas decisões já foram considerados e recusados.

**Nada de automação de envio.** Nenhuma mensagem sai sem uma pessoa ter
escrito e clicado. Sem fila, sem agendamento, sem disparo em massa. Isso é
posição do dono, não limitação técnica. Em 08/set ele cogitou usar um agente
externo (Muse) para conduzir as conversas e a ideia foi descartada — entre
outros motivos, porque derruba a defesa perante a OLX, que se apoia em
"0 mensagens automáticas".

**Nada de disfarce.** Houve a opção de randomizar os intervalos do radar para
não parecer automatizado. Recusada: a intenção é **pedir autorização** à OLX,
e quem pretende pedir não passa antes por invisível. Pela mesma razão, a aba
que o botão 👁 abre e fecha **não é escondida**.

**Leitura da OLX acontece no navegador do operador, nunca no servidor.**
Existia um trecho em que o servidor da Vercel buscava a página com
`User-Agent` de Chrome forjado. Removido em 02/set; a API hoje **recusa URLs
da OLX** de propósito.

**Nunca fingir sucesso.** Se a OLX rejeitar o clique sintético, o erro
aparece. Três bugs caros nasceram de código que reportava sucesso ou silêncio
onde havia falha. A regra vale para texto de tela: distinguir sempre "não há"
de "não consegui saber".

**Sem senha digitada — mas com chave.** Não há tela de login e o Yuri não
digita senha durante o uso. Mas a API inteira exige chave: o aparelho é
liberado **uma vez** em `/entrar.html` e nunca mais pergunta. A chave viaja no
fragmento (`#`) da URL, que não é enviado ao servidor.

O motivo não foi proteger o Yuri de si mesmo: `/api/compradores` devolvia
**nome, telefone, CPF e dados bancários dos compradores** a quem soubesse a
URL. Dado de terceiro, não dele.

Detalhe que já custou caro: o envelope de `assets/auth.js` só põe o cabeçalho
quando a página não pôs nenhum. Telas com chave própria antiga
(`cnr_vendas_key`) venciam o envelope e se auto-derrubavam.

**Particular nunca recebe oferta de repasse.** Repasse é preço de atacado;
chegar a cliente final expõe a margem a quem compraria no varejo. O Match
filtra `papel` **e** `tipo`, porque o cadastro grava `papel || 'comprador'`.

**Um visual só, fundo preto.** O app não segue o tema do sistema. Além da
identidade, tema único elimina a classe de bug do `transition` congelado.

**A FIPE do anúncio vence a busca quando divergem muito.** A busca por texto
chuta qual carro é; o vendedor sabe. Acima de 20% de diferença o Gerador
mostra os dois e mantém o do anúncio. Caso que originou a regra: `Bmw X6 M
Coupe 2018` — anúncio dizia 298.000, a busca gravou 438.663.

**Numa consulta por PLACA, o valor da APiBrasil manda.** Ele vem do chassi
daquele carro, não de um palpite sobre texto. Até 10/set isso era decidido por
um `setTimeout` de 2,5s contra a cascata — ou seja, no cronômetro, e o mesmo
carro dava resultado diferente conforme a rede.

**Não criptografar campos no Supabase.** Sugerido e recusado duas vezes
(02/set e 11/set, as duas pela Perplexity). A API precisaria descriptografar
para responder, então não protege de quem chega pela API — que é o único
caminho — e **custa busca e ordenação** nesses campos no banco. Custo real,
ganho nenhum. O Supabase já criptografa em disco, o que cobre outra ameaça:
alguém levar o hardware, não alguém usando a aplicação.

**Colar URL da OLX, nunca montar filtro do zero.** Os parâmetros da OLX mudam
sem aviso. A tela decompõe uma URL que já funciona e **preserva intacto o que
não reconhece**.

**Carro de parceiro não é estoque.** Não aparece "Salvar no catálogo" na tela
Parceiros, não entra no catálogo e não vira story. *"Só vão para o relatório
de vendas caso eu venda; caso contrário é lixo mesmo."*

**Ele mesmo fotografa os carros captados**, com tampa-placa e um padrão
próprio: foto 1 frontal reta, **foto 2 em 45° com a frente à esquerda**
(conferido nos cinco carros do catálogo em 10/set — é por isso que o story
escolhe a segunda sozinho). O estúdio de foto existe para **descaracterizar**
fotos vindas de lojas parceiras, não para embelezar. Não propor edição de foto
como etapa da captação.

**Preço vai no story do Instagram.** Decisão dele em 10/set, contra a
recomendação de não pôr: *"detesto ver stories de coisas à venda sem preço; a
galera desanima, mais fácil eu filtrar depois"*. O campo é `veiculos.valor`
(o repasse) — **nunca** `valor_compra`, que é o que ele pagou.

**O alarme é do celular, não nosso.** A agenda gera `.ics` e o telefone toca
offline, com o app fechado. Alarme dentro do Gerador só tocaria com ele
aberto — justamente o cenário que não serve (*"posso tá na rua"*). O lembrete
na barra lateral é outra coisa: ele já está com o Gerador aberto.

**A mensagem de abordagem é escrita por ele.** A versão em uso desde 09/set é
texto dele, não sugestão aceita. A primeira frase — `Olá! Tudo bem? Meu nome é
Yuri` — **não pode mudar** sem mudar junto a âncora em `olx-chat-monitor.js`,
que a usa para separar o que ele escreveu do que o vendedor escreveu.

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

**Pegada:** 1 conta, 4 buscas, 1 verificação por hora, no máximo **~96**
carregamentos de página por dia — e esse é o teto, não a média. Eram ~192 na
projeção de duas máquinas varrendo; desde 11/set **o radar é ligável por
computador** e só a máquina do Yuri varre. A da mãe lê a mesma fila pelo
Gerador e aborda, sem repetir a varredura. O botão 👁 acrescenta **uma** página por clique
dele, nunca na varredura.

**Ponto de timing:** a janela para conversar com a OLX não fecha por tempo —
**fecha na distribuição**. Enquanto é o Yuri sozinho, na própria conta, é
ferramenta pessoal. No instante em que um parceiro instala, vira software
distribuído e a defesa de caso único desaparece.

**Em andamento:** o irmão do Yuri (formado em marketing, com PJ) vai abrir
contato com a OLX. O enquadramento não é pedir permissão para automatizar, e
sim perguntar, como revendedor PJ, se existe integração oficial, API de
parceiro ou plano profissional. Pesquisa de 03/set: a OLX tem três APIs
oficiais (Anúncios, Leads, Chat) e o canal `suporteintegrador@olxbr.com` —
mas as três são para **quem anuncia**, e o Yuri faz o inverso.

---

## 8. Pendências conhecidas

| Item | Situação |
|---|---|
| **CNPJ** | O gargalo de duas frentes ao mesmo tempo: destrava o site de consulta veicular **e** a venda do Gerador. Nada técnico depende disso; tudo comercial depende. |
| **Multi-tenancy** | A API usa `SERVICE_ROLE_KEY` sem escopo de usuário; `seen`/`queue` vivem no storage local de cada máquina. As chaves de hoje identificam **quem** (`CNR_KEY_2..9`), mas não isolam **dados** — Yuri e mãe compartilham tudo de propósito. Vender a terceiros exige auth + RLS de verdade. |
| `Access-Control-Allow-Origin: *` em toda a API | Não é explorável com o portão ligado. Deixado como está para não quebrar a extensão, que fala de outra origem. |
| `host_permissions: ["https://*.vercel.app/*"]` | Amplo demais para passar na revisão da Chrome Web Store. |
| Logs de diagnóstico na extensão | Ainda lá (15 pontos no `sw.js`). Mantidos de propósito enquanto a captação é observada — foram eles que acharam os bugs de 01–02/set. Sair quando estabilizar. |
| `detected_at` é hora da captura, não da mensagem | Mensagens antigas carregadas por rolagem ordenam no fim. Resolver exige guardar a posição na conversa (mudança de schema). |
| **Segunda operadora — DECIDIDO em 11/set** | Fim de setembro. Ela usa a **conta da OLX do Yuri** e, do Gerador, **só a abordagem** — Radar/Anúncios e o espelho de conversa. Catálogo, vendas, clientes e negociações continuam só com ele. Duas consequências: (a) a mensagem segue com "Meu nome é Yuri", que é coerente com a conta que o vendedor vê, então **a âncora não precisa mudar** e o acoplamento descrito em §5 fica inerte; (b) o radar dela é desligado nas opções da extensão — só uma máquina varre. Falta: `git clone`, liberar o aparelho em `/entrar.html` com a chave dela (`CNR_KEY_2`, já configurada) e desmarcar "Este computador roda o radar". |
| Senhas e acesso ao e-mail | A senha do e-mail da empresa é a mesma de tudo, e esse e-mail é a conta de recuperação de Vercel, Supabase, OLX e Instagram. **A verificação em duas etapas está ligada desde 05/set** — telefone **e** app Authenticator, conferido nos próprios avisos do Google. Falta: (a) os **códigos de backup**, porque hoje os dois fatores moram no mesmo aparelho e perder o celular tranca a conta que recupera todas as outras; (b) o levantamento de onde a senha é usada, antes de trocá-la. Decisão dele: deixar para depois. |
| **LGPD / retenção** | Medido em 11/set: **14 clientes com CPF/CNPJ**, 3 com banco ou Pix, 6 vendas com CPF do comprador. Dado de quem fechou negócio — precisa ficar, por contrato e nota. O que poderia acumular sem razão (nome de vendedor e conteúdo de conversa de quem **não** fechou) **não está acumulando**: nenhum anúncio passa de 60 dias e a mensagem mais antiga tem 12. Nada urgente hoje. Vira pauta real quando houver assinantes, porque aí passa a ser dado de cliente dos outros. |

**Resolvidas desde a versão anterior deste documento:**
`GET` público da API (03/set) · token da FIPE e cache (10/set) · mensagens
novas em conversas não abertas (02/set, caixa de entrada) · RLS na tabela
`historico`, que estava aberta e legível de fora (08/set).

---

## 9. Como colaborar bem neste projeto

Escrito a partir do que já deu errado.

- **Verificar antes de afirmar.** Já se perdeu tempo caçando corrupção de
  dados que não existia, por confiar numa anotação antiga em vez de abrir o
  anúncio e olhar.
- **Feedback invisível é o inimigo.** Os bugs mais caros deste projeto não
  foram lógica errada — foram telas dizendo uma coisa enquanto o sistema fazia
  outra.
- **Contar não é medir.** Um levantamento acusou "7 arquivos afetados" quando
  era 1: `grep` conta texto, mas não sabe o que cada página carrega. Medir por
  unidade real (a página, com os arquivos que ela puxa).
- **O verificador também mente.** Em 10/set, quatro vezes: um teste acusou
  código que só existia dentro de um comentário explicando que ele fora
  removido; outro acusou um timer sem relação; a versão "esperta" que removia
  comentários engoliu código (`*/` aparece dentro de expressões regulares).
  Recortar a função de que se fala e checar dentro dela; preferir testar
  comportamento a procurar texto. Quando o teste acusar o produto, desconfiar
  do teste primeiro.
- **Quando a captura de tela e a medição discordam, nenhuma venceu ainda.**
  Mudar as condições até uma das duas se explicar, em vez de escolher a que
  confirma o que já se achava.
- **Texto longo vai por arquivo, nunca pelo shell.** Escape comido já
  produziu expressões regulares quebradas e código corrompido, cinco vezes.
- **Uma correção por vez, quando pedido.** Yuri pede reparos pontuais com
  frequência: *"corrija somente esse problema, não faça outras melhorias"*.
- **Ele testa em produção, no celular.** Não existe console lá.
- **Português do Brasil**, direto, sem enrolação.
- **Perguntar como ele trabalha antes de construir para um cenário.** Em
  03/set foram construídas duas versões de uma "lista de transmissão" antes de
  descobrir que ele usa **WhatsApp pelo celular**, onde o app mostra uma
  conversa por vez. O recurso foi removido no mesmo dia.
- **Procurar o que já existe antes de mandá-lo configurar algo.** Duas vezes
  se construiu o que já estava pronto, e uma vez ele digitou a mesma chave
  quatro vezes porque uma chave antiga em outra tela não fora procurada.
- **Investigar o pedido, não só atendê-lo.** Em 10/set ele pediu para trocar a
  fonte porque "número fica ruim de ler". Não era a fonte: era `lining-nums`
  desligado. Mostradas as quatro opções lado a lado, o próprio pedido perdeu
  sentido para ele. Trocar a fonte teria custado a identidade do sistema por
  causa de um ajuste.
- **Ele costuma chegar na solução melhor em duas ou três voltas.** No Painel,
  passou de "dois botões" para "um botão com seletor" para "subir a seção que
  já existe" — a terceira não custava clique nem duplicava nada. Vale ouvir a
  iteração em vez de implementar a primeira.
- **"Não funciona" pode ser "funciona e não dá para notar".** Perguntar o que
  apareceu na tela antes de investigar o mecanismo.
- **Relato dele vale mais que blog de fornecedor.**
- **Segredo nunca em campo de texto visível.** Uma chave vazou num print que
  ele mandou para pedir ajuda.
- **Cópia é o defeito que mais voltou aqui.** Montador de anúncio, máscara de
  telefone, declarações do catálogo, desenho da placa, acesso à FIPE — todos
  nasceram duplicados e divergiram em silêncio. Antes de copiar um trecho,
  extrair para `assets/`.

---

*Sistema em produção e em uso diário. Este documento descreve o estado real,
não um plano.*
