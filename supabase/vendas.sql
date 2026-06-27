-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Carro na Rede Repasses — Registro de Vendas                  ║
-- ║  Tabela de vendas fechadas + bucket PRIVADO de anexos         ║
-- ║  Rode no Supabase: SQL Editor → New query (depois do schema). ║
-- ╚══════════════════════════════════════════════════════════════╝

create table if not exists public.vendas (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Vínculo opcional com o veículo do catálogo (se a venda nasceu de lá)
  veiculo_id    uuid references public.veiculos(id) on delete set null,

  -- ── Dados do carro (copiados na hora da venda, não dependem do catálogo)
  marca         text,
  modelo        text,
  versao        text,
  ano           text,
  placa         text,
  cor           text,
  km            int,
  renavam       text,
  chassi        text,

  -- ── Vendedor / Origem (de quem veio o carro)
  origem            text,   -- planilha "Origem": cidade/contato de onde veio
  vendedor_nome     text,
  vendedor_cpf      text,
  vendedor_telefone text,

  -- ── Comprador / Destino (pra onde foi)
  destino            text,  -- planilha "Destino": cidade/quem ficou com o carro
  comprador_nome     text,
  comprador_cpf      text,
  comprador_telefone text,

  -- ── Valores
  valor_venda        numeric,   -- valor do negócio
  valor_fipe         numeric,
  taxa_intermediacao numeric,   -- planilha "Lucro": taxa/lucro da Carro na Rede
  forma_pagamento    text,

  -- ── Datas
  data_venda     date,   -- planilha "Data"
  data_retirada  date,   -- planilha "Entrega / Retirada"

  -- ── Gestão
  status        text not null default 'negociando',  -- negociando | pago | retirado | concluido | cancelado
  doc_status    text not null default 'pendente',    -- planilha "Documentação": pendente | entregue | procuracao
  observacoes   text,

  -- ── Anexos (bucket PRIVADO). Array de objetos:
  --    { tipo, path, nome, mimeType, uploadedAt }
  --    tipo: comprovante_pagamento | cautelar | documento_carro | outro
  --    path: caminho do objeto no bucket (NUNCA URL pública — bucket é privado)
  anexos        jsonb not null default '[]'::jsonb
);

create index if not exists idx_vendas_status     on public.vendas (status);
create index if not exists idx_vendas_data_venda  on public.vendas (data_venda desc);
create index if not exists idx_vendas_created     on public.vendas (created_at desc);
create index if not exists idx_vendas_comprador   on public.vendas (comprador_nome);
create index if not exists idx_vendas_vendedor    on public.vendas (vendedor_nome);

-- updated_at automático (reaproveita a função criada no schema.sql; recria por segurança)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_vendas_updated on public.vendas;
create trigger trg_vendas_updated
  before update on public.vendas
  for each row execute function public.set_updated_at();

-- ── Segurança ───────────────────────────────────────────────────
-- RLS LIGADO e SEM políticas: ninguém lê pela anon key.
-- Todo acesso passa pela API route do Vercel (service_role).
alter table public.vendas enable row level security;

-- ── Bucket PRIVADO de anexos ────────────────────────────────────
-- Diferente do bucket "veiculos" (público p/ exibir fotos), aqui os
-- arquivos são sensíveis (CPF, comprovante, documento do carro).
-- Bucket privado: ninguém acessa por URL direta. A API gera um link
-- temporário assinado (signed URL) só quando o Yuri clica pra abrir.
insert into storage.buckets (id, name, public)
values ('vendas-docs', 'vendas-docs', false)
on conflict (id) do update set public = false;
