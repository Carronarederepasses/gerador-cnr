-- ─────────────────────────────────────────────────────────────────────
-- FASE 0 — laboratório do "dono em cada linha" (23/set/2026)
--
-- RODAR NO PROJETO cnr-piloto, não na produção.
--
-- Por que aqui: não cabe um terceiro banco no plano grátis (limite de DOIS
-- projetos ATIVOS por conta — confirmado no painel do Yuri em 23/set, onde o
-- projeto da tia aparece "paused"). Então o ensaio mora no projeto do piloto,
-- em tabelas com prefixo `lab_`, que NÃO tocam nas tabelas do Bruno e podem
-- ser apagadas com um comando quando o ensaio terminar.
--
-- O que se quer provar antes de mexer na produção:
--   1. a forma das tabelas de conta, usuário e vínculo;
--   2. que dá para carimbar o dono nas linhas que já existem sem perder nada;
--   3. que uma consulta sem dono NÃO passa — hoje ela passaria, e é esse o
--      defeito que a fase 0 existe para fechar.
--
-- Seguro de rodar duas vezes: tudo é IF NOT EXISTS / ON CONFLICT.
-- ─────────────────────────────────────────────────────────────────────

-- ── 1. Quem é dono ───────────────────────────────────────────────────
-- Uma CONTA é uma loja. O Yuri e a mãe dele são a mesma conta (decisão de
-- 11/set: mesma operação, dados compartilhados de propósito). O Bruno é
-- outra conta.
create table if not exists lab_contas (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  criada_em   timestamptz not null default now(),
  ativa       boolean not null default true
);

-- Um USUÁRIO é uma pessoa. O telefone é a identidade porque é o que o
-- lojista já tem e já usa — fase 1 do plano troca a chave por aparelho por
-- um código enviado a este número.
create table if not exists lab_usuarios (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  telefone   text unique,
  criado_em  timestamptz not null default now()
);

-- O VÍNCULO é separado de propósito: uma pessoa pode um dia operar duas
-- lojas (o repassador que atende duas revendas), e uma loja tem várias
-- pessoas. Guardar `conta_id` dentro de `usuarios` fecharia essa porta.
create table if not exists lab_conta_membros (
  conta_id   uuid not null references lab_contas(id)   on delete cascade,
  usuario_id uuid not null references lab_usuarios(id) on delete cascade,
  papel      text not null default 'operador',  -- dono | operador
  criado_em  timestamptz not null default now(),
  primary key (conta_id, usuario_id)
);

-- ── 2. Duas tabelas reais, em miniatura ──────────────────────────────
-- Espelham `veiculos` e `vendas` só no que importa para o ensaio.
create table if not exists lab_veiculos (
  id         uuid primary key default gen_random_uuid(),
  conta_id   uuid references lab_contas(id) on delete restrict,
  marca      text,
  modelo     text,
  valor      numeric,
  criado_em  timestamptz not null default now()
);

create table if not exists lab_vendas (
  id            uuid primary key default gen_random_uuid(),
  conta_id      uuid references lab_contas(id) on delete restrict,
  veiculo_id    uuid references lab_veiculos(id) on delete set null,
  comprador     text,
  valor_venda   numeric,
  criado_em     timestamptz not null default now()
);

-- Índice em toda coluna de dono: daqui para a frente TODA consulta filtra
-- por ela. Sem índice, cada tela varre a tabela inteira.
create index if not exists idx_lab_veiculos_conta on lab_veiculos(conta_id);
create index if not exists idx_lab_vendas_conta   on lab_vendas(conta_id);

-- RLS ligada e sem policy, igual ao resto do projeto: ninguém entra pela
-- chave pública; quem lê é o servidor, com a chave de serviço.
alter table lab_contas        enable row level security;
alter table lab_usuarios      enable row level security;
alter table lab_conta_membros enable row level security;
alter table lab_veiculos      enable row level security;
alter table lab_vendas        enable row level security;

-- ── 3. Duas lojas e um pouco de dado para o ensaio ───────────────────
insert into lab_contas (id, nome) values
  ('11111111-1111-1111-1111-111111111111', 'Carro na Rede'),
  ('22222222-2222-2222-2222-222222222222', 'BHM Autos')
on conflict (id) do nothing;

insert into lab_usuarios (id, nome, telefone) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Yuri',  '48999990001'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Mãe',   '48999990002'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Bruno', '19999990001')
on conflict (id) do nothing;

-- Yuri e mãe na MESMA conta — é o caso real, e é o que prova que o modelo
-- não obriga uma pessoa por loja.
insert into lab_conta_membros (conta_id, usuario_id, papel) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', 'dono'),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000002', 'operador'),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-0000-0000-0000-000000000001', 'dono')
on conflict do nothing;

-- ── 4. O ensaio do carimbo ───────────────────────────────────────────
-- Simula o que a migração de verdade vai fazer na produção: linhas que já
-- existem, sem dono, recebendo o dono certo. Duas linhas nascem órfãs de
-- propósito, para o carimbo ter o que consertar.
insert into lab_veiculos (id, conta_id, marca, modelo, valor) values
  ('cccccccc-0000-0000-0000-000000000001', null, 'Toyota', 'Corolla XEi', 120000),
  ('cccccccc-0000-0000-0000-000000000002', null, 'VW',     'Polo',         78000),
  ('cccccccc-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'Fiat', 'Argo', 60000)
on conflict (id) do nothing;

insert into lab_vendas (id, conta_id, veiculo_id, comprador, valor_venda) values
  ('dddddddd-0000-0000-0000-000000000001', null, 'cccccccc-0000-0000-0000-000000000001', 'Autoconfirma', 125000)
on conflict (id) do nothing;

-- O carimbo: tudo que não tem dono é do Yuri, porque na produção tudo que
-- existe hoje é dele. Depois disso, a coluna vira obrigatória.
update lab_veiculos set conta_id = '11111111-1111-1111-1111-111111111111' where conta_id is null;
update lab_vendas    set conta_id = '11111111-1111-1111-1111-111111111111' where conta_id is null;

alter table lab_veiculos alter column conta_id set not null;
alter table lab_vendas   alter column conta_id set not null;

-- ── Conferência ──────────────────────────────────────────────────────
select 'contas'   as tabela, count(*) from lab_contas
union all select 'usuarios',  count(*) from lab_usuarios
union all select 'vinculos',  count(*) from lab_conta_membros
union all select 'veiculos',  count(*) from lab_veiculos
union all select 'vendas',    count(*) from lab_vendas
union all select 'sem dono',  count(*) from lab_veiculos where conta_id is null;

-- ── Para apagar o laboratório depois ─────────────────────────────────
-- drop table if exists lab_vendas, lab_veiculos, lab_conta_membros,
--                      lab_usuarios, lab_contas cascade;
