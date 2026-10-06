-- ─────────────────────────────────────────────────────────────────────
-- BLOQUEAR UMA LOJA (06/out/2026)
--
-- RODAR NO PROJETO DA CNR (o banco principal). Seguro de rodar duas vezes.
--
-- ── POR QUE ESTA TABELA EXISTE ───────────────────────────────────────
--
-- Até hoje a Rede era fechada por convite: ninguém falava comigo sem
-- pedir para entrar na minha lista e eu aceitar (§3.2, "ninguém é
-- adicionado sem pedir"). O Yuri trocou a regra em 06/out, para a Rede
-- funcionar como o WhatsApp que o mercado dele já usa:
--
--   **quem tem o meu número me chama direto.**
--
-- A regra antiga protegia de incômodo com atrito: cada loja nova custava
-- um pedido e um aceite. A nova tira o atrito — e por isso precisa da
-- válvula que o próprio WhatsApp tem. Sem bloquear, "qualquer um te
-- chama" não tem saída nenhuma. Foi a escolha dele, com esta tabela
-- dentro: "direto, com bloquear".
--
-- ── O QUE O BLOQUEIO FAZ, E O QUE NÃO FAZ ────────────────────────────
--
-- Faz: a outra loja não abre conversa comigo, não me manda mensagem e não
-- me manda carro. O que já foi dito antes continua escrito — bloquear não
-- reescreve o passado.
--
-- NÃO faz: avisar a outra loja. Bloqueio que avisa é discussão, não
-- bloqueio. (Mesma decisão do WhatsApp, e por isso ele é entendido.)
--
-- NÃO esconde a existência da loja no feed público da rede: a vitrine é
-- aberta para todos de propósito (decisão de 28/set). Bloquear é sobre
-- quem fala comigo, não sobre quem vê o estoque de quem.
--
-- ── A JANELA ENTRE O DEPLOY E ESTA MIGRATION ─────────────────────────
--
-- O deploy é automático no push e esta migration é manual, então existe
-- uma janela em que o código novo roda sem a tabela. O `api/_rede.js`
-- trata a ausência dela como "ninguém bloqueado" em vez de derrubar a
-- Rede — a mesma rede de proteção de 08/set (`operador`) e 03/out
-- (`comissao_recebida_em`). Depois de rodar isto, nada muda no código.
-- ─────────────────────────────────────────────────────────────────────

create table if not exists public.bloqueios (
  -- Quem bloqueou.
  conta_id            uuid not null references public.contas(id) on delete cascade,
  -- Quem foi bloqueado.
  bloqueada_conta_id  uuid not null references public.contas(id) on delete cascade,
  criado_em           timestamptz not null default now(),
  primary key (conta_id, bloqueada_conta_id),
  -- Bloquear a si mesma seria o jeito de uma loja se trancar fora da
  -- própria Rede. O código também recusa; aqui é a trava que não depende
  -- de eu lembrar.
  constraint bloqueio_nao_e_de_si_mesma check (conta_id <> bloqueada_conta_id)
);

-- A consulta de TODA conversa e de TODO envio de carro: "esta loja me
-- bloqueou, ou eu bloqueei ela?". Roda nos dois sentidos, então o índice
-- do lado invertido não é luxo — sem ele a verificação vira varredura.
create index if not exists bloqueios_de_quem_idx
  on public.bloqueios (conta_id, bloqueada_conta_id);
create index if not exists bloqueios_invertido_idx
  on public.bloqueios (bloqueada_conta_id, conta_id);

-- RLS ligada e sem policy, como o resto do sistema: quem lê é a API com a
-- chave de serviço, e a regra de quem vê o quê está escrita em
-- `api/_rede.js`, junto de cada consulta.
alter table public.bloqueios enable row level security;

-- Depois de rodar, conferir daqui:
--   select count(*) from bloqueios;   -- 0, e a Rede continua funcionando
