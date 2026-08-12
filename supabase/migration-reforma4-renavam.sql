-- ╔══════════════════════════════════════════════════════════════╗
-- ║  CNR — Migration: campo renavam em veiculos                  ║
-- ║  Aditiva e segura — não afeta dados existentes.              ║
-- ║  Rodar no Supabase: SQL Editor → New query                   ║
-- ╚══════════════════════════════════════════════════════════════╝

alter table veiculos
  add column if not exists renavam text;

-- renavam: número do RENAVAM capturado automaticamente da APiBrasil
-- na consulta de placa durante a captação (index.html → buscarPlacaGerador).
-- Nullable — veículos cadastrados sem consulta de placa ficam com NULL.
-- Uso interno — não exposto no anúncio público.
