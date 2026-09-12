-- ─────────────────────────────────────────────────────────────────
-- Tirar a estrutura do banco vivo — preparada em 12/set/2026
--
-- POR QUE ISTO EXISTE
-- Os arquivos SQL deste repositório criam 7 tabelas. O sistema usa 12.
-- `compradores`, `negociacoes`, `eventos`, `historico` e `observacoes`
-- foram criadas direto no painel ou por conexão ao Postgres, e a estrutura
-- delas não está em lugar nenhum fora do projeto vivo do Supabase.
--
-- Dois efeitos, e o segundo é o grave:
--   1. Não dá para montar o banco de um segundo usuário (piloto com lojista)
--   2. Perdido o projeto, o DESENHO de 5 tabelas some — dado tem backup,
--      estrutura não tem
--
-- COMO USAR
-- Rodar no SQL Editor do Supabase, um bloco por vez, e mandar o resultado
-- de volta. Só LÊ — nenhuma consulta aqui altera nada.
-- ─────────────────────────────────────────────────────────────────


-- ── 1. Colunas de cada tabela ─────────────────────────────────────
-- Devolve uma linha por tabela, já no formato CREATE TABLE.

SELECT
  'CREATE TABLE IF NOT EXISTS public.' || c.relname || E' (\n' ||
  string_agg(
    '  ' || a.attname
         || ' ' || format_type(a.atttypid, a.atttypmod)
         || CASE WHEN ad.adbin IS NOT NULL
                 THEN ' DEFAULT ' || pg_get_expr(ad.adbin, ad.adrelid)
                 ELSE '' END
         || CASE WHEN a.attnotnull THEN ' NOT NULL' ELSE '' END,
    E',\n' ORDER BY a.attnum
  ) || E'\n);' AS ddl
FROM pg_class c
JOIN pg_namespace n   ON n.oid = c.relnamespace
JOIN pg_attribute a   ON a.attrelid = c.oid
LEFT JOIN pg_attrdef ad ON ad.adrelid = c.oid AND ad.adnum = a.attnum
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND a.attnum > 0
  AND NOT a.attisdropped
GROUP BY c.relname
ORDER BY c.relname;


-- ── 2. Chaves, únicos e checagens ─────────────────────────────────
-- O bloco 1 não traz isto. Sem estes, `olx_mensagens` perde o UNIQUE de
-- msg_hash (que é o que impede mensagem duplicada) e `anuncios` perde o
-- conflito de origem+listing_id (que é o que faz o upsert do Radar
-- funcionar em vez de dar erro 23505).

SELECT
  'ALTER TABLE public.' || c.relname ||
  ' ADD CONSTRAINT ' || con.conname || ' ' ||
  pg_get_constraintdef(con.oid) || ';' AS ddl
FROM pg_constraint con
JOIN pg_class c     ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
ORDER BY c.relname, con.conname;


-- ── 3. Índices ────────────────────────────────────────────────────
-- Os 5 da `historico` e o índice parcial de "anúncios ainda não lidos"
-- moram só aqui.

SELECT indexdef || ';' AS ddl
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;


-- ── 4. RLS: quais tabelas estão ligadas, e com que política ───────
-- Em 08/set a `historico` foi encontrada ABERTA por um alerta do próprio
-- Supabase. Um banco novo tem de nascer com isto ligado, não ganhar depois.

SELECT relname AS tabela, relrowsecurity AS rls_ligada
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY relname;

SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
