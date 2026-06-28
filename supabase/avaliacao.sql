-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Catálogo — Avaliação do veículo (substitui a vistoria separada)║
-- ║  Adiciona um campo flexível na tabela veiculos pra guardar a   ║
-- ║  avaliação simplificada (checklist + nota + observações).      ║
-- ║  Rode no Supabase: SQL Editor → New query.                     ║
-- ╚══════════════════════════════════════════════════════════════╝

alter table public.veiculos
  add column if not exists avaliacao jsonb not null default '{}'::jsonb;

-- Estrutura do campo avaliacao:
--   { "nota": "acima|media|abaixo",
--     "obs": "texto livre",
--     "resultado": { "<secao>": { "<item>": { "status": "...", "obs": "..." } } } }
