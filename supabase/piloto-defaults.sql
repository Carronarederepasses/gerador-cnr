-- ─────────────────────────────────────────────────────────────────────
-- PILOTO — os valores padrão que faltaram (23/set/2026)
--
-- RODAR NO PROJETO cnr-piloto. Não mexe na produção.
--
-- ── O defeito ────────────────────────────────────────────────────────
-- O banco do piloto foi criado em 22/set a partir da descrição que o
-- próprio Supabase publica (OpenAPI). Aquela descrição **não informa
-- valores padrão complexos** — foi anotado como ressalva no dia, e hoje a
-- ressalva virou defeito medido:
--
--   mesmo INSERT mínimo nos dois bancos
--   PRODUÇÃO → aceita, opcionais [] · fotos [] · documentos [] · avaliacao {}
--   PILOTO   → RECUSA: null value in column "opcionais" violates not-null
--
-- Ou seja: gravação que funciona no site do Yuri **falharia no site do
-- Bruno**, e o erro só apareceria com ele usando. É a diferença silenciosa
-- entre dois bancos que deveriam ser iguais — o tipo de coisa que este
-- projeto já pagou caro para aprender a não deixar passar.
--
-- Hoje as telas mandam esses campos sempre preenchidos, então o defeito
-- ainda não apareceu. Isso é sorte, não proteção: qualquer caminho que
-- grave sem eles — API, importação, o próprio SQL Editor — quebra.
--
-- Cinco colunas, medidas uma a uma contra a produção.
-- ─────────────────────────────────────────────────────────────────────

alter table veiculos alter column opcionais  set default '[]'::jsonb;
alter table veiculos alter column fotos      set default '[]'::jsonb;
alter table veiculos alter column documentos set default '[]'::jsonb;
alter table veiculos alter column avaliacao  set default '{}'::jsonb;
alter table vendas   alter column anexos     set default '[]'::jsonb;

-- ── Conferência ──────────────────────────────────────────────────────
-- Espera-se: as cinco linhas com o padrão preenchido.
select table_name, column_name, column_default
from information_schema.columns
where table_schema = 'public'
  and (table_name, column_name) in (
    ('veiculos','opcionais'), ('veiculos','fotos'), ('veiculos','documentos'),
    ('veiculos','avaliacao'), ('vendas','anexos')
  )
order by table_name, column_name;
