-- ─────────────────────────────────────────────────────────────────
-- Limpeza de tabelas órfãs — preparada em 11/set/2026
--
-- Rodar no SQL Editor do Supabase. NÃO é executado por nenhum deploy:
-- apagar tabela é irreversível e passa pelo Yuri.
--
-- COMO SE CHEGOU AQUI
-- Ao atualizar o CONTEXTO.md em 11/set, o banco foi comparado com o código.
-- Duas tabelas não são referenciadas por NENHUM arquivo do Gerador nem da
-- extensão — conferido com busca em todo o repositório, não por memória.
-- ─────────────────────────────────────────────────────────────────


-- ── 1. listas_envio ───────────────────────────────────────────────
-- Sobra da "lista de transmissão": recurso construído e removido no mesmo
-- dia, 03/set. O motivo da remoção está registrado no CLAUDE.md — o Yuri usa
-- WhatsApp pelo celular, onde o app abre uma conversa por vez, então a fila
-- dava mais trabalho do que tirava.
--
-- Zero linhas. Zero referências. Seguro.

DROP TABLE IF EXISTS public.listas_envio;


-- ── 2. vistorias ──────────────────────────────────────────────────
-- LIBERADO PELO YURI em 11/set. E a minha leitura estava ERRADA.
--
-- Eu tinha concluído que era registro de teste, pelos indícios: sem fotos,
-- sem inspetor, `venda_id` e `veiculo_id` nulos, e o carro sem rastro no
-- catálogo ou nas vendas. Ele corrigiu:
--
--     "fiz avaliação, mas cliente desistiu da venda"
--
-- Ou seja, era trabalho de verdade — o carro nunca entrou no catálogo porque
-- o negócio não aconteceu, não porque a vistoria era fictícia. Bom lembrete
-- de por que o DROP ficou comentado esperando a palavra dele em vez de eu
-- decidir pelos indícios.
--
-- O conteúdo foi exportado antes, em `supabase/vistorias-backup-2026-06-28.json`,
-- e vai para o git. Apagar tabela é irreversível; o trabalho, não.
--
-- A tabela sai porque nenhum código a referencia e a avaliação do sistema
-- passou a morar em `veiculos.avaliacao` (JSONB).

DROP TABLE IF EXISTS public.vistorias;


-- ── Conferência depois de rodar ───────────────────────────────────
-- Deve listar as 12 em uso: veiculos, anuncios, buscas, vendas, compradores,
-- negociacoes, eventos, olx_mensagens, ideias, historico, observacoes, agenda.

-- SELECT table_name
--   FROM information_schema.tables
--  WHERE table_schema = 'public'
--  ORDER BY table_name;
