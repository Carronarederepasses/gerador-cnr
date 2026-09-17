-- ─────────────────────────────────────────────────────────────────
-- Venda em andamento: sinal recebido — preparada em 16/set/2026
--
-- Rodar no SQL Editor do Supabase.
--
-- POR QUE
-- Existe um estado que o sistema não sabia nomear, descrito pelo Yuri:
--
--   "A venda em andamento começa quando recebo sinal, o carro está travado,
--    esperando desenrolar da negociação (cautelar, às vezes carro entrando
--    em loja, aí tem que esperar finalizar a venda da fonte, pra depois
--    desenrolar o repasse)."
--
-- Não é um estado curto — pode durar semanas. Nesse meio tempo o carro está
-- comprometido: nem disponível, nem vendido. É o mesmo buraco que fez um
-- veículo ser APAGADO em 08/set, por não haver status que servisse.
--
-- O `status` da venda já cobria isto (`negociando`) e ninguém usava. O que
-- faltava era o sinal: quanto entrou e quando.
-- ─────────────────────────────────────────────────────────────────


ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS valor_sinal numeric,
  ADD COLUMN IF NOT EXISTS sinal_em    date;

COMMENT ON COLUMN public.vendas.valor_sinal IS
  'Sinal recebido que trava o carro enquanto a venda não fecha. Venda com status=negociando NAO entra no faturamento do painel.';
COMMENT ON COLUMN public.vendas.sinal_em IS
  'Data em que o sinal entrou. Serve para saber ha quanto tempo o carro esta travado.';


-- ── Sem índice, de propósito ──────────────────────────────────────
-- A tabela tem 114 linhas. Índice aqui custaria escrita e manutenção para
-- economizar um varrimento que o Postgres faz em microssegundos. Se um dia
-- passar de algumas dezenas de milhares, reavaliar com EXPLAIN — não por
-- suposição.


-- ── RLS ───────────────────────────────────────────────────────────
-- Nada a fazer: `vendas` já tem RLS ligada sem policy desde 08/set, e o
-- acesso é todo por `service_role` através de `api/vendas.js`. Coluna nova
-- herda a proteção da tabela.


-- ── Conferência depois de rodar ───────────────────────────────────
-- Deve listar as duas colunas novas:
--
-- SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--  WHERE table_schema = 'public' AND table_name = 'vendas'
--    AND column_name IN ('valor_sinal', 'sinal_em');
--
-- E o histórico deve continuar intacto — 114 vendas como `concluido`:
--
-- SELECT status, count(*) FROM public.vendas GROUP BY status ORDER BY 2 DESC;
