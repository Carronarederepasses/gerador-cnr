# Ideias — CNR

Caderno de ideias do Yuri. Escreve do jeito que vier: sem formato, sem
capricho, sem se preocupar se faz sentido. Rabisco serve.

O Claude lê este arquivo no começo de cada sessão. Se algo aqui virar
trabalho, ele move para o CLAUDE.md com o desenho e a decisão — aqui fica só
o que ainda não foi feito.

---

## Anotar aqui

<!-- Escreva abaixo. Uma linha já basta. -->

- **RENAVE no sistema** — entrada e saída de veículo no estoque pelo
  registro eletrônico do governo (28/set)

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
- **Buscador de FIPE na tela inicial** → feito em 01/out/2026, tela /fipe.html e atalho no Painel. A cascata ja existia e era feita para reuso: ganhou o contexto `avulsa`.
- **Financeiro: o que tenho a receber** → feito em 03/out/2026,
  `vendas.comissao_recebida_em`. Botão 💰 Recebi no card da venda e cartão
  "A receber" no Painel, escondido quando não há nada. O histórico entra na
  conta: dívida não tem mês.
- **Catálogo de repasses separado do estoque** → feito em 03/out/2026. É do
  **lojista**: `valor_varejo` ao lado do preço de repasse e `destino_venda`
  (varejo / repasse / os dois), marcado por ele carro a carro, com filtro no
  topo do catálogo. Escondido para repassador.
- **Importar as vendas do lojista, por ele mesmo** → feito em 03/out/2026,
  tela `/importar.html`. Autoatendimento, como ele corrigiu: o arquivo é
  aberto no navegador dele e nada é enviado para ninguém. Lê as colunas
  que a planilha tem, mostra antes de gravar, e trava contra duplicata.
  **O que NÃO está prometido:** o dado não fica invisível para o Yuri —
  ele é o administrador do banco.
- **FIPE do catalogo nao virava com o mes** → feito em 02-03/out/2026: `veiculos.fipe_ref` guarda qual linha da tabela deu o valor, e o servidor atualiza sozinho no GET do catalogo. Carro antigo mostra "nao atualiza — religar".
