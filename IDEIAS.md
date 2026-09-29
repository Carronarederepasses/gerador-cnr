# Ideias — CNR

Caderno de ideias do Yuri. Escreve do jeito que vier: sem formato, sem
capricho, sem se preocupar se faz sentido. Rabisco serve.

O Claude lê este arquivo no começo de cada sessão. Se algo aqui virar
trabalho, ele move para o CLAUDE.md com o desenho e a decisão — aqui fica só
o que ainda não foi feito.

---

## Anotar aqui

<!-- Escreva abaixo. Uma linha já basta. -->

- **Catálogo de repasses para lojas**, separado do catálogo de estoque de
  venda (ideia de 28/set, conversando com um amigo)
- **RENAVE no sistema** — entrada e saída de veículo no estoque pelo
  registro eletrônico do governo (28/set)
- **Financeiro: o que tenho a receber** — a venda é registrada, mas a
  comissão que ainda não entrou não aparece em lugar nenhum (28/set,
  vendo o menu do SIG)
- **Alarme de pendências no Painel** — "3 carros sem preço de repasse,
  não dá para mandar para a rede", com link. Poucas linhas e no lugar
  certo, ao contrário da lista de 17 carros parados do SIG (28/set)

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

- **Cidade vem suja da extensão** — em 13 de 200 anúncios a `localizacao`
  veio com a data grudada ("GaropabaHoje, 13:13"). A TELA já limpa desde
  29/set, então não atrapalha o uso; consertar em `olx-search.js` evitaria
  a sujeira na origem, mas exige recarregar a extensão nas duas máquinas.

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
