-- ╔══════════════════════════════════════════════════════════════╗
-- ║  CNR — Tabela de Anúncios (Captação Inteligente)              ║
-- ║  Entidade separada de veículos — anúncio ≠ veículo            ║
-- ║  Rode no Supabase: SQL Editor → New query                     ║
-- ╚══════════════════════════════════════════════════════════════╝

create table if not exists public.anuncios (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null    default now(),
  updated_at    timestamptz not null    default now(),

  -- Identificação do anúncio na plataforma de origem
  origem        text        not null    default 'olx',
  listing_id    text        not null,
  url           text        not null    default '',

  -- Dados extraídos pelo Catafrango
  titulo        text        not null    default '',
  preco         text        not null    default '',
  localizacao   text        not null    default '',
  thumbnail     text,                              -- URL da foto principal (nullable)
  search_name   text,                              -- nome da busca que encontrou este anúncio

  -- Rastreamento temporal
  first_seen_at timestamptz not null    default now(),
  last_seen_at  timestamptz not null    default now(),

  -- Fluxo de captação
  -- novo → enviado → respondeu → autorizado
  --      ↘ morto (qualquer ponto)
  status        text        not null    default 'novo',
  motivo_morte  text,                              -- razão quando status='morto'

  -- Ligação ao catálogo (null até autorização explícita do Yuri)
  vehicle_id    uuid,

  -- Deduplicação: mesmo anúncio nunca é duplicado
  constraint anuncios_origem_listing_id unique (origem, listing_id)
);

-- ── Índices ─────────────────────────────────────────────────────
create index if not exists idx_anuncios_status
  on public.anuncios (status);

create index if not exists idx_anuncios_origem_listing
  on public.anuncios (origem, listing_id);

create index if not exists idx_anuncios_first_seen
  on public.anuncios (first_seen_at desc);

create index if not exists idx_anuncios_vehicle
  on public.anuncios (vehicle_id)
  where vehicle_id is not null;

-- ── updated_at automático ────────────────────────────────────────
-- Reutiliza a função set_updated_at() criada em schema.sql
drop trigger if exists trg_anuncios_updated on public.anuncios;
create trigger trg_anuncios_updated
  before update on public.anuncios
  for each row execute function public.set_updated_at();

-- ── Segurança ────────────────────────────────────────────────────
-- RLS LIGADO; acesso somente via SERVICE_ROLE key (server-side).
alter table public.anuncios enable row level security;
