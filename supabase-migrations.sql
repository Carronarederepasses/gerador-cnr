-- =====================================================
-- CNR — Migração: Compradores + Eventos + campos Vendas
-- Rodar no Supabase → SQL Editor
-- =====================================================

-- 1. Tabela de compradores (CRM)
create table if not exists compradores (
  id           uuid default gen_random_uuid() primary key,
  created_at   timestamptz default now(),
  nome         text not null,
  telefone     text,
  tipo         text default 'loja',       -- loja | pessoa_fisica | investidor | revendedor
  cidade       text,
  marcas       text[],                    -- ex: ['Toyota','Honda','Volkswagen']
  preco_min    numeric,
  preco_max    numeric,
  observacoes  text,
  ativo        boolean default true
);

-- 2. Tabela de eventos (log imutável — nunca deletar)
create table if not exists eventos (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  tipo          text not null,            -- ex: 'veiculo.captado', 'match.aceito'
  veiculo_id    uuid,
  venda_id      uuid,
  comprador_id  uuid,
  usuario       text default 'yuri',
  dados         jsonb default '{}',
  origem        text default 'web'        -- web | system | api
);

create index if not exists eventos_veiculo_idx    on eventos(veiculo_id);
create index if not exists eventos_tipo_idx       on eventos(tipo);
create index if not exists eventos_created_at_idx on eventos(created_at desc);

-- 3. Novos campos na tabela vendas
alter table vendas add column if not exists valor_compra  numeric;
alter table vendas add column if not exists canal_origem  text;
alter table vendas add column if not exists comprador_id  uuid;
alter table vendas add column if not exists motivo_match  text;
