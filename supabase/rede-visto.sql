-- ══ OS VISTINHOS ═══════════════════════════════════════════════════
--
-- Hoje o dono manda o carro e não sabe NADA: não sabe se chegou, não sabe
-- se abriram, não sabe se olharam e não quiseram. Isso não é enfeite de
-- tela — é a diferença entre "ninguém quer este carro" e "ninguém viu
-- este carro", que pedem decisões opostas.
--
-- Uma coluna só, em `oferta_destinos`, que é onde já mora a linha "este
-- carro foi para esta loja".
--
--   sem visto_em   → entregue        ✓
--   com visto_em   → visto           ✓✓
--
-- NULO é o estado normal, não um erro: toda linha que já existe nasce
-- assim, e as 4 de hoje continuam válidas.
--
-- ROLE ESTE ARQUIVO NO SQL EDITOR DO SUPABASE (projeto da Carro na Rede).
-- Nada quebra enquanto não rodar: o código trata a coluna ausente como
-- "nunca visto", que é a verdade.

alter table oferta_destinos
  add column if not exists visto_em timestamptz;

-- Para a pergunta "o que ainda não foi visto?" não varrer a tabela
-- inteira. Índice PARCIAL: só as linhas não vistas entram nele, que são
-- justamente as que se procuram — as vistas nunca voltam a ser.
create index if not exists idx_destinos_nao_vistos
  on oferta_destinos (oferta_id)
  where visto_em is null;

-- Conferir depois de rodar (deve devolver uma linha, com visto_em nulo):
--   select oferta_id, conta_id, visto_em from oferta_destinos limit 1;
