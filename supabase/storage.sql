-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Catálogo — Fase 2: bucket de fotos dos veículos              ║
-- ║  Rode no Supabase SQL Editor (depois do schema.sql).          ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Bucket público. Os arquivos ficam em caminhos por UUID do veículo
-- (ex: veiculos/<uuid>/<timestamp>.jpg), que não são adivinháveis.
-- Upload/delete só acontece via API route (service_role); o "público"
-- serve apenas para o <img src> conseguir exibir a foto.
insert into storage.buckets (id, name, public)
values ('veiculos', 'veiculos', true)
on conflict (id) do update set public = true;
