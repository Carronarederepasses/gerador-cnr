-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Carro na Rede Repasses — Vistoria / Laudo Cautelar           ║
-- ║  Fase 1: tabela de vistorias + bucket de fotos                ║
-- ║  Rode no Supabase: SQL Editor → New query.                    ║
-- ╚══════════════════════════════════════════════════════════════╝

create table if not exists public.vistorias (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Vínculos opcionais (a vistoria pode nascer de uma venda ou do catálogo)
  venda_id      uuid,
  veiculo_id    uuid,

  -- Dados do veículo (copiados na hora da vistoria)
  marca           text,
  modelo          text,
  placa           text,
  ano_fabricacao  int,
  ano_modelo      int,
  cor             text,

  -- Dados da vistoria
  inspetor      text,
  data_vistoria date default current_date,
  latitude      double precision,
  longitude     double precision,
  nota_geral    text,    -- abaixo | media | acima (da média)

  -- O checklist inteiro mora aqui, em formato flexível:
  --   { "<secao>": { "<item>": { "status": "...", "obs": "...", ...extras } } }
  resultado     jsonb not null default '{}'::jsonb,

  -- Fotos (Fase 2): [{ secao, item, url }]
  fotos         jsonb not null default '[]'::jsonb,

  status        text not null default 'rascunho',  -- rascunho | finalizada
  observacoes   text
);

create index if not exists idx_vistorias_placa    on public.vistorias (placa);
create index if not exists idx_vistorias_status   on public.vistorias (status);
create index if not exists idx_vistorias_venda    on public.vistorias (venda_id);
create index if not exists idx_vistorias_created  on public.vistorias (created_at desc);

-- updated_at automático (reaproveita a função do schema.sql)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_vistorias_updated on public.vistorias;
create trigger trg_vistorias_updated
  before update on public.vistorias
  for each row execute function public.set_updated_at();

-- Segurança: RLS ligado, acesso só pela API route (service_role)
alter table public.vistorias enable row level security;

-- Bucket de fotos da vistoria (público só pra exibir <img>; caminhos por UUID
-- não são adivinháveis). Upload/delete só via API route (service_role).
insert into storage.buckets (id, name, public)
values ('vistorias-fotos', 'vistorias-fotos', true)
on conflict (id) do update set public = true;
