-- ╔══════════════════════════════════════════════════════════════╗
-- ║  CNR — Detalhes do anúncio (descrição e ficha do veículo)     ║
-- ║  Rode no Supabase: SQL Editor → New query                     ║
-- ╚══════════════════════════════════════════════════════════════╝
--
-- POR QUE
-- O card do Radar mostrava título, preço, local e foto. Faltava o que
-- decide a abordagem: a descrição do vendedor e a quilometragem. Sem isso
-- o Yuri precisava abrir o anúncio na OLX antes de cada abordagem.
--
-- DE ONDE VEM
-- A página do anúncio publica um <script type="application/ld+json"> com
-- dados estruturados schema.org (é o que a OLX entrega ao Google). De lá
-- saem descrição, km, marca, modelo, ano, combustível, câmbio e vendedor,
-- já separados — sem depender de classe CSS, que a OLX troca a cada deploy.
--
-- QUANDO É PREENCHIDO
-- Só quando o Yuri clica 👁 no card. Uma página por clique. A varredura do
-- Radar continua lendo apenas as páginas de busca.
--
-- Todas as colunas são nullable: anúncio sem detalhe lido é o normal, não
-- é erro. `detalhes_em` distingue "nunca li" de "li e o vendedor não
-- escreveu descrição" — sem ele, os dois casos ficariam NULL e o botão
-- 👁 reapareceria pra sempre em anúncio sem texto.

alter table public.anuncios
  add column if not exists descricao    text,
  add column if not exists km           integer,
  add column if not exists marca        text,
  add column if not exists modelo       text,
  add column if not exists ano_modelo   integer,
  add column if not exists combustivel  text,
  add column if not exists cambio       text,
  add column if not exists vendedor     text,
  add column if not exists detalhes_em  timestamptz;

comment on column public.anuncios.descricao   is 'Texto escrito pelo vendedor (ld+json description)';
comment on column public.anuncios.km          is 'mileageFromOdometer — número, não texto';
comment on column public.anuncios.ano_modelo  is 'modelDate';
comment on column public.anuncios.vendedor    is 'Nome público do anunciante na OLX';
comment on column public.anuncios.detalhes_em is 'Quando a ficha foi lida. NULL = nunca lida.';

-- Índice parcial: as telas perguntam "quais ainda não foram lidos?".
-- Parcial porque só as linhas NULL interessam — com o tempo, a maioria
-- estará preenchida e o índice segue pequeno.
create index if not exists anuncios_sem_detalhes_idx
  on public.anuncios (last_seen_at desc)
  where detalhes_em is null;
