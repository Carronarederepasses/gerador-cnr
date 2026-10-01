# Ideias — CNR

Caderno de ideias do Yuri. Escreve do jeito que vier: sem formato, sem
capricho, sem se preocupar se faz sentido. Rabisco serve.

O Claude lê este arquivo no começo de cada sessão. Se algo aqui virar
trabalho, ele move para o CLAUDE.md com o desenho e a decisão — aqui fica só
o que ainda não foi feito.

---

## Anotar aqui

<!-- Escreva abaixo. Uma linha já basta. -->

- **Importar as vendas do lojista, por ele mesmo** (01/out) — ideia do
  Yuri depois de falar com o Bruno e o Nogueira: nenhum dos dois mexeu no
  sistema ainda, "por falta de tempo", e o sistema vazio não puxa
  ninguém. Com o histórico dentro, o Painel diz algo verdadeiro no
  primeiro dia.

  **A correção dele é o desenho inteiro:** eu tinha imaginado "eles te
  mandam o arquivo e eu importo". Não existe —
  *"jamais passariam o relatório, assim como eu tb não. Isso é muito
  pessoal."* Ele diz que a maioria tem em Excel ou planilha do Google;
  caderno ficou para trás, mas ainda deve existir.

  Então tem de ser **autoatendimento**: o lojista escolhe a planilha
  dele, na conta dele, e o arquivo não passa pela mão de ninguém.

  O que isso exige, e é onde está o trabalho:
  - **não dá para exigir o nosso formato** — a planilha é dele, com as
    colunas dele. A tela mostra as colunas que vieram e ele diz qual é
    qual, uma vez
  - **mostrar antes de gravar** — as primeiras linhas já traduzidas, para
    ele conferir. Importação que grava direto, num dado que ele considera
    pessoal, é pedir para ele nunca mais mexer
  - o `📥 CSV` de `vendas.html` já define um formato de saída; serve de
    referência, não de exigência

  **O que NÃO prometer:** autoatendimento tira o constrangimento de
  entregar o arquivo a uma pessoa, mas **não torna o dado invisível para
  o Yuri** — ele é o administrador do banco. É a mesma correção que ele
  me fez em 25/set sobre o Bruno. As duas coisas são verdade e a segunda
  não se esconde.

  **Dúvida honesta antes de construir:** quem não teve tempo de lançar um
  carro pode não ter tempo de arrumar uma planilha. O teste mais barato
  continua sendo **um carro só**, e ele responde se o sistema serve para
  alguém que não seja o Yuri.

- **Buscador de FIPE na tela inicial** (01/out) — consultar a FIPE de um
  carro qualquer direto do Painel, sem precisar criar anúncio nem abrir
  Captação/Parceiros. Hoje a FIPE só é alcançável dentro do fluxo de um
  carro que ele está cadastrando.
  Nota para quando virar trabalho: o motor já existe e está bom
  (`api/fipe-search.js` + a cascata), inclusive com a trava de sub-linha
  de 01/out — é tela, não lógica nova. E vale decidir se mostra a versão
  que casou (como o MasterFipe faz), que foi o que evitou erro em 03/set.

- **Catálogo de repasses para lojas**, separado do catálogo de estoque de
  venda (ideia de 28/set, conversando com um amigo)

- **RENAVE no sistema** — entrada e saída de veículo no estoque pelo
  registro eletrônico do governo (28/set)

- **Financeiro: o que tenho a receber** — a venda é registrada, mas a
  comissão que ainda não entrou não aparece em lugar nenhum (28/set,
  vendo o menu do SIG)

- **Grupo e transmissão de graça, o resto pago** (29/set) — a parte de
  rede (grupo, transmissão, conversa) seria a porta de entrada gratuita,
  e catálogo, vendas, captação, FIPE e consulta ficariam no plano pago.
  Faz sentido com o que a gente viu: **a rede só vale com gente dentro**,
  e cobrar pela porta atrasa isso. O sistema de loja é o que o lojista
  paga; a rede é o que o traz.
  Depende de decidir cobrança, que depende do CNPJ — parado até depois
  das eleições.

- **Convidar liberado para os outros usuários** (29/set) — hoje só a loja
  dona da instalação convida (`podeConvidar` em `api/utils.js`). Quando o
  piloto estiver de pé, soltar para cada loja convidar a própria rede.

- **Assinar o contrato dentro do sistema** — ADIADO por decisão do Yuri
  em 28/set: *"a parte de contrato é particular de cada loja"*. Começou
  a ser desenhado e parou antes de rodar qualquer coisa.
  O que ficou entendido, para quando voltar:
  - o **texto** do contrato é de cada loja (cláusulas, comissão, quem
    responde pelo quê); o **mecanismo** de assinar não é. Se for feito,
    o texto tem de ser modelo por conta, nunca o do Yuri embutido
  - a base legal já existe e a cláusula já está no contrato dele:
    MP 2.200-2/2001 art. 10 §2º (assinatura sem ICP vale quando as
    partes a admitem) + Lei 14.063/2020 (nível "simples")
  - o que a lei pede vira três colunas, não recado jurídico:
    **identidade** (nome, documento, ip, aparelho), **integridade**
    (sha256 do texto exato assinado — sem isso ninguém prova que o
    documento não mudou depois) e **anuência** (aceite gravado no ato)
  - o contrato tem de ser **congelado** em texto, não regerado da
    negociação: assinatura é sobre um documento, não sobre um registro


---

- **"O sistema se adapta à loja, não a loja ao sistema"** (01/out) —
  frase de um amigo do Yuri, trazida por ele. **Para amadurecer, não é
  decisão fechada.**

  Boa parte disso o projeto já faz sem ter dado nome: modelo de anúncio
  por loja (29/set), telas escondidas por conta, lojista × repassador,
  marca vinda de `contas`. E na importação de planilha é obrigatório —
  ler o que a loja tem, não exigir o nosso formato.

  **Onde o princípio é perigoso, e é o que falta amadurecer:** existe um
  esqueleto que não pode ser da loja — o que É um carro, uma venda, um
  cliente. Se cada uma redefinir isso, morrem três coisas:
  - o **relatório**, porque não se soma o que cada um definiu diferente
  - a **Rede**, porque o carro só atravessa de uma loja para outra
    quando significa a mesma coisa nas duas. Campo inventado não viaja
  - o **Match** e a **FIPE**, que leem campos que precisam existir

  E a armadilha prática: *tudo configurável* vira um sistema em que cada
  tela tem uma tela de configuração atrás. A loja abre, vê 40 opções e
  fecha. É a mesma razão pela qual o Yuri decidiu em 29/set que as cinco
  etapas da preparação ficam fixas por ora.

  **Régua proposta (a amadurecer):** a loja manda na FORMA, o sistema
  manda no ESQUELETO — e o esqueleto é o menor possível (carro, venda,
  cliente, negociação). Campo que a loja inventar dá para guardar, mas
  não entra em relatório, Rede nem Match: vira anotação, não
  inteligência. E isso se diz a ela ANTES, não depois.

  **Primeiro passo concreto, se for em frente:** não construir um motor
  de configuração. Fazer a importação adaptável e aprender, com dado
  real, quais campos as lojas têm que a gente não tem. Aí decidir o que
  vira campo de verdade — que é a Estrutura Emergente já escrita no
  §6 do CLAUDE.md: estrutura nasce de fricção, não de hipótese.


## Já viraram trabalho

<!-- O Claude move para cá quando a ideia sai do papel, com a data e onde
     ela foi parar. Serve para você lembrar do que já pediu. -->

- **Buscas do radar configuráveis pelo Gerador** → feito em 02/set/2026,
  tela `/radar.html`
- **Chat espelhado dentro do Gerador** → feito em 02/set/2026,
  tela `/conversas.html`
- **Saber que alguém respondeu sem abrir a OLX** → feito em 02/set/2026,
  leitura da caixa de entrada
- **Busca na lista de vendas** → feito em 02/set/2026
- **Venda em andamento de parceiros** (sinal recebido, aguardando fechar) → feito em 16/set/2026: campos de sinal em `vendas.html`, cartao no painel, `supabase/migration-venda-sinal.sql`
- **Alarme de pendências no Painel** → feito em 29/set/2026, bloco "⚠️ Resolver antes" em `home.html`. Só entra o que IMPEDE uma ação (carro sem preço de repasse, sem foto, reservado sem comprovante); some quando não há nada.
- **Cidade vem suja da extensão** → feito em 01/out/2026, `cidadeDoCard()` em `content/olx-search.js` limpa na origem, gêmea declarada de `soCidade()` do Gerador. O verificador achou de brinde um defeito antigo na tela: "Porto Seguro" virava "Porto".
