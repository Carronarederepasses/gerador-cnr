-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Mensagem só com anexo (07/out/2026)                          ║
-- ║  RODAR NO PROJETO DA CNR. Seguro de rodar duas vezes.          ║
-- ╚══════════════════════════════════════════════════════════════╝
--
-- ── O DEFEITO ────────────────────────────────────────────────────────
--
-- O Yuri gravou um áudio para o Nogueira em 07/out. O arquivo subiu (está
-- no balde, 64 KB), e **a mensagem nunca foi gravada**. Nada apareceu na
-- conversa e o erro não dizia nada que ele pudesse entender.
--
-- A causa é esta trava, de `rede-conversas.sql` (27/set):
--
--     constraint mensagens_texto_nao_vazio check (length(trim(texto)) > 0)
--
-- Ela estava CERTA no mundo em que foi escrita: ali, mensagem era texto, e
-- mensagem vazia era engano. Com o anexo (06/out) o mundo mudou — áudio e
-- foto são conteúdo, e no WhatsApp a legenda é opcional. A trava virou o
-- que impedia exatamente a coisa nova.
--
-- Eu construí o anexo e **não vim aqui afrouxar isto**. O código já aceitava
-- mensagem só com anexo (`if (!limpo && !lista.length)`), e o banco não.
-- Duas regras para a mesma coisa, discordando — e quem perde é quem usa.
--
-- ── A REGRA NOVA ─────────────────────────────────────────────────────
--
-- Mensagem precisa de CONTEÚDO: texto, ou anexo, ou os dois. O que não
-- pode continuar passando é a mensagem completamente vazia, que era o que
-- a trava antiga protegia — e isso continua protegido.

alter table public.mensagens_rede
  drop constraint if exists mensagens_texto_nao_vazio;

alter table public.mensagens_rede
  drop constraint if exists mensagens_tem_conteudo;

alter table public.mensagens_rede
  add constraint mensagens_tem_conteudo check (
    length(btrim(coalesce(texto, ''))) > 0
    or coalesce(anexos, '[]'::jsonb) <> '[]'::jsonb
  );

-- Depois de rodar, conferir daqui — as duas linhas têm de ser verdade:
--   1. mensagem só com anexo PASSA;
--   2. mensagem sem texto e sem anexo CONTINUA sendo recusada.
