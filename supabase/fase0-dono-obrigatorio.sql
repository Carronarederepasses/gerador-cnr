-- ════════════════════════════════════════════════════════════════
-- Fase 0, segunda metade: o dono deixa de ser opcional
-- ════════════════════════════════════════════════════════════════
--
-- Em 23/set a coluna `conta_id` entrou nas 12 tabelas com DEFAULT
-- apontando para a conta da Carro na Rede e SEM obrigatoriedade. Isso foi
-- de propósito: obrigatória naquele dia, toda gravação quebraria no
-- instante do deploy, porque nenhuma chamada mandava o dono ainda.
--
-- Hoje o funil (`api/_db.js`) carimba o dono em todo POST, e o código já
-- roda assim há seis dias. O DEFAULT virou o contrário do que era: uma
-- linha que nascesse sem dono nasceria como sendo da Carro na Rede, em
-- silêncio. Enquanto é um site por loja isso acerta por acidente; no dia
-- em que duas lojas dividirem o mesmo banco, erra sem avisar.
--
-- CONFERIDO ANTES DE ESCREVER (29/set), no banco de produção:
--
--   veiculos 7 · vendas 114 · compradores 18 · negociacoes 3
--   anuncios 200 · buscas 4 · ideias 10 · eventos 53
--   historico 56 · observacoes 20 · agenda 0 · olx_mensagens 27
--
--   linhas SEM dono: ZERO, em todas as 12.
--
-- E conferido no código: `scripts/checa-funil.js` passa, e todo POST para
-- essas tabelas vai pelo funil, que carimba o dono. O upsert do Radar tem
-- `conta_id` dentro do `columns=` (senão o PostgREST descartaria).
--
-- ── O que acontece se eu estiver errado ──────────────────────────
-- O `SET NOT NULL` do Postgres CONFERE as linhas existentes antes de
-- valer. Se sobrar uma linha sem dono, ele recusa com a tabela no erro, e
-- o bloco inteiro é cancelado — nada fica pela metade. É a proteção que
-- salvou a limpeza do piloto em 23/set.
--
-- ── Onde rodar ───────────────────────────────────────────────────
-- Banco de PRODUÇÃO (Carro na Rede). O banco do piloto não foi conferido
-- daqui — a chave dele no .env não responde mais — então ele fica como
-- está; com um site por loja, o DEFAULT lá continua acertando.
--
-- Rodar no SQL Editor do Supabase, de uma vez. Confira antes que a aba
-- aberta é o projeto CERTO: dois bancos parecidos, um clique de distância.
-- ════════════════════════════════════════════════════════════════

begin;

alter table veiculos       alter column conta_id drop default, alter column conta_id set not null;
alter table vendas         alter column conta_id drop default, alter column conta_id set not null;
alter table compradores    alter column conta_id drop default, alter column conta_id set not null;
alter table negociacoes    alter column conta_id drop default, alter column conta_id set not null;
alter table anuncios       alter column conta_id drop default, alter column conta_id set not null;
alter table buscas         alter column conta_id drop default, alter column conta_id set not null;
alter table ideias         alter column conta_id drop default, alter column conta_id set not null;
alter table eventos        alter column conta_id drop default, alter column conta_id set not null;
alter table historico      alter column conta_id drop default, alter column conta_id set not null;
alter table observacoes    alter column conta_id drop default, alter column conta_id set not null;
alter table agenda         alter column conta_id drop default, alter column conta_id set not null;
alter table olx_mensagens  alter column conta_id drop default, alter column conta_id set not null;

commit;

-- ── Conferência: rode isto depois e leia o resultado ─────────────
-- As 12 linhas têm de vir com  obrigatorio = true  e  padrao = null.
-- Se alguma vier diferente, o bloco acima não valeu para ela.
select
  c.table_name                                as tabela,
  (c.is_nullable = 'NO')                      as obrigatorio,
  c.column_default                            as padrao
from information_schema.columns c
where c.column_name = 'conta_id'
  and c.table_schema = 'public'
  and c.table_name in (
    'veiculos','vendas','compradores','negociacoes','anuncios','buscas',
    'ideias','eventos','historico','observacoes','agenda','olx_mensagens'
  )
order by c.table_name;
