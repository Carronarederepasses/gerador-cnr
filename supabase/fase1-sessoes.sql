-- ════════════════════════════════════════════════════════════════════
-- FASE 1 — entrar por telefone: as duas tabelas
--
-- NÃO RODAR AINDA. Preparação escrita em 27/set. Desenho completo e o
-- porquê de cada escolha: `FASE1-ENTRAR.md`.
--
-- Diferente do `rede-fase2.sql`, estas duas rodam **no banco da operação**
-- quando chegar a hora — é lá que Yuri e mãe vão entrar pelo telefone. Não
-- tocam nenhuma tabela existente: só acrescentam.
--
-- ── A regra que guia o arquivo inteiro ──────────────────────────────
-- **Nunca guardar o valor, só o hash.** Vale para o código de 6 dígitos e
-- para o token da sessão. Se este banco vazar, o que está aqui não abre
-- porta nenhuma. É a mesma lição de 25/set, quando a Vercel apontou que o
-- FIPE_TOKEN estava guardado à vista.
--
-- O hash é feito no servidor (Node), não no Postgres: assim o valor cru
-- nunca chega a viajar até o banco.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. O código pendente ────────────────────────────────────────────
-- Vive 10 minutos. Uma linha por pedido — pedir de novo NÃO apaga o
-- anterior, para o histórico de tentativas continuar legível quando
-- alguém disser "não chegou".
create table if not exists public.codigos (
  id         uuid primary key default gen_random_uuid(),
  telefone   text not null,
  hash       text not null,
  criado_em  timestamptz not null default now(),
  expira_em  timestamptz not null,
  tentativas smallint not null default 0,
  usado_em   timestamptz,
  ip         text,
  constraint codigos_tentativas_sao_poucas check (tentativas >= 0 and tentativas <= 5)
);

-- A consulta do passo 2: o código vivo mais recente daquele telefone.
create index if not exists codigos_telefone_idx
  on public.codigos (telefone, criado_em desc) where usado_em is null;

-- O freio de envio: quantos pedidos esse telefone fez na última hora.
-- Índice separado porque essa consulta ignora se foi usado ou não.
create index if not exists codigos_freio_idx on public.codigos (telefone, criado_em desc);

-- ── 2. A sessão ─────────────────────────────────────────────────────
-- Substitui a chave por aparelho. O navegador guarda o token onde hoje
-- guarda a chave; aqui fica só o hash dele.
--
-- `expira_em` existe, mas com prazo longo de propósito: o Yuri disse em
-- 02/set que não quer senha nem portão no caminho, e uma sessão que vence
-- toda semana é um portão disfarçado. Prazo longo, e o jeito de cortar
-- alguém é encerrar a sessão dela — o que já era o desenho das chaves
-- `CNR_KEY_2..9`, só que agora sem mexer em variável de ambiente.
create table if not exists public.sessoes (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references public.usuarios(id),
  hash        text not null,
  criado_em   timestamptz not null default now(),
  ultimo_uso  timestamptz not null default now(),
  expira_em   timestamptz not null,
  encerrada_em timestamptz,
  aparelho    text,   -- só para a pessoa se reconhecer na lista: "Chrome, Windows"
  ip          text,
  constraint sessoes_hash_unico unique (hash)
);

-- A consulta de todo pedido: achar a sessão viva por hash. É a mais
-- quente do sistema depois da fase 1 — roda em TODA chamada de API.
create index if not exists sessoes_hash_idx on public.sessoes (hash)
  where encerrada_em is null;

-- "Minhas sessões" e o encerrar-uma-sem-derrubar-as-outras.
create index if not exists sessoes_usuario_idx on public.sessoes (usuario_id, criado_em desc);

-- ── 3. O telefone, que hoje está vazio ──────────────────────────────
-- `usuarios.telefone` existe desde a fase 0 e está NULL nos dois usuários
-- (conferido em 27/set). Sem ele ninguém entra.
--
-- NÃO fica obrigatório agora: durante a transição (FASE1-ENTRAR.md §5) o
-- acesso por chave continua valendo, e um NOT NULL derrubaria isso. Vira
-- obrigatório quando as chaves saírem.
--
-- Único de propósito: um telefone, uma pessoa. Índice parcial porque
-- NULL não colide com NULL, mas o índice fica menor e mais honesto.
create unique index if not exists usuarios_telefone_unico
  on public.usuarios (telefone) where telefone is not null;

-- ── 4. RLS ──────────────────────────────────────────────────────────
-- Ligada e sem policy, como o resto. Estas duas tabelas são as que mais
-- importam nisso: são elas que guardam o que abre a porta.
alter table public.codigos enable row level security;
alter table public.sessoes enable row level security;

-- ── 5. Faxina ───────────────────────────────────────────────────────
-- Código vencido não serve para nada e telefone é dado pessoal. Rodar de
-- vez em quando (ou no cron que já mantém o Supabase acordado):
--
--   delete from public.codigos where criado_em < now() - interval '30 days';
--
-- Sessão encerrada há muito tempo idem:
--
--   delete from public.sessoes
--    where encerrada_em is not null and encerrada_em < now() - interval '90 days';
--
-- Guardar para sempre "quem pediu código em que telefone" é acumular dado
-- pessoal sem razão — o levantamento de LGPD de 11/set já dizia que o que
-- não tem razão de ficar não deve ficar.

-- ── Conferir depois de rodar ────────────────────────────────────────
-- select tablename, rowsecurity from pg_tables
--   where schemaname='public' and tablename in ('codigos','sessoes');
-- Esperado: 2 linhas, rowsecurity = true.
