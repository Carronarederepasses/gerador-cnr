-- ═════════════════════════════════════════════════════════════════
-- Estrutura COMPLETA do banco do Gerador — gerada em 22/set/2026
--
-- POR QUE EXISTE
-- 5 das 12 tabelas (compradores, negociacoes, eventos, historico,
-- observacoes) nunca tiveram script: foram criadas no painel ou por conexão
-- direta, e só existiam dentro do projeto vivo do Supabase. Isso travava o
-- piloto com o lojista (não havia como montar um banco vazio igual) e, pior,
-- se o projeto se perdesse, o DESENHO dessas tabelas ia junto.
--
-- DE ONDE VEIO
-- Colunas, tipos, padrões, obrigatórias, chaves primárias e estrangeiras:
-- da descrição que o próprio banco publica (OpenAPI do PostgREST), lida em
-- 22/set. Não é redigitado de memória.
-- Regras de valor único, índices e numeração automática: dos scripts
-- antigos da pasta supabase/, porque a descrição NÃO mostra isso.
--
-- O QUE A DESCRIÇÃO NÃO MOSTRA — e o que foi feito com cada coisa
--   • padrões mais complexos (ex.: negociacoes.anexos '[]'): omitidos. O
--     código já trata a coluna vazia; nada quebra.
--   • regras de valor único das 5 tabelas sem script: desconhecidas. Nenhum
--     upsert do código depende delas (conferido); no pior caso, um banco
--     novo aceita uma duplicata que o de produção recusaria.
--   • ação ao apagar nas chaves estrangeiras: a descrição não diz; ficou o
--     padrão do Postgres (bloqueia apagar quem é referenciado).
--
-- COMO SE CONFERE
-- Rodar isto num projeto NOVO e comparar a descrição dele com a de
-- produção: as duas têm de bater tabela por tabela, coluna por coluna.
--
-- Rodar num projeto VAZIO. Em produção não faz nada (if not exists), mas não
-- é para lá.
-- ═════════════════════════════════════════════════════════════════


-- ── Tabelas (12) ─ em ordem: quem é apontado vem antes ──────

create table if not exists public.agenda (
  id                     uuid default gen_random_uuid() primary key,
  quando                 timestamp with time zone not null,
  titulo                 text not null,
  local                  text,
  observacao             text,
  anuncio_id             uuid,
  veiculo_id             uuid,
  operador               text,
  feito_em               timestamp with time zone,
  created_at             timestamp with time zone default now() not null,
  updated_at             timestamp with time zone default now() not null
);

create table if not exists public.anuncios (
  id                     uuid default gen_random_uuid() primary key,
  created_at             timestamp with time zone default now() not null,
  updated_at             timestamp with time zone default now() not null,
  origem                 text default 'olx' not null,
  listing_id             text not null,
  url                    text default '' not null,
  titulo                 text default '' not null,
  preco                  text default '' not null,
  localizacao            text default '' not null,
  thumbnail              text,
  search_name            text,
  first_seen_at          timestamp with time zone default now() not null,
  last_seen_at           timestamp with time zone default now() not null,
  status                 text default 'novo' not null,
  motivo_morte           text,
  vehicle_id             uuid,
  descricao              text,
  km                     integer,
  marca                  text,
  modelo                 text,
  ano_modelo             integer,
  combustivel            text,
  cambio                 text,
  vendedor               text,
  detalhes_em            timestamp with time zone,
  operador               text
);

create table if not exists public.buscas (
  id                     text primary key,
  nome                   text not null,
  url                    text not null,
  ativa                  boolean default true not null,
  ordem                  smallint default 0 not null,
  criada_em              timestamp with time zone default now() not null,
  atualizada_em          timestamp with time zone default now() not null
);

create table if not exists public.compradores (
  id                     uuid default gen_random_uuid() primary key,
  created_at             timestamp with time zone default now(),
  nome                   text not null,
  telefone               text,
  tipo                   text default 'loja',
  cidade                 text,
  marcas                 text[],
  preco_min              numeric,
  preco_max              numeric,
  observacoes            text,
  ativo                  boolean default true,
  razao_social           text,
  cnpj                   text,
  ie                     text,
  cpf                    text,
  rg                     text,
  data_nascimento        date,
  cep                    text,
  estado                 text default 'SC',
  logradouro             text,
  numero                 text,
  complemento_end        text,
  bairro                 text,
  proprietario           text,
  papel                  text default 'comprador',
  banco                  text,
  agencia                text,
  conta                  text,
  tipo_conta             text default 'corrente',
  pix_tipo               text,
  pix_chave              text
);

create table if not exists public.eventos (
  id                     uuid default gen_random_uuid() primary key,
  created_at             timestamp with time zone default now(),
  tipo                   text not null,
  veiculo_id             uuid,
  venda_id               uuid,
  comprador_id           uuid,
  usuario                text default 'yuri',
  dados                  jsonb,
  origem                 text default 'web'
);

create table if not exists public.historico (
  id                     uuid default gen_random_uuid() primary key,
  created_at             timestamp with time zone default now() not null,
  evento                 text not null,
  entidade               text not null,
  entidade_id            uuid not null,
  veiculo_id             uuid,
  venda_id               uuid,
  cliente_id             uuid,
  dados_antes            jsonb,
  dados_depois           jsonb,
  origem                 text default 'web' not null,
  versao_app             text,
  metadata               jsonb
);

create table if not exists public.ideias (
  id                     bigint generated always as identity primary key,
  texto                  text not null,
  status                 text default 'nova' not null,
  criada_em              timestamp with time zone default now() not null,
  atualizada_em          timestamp with time zone default now() not null
);

create table if not exists public.negociacoes (
  id                     uuid default gen_random_uuid() primary key,
  created_at             timestamp with time zone default now(),
  updated_at             timestamp with time zone default now(),
  veiculo_nome           text,
  comprador_nome         text,
  comprador_id           uuid,
  contato_telefone       text,
  valor_proposto         numeric,
  status                 text default 'primeiro-contato',
  ultimo_contato         date,
  historico              jsonb,
  observacoes            text,
  motivo_descarte        text,
  motivo_match           text,
  veiculo_id             uuid,
  valor_sinal            numeric,
  sinal_em               date,
  anexos                 jsonb
);

create table if not exists public.observacoes (
  id                     uuid default gen_random_uuid() primary key,
  created_at             timestamp with time zone default now(),
  tipo_entidade          text not null,
  entidade_id            uuid not null,
  texto                  text not null,
  autor                  text default 'yuri',
  ativo                  boolean default true
);

create table if not exists public.olx_mensagens (
  id                     uuid default gen_random_uuid() primary key,
  listing_id             text not null,
  origem                 text default 'olx' not null,
  direction              text not null,
  content                text not null,
  msg_hash               text not null,
  conversation_id        text,
  detected_at            timestamp with time zone default now() not null,
  created_at             timestamp with time zone default now() not null
);

create table if not exists public.veiculos (
  id                     uuid default gen_random_uuid() primary key,
  created_at             timestamp with time zone default now() not null,
  updated_at             timestamp with time zone default now() not null,
  marca                  text,
  modelo                 text,
  versao                 text,
  complemento            text,
  ano                    text,
  ano_int                integer,
  km                     integer,
  cor                    text,
  regiao                 text,
  valor                  numeric,
  fipe                   numeric,
  opcionais              jsonb not null,
  observacoes            text,
  anuncio_texto          text,
  status                 text default 'disponivel' not null,
  fotos                  jsonb not null,
  documentos             jsonb not null,
  placa                  text,
  avaliacao              jsonb not null,
  combustivel            text,
  valor_compra           numeric,
  gastos                 text,
  renavam                text,
  vendedor_nome          text,
  vendedor_telefone      text,
  gastos_valor           numeric,
  emplacado_em           text
);

create table if not exists public.vendas (
  id                     uuid default gen_random_uuid() primary key,
  created_at             timestamp with time zone default now() not null,
  updated_at             timestamp with time zone default now() not null,
  veiculo_id             uuid,
  marca                  text,
  modelo                 text,
  versao                 text,
  ano                    text,
  placa                  text,
  cor                    text,
  km                     integer,
  renavam                text,
  chassi                 text,
  origem                 text,
  vendedor_nome          text,
  vendedor_cpf           text,
  vendedor_telefone      text,
  destino                text,
  comprador_nome         text,
  comprador_cpf          text,
  comprador_telefone     text,
  valor_venda            numeric,
  valor_fipe             numeric,
  taxa_intermediacao     numeric,
  forma_pagamento        text,
  data_venda             date,
  data_retirada          date,
  status                 text default 'negociando' not null,
  doc_status             text default 'pendente' not null,
  observacoes            text,
  anexos                 jsonb not null,
  valor_compra           numeric,
  canal_origem           text,
  comprador_id           uuid,
  motivo_match           text,
  valor_sinal            numeric,
  sinal_em               date
);


-- ── Chaves estrangeiras (1) ────────────────────────────────
-- Só as que EXISTEM em produção. veiculo_id e venda_id da historico, por
-- exemplo, NÃO têm chave estrangeira de propósito (19/ago): o histórico não
-- pode sumir quando um carro ou venda é apagado.

alter table public.negociacoes add constraint negociacoes_comprador_id_fkey foreign key (comprador_id) references public.compradores (id);


-- ── Valor único que o código usa ──────────────────────────────────
-- Sem estes, os upserts do Radar e do espelho de conversa dariam erro 42P10.

alter table public.anuncios add constraint anuncios_origem_listing_id unique (origem, listing_id);
alter table public.olx_mensagens add constraint olx_mensagens_msg_hash_key unique (msg_hash);


-- ── Índices (27) ──────────────────────────────────────

create index if not exists idx_agenda_quando on public.agenda (quando);   -- de migration-agenda.sql
create index if not exists idx_agenda_pendentes on public.agenda (quando) where feito_em is null;   -- de migration-agenda.sql
create index if not exists anuncios_sem_detalhes_idx on public.anuncios (last_seen_at desc) where detalhes_em is null;   -- de migration-anuncio-detalhes.sql
create index if not exists idx_anuncios_status on public.anuncios (status);   -- de migration-anuncios.sql
create index if not exists idx_anuncios_origem_listing on public.anuncios (origem, listing_id);   -- de migration-anuncios.sql
create index if not exists idx_anuncios_first_seen on public.anuncios (first_seen_at desc);   -- de migration-anuncios.sql
create index if not exists idx_anuncios_vehicle on public.anuncios (vehicle_id) where vehicle_id is not null;   -- de migration-anuncios.sql
create index if not exists idx_buscas_ordem on public.buscas (ordem, id);   -- de migration-buscas.sql
create index if not exists idx_ideias_status_data on public.ideias (status, criada_em desc);   -- de migration-ideias.sql
CREATE INDEX IF NOT EXISTS olx_mensagens_listing_id_idx ON olx_mensagens (listing_id);   -- de reforma-43-olx-mensagens.sql
CREATE INDEX IF NOT EXISTS olx_mensagens_detected_at_idx ON olx_mensagens (detected_at DESC);   -- de reforma-43-olx-mensagens.sql
create index if not exists idx_veiculos_status on public.veiculos (status);   -- de schema.sql
create index if not exists idx_veiculos_marca on public.veiculos (marca);   -- de schema.sql
create index if not exists idx_veiculos_valor on public.veiculos (valor);   -- de schema.sql
create index if not exists idx_veiculos_km on public.veiculos (km);   -- de schema.sql
create index if not exists idx_veiculos_ano_int on public.veiculos (ano_int);   -- de schema.sql
create index if not exists idx_veiculos_created on public.veiculos (created_at desc);   -- de schema.sql
create index if not exists idx_vendas_status on public.vendas (status);   -- de vendas.sql
create index if not exists idx_vendas_data_venda on public.vendas (data_venda desc);   -- de vendas.sql
create index if not exists idx_vendas_created on public.vendas (created_at desc);   -- de vendas.sql
create index if not exists idx_vendas_comprador on public.vendas (comprador_nome);   -- de vendas.sql
create index if not exists idx_vendas_vendedor on public.vendas (vendedor_nome);   -- de vendas.sql
create index if not exists idx_historico_entidade on public.historico (entidade, entidade_id, created_at desc);   -- de CLAUDE.md — Reforma 35
create index if not exists idx_historico_veiculo_id on public.historico (veiculo_id, created_at desc);   -- de CLAUDE.md — Reforma 35
create index if not exists idx_historico_venda_id on public.historico (venda_id, created_at desc);   -- de CLAUDE.md — Reforma 35
create index if not exists idx_historico_cliente_id on public.historico (cliente_id, created_at desc);   -- de CLAUDE.md — Reforma 35
create index if not exists idx_historico_evento on public.historico (evento, created_at desc);   -- de CLAUDE.md — Reforma 35


-- ── RLS em TODAS, sem policy ──────────────────────────────────────
-- Igual a produção desde 08/set: o acesso é só pelo servidor (service_role,
-- que ignora RLS). Sem policy, a chave pública não enxerga nada — que é o
-- certo, e é por isso que a Caixa Preta deixou de ficar aberta.

alter table public.agenda enable row level security;
alter table public.anuncios enable row level security;
alter table public.buscas enable row level security;
alter table public.compradores enable row level security;
alter table public.eventos enable row level security;
alter table public.historico enable row level security;
alter table public.ideias enable row level security;
alter table public.negociacoes enable row level security;
alter table public.observacoes enable row level security;
alter table public.olx_mensagens enable row level security;
alter table public.veiculos enable row level security;
alter table public.vendas enable row level security;


-- ── Armazenamento de arquivos ─────────────────────────────────────
-- veiculos:    PÚBLICO — é o que deixa a foto aparecer no <img> e no story.
-- vendas-docs: PRIVADO — CPF, CRLV, contrato, comprovante. Só com link
--              temporário gerado pelo servidor.

insert into storage.buckets (id, name, public) values ('veiculos', 'veiculos', true)
  on conflict (id) do update set public = true;
insert into storage.buckets (id, name, public) values ('vendas-docs', 'vendas-docs', false)
  on conflict (id) do update set public = false;
