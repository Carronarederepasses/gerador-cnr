-- ─────────────────────────────────────────────────────────────────
-- Ideias — caderno do Yuri, gravado de qualquer aparelho
--
-- Ideia aparece na hora que aparece: dirigindo, no meio de uma
-- negociação, olhando um carro. Precisa ser anotável do celular, em
-- dois toques, sem formato. Guardar no banco é o que permite o Claude
-- ler depois sem o Yuri ter que copiar nada.
-- ─────────────────────────────────────────────────────────────────

create table if not exists public.ideias (
  id             bigint generated always as identity primary key,
  texto          text        not null,
  -- nova → ainda não conversamos sobre ela
  -- feita → virou trabalho
  -- descartada → decidimos não fazer (guardado: saber o que se recusou
  --              vale tanto quanto saber o que se fez)
  status         text        not null default 'nova',
  criada_em      timestamptz not null default now(),
  atualizada_em  timestamptz not null default now(),

  constraint ideias_status_valido check (status in ('nova','feita','descartada')),
  constraint ideias_texto_nao_vazio check (length(trim(texto)) > 0)
);

comment on table public.ideias is 'Caderno de ideias do Yuri, anotadas de qualquer aparelho.';

-- A tela lista as novas primeiro, mais recentes no topo.
create index if not exists idx_ideias_status_data
  on public.ideias (status, criada_em desc);

create or replace function public.set_ideias_atualizada_em()
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

drop trigger if exists trg_ideias_atualizada on public.ideias;
create trigger trg_ideias_atualizada
  before update on public.ideias
  for each row execute function public.set_ideias_atualizada_em();

-- ── Segurança ────────────────────────────────────────────────────
-- RLS ligado e sem policies: nenhum acesso por anon/authenticated.
-- Todo o tráfego passa por /api/fetch-anuncio?ideias=1, que usa a
-- SERVICE_ROLE e portanto ignora RLS. Mesmo padrão de anuncios e buscas.
alter table public.ideias enable row level security;
