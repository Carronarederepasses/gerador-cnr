-- ─────────────────────────────────────────────────────────────────
-- Buscas do Radar — configuração das URLs que a extensão verifica
--
-- Antes ficavam em 3 slots fixos no options.html da extensão, ou seja,
-- no chrome.storage.local de cada máquina. Trazer para o banco permite
-- configurar pelo Gerador, de qualquer lugar, sem editar a extensão.
--
-- O id é gerado pelo cliente (texto), não pelo banco. Isso permite que a
-- tela envie o conjunto inteiro e o endpoint faça upsert por id e só
-- depois apague o que sumiu — se o upsert falhar, nada foi perdido.
-- ─────────────────────────────────────────────────────────────────

create table if not exists public.buscas (
  id             text        primary key,
  nome           text        not null,
  url            text        not null,
  ativa          boolean     not null default true,
  ordem          smallint    not null default 0,
  criada_em      timestamptz not null default now(),
  atualizada_em  timestamptz not null default now()
);

comment on table  public.buscas is 'URLs de busca da OLX verificadas pelo Radar da extensão Captação Inteligente.';
comment on column public.buscas.id    is 'Gerado pelo cliente para permitir upsert idempotente.';
comment on column public.buscas.url   is 'URL de busca da OLX colada pelo usuário, preservada na íntegra.';
comment on column public.buscas.ativa is 'Busca desligada continua salva, mas não é verificada.';

create index if not exists idx_buscas_ordem on public.buscas (ordem, id);

-- ── updated_at automático ────────────────────────────────────────
-- Reutiliza a função set_updated_at() criada em schema.sql, que escreve
-- em updated_at. Aqui a coluna chama atualizada_em, então usa gatilho
-- próprio em vez de forçar o nome só para reaproveitar a função.
create or replace function public.set_buscas_atualizada_em()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.atualizada_em = now();
  return new;
end;
$$;

drop trigger if exists trg_buscas_atualizada on public.buscas;
create trigger trg_buscas_atualizada
  before update on public.buscas
  for each row execute function public.set_buscas_atualizada_em();

-- ── Segurança ────────────────────────────────────────────────────
-- RLS LIGADO e sem policies: nenhum acesso pelos papéis anon/authenticated.
-- Todo o tráfego passa por /api/fetch-anuncio?buscas=1, que usa a
-- SERVICE_ROLE key e portanto ignora RLS. Mesmo padrão de public.anuncios.
alter table public.buscas enable row level security;
