-- ─────────────────────────────────────────────────────────────────
-- Listas de envio — a "lista de transmissão" do Gerador
--
-- O WhatsApp tirou/limitou a lista de transmissão, e a que existia só
-- entregava para quem tinha o número do Yuri salvo — sem avisar quem
-- ficou de fora. A lista passa a morar aqui, e o disparo continua sendo
-- um toque dele por contato: o Gerador abre a conversa com o anúncio
-- pronto, ele confere e envia. Nada sai sozinho.
--
-- Por que no banco e não no localStorage: em setembro entra a segunda
-- operadora, no notebook dela. Lista que mora no navegador não
-- atravessa máquina — e seria a mesma armadilha das buscas do Radar,
-- que já custou essa lição uma vez.
-- ─────────────────────────────────────────────────────────────────

create table if not exists public.listas_envio (
  id             bigint generated always as identity primary key,
  nome           text        not null,

  -- IDs de public.compradores. Sem FK de propósito: apagar um comprador
  -- não deve derrubar a lista inteira nem falhar o DELETE. A tela ignora
  -- id que não existe mais — some da lista sozinho, sem erro.
  comprador_ids  uuid[]      not null default '{}',

  criada_em      timestamptz not null default now(),
  atualizada_em  timestamptz not null default now(),

  constraint listas_envio_nome_nao_vazio check (length(trim(nome)) > 0)
);

comment on table public.listas_envio is
  'Listas nomeadas de compradores, para enviar um anúncio a um grupo escolhido.';

-- A tela lista por nome; são poucas dezenas de linhas, mas o índice
-- mantém a ordenação estável e barata conforme cresce.
create index if not exists idx_listas_envio_nome
  on public.listas_envio (nome);

create or replace function public.set_listas_envio_atualizada_em()
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

drop trigger if exists trg_listas_envio_atualizada on public.listas_envio;
create trigger trg_listas_envio_atualizada
  before update on public.listas_envio
  for each row execute function public.set_listas_envio_atualizada_em();

-- ── Segurança ────────────────────────────────────────────────────
-- RLS ligado e sem policies: nenhum acesso por anon/authenticated.
-- Todo o tráfego passa por /api/compradores?listas=1, que usa a
-- SERVICE_ROLE e portanto ignora RLS, e que desde 03/set exige a chave
-- de liberação do aparelho. Mesmo padrão de anuncios, buscas e ideias.
alter table public.listas_envio enable row level security;
