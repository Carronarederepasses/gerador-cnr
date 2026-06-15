-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Carro na Rede Repasses — Catálogo de Oportunidades           ║
-- ║  Fase 1: tabela de veículos                                    ║
-- ║  Rode este SQL no painel do Supabase: SQL Editor → New query  ║
-- ╚══════════════════════════════════════════════════════════════╝

create table if not exists public.veiculos (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Identificação do veículo
  marca         text,
  modelo        text,          -- modelo base (ex: Onix)
  versao        text,          -- versão completa FIPE (ex: Onix Plus Premier 1.0 Turbo)
  complemento   text,          -- complemento livre digitado
  ano           text,          -- rótulo do ano (ex: "2026 Gasolina")
  ano_int       int,           -- ano numérico, para filtro por faixa

  -- Dados comerciais
  km            int,
  cor           text,
  regiao        text,
  valor         numeric,       -- preço de repasse (R$)
  fipe          numeric,       -- valor FIPE (R$)

  -- Conteúdo
  opcionais     jsonb not null default '[]'::jsonb,  -- array de strings
  observacoes   text,
  anuncio_texto text,          -- texto pronto do anúncio (WhatsApp)

  -- Gestão
  status        text not null default 'disponivel',  -- disponivel | reservado | vendido

  -- Fases futuras (já criadas pra não migrar depois)
  fotos         jsonb not null default '[]'::jsonb,  -- Fase 2: URLs das fotos
  documentos    jsonb not null default '[]'::jsonb   -- Fase 3: cautelar, laudos, etc.
);

-- Índices para a busca/filtro ficar rápida
create index if not exists idx_veiculos_status   on public.veiculos (status);
create index if not exists idx_veiculos_marca     on public.veiculos (marca);
create index if not exists idx_veiculos_valor     on public.veiculos (valor);
create index if not exists idx_veiculos_km        on public.veiculos (km);
create index if not exists idx_veiculos_ano_int   on public.veiculos (ano_int);
create index if not exists idx_veiculos_created   on public.veiculos (created_at desc);

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_veiculos_updated on public.veiculos;
create trigger trg_veiculos_updated
  before update on public.veiculos
  for each row execute function public.set_updated_at();

-- ── Segurança ───────────────────────────────────────────────────
-- RLS LIGADO e SEM políticas públicas: ninguém acessa pela anon key.
-- Todo acesso passa pela API route do Vercel, que usa a SERVICE_ROLE
-- key (server-side, secreta) — essa chave ignora RLS.
alter table public.veiculos enable row level security;
