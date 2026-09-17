-- ─────────────────────────────────────────────────────────────────
-- Sinal na NEGOCIAÇÃO — preparada em 17/set/2026
--
-- Rodar no SQL Editor do Supabase.
--
-- POR QUE AQUI, E NÃO NA VENDA
-- Em 16/set eu pus o sinal na tabela `vendas`. O Yuri usou, entendeu o fluxo
-- e corrigiu:
--
--   "Ao invés de lançarmos a venda em andamento como uma nova venda, entendi
--    o lance da negociação. Acho que pode acrescentar o campo sinal no campo
--    de negociação e não na nova venda."
--
-- Ele está certo, e a decisão já estava escrita no CLAUDE.md desde 15/ago:
--
--   "O fluxo ideal é: negociando → reservado (quando houver sinal ou reserva
--    do comprador) → comprado."
--
-- Venda que não fechou não é venda. A tabela `vendas` alimenta o relatório,
-- os KPIs, o CSV e o espelho no Google Sheets — pôr lá dentro algo que pode
-- cancelar obrigou a filtrar em três pontos do painel, o que era sintoma de
-- estar no lugar errado. A negociação já é o lugar do pré-fechamento: tem o
-- veículo, o comprador, o valor proposto, o histórico, e já sabe virar venda.
--
-- O status `reservado` JÁ EXISTIA na tela (filtro, opção e cor) e o Yuri já
-- usou. O que faltava era onde guardar o sinal.
-- ─────────────────────────────────────────────────────────────────


ALTER TABLE public.negociacoes
  ADD COLUMN IF NOT EXISTS valor_sinal numeric,
  ADD COLUMN IF NOT EXISTS sinal_em    date;

COMMENT ON COLUMN public.negociacoes.valor_sinal IS
  'Sinal recebido que trava o carro enquanto a negociacao nao fecha. Viaja para vendas.valor_sinal na conversao.';
COMMENT ON COLUMN public.negociacoes.sinal_em IS
  'Data em que o sinal entrou. E o que permite mostrar ha quantos dias o carro esta travado.';


-- ── As colunas em `vendas` continuam, e não são sobra ─────────────
-- `vendas.valor_sinal` e `vendas.sinal_em` (16/set) deixam de ser digitadas à
-- mão e passam a ser o DESTINO: chegam preenchidas quando a negociação vira
-- venda. Depois de fechada, a venda é o registro final.
-- Nenhuma venda tinha sinal preenchido quando isto foi escrito — conferido.


-- ── Sem índice, de propósito ──────────────────────────────────────
-- A tabela tem 3 linhas. Índice aqui seria custo sem retorno. Reavaliar com
-- EXPLAIN se um dia passar de dezenas de milhares — não por suposição.


-- ── RLS ───────────────────────────────────────────────────────────
-- Nada a fazer: `negociacoes` já tem RLS ligada sem policy desde 08/set, e o
-- acesso é todo por `service_role` através de `api/compradores.js`.


-- ── Conferência depois de rodar ───────────────────────────────────
-- SELECT column_name, data_type
--   FROM information_schema.columns
--  WHERE table_schema = 'public' AND table_name = 'negociacoes'
--    AND column_name IN ('valor_sinal', 'sinal_em');
