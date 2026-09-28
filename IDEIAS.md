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
