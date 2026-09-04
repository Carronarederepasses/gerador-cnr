-- ╔══════════════════════════════════════════════════════════════╗
-- ║  CNR — Cidade de emplacamento (uso interno)                   ║
-- ║  Rode no Supabase: SQL Editor → New query                     ║
-- ╚══════════════════════════════════════════════════════════════╝
--
-- POR QUE
-- A consulta de placa devolve o município onde o carro está EMPLACADO, e
-- isso vinha sendo escrito no campo `regiao` — que é o que sai no anúncio.
-- São coisas diferentes: um March emplacado em Canela-RS estava em
-- Garopaba-SC, e o anúncio mandava os interessados para a cidade errada.
--
-- Pior: `regiao` é o campo que o Yuri borra de propósito, para não
-- entregarem a origem do carro e atravessarem o negócio. Preencher sozinho
-- tirava dele a decisão que o campo existe para tomar.
--
-- Agora são dois campos com donos diferentes:
--   emplacado_em → fato do documento. USO INTERNO, nunca entra no anúncio.
--   regiao       → o que ele escolhe mostrar. Renomeado para "Localização"
--                  na tela e no texto do anúncio.
--
-- Fica ao lado de `placa` e `renavam`, que já seguem essa mesma regra.

alter table public.veiculos
  add column if not exists emplacado_em text;

comment on column public.veiculos.emplacado_em is
  'Municipio-UF de emplacamento, da consulta de placa. USO INTERNO: nunca entra no texto do anuncio.';
