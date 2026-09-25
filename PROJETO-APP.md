# Projeto — o Gerador como app em rede

> Documento de desenho, aberto em **12 de setembro de 2026**. Não é plano de
> execução e nada aqui foi construído. Serve para pensar antes de escrever
> código, e para os sócios (as outras IAs) opinarem sobre algo escrito em vez
> de sobre lembrança de conversa.
>
> Marcação usada no documento inteiro:
> **[YURI]** decisão dele, já tomada · **[CLAUDE]** recomendação minha, ainda
> não aprovada · **[ABERTO]** ninguém decidiu.

---

## 1. Em uma frase

O Gerador deixa de ser o sistema de uma pessoa e vira **um app onde cada
lojista tem a própria loja na mão e recebe, no privado e na hora, os carros
que interessam a ele** — com alcance nacional.

---

## 2. De onde isso veio

O gatilho não foi ambição de produto: foi um gargalo concreto, descrito pelo
Yuri em 12/set.

> *"Não consigo disparar para todos instantaneamente, então fico no WhatsApp
> mesmo."*

O grupo da Carro na Rede tem 188 membros e mais da metade não abre. A causa é
estrutural, não de conteúdo: **grupo manda tudo para todos**, então quem só
compra popular recebe SUV de R$ 200 mil e aprende a silenciar. O privado
resolve a relevância e não resolve a velocidade — e repasse é agora, o carro
some em dois minutos.

Três saídas foram avaliadas e duas morreram:

| saída | veredito |
|---|---|
| Lista de transmissão do WhatsApp | limitada pelo próprio app — é a dor que o mercado inteiro tem hoje |
| API oficial da Meta | **descartada [YURI]** — ~R$ 35 mil/mês na conta dele. Preço por mensagem pune exatamente o padrão "muitas mensagens × muita gente, todo dia" |
| Ferramenta de disparo de terceiro | **proibido** — banimento do número, que é o próprio negócio |

Sobra construir o canal. E a pergunta que derrubava a ideia — *por que o
lojista instalaria mais um app?* — tem resposta do Yuri:

> *"Vender o gerador como um APP que você tem a loja na sua mão. Controle de
> estoque, integrador, gerador de contrato, relatório de vendas, um lugar para
> consultas automotivas, tudo num lugar só. E ainda recebendo carros direto."*

Ou seja: **a ferramenta entra sozinha, a rede vem junto.** O lojista não
instala para receber os carros do Yuri; instala porque roda o negócio dele, e
receber carro é o que o faz abrir todo dia.

---

## 3. As regras que não podem ser violadas

Se alguma destas cair numa "melhoria" futura, o produto vira outra coisa —
provavelmente a comunidade barulhenta que ele existe para substituir.

### 3.1 A lista é privada **[YURI]**

Cada usuário alcança **apenas os contatos dele**. Não existe botão que mande
um carro para a base inteira, e ninguém enxerga a lista do outro.

É o que protege o dono da rede de ser desintermediado dentro do próprio app.
A vitrine (§6) é uma superfície separada e opt‑in, nunca a lista de todo mundo
somada.

### 3.2 Entrada por solicitação, saída livre **[YURI]**

Ninguém é adicionado sem pedir. O interessado solicita, o dono da lista
aceita, e a saída está sempre à mão.

Consequência aceita: **começa devagar.** Em troca, todo mundo que está ali
quis estar — que é exatamente a diferença para o grupo de hoje. E quem nunca
solicitar é informação, não perda: revela quem eram os 80 que interessavam
dentro dos 188.

### 3.3 O filtro é livre, e o padrão é receber tudo **[YURI]**

Filtro obrigatório no cadastro é decidir pelo outro, na hora em que ele menos
sabe o que quer. Quem quiser ver tudo, vê tudo.

**[YURI, decidido 12/set]** Separar duas coisas que hoje andam juntas:

| | |
|---|---|
| **o que chega** | tudo, sempre — o feed é completo |
| **o que apita o celular** | o que a pessoa escolher; padrão, tudo |

Filtrar notificação não esconde carro nenhum. O incômodo que mata comunidade
não é a informação existir, é o aparelho apitar oito vezes por dia com coisa
fora da faixa. E o filtro não aparece no cadastro: aparece quando dói — se
alguém ignora quase tudo que chega, o app oferece.

### 3.4 Quem só quer receber, só recebe **[YURI]**

Cadastrar estoque é opcional. O app não pode exigir que o lojista alimente
nada para ter direito a ver os carros.

### 3.5 O app não inventa processo de mercado

Ver §5. Vale como princípio geral: onde o mercado já tem regra, o app
**registra** a regra em vez de criar uma nova.

---

## 4. Os três círculos

O produto tem três camadas, e elas entram em ordem de dependência — cada uma
funciona sem a seguinte.

```
┌─ FERRAMENTA ──────────────────────────────────────┐
│  a loja na mão. Vale com 1 usuário.               │
│  estoque · vendas · relatórios · contrato ·       │
│  consulta veicular · gerador de anúncio           │
│                                                    │
│  ┌─ LISTA ───────────────────────────────────┐   │
│  │  privada, por solicitação. Vale com 2.    │   │
│  │  envio instantâneo · fila de interesse    │   │
│  │                                            │   │
│  │  ┌─ VITRINE ────────────────────────┐     │   │
│  │  │  nacional, opt-in por carro.     │     │   │
│  │  │  Vale com ~100.                  │     │   │
│  │  └──────────────────────────────────┘     │   │
│  └────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
```

**Isso importa porque significa que não existe dia do lançamento.** Cada
camada entrega valor sozinha, e a de baixo já está construída.

### Estado real da ferramenta hoje

| peça | estado |
|---|---|
| Controle de estoque | **pronto** — catálogo, fotos, avaliação, margem, dias parado |
| Relatório de vendas | **pronto** — KPIs, mensal, 12 meses, CSV |
| Gerador de anúncio | **pronto** — e é o que ninguém mais tem |
| Consulta veicular | **parcial** — placa funciona; leilão/sinistro/débito exige CNPJ e credenciamento |
| Gerador de contrato | **não construído** — modelo existe (`Celular - CNR Vendas/2026/03 - Março/Contrato compra e venda modelo 06.pdf`). Trava o uso pelo Yuri (sem CNPJ), **não** trava construir: no produto quem assina é o lojista, com o CNPJ dele |
| Integrador | **não construído** — feature eventual, **nunca posicionamento [YURI]**. Virar "mais um integrador" é entrar numa briga onde o diferencial some |

---

## 5. A fila de interesse

Aqui o app não decide nada — ele **transcreve o mercado**. Regra declarada
pelo Yuri:

> *"Hoje é tácito: quem chama primeiro tem a preferência. Dois chamaram ao
> mesmo tempo? Quem colocar sinal primeiro trava. É assim que funciona o
> mercado."*

O que o app acrescenta não é regra nova — é **prova**. Hoje, no grupo, "eu
chamei primeiro" é discussão; no app é carimbo de hora do servidor, visível
para os dois lados.

| hoje, no grupo | no app |
|---|---|
| respostas espalhadas no meio das mensagens | fila ordenada por hora de chegada |
| "eu chamei primeiro" vira discussão | carimbo do servidor, incontestável |
| o 2º não sabe que perdeu | fica na fila se o 1º desistir |
| carro vendido continua aparecendo | marcou vendido, some para todos |

Três decisões de implementação que derivam disso:

1. **A hora é do servidor, nunca do aparelho.** Relógio de celular erra e
   pode ser mexido — e essa é a hora que decide quem ganhou o carro.
2. **Quem trava é o dono — com ou sem sinal. [YURI, corrigido 22/set]**
   > *"Sobre o sinal, isso é controle de cada um, às vezes trava o carro sem
   > sinal."*

   Eu tinha escrito "sinal trava" como se o sinal fosse a condição da trava.
   Não é: **travar é decisão do dono**, para quem ele quiser — por sinal, por
   confiança, por ser cliente antigo. O sinal é **opcional**: se entrou,
   registra valor e comprovante (já existe no Gerador desde 17-18/set). A
   trava sai do ar para os outros, com o motivo visível. O app registra a
   decisão do dono e, quando houver, a declaração do sinal — não o dinheiro.
   **Isso precisa estar claro na tela**, senão promete garantia que não existe.

   Efeito colateral no Gerador de hoje, corrigido no mesmo dia: o cartão
   "Carros travados" do Painel contava só negociação com sinal, e um
   Reservado sem sinal sumia dele.
3. **Desistência devolve a vez.** O 2º da fila é avisado. É onde o app ganha
   dinheiro para o vendedor sem ele fazer nada.

### 5.1 Reservar — o desenho fechado **[YURI, 25/set]**

Fechado desenhando a tela com ele. Quatro decisões:

**1. A palavra é "reservar", não "travar".** "Travar" era minha. O mercado
dele diz **reservado** — e o Gerador **já usa** `reservado` como status de
negociação desde antes. Foi justamente essa lista de status que eu não li em
16/set, e isso me fez construir a "venda em andamento" no lugar errado.

**2. Dois estados, e os dois são públicos:**

| | |
|---|---|
| **Reservado** | na palavra. É a maioria dos casos |
| **Reservado — sinal na conta** | quando o dinheiro entrou; registra valor e comprovante |

> *"No WhatsApp, apenas colocamos carro reservado (com sinal na conta) quando
> tem, quando não tem sinal, somente reservado. Assim, todos veem."*

O próprio rótulo já diz o quanto a reserva é firme. Quem também queria lê e
decide sozinho quanta esperança manter — **sem que o app precise avisar
ninguém**. Eu tinha desenhado um sistema de notificação privada para o 2º da
fila; era resolver com engenharia o que o mercado resolve mostrando o estado
na cara de todos.

**3. Sem prazo automático.** Eu propus 24h renováveis. Ele derrubou:

> *"Prazo de reservado depende de N situações, mas geralmente é o prazo de
> esperar resultado da cautelar e tal, a menos que carro que está
> negociando demore pra entrar, não tem documento ainda pra poder pagar."*

Um relógio derrubaria as reservas **legítimas**, que são a maioria das
demoradas. No lugar dele: o app mostra **há quanto tempo** está reservado e,
se o dono quiser, **por quê** (aguardando cautelar · documento · carro não
entrou). "Reservado há 11 dias", sem motivo, fala por si — e quem some
aparece sem precisar de regra.

**4. Para quem reservou é privado.** O dono escolhe da fila; os outros veem
apenas "Reservado". O nome fica registrado por dois motivos concretos: se a
reserva cair, o app avisa o 2º sozinho; e é daí que nasce o histórico de
desistências que aparece quando alguém pede para entrar numa lista.

> Cheguei a oferecer um "reservar sem dizer para quem". Era mal-entendido
> meu: quando ele disse que não marca para quem, falava do que **os outros**
> veem — ele obviamente sabe, está falando com a pessoa. Descartado.

### 5.2 O membro não vê os outros membros **[YURI, confirmado 25/set]**

Pergunta dele: *"os integrantes não terão acesso aos membros né?"* Não — e é
o que a §3.1 já dizia. Dentro de uma lista:

- **o dono** vê os membros dele
- **os membros** não se enxergam, nem sabem quantos são
- um membro vê: nome da lista, quem é o dono, o que escolheu receber de
  aviso, o próprio histórico ali, e o botão de sair

É a diferença inteira para um grupo de WhatsApp, onde qualquer um abre a
relação de participantes e copia os 188 contatos. **A lista não é um lugar
onde as pessoas se encontram; é um canal que sai do dono para cada uma.**

**[ABERTO]** Empate real (dois toques no mesmo segundo) e prazo de validade do
"chamei primeiro" — depois de quanto tempo sem resposta a preferência passa
adiante?

**Esboço das telas:** `claude.ai/artifact/6ZPmk5F9yyTkntsx3DnAMu` — nove
telas de celular, atualizado em 25/set. Faltam desenhar: entrar/criar conta,
o aviso no celular, e o perfil da loja.

---

## 6. Vitrine

**[YURI]** Referência declarada: **Auto Avaliar** — quem quiser disponibilizar
estoque publica lá, como eles fazem.

### 6.1 O que o Auto Avaliar é, conferido

Plataforma B2B com bid online: ~3,3 mil concessionárias, bancos, locadoras e
fabricantes ofertando, para ~30 mil lojistas multimarcas. Cerca de 18 mil
vendas/mês. Exige CNPJ para comprar.

Dois fatos que orientam o desenho:

**A oferta deles é institucional.** Concessionária, locadora, frotista — carro
que já está dentro de uma empresa. **Ninguém ali capta de pessoa física.** É a
mesma conclusão da pesquisa de 05/set sobre os sistemas de revenda: o mercado
inteiro começa com o carro já na loja. A captação de PF é oferta que eles não
têm.

**A escala deles é o aviso.** Vitrine que tente ser o Auto Avaliar do zero
nasce morta. A vitrine aqui é consequência da rede, não o produto.

### 6.1.1 Cliente final fica de fora **[YURI, confirmado 25/set]**

Ele perguntou se a vitrine seria de carros para venda final — e se fosse,
precisaria liberar acesso a consumidor. Confirmou depois que não:

> *"A ideia do app realmente é somente para lojistas, investidores e
> repassadores."*

Fica registrado porque a pergunta volta, e a resposta tem motivo duro:
**preço de vitrine é preço de repasse, ou seja, atacado.** Consumidor vendo
atacado destrói a margem do lojista — é a mesma razão pela qual o particular
saiu do Motor de Match do Gerador em 03/set.

Se um dia fizer sentido vender ao consumidor, é **outra superfície**: vitrine
da loja, preço de varejo, carros escolhidos um a um, link aberto. Nunca a
vitrine da rede aberta ao público. Duas tabelas de preço que não se
encontram — que é como a loja já trabalha hoje.

### 6.2 Como a vitrine convive com a lista

> **A lista é o primeiro olhar. A vitrine é depois.**

O carro vai para a lista privada **agora**. Se ninguém pegar em X minutos (o
dono escolhe), cai na vitrine. Quem quiser, manda direto — é escolha **por
carro**, não regra do sistema.

Faz duas coisas de uma vez: estar na lista de alguém passa a valer (chega
antes), e carro que não girou encontra comprador em vez de morrer.

### 6.3 Dinheiro **[ABERTO]**

**[YURI]** *"Talvez cobrar uma taxa igual ao Auto Avaliar."*

O ponto duro, e vale decidir com ele na mesa: **só dá para cobrar por venda se
a venda passar por dentro.** Auto Avaliar consegue porque o lance é a
transação — acontece dentro da plataforma. Se as partes se acham na vitrine e
fecham no WhatsApp, não há como cobrar nem como saber que aconteceu.

Quatro caminhos, com o que cada um custa:

| modelo | funciona | custo |
|---|---|---|
| Assinatura da ferramenta | sim, desde o 1º usuário | não monetiza a rede |
| Assinatura para publicar na vitrine | sim | receita baixa no começo |
| Taxa por venda **autodeclarada** | não | ninguém declara |
| Taxa no **sinal processado no app** | sim | exige CNPJ, gateway e regra de pagamento |

~~**[CLAUDE]** O quarto é o elegante: a regra do mercado — *sinal trava* — é
exatamente o momento em que a plataforma tem direito de existir na transação.~~

**Revisto em 22/set.** Esse argumento se apoiava numa premissa errada: que o
sinal é o que trava. O Yuri corrigiu — travar é decisão do dono e muitas vezes
acontece **sem sinal nenhum**, na confiança. Então cobrar no sinal só alcança
parte dos negócios, e justamente os entre desconhecidos; o negócio entre
conhecidos fecha sem passar por ele.

**Cobrar por usuário: descartado [YURI, 25/set].** Eu sugeri que mais
usuários por loja fosse mais caro — loja grande paga mais porque usa mais.
Ele recusou: *"acho que não é justo"*. Tem razão, e o efeito colateral seria
pior que a receita: cobrar por pessoa empurra a loja a compartilhar um login
só, e aí o registro de quem fez o quê — que é metade do valor dos papéis
(§8.2.1) — deixa de existir. **Assinatura por loja, valor único.**

**[CLAUDE]** Com isso, a **assinatura da loja** volta a ser o caminho mais
firme: não depende de o negócio passar por dentro do app. O sinal processado no
app continua possível como **serviço opcional de garantia** entre
desconhecidos (§7) — "pague o sinal pelo app e o carro fica travado com
lastro" — mas deixa de ser a base da cobrança. Segue **[ABERTO]**.

---

## 7. O que quebra ao virar nacional

**[YURI]** *"Esqueça que sou de Garopaba, o gerador vejo com alcance
nacional."* — Correto, e a captação é que é regional; o software não tem
motivo para ser.

Mas alcance nacional muda uma coisa que no litoral de SC é de graça:
**confiança**. Hoje ele conhece as pessoas pelo nome e sabe quem paga à vista.
Entre dois desconhecidos em estados diferentes, nada disso existe, e é o
primeiro lugar onde um app assim apodrece — basta um golpe bem contado para
a rede morrer.

Três peças que passam a ser obrigatórias, e nenhuma é enfeite:

1. **Identidade verificada.** Telefone confirmado por código, e CNPJ
   conferido para quem publica. O próprio Auto Avaliar exige CNPJ para
   comprar — o mercado profissional já trata isso como normal.
2. **Histórico visível.** Quantos negócios, desde quando, quantas
   desistências depois de travar carro. Reputação só funciona se a
   desistência custar alguma coisa.
3. **Sinal com lastro** (§6.3) — o caminho que transforma confiança em
   mecanismo em vez de torcida.

**[ABERTO]** O que fazer com quem trava carro e some. É a fraude barata mais
óbvia do desenho.

---

## 8. O que muda no banco

Este é o trabalho pesado, e é o que encarece se for deixado para depois de
existir cliente pagando.

### 8.1 O problema de hoje

Nenhuma das 12 tabelas tem noção de dono. `veiculos`, `vendas`, `compradores`,
`negociacoes`, `anuncios`, `agenda` — tudo misturado, porque nunca precisou
separar. Existe **uma** exceção parcial: `anuncios.operador`, criada em 08/set
para distinguir quem abordou.

### 8.2 O modelo proposto **[CLAUDE]**

Duas entidades novas, e a distinção entre elas resolve um caso que hoje é
gambiarra:

| | |
|---|---|
| **`contas`** | o negócio. É o dono dos dados — estoque, vendas, clientes |
| **`usuarios`** | a pessoa, identificada pelo telefone |
| **`conta_membros`** | quem pertence a qual conta, com papel |

**Isso absorve o caso da mãe do Yuri nativamente.** Hoje ela usa a conta dele
via chave separada (`CNR_KEY_2`) mais a coluna `operador` — dois mecanismos
paralelos inventados para um caso. No modelo novo é uma conta com dois
usuários, que é a mesma coisa que o lojista vai querer quando tiver um
vendedor.

Tabelas da rede:

| tabela | o que guarda |
|---|---|
| `contatos` | a aresta conta → conta. **É a lista.** Com estado (ativa/saiu) e data |
| `solicitacoes` | pedido de entrada, com aceite ou recusa |
| `ofertas` | um carro enviado: de quem, quando, e quando cai na vitrine |
| `interesses` | quem levantou a mão, **com hora do servidor**, e o estado (interessado / sinal / desistiu) |

E todas as 12 tabelas atuais ganham `conta_id`, com RLS por conta — não mais
RLS ligada sem policy, que é o desenho de hoje e só funciona porque existe um
dono só.

### 8.2.1 Os papéis dentro da loja **[YURI, 25/set]**

Levantado por ele ao ver a tela de entrar, onde eu tinha escrito "um número,
uma loja":

> *"Loja grande, quem compra é o gerente e o dono. E teremos outras funções
> dentro do app — checklist de avaliação, de preparação, status do carro:
> lavação, funilaria, pátio. Algumas dessas telas os funcionários terão
> acesso também."*

O número identifica **a pessoa**, não a loja. E a estrutura para isso **já
existe desde a fase 0**: `usuarios.telefone` + `conta_membros.papel`.

**Quatro papéis**, sendo o último opcional — *"dependendo do tamanho da loja,
é o próprio vendedor que faz a correria de preparação do carro"*:

| | Dono | Gerente | Vendedor | Pátio |
|---|---|---|---|---|
| Carros de repasse que chegam das listas | ✓ | ✓ | — | — |
| Reservar | ✓ | ✓ | — | — |
| Vitrine — procurar carro para um cliente | ✓ | ✓ | ✓ | — |
| Onde está cada carro e o que falta fazer | ✓ | ✓ | ✓ | ✓ |
| Custo do carro e margem | ✓ | ✓ | — | — |

**A regra que eu ia errar:** perguntei quem pode mandar carro para a lista, e
ele respondeu *"quem for responsável por isso, aí não temos como definir quem
faz isso"*. Ou seja, **não é função de cargo** — varia de loja para loja.
Então é **chave à parte, que o dono liga pessoa a pessoa**, nunca amarrada ao
papel. Amarrar seria inventar regra que o mercado não tem (§3.5).

**Distinção nova que apareceu aqui:** o vendedor **não** alcança os carros de
repasse, mas **alcança a vitrine** — *"às vezes o vendedor tem cliente
procurando carro específico que a loja não tem em estoque, ele pode
procurar."* São duas superfícies diferentes, com públicos diferentes dentro da
mesma loja.

**[ABERTO]** Quem convida e tira gente da loja. Supus que só o dono; não foi
confirmado.

### 8.3 Uma decisão que parece detalhe e não é **[ABERTO]**

**`compradores` (o CRM) e `contatos` (a rede) não são a mesma coisa**, e a
tentação de fundir é grande porque muitas vezes é a mesma pessoa.

- `compradores` são **anotações privadas** do dono: "paga rápido", "só compra
  popular", faixa de preço, telefone, CPF.
- `contatos` é **uma relação entre dois negócios**, que os dois lados
  enxergam.

Fundir vaza o que um escreveu sobre o outro. Recomendação: manter separados,
com vínculo opcional — "este contato é o cliente Fulano do meu CRM".

---

## 8.4 Onde isso é construído — cópia, não **[decidido 12/set]**

**[YURI]** *"Ao invés de construir em cima do nosso gerador, construir em cima
de uma cópia. Assim posso ir mexendo no gerador sem afetar as
funcionalidades."*

O objetivo está certo e é inegociável: **a operação dele não pode parar nem
correr risco enquanto isso é construído.** Mas "cópia" junta duas coisas que
precisam de respostas opostas.

| | resposta |
|---|---|
| **Dados separados** | **sim, sempre.** Banco novo, vazio. Nada do que for feito toca catálogo, vendas ou clientes de verdade |
| **Código copiado** | **não.** Mesma base, ramo separado (*branch*) |

**Por que o código não pode ser cópia:** é o erro que mais custou caro neste
projeto, e ele já aconteceu seis vezes — os dois montadores de anúncio
(AVALIAÇÃO e GASTOS sumiram do WhatsApp por meses), a máscara de telefone, as
declarações do catálogo, o desenho da placa, o acesso à FIPE, a mensagem de
abordagem. **Em todas, duas cópias divergiram em silêncio e ninguém percebeu
até dar problema na frente do cliente.** Copiar o sistema inteiro é a maior
versão possível desse erro: correção feita de um lado não chega no outro, e a
juntada depois de meses é pior que o trabalho original.

Ramo separado dá exatamente o que ele quer — produção intocada, ele mexendo à
vontade no que usa — sem criar a segunda cópia. E quando estiver pronto, a
juntada é normal, porque o histórico é um só.

```
main                          → gerador-cnr.vercel.app    (dele, banco real)
ramo do projeto               → endereço de teste         (banco vazio)
```

Os dois endereços rodam o mesmo repositório apontando para bancos diferentes,
por variável de ambiente. Nenhuma linha de código sabe qual é qual.

---

## 8.5 Piloto com lojista — e por que ele não pode receber uma chave

**[YURI, 12/set]** Um parceiro lojista de Garopaba topa testar.

**Não dá para simplesmente liberar o aparelho dele.** Hoje o sistema é de um
dono só: quem entra vê **tudo** — as 114 vendas com valor de compra e lucro,
os clientes com CPF, telefone e dados bancários, o catálogo inteiro com quanto
foi pago em cada carro. Entregar isso a outro lojista é entregar a margem da
operação e, pior, dado pessoal de terceiro que não é do Yuri para distribuir.

**O piloto é uma instância separada**, com banco próprio e vazio, onde ele é o
único dono. Mesmo código, mesmo repositório, endereço e banco diferentes.

E isso rende um teste que vale por si: **é a primeira vez que o sistema atende
alguém que não é o Yuri**, e vai revelar sozinho todo lugar onde ele está
escrito no código. A mensagem de abordagem já saiu de lá em 11/set (mora em
`api/_abordagem.js`, no servidor) — foi exatamente o que tornou isto possível
sem refazer nada.

**[ABERTO]** O que mais está preso ao Yuri: marca d'água, nome no topo,
Instagram, textos do WhatsApp, região padrão.

---

## 9. O aparelho

O Gerador é HTML, CSS e JavaScript. Isso **embrulha** em app nativo (Android e
iPhone) reaproveitando as telas que existem — não é reescrever, é a mesma
coisa com casca, e é a casca que dá direito a notificação de verdade.

Custo de loja: US$ 25 uma vez no Google, US$ 99 por ano na Apple.

**A notificação é o motivo de existir o app**, então ela decide o momento: até
a camada LISTA entrar, o navegador do celular basta.

---

## 10. Ordem de construção **[CLAUDE]**

Cada fase é utilizável sozinha e não depende de decisão das seguintes.

| | o quê | por que nesta ordem |
|---|---|---|
| **0** | `contas` / `usuarios` / `conta_membros` + `conta_id` em tudo + RLS por conta | Fundação. Não depende de nenhuma decisão de produto, e é o que multiplica de preço depois de ter cliente |
| **1** | Identidade por telefone com código, substituindo a chave por aparelho | Sem isso não há usuário, só navegador liberado |
| **2** | Contatos, solicitação, envio para a lista, fila de interesse | **O coração.** Já ganha do WhatsApp com 10 usuários |
| **3** | App embrulhado + notificação | Quando a lista existir e tiver o que notificar |
| **4** | Vitrine nacional | Quando houver rede suficiente para ela não nascer vazia |
| **5** | Sinal e cobrança | Depende de CNPJ |

**Antes da fase 0 tem uma coisa que custa zero:** um lojista de verdade usando
o Gerador pelo navegador, como a mãe do Yuri já usa. Se ele não usar no
navegador, também não usaria como app — e o que faltar vai ser coisa que nem
eu nem o Yuri listamos aqui.

---

## 11. O que trava o quê

| trava | o que segura |
|---|---|
| **CNPJ** | consulta veicular (camada 2), contrato para o Yuri, sinal e cobrança, conta de loja de app. *"Preciso ver isso com calma"* — 12/set |
| **Rede vazia** | vitrine. Não adianta construir antes |
| **Multi-tenancy** | tudo que envolva mais de uma loja |

Nada do que está nas fases 0 a 2 depende do CNPJ.

---

## 12. Ainda não decidido

- Preço e modelo de cobrança (§6.3)
- Empate e validade da preferência na fila (§5)
- Punição de quem trava carro e some (§7)
- Fundir ou não CRM e contatos (§8.3)
- Nome do produto — "Gerador CNR" é nome interno de ferramenta de uma pessoa
- Quanto tempo o carro fica na lista antes da vitrine, e se é o dono quem
  escolhe caso a caso

---

*Aberto em 12 de setembro de 2026. Nada construído.*
