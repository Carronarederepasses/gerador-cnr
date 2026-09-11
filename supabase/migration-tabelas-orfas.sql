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
-- ATENÇÃO: esta tem 1 linha de verdade, de 28/06/2026 — Peugeot 2008
-- Crossway 2019, branco, nota "media", status "finalizada", com as 8 seções
-- do checklist preenchidas.
--
-- Indícios de que é registro de teste, e não de um carro real:
--   • sem fotos, sem inspetor e sem observações;
--   • `venda_id` e `veiculo_id` nulos — não está ligada a nada;
--   • esse Peugeot não existe no catálogo nem nas vendas;
--   • a avaliação do sistema hoje mora em `veiculos.avaliacao` (JSONB), não
--     aqui — esta tabela é de uma tentativa anterior, de junho.
--
-- Mesmo assim: **descomentar só depois de o Yuri confirmar** que aquela
-- vistoria de junho não significa nada. Uma linha custa zero para ficar.

-- DROP TABLE IF EXISTS public.vistorias;


-- ── Conferência depois de rodar ───────────────────────────────────
-- Deve listar as 12 em uso: veiculos, anuncios, buscas, vendas, compradores,
-- negociacoes, eventos, olx_mensagens, ideias, historico, observacoes, agenda.

-- SELECT table_name
--   FROM information_schema.tables
--  WHERE table_schema = 'public'
--  ORDER BY table_name;
