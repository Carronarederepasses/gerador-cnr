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
2. **Sinal trava, e trava de verdade.** Marcado o sinal, o carro sai da roda
   para os outros, com o motivo visível. Enquanto o sinal não for processado
   dentro do app (§6.2), quem marca é o vendedor — o app registra a
   declaração, não o dinheiro. **Isso precisa estar claro na tela**, senão
   promete garantia que não existe.
3. **Desistência devolve a vez.** O 2º da fila é avisado. É onde o app ganha
   dinheiro para o vendedor sem ele fazer nada.

**[ABERTO]** Empate real (dois toques no mesmo segundo) e prazo de validade do
"chamei primeiro" — depois de quanto tempo sem resposta a preferência passa
adiante?

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

**[CLAUDE]** O quarto é o elegante, e por um motivo que não é financeiro: a
regra do mercado que o Yuri descreveu — *sinal trava* — é exatamente o momento
em que a plataforma tem direito de existir na transação. O sinal dentro do app
resolve três coisas ao mesmo tempo: trava o carro de forma incontestável, dá
segurança entre desconhecidos (§7) e cria o momento de cobrança.

Não é para agora: mexer com dinheiro de terceiro tem peso regulatório próprio.
Mas convém **não fechar a porta dele** ao desenhar a fila de interesse.

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
