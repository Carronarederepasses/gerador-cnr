# Fase 1 — entrar por telefone

Desenho técnico, escrito em 27/set. **Nada disto foi construído.** É para
decidir antes de escrever, e para a construção não precisar redescobrir o
caminho.

---

## 1. O que muda de verdade

Não é "trocar chave por SMS". É isto:

| hoje | depois |
|---|---|
| o aparelho é liberado | a **pessoa** entra |
| `conta_id` vem de **variável de ambiente** | vem da **sessão de quem pediu** |
| uma loja = um site na Vercel | um site atende **todas** as lojas |
| o card diz "operador 2" se alguém errar o prefixo | o nome vem do cadastro |

A linha do meio é a que importa. `api/_conta.js` hoje lê `CNR_CONTA_ID` do
ambiente, e é por isso que o Bruno precisou de um projeto Vercel só dele.
Enquanto for assim, **cada cliente novo custa um site e um banco** — e o
Supabase grátis já travou no segundo.

> A fase 1 não é uma melhoria de login. É o que faz o produto caber no
> plano grátis e escalar depois.

---

## 2. O fluxo, em dois passos

```
1) POST /api/utils?type=codigo    { telefone }
   → gera 6 dígitos, guarda o HASH, manda o SMS
   → responde sempre igual, mesmo se o telefone não existir

2) POST /api/utils?type=sessao    { telefone, codigo }
   → confere, cria a sessão, devolve o token
   → o navegador guarda o token onde hoje guarda a chave
```

**Por que dentro de `utils.js` e não em arquivo novo:** o plano Hobby da
Vercel dá 12 funções e as 12 estão ocupadas. `utils.js` já hospeda `ping`,
`marca`, `manifesto` e `quem` pelo mesmo mecanismo — é o padrão da casa
desde 08/set.

Essas duas rotas ficam **antes** do portão (como o ping e a marca): quem
está entrando ainda não tem com que se identificar.

---

## 3. Duas tabelas

Arquivo pronto: `supabase/fase1-sessoes.sql`.

| tabela | para quê |
|---|---|
| `codigos` | o código pendente: telefone, **hash**, validade, tentativas |
| `sessoes` | a sessão viva: **hash** do token, quem é, quando nasceu, último uso |

**Guardamos hash, nunca o valor.** Vale para o código e para o token. Se o
banco vazar, ninguém entra com o que está lá. É a mesma razão por que a
chave da Vercel é *Secret* e não *Config* — aprendido em 25/set, quando a
própria Vercel apontou o `FIPE_TOKEN` exposto.

---

## 4. O que pode dar errado, e a resposta de cada um

Esta seção existe porque login é a porta: aqui um erro não dá tela feia,
dá estranho dentro do sistema.

| risco | resposta |
|---|---|
| **Tentar os 6 dígitos na força** | 5 tentativas por código e o código morre. 1 milhão de combinações com 5 chances é o suficiente |
| **Código que não expira** | Vale **10 minutos**. Depois disso, some |
| **Encher alguém de SMS** | No máximo 1 envio por minuto e 5 por hora, por telefone. Protege o bolso e a pessoa |
| **Reusar o código** | Marcado como usado no mesmo instante em que vale |
| **Descobrir quem tem cadastro** | O passo 1 responde **igual** para telefone conhecido e desconhecido. Resposta diferente vira lista de clientes para quem quiser |
| **Token roubado** | Sessão com validade e último uso registrado. Dá para encerrar uma sessão sem derrubar as outras |
| **Telefone reaproveitado pela operadora** | Número que muda de dono é caso real no Brasil. Trocar o telefone de um usuário precisa passar pelo dono da conta, nunca ser automático |

---

## 5. A transição sem travar ninguém

**A regra que vale mais que o desenho:** o Yuri e a mãe usam isto todo dia.
Em 03/set eu fechei a API e quebrei o backup das vendas no Google Sheets
porque não perguntei o que mais consumia a API. A lição já está escrita:
nada de virar a chave de uma vez.

1. **`_auth.js` aceita os dois** — chave por aparelho **ou** sessão. Nada
   quebra no dia do deploy.
2. `contaDoPedido(req)` passa a olhar a sessão primeiro; **sem sessão, cai
   na variável de ambiente**, que é o comportamento de hoje.
3. Yuri e mãe entram pelo telefone quando quiserem, no tempo deles.
4. Só depois de as duas sessões existirem e rodarem alguns dias, as chaves
   `CNR_KEY*` saem da Vercel.

O passo 2 é o que permite ligar isto em produção sem combinar nada com
ninguém: quem não entrou pelo telefone continua exatamente como está.

---

## 6. O que eu NÃO vou usar, e por quê

**Supabase Auth.** Ele faz OTP por telefone pronto, e ainda assim não é o
caminho aqui — hoje.

Todo o sistema fala com o banco pela chave de serviço, do lado do servidor,
e a RLS está ligada **sem policy** de propósito. Adotar o Supabase Auth
significa JWT do usuário em cada chamada e policies de RLS escritas para
cada tabela: é a arquitetura certa para o futuro multi-loja, e é uma
reforma grande, no meio do caminho, sem ninguém pedindo.

**Isto fica anotado como dívida consciente**, não como esquecimento: no dia
em que várias lojas dividirem o mesmo banco, a RLS por conta passa a valer
mais que o filtro no servidor, e aí o Supabase Auth volta para a mesa.

---

## 7. O custo já está levantado

R$ 0,32 por SMS, sem exigir CNPJ, e o volume é baixo porque entrar acontece
uma vez por aparelho. Ver `PROJETO-APP.md` §10.1 — com as fontes.

---

## 8. Como se prova que funciona

Antes de qualquer tela, com duas contas de verdade:

1. Pedir código para um telefone → chega, e a resposta não diz se o
   telefone existe
2. Código errado 5 vezes → o 6º é recusado mesmo sendo o certo
3. Código certo depois de 11 minutos → recusado
4. Sessão da loja A não enxerga nada da loja B, em cada uma das rotas
5. Chave por aparelho **continua** funcionando durante a transição
6. Encerrar uma sessão não derruba as outras da mesma pessoa

O teste 4 é o que importa: é ele que separa este produto de um vazamento.
