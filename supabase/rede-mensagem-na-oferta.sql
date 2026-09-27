-- ════════════════════════════════════════════════════════════════════
-- A MENSAGEM QUE VAI COM O CARRO
--
-- Rodar no banco da operação. Uma coluna, nada mais.
--
-- ── Por quê [YURI, 27/set] ──────────────────────────────────────────
-- Ele pediu a tela no padrão do WhatsApp: a transmissão aberta, com o
-- campo de digitar embaixo — e mandou o print da "Transmissão SP · 32
-- destinatários".
--
-- No WhatsApp ele não manda só a foto do carro: manda o carro E o texto
-- ("entrou esse hoje", "aceito troca", "só à vista"). Sem esta coluna, a
-- tela teria um campo de digitar que não leva nada — campo que existe e
-- não faz nada é pior que campo nenhum.
--
-- Opcional de propósito: mandar sem escrever nada continua valendo.
-- ════════════════════════════════════════════════════════════════════

alter table public.ofertas
  add column if not exists mensagem text;

-- ── Conferir depois de rodar ────────────────────────────────────────
-- select column_name from information_schema.columns
--  where table_name='ofertas' and column_name='mensagem';
-- Esperado: 1 linha.
