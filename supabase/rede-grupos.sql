-- ════════════════════════════════════════════════════════════════════
-- GRUPOS — a terceira peça do padrão WhatsApp
--
-- Rodar no banco da operação, depois de `rede-conversas.sql`.
--
-- ── As três coisas, agora completas [YURI, 27/set] ──────────────────
--
--   • **Transmissão** — 1 para muitos. Cada um recebe sozinho e
--     **ninguém vê quem mais recebeu**. É o que protege a agenda do dono.
--   • **Conversa** — 1 a 1, entre duas lojas.
--   • **Grupo** — muitos com muitos: todos leem as mensagens de todos.
--     **Mas a relação de participantes é OCULTA.**
--
-- ── O diferencial, decidido por ele em 27/set ───────────────────────
-- *"No grupo, quero que os membros sejam ocultos, o que será diferencial
-- do WhatsApp."*
--
-- No WhatsApp, entrar num grupo entrega a agenda de todo mundo: qualquer
-- um abre a relação de participantes e copia 200 contatos. É o motivo de
-- o grupo dele de 188 pessoas ser um ativo em risco permanente.
--
-- Aqui a conversa é coletiva e **a lista não existe para ninguém**, nem
-- para quem está dentro. Quem só observa — que é a maioria — continua
-- invisível. Quem fala se identifica pela própria mensagem, e é assim
-- que dá para responder no privado.
--
-- Consequência de desenho, para não se perder: **nenhuma rota pode
-- devolver `grupo_membros` de um grupo.** Só a CONTAGEM, e só para quem
-- está dentro. Quem quiser saber quem está lá, só descobre pelos que
-- falam — que é exatamente o ponto.
--
-- ── Uma tabela de mensagens só ──────────────────────────────────────
-- `mensagens_rede` passa a servir conversa E grupo. Duas tabelas quase
-- iguais divergiriam em silêncio — foi o erro que mais custou caro neste
-- projeto (os dois montadores de anúncio, a máscara de telefone, o
-- desenho da placa). Uma linha pertence a uma conversa OU a um grupo, e
-- o banco recusa qualquer outra combinação.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. O grupo ──────────────────────────────────────────────────────
-- `aberto` é decisão do admin [YURI, 27/set]: *"geralmente os grupos são
-- fechados, mas os adms deles quem decidem"*.
--
--   • **fechado** (padrão) — só admin acrescenta alguém
--   • **aberto** — qualquer loja da rede entra por conta própria
--
-- Nos dois casos **o autor de cada mensagem aparece** e **a relação de
-- participantes não**. Grupo aberto não é grupo devassado: continua sem
-- dar a lista de ninguém.
--
-- O padrão é FECHADO de propósito: se o padrão fosse aberto, um grupo
-- criado sem pensar já nasceria alcançável por toda a rede — e o engano
-- só apareceria depois de alguém entrar.
create table if not exists public.grupos (
  id           uuid primary key default gen_random_uuid(),
  criado_por   uuid not null references public.contas(id),
  nome         text not null,
  aberto       boolean not null default false,
  criado_em    timestamptz not null default now(),
  ultima_em    timestamptz not null default now(),
  arquivado_em timestamptz,
  constraint grupos_nome_nao_vazio check (length(trim(nome)) > 0)
);
create index if not exists grupos_criador_idx on public.grupos (criado_por) where arquivado_em is null;

-- ── 2. Quem está no grupo ───────────────────────────────────────────
-- `admin` porque alguém precisa poder acrescentar e tirar gente. Quem
-- cria nasce admin; os outros, não.
create table if not exists public.grupo_membros (
  grupo_id  uuid not null references public.grupos(id) on delete cascade,
  conta_id  uuid not null references public.contas(id),
  admin     boolean not null default false,
  entrou_em timestamptz not null default now(),
  saiu_em   timestamptz,
  primary key (grupo_id, conta_id)
);
-- "Meus grupos": a consulta que a coluna da esquerda faz toda vez.
create index if not exists grupo_membros_conta_idx on public.grupo_membros (conta_id) where saiu_em is null;

-- ── 3. A mensagem passa a servir os dois ────────────────────────────
-- `conversa_id` deixa de ser obrigatória, e entra `grupo_id`. A trava
-- garante que a linha pertence a exatamente UM lugar — sem ela existiria
-- mensagem órfã, ou pior, mensagem em dois lugares ao mesmo tempo.
alter table public.mensagens_rede
  add column if not exists grupo_id uuid references public.grupos(id) on delete cascade;

alter table public.mensagens_rede alter column conversa_id drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'mensagens_um_lugar_so'
      and conrelid = 'public.mensagens_rede'::regclass
  ) then
    alter table public.mensagens_rede
      add constraint mensagens_um_lugar_so
      check ((conversa_id is not null and grupo_id is null)
          or (conversa_id is null and grupo_id is not null));
  end if;
end $$;

create index if not exists mensagens_grupo_idx on public.mensagens_rede (grupo_id, criado_em)
  where grupo_id is not null;

-- ── 4. RLS ──────────────────────────────────────────────────────────
alter table public.grupos        enable row level security;
alter table public.grupo_membros enable row level security;

-- ── Conferir depois de rodar ────────────────────────────────────────
-- select tablename, rowsecurity from pg_tables
--  where schemaname='public' and tablename in ('grupos','grupo_membros');
-- Esperado: 2 linhas, rowsecurity = true.
