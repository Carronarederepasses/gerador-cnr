-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Adiciona o campo combustível ao catálogo de veículos          ║
-- ║  Rode este SQL no painel do Supabase: SQL Editor → New query  ║
-- ╚══════════════════════════════════════════════════════════════╝

alter table public.veiculos
  add column if not exists combustivel text; -- Flex, Gasolina, Álcool, Diesel, Híbrido, Elétrico, GNV
