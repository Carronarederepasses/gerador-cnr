-- ─────────────────────────────────────────────────────────────────────
-- FASE 0 — dono em cada linha (23/set/2026)
--
-- Rodar na PRODUÇÃO (CRR's Project). Ensaiado antes em `fase0-lab.sql`, no
-- projeto do piloto: 10 verificações, 10 passaram.
--
-- ── A decisão que faz esta migração ser segura ───────────────────────
-- A coluna `conta_id` nasce com DEFAULT apontando para a conta do Yuri, e
-- NÃO nasce obrigatória.
--
-- Por quê: hoje nenhuma linha do Gerador manda `conta_id`. Se a coluna
-- fosse obrigatória agora, TODA gravação passaria a falhar no instante em
-- que este SQL rodasse — venda, carro, negociação, tudo — e o Yuri
-- descobriria no meio de um negócio. Com DEFAULT, o código de hoje continua
-- gravando sem saber que a coluna existe, e as linhas já nascem com dono.
--
-- A coluna só vira obrigatória (e o DEFAULT só sai) quando o servidor
-- estiver mandando o dono explicitamente. Isso é outra migração, depois do
-- código — não esta.
--
-- ── O que esta migração NÃO faz ──────────────────────────────────────
-- Não isola nada ainda. Isolamento é trabalho do servidor: as funções de
-- `api/` entram com a chave de serviço, que passa por cima da RLS. A RLS
-- continua ligada e sem policy, como está desde 08/set, o que fecha a porta
-- de quem chega com a chave pública — e não a porta de uma conta para a
-- outra. Quem fecha essa é o filtro por `conta_id`, no código.
--
-- Reversível: `alter table X drop column conta_id` devolve o estado de hoje.
-- ─────────────────────────────────────────────────────────────────────

-- ── 1. Contas, pessoas e o vínculo entre elas ────────────────────────
create table if not exists contas (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  criada_em   timestamptz not null default now(),
  ativa       boolean not null default true
);

create table if not exists usuarios (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  telefone   text unique,          -- identidade da fase 1 (código por SMS)
  criado_em  timestamptz not null default now()
);

-- Vínculo em tabela própria, não como coluna dentro de `usuarios`: uma
-- pessoa pode operar duas lojas, e uma loja tem várias pessoas. Yuri e mãe
-- são o caso real de duas pessoas na MESMA conta (decidido em 11/set).
create table if not exists conta_membros (
  conta_id   uuid not null references contas(id)   on delete cascade,
  usuario_id uuid not null references usuarios(id) on delete cascade,
  papel      text not null default 'operador',     -- dono | operador
  criado_em  timestamptz not null default now(),
  primary key (conta_id, usuario_id)
);

alter table contas        enable row level security;
alter table usuarios      enable row level security;
alter table conta_membros enable row level security;

-- ── 2. A conta que já existe ─────────────────────────────────────────
-- Id fixo e escrito à mão, não sorteado: ele vira o DEFAULT das doze
-- tabelas abaixo e precisa ser o mesmo se esta migração rodar de novo.
insert into contas (id, nome)
values ('00000000-0000-4000-8000-000000000001', 'Carro na Rede Repasses')
on conflict (id) do nothing;

insert into usuarios (id, nome) values
  ('00000000-0000-4000-8000-0000000000a1', 'Yuri'),
  ('00000000-0000-4000-8000-0000000000a2', 'Mãe')
on conflict (id) do nothing;

insert into conta_membros (conta_id, usuario_id, papel) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'dono'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a2', 'operador')
on conflict do nothing;

-- ── 3. A coluna de dono nas doze tabelas ─────────────────────────────
-- `do $$` porque `add column if not exists` + default + índice repetido em
-- doze tabelas viraria sessenta linhas iguais, e linha repetida é onde uma
-- tabela fica de fora sem ninguém ver.
do $$
declare
  t text;
  tabelas text[] := array[
    'veiculos', 'vendas', 'compradores', 'negociacoes', 'anuncios',
    'buscas', 'ideias', 'eventos', 'historico', 'observacoes',
    'olx_mensagens', 'agenda'
  ];
begin
  foreach t in array tabelas loop
    -- pula tabela que não existir neste banco, em vez de abortar tudo
    if to_regclass('public.' || t) is null then
      raise notice 'tabela % não existe aqui — pulando', t;
      continue;
    end if;

    execute format(
      'alter table %I add column if not exists conta_id uuid
         references contas(id) on delete restrict
         default ''00000000-0000-4000-8000-000000000001''', t);

    -- Carimbo do que já existe. Tudo que está no banco hoje é do Yuri.
    execute format(
      'update %I set conta_id = ''00000000-0000-4000-8000-000000000001''
         where conta_id is null', t);

    -- Toda consulta passará a filtrar por esta coluna.
    execute format(
      'create index if not exists idx_%s_conta on %I(conta_id)', t, t);

    raise notice 'tabela % pronta', t;
  end loop;
end $$;

-- ── Conferência ──────────────────────────────────────────────────────
-- Espera-se: uma linha por tabela, `sem_dono` zerado em todas.
select c.relname as tabela,
       (select count(*) from contas) as contas,
       pg_catalog.obj_description(c.oid) as _,
       (xpath('/row/c/text()',
              query_to_xml(format('select count(*) as c from %I where conta_id is null', c.relname),
                           false, true, '')))[1]::text::int as sem_dono
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = c.relname and column_name = 'conta_id'
  )
order by 1;
