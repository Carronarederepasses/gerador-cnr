-- ════════════════════════════════════════════════════════════════════
-- LISTAS DE TRANSMISSÃO — o padrão do WhatsApp, que o mercado já entende
--
-- Rodar no banco da operação, depois do `rede-fase2.sql`. Só acrescenta.
--
-- ── A distinção que dá nome às coisas [YURI, 27/set] ────────────────
-- Pedido dele: *"a lista de transmissão e os grupos, tenta seguir padrão
-- WhatsApp"*. Lá são DUAS coisas diferentes, e a diferença é justamente
-- a que protege o ativo dele:
--
--   • **Contatos** — quem está na sua agenda. Aqui: as lojas que pediram
--     para entrar e foram aceitas. É a tabela `contatos`, que já existe.
--   • **Lista de transmissão** — um RECORTE NOMEADO desses contatos.
--     Cada um recebe individualmente, ninguém vê quem mais recebeu, e a
--     conversa que nasce é 1 para 1.
--   • **Grupo** — todo mundo vê todo mundo. **Não existe aqui**, e é
--     decisão: num grupo qualquer um abre a relação de participantes e
--     copia os 188 contatos. O ativo indo embora pela porta da frente.
--
-- Até agora havia UMA lista implícita por loja: tudo que estava em
-- `contatos` recebia tudo. Isto separa as duas camadas, como no WhatsApp:
-- a agenda é uma coisa, o recorte para quem se manda é outra.
--
-- ── O que NÃO muda ──────────────────────────────────────────────────
-- `contatos` continua igual, e continua sendo a fonte de quem está na
-- rede da loja. Mandar "para todos os contatos" segue funcionando sem
-- lista nenhuma — quem nunca criar uma lista não perde nada.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. A lista ──────────────────────────────────────────────────────
create table if not exists public.listas (
  id          uuid primary key default gen_random_uuid(),
  conta_id    uuid not null references public.contas(id),
  nome        text not null,
  criada_em   timestamptz not null default now(),
  arquivada_em timestamptz,
  constraint listas_nome_nao_vazio check (length(trim(nome)) > 0)
);
-- Nome repetido dentro da mesma loja confunde na hora de escolher para
-- quem mandar. Entre lojas diferentes pode repetir à vontade.
create unique index if not exists listas_nome_por_loja
  on public.listas (conta_id, lower(trim(nome))) where arquivada_em is null;
create index if not exists listas_conta_idx on public.listas (conta_id) where arquivada_em is null;

-- ── 2. Quem está em cada lista ──────────────────────────────────────
-- A mesma loja pode estar em várias listas, como um contato do WhatsApp
-- pode estar em várias transmissões.
create table if not exists public.lista_membros (
  lista_id   uuid not null references public.listas(id) on delete cascade,
  conta_id   uuid not null references public.contas(id),
  criado_em  timestamptz not null default now(),
  primary key (lista_id, conta_id)
);
create index if not exists lista_membros_conta_idx on public.lista_membros (conta_id);

-- ── 3. De qual lista saiu a oferta ──────────────────────────────────
-- Guardado para o histórico responder "por que esse carro chegou para
-- mim?" meses depois. Sem FK forte: a lista pode ser apagada, e isso não
-- pode apagar a oferta que já aconteceu — mesmo raciocínio da tabela
-- `historico`.
alter table public.ofertas
  add column if not exists lista_id uuid,
  add column if not exists lista_nome text;

-- ── 4. RLS ──────────────────────────────────────────────────────────
-- Ligada e sem policy, como as outras. Quem entra é o servidor; a regra
-- de quem enxerga o quê está em `api/_rede.js`, escrita à mão.
alter table public.listas        enable row level security;
alter table public.lista_membros enable row level security;

-- ── Conferir depois de rodar ────────────────────────────────────────
-- select tablename, rowsecurity from pg_tables
--  where schemaname='public' and tablename in ('listas','lista_membros');
-- Esperado: 2 linhas, rowsecurity = true.
