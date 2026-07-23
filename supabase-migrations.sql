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

-- 3. Campos de faturamento na tabela compradores
alter table compradores add column if not exists razao_social    text;
alter table compradores add column if not exists cnpj            text;
alter table compradores add column if not exists ie              text;
alter table compradores add column if not exists cpf             text;
alter table compradores add column if not exists rg              text;
alter table compradores add column if not exists data_nascimento date;
alter table compradores add column if not exists cep             text;
alter table compradores add column if not exists estado          text;
alter table compradores add column if not exists logradouro      text;
alter table compradores add column if not exists numero          text;
alter table compradores add column if not exists complemento_end text;
alter table compradores add column if not exists bairro          text;

-- 4. Novos campos na tabela vendas
alter table vendas add column if not exists valor_compra  numeric;
alter table vendas add column if not exists canal_origem  text;
alter table vendas add column if not exists comprador_id  uuid;
alter table vendas add column if not exists motivo_match  text;

-- 5. Tabela de negociações (migrada de localStorage para Supabase)
create table if not exists negociacoes (
  id                uuid default gen_random_uuid() primary key,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  veiculo_nome      text,
  comprador_nome    text,
  comprador_id      uuid references compradores(id),
  contato_telefone  text,
  valor_proposto    numeric,
  status            text default 'primeiro-contato',
  ultimo_contato    date,
  historico         jsonb default '[]',
  observacoes       text
);

create index if not exists negociacoes_status_idx     on negociacoes(status);
create index if not exists negociacoes_updated_at_idx on negociacoes(updated_at desc);

-- 6. Campo valor_compra na tabela de veículos (custo de captação — uso interno)
-- Rode no Supabase SQL Editor:
alter table veiculos add column if not exists valor_compra numeric;

-- 7. Motivos estruturados nas negociações (por que descartou / por que escolheu esse comprador)
alter table negociacoes add column if not exists motivo_descarte text;
alter table negociacoes add column if not exists motivo_match text;
