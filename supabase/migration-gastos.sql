-- ╔══════════════════════════════════════════════════════════════╗
-- ║  CNR — Migration: campo gastos em veiculos                   ║
-- ║  Aditiva e segura — não afeta dados existentes.              ║
-- ║  Rodar no Supabase: SQL Editor → New query                   ║
-- ╚══════════════════════════════════════════════════════════════╝

alter table veiculos
  add column if not exists gastos text;

-- gastos: despesas de preparação previstas para o veículo
-- (ex: "Pintar para-choque; higienização")
-- Uso interno — não exposto no anúncio público.
-- Nullable — veículos existentes ficam com NULL, comportamento igual ao anterior.
