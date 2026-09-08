-- ╔══════════════════════════════════════════════════════════════╗
-- ║  CNR — Quem abordou cada anúncio                              ║
-- ║  Rode no Supabase: SQL Editor → New query                     ║
-- ╚══════════════════════════════════════════════════════════════╝
--
-- POR QUE
-- A partir do fim de setembro/2026 são duas pessoas abordando anúncios: o
-- Yuri e a mãe dele. O card da Mesa de Cata diz "enviado", mas não diz POR
-- QUEM — e com duas pessoas trabalhando na mesma lista, os dois vão querer
-- saber quem já falou com qual vendedor, para não abordar duas vezes.
--
-- ISTO NÃO É MULTI-TENANCY. É atribuição.
-- Yuri e mãe são o mesmo negócio, com os mesmos dados, compartilhados de
-- propósito: ele QUER ver os carros que ela achou. Separar os dados dos dois
-- esconderia dele metade da própria operação. Multiusuário de verdade — cada
-- assinante isolado do outro — é outro problema, e é o de vender o Gerador
-- para o lojista de outra cidade.
--
-- COMO É PREENCHIDO
-- Pelo servidor, a partir da chave do aparelho (api/_auth.js → operadorDe).
-- Ninguém digita e não há campo na tela: cada pessoa tem a sua chave, e a
-- chave já diz quem é. Fica nulo quando não dá para afirmar — chave legada
-- (extensão, script da planilha) ou portão desligado. Vazio, nunca chutado.
--
-- Anúncios abordados ANTES desta coluna existir ficam nulos, e isso está
-- certo: eram todos do Yuri, mas o banco não tem como provar. A tela mostra
-- o nome quando existe e cala quando não existe.

alter table public.anuncios
  add column if not exists operador text;

comment on column public.anuncios.operador is
  'Quem mudou o status por ultimo. Carimbado pelo servidor a partir da chave do aparelho (api/_auth.js). Nulo = nao da para afirmar. Atribuicao, nao multi-tenancy.';
