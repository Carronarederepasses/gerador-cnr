-- ════════════════════════════════════════════════════════════════
-- FIPE do mês corrente: guardar QUAL linha da tabela deu o valor
-- ════════════════════════════════════════════════════════════════
--
-- Relatado pelo Yuri em 02/out: o valor de FIPE dos carros do catálogo não
-- virava com o mês. O Corolla dele estava com R$ 125.829 de setembro
-- enquanto outubro dizia R$ 124.399 — R$ 1.430 de diferença no número com
-- que ele precifica o repasse.
--
-- Até aqui o sistema guardava SÓ o número (`veiculos.fipe`). Para
-- atualizar, teria de adivinhar o carro pelo nome outra vez — e adivinhar
-- pelo nome já errou quatro vezes neste projeto: combustível ignorado
-- (02/set), F-250 virando outra picape (16/set), Corolla virando Corolla
-- Cross e SW4 não achando nada (01/out).
--
-- **Atualizar errado é pior que ficar velho.** Com o valor de setembro, ele
-- sabe que é de setembro. Com um valor errado de outubro, parece certo.
--
-- `fipe_ref` guarda a linha exata:
--   {
--     marcaCod, modeloCod, anoCod,   -- o suficiente para reconsultar
--     codigoFipe,                    -- o código público ("002001-0")
--     nome,                          -- o que casou, para a tela mostrar
--     mes,                           -- "outubro de 2026"
--     em                             -- quando foi lido
--   }
--
-- Nulo = carro antigo, sem referência. Esse NÃO é atualizado sozinho: a
-- tela mostra o mês do valor e um "atualizar" que abre a cascata uma vez.
-- Preencher sozinho seria adivinhar, e é disso que estamos saindo.

alter table veiculos add column if not exists fipe_ref jsonb;

comment on column veiculos.fipe_ref is
  'Qual linha da FIPE produziu veiculos.fipe: {marcaCod, modeloCod, anoCod, codigoFipe, nome, mes, em}. Nulo = sem referência; não atualizar sozinho, seria adivinhar.';

-- Índice só do que a atualização olha: carro à venda e sem referência não
-- entra na conta.
create index if not exists idx_veiculos_fipe_mes
  on veiculos ((fipe_ref->>'mes'))
  where fipe_ref is not null;

-- ── Conferência ──────────────────────────────────────────────────
select
  count(*)                                            as veiculos,
  count(*) filter (where fipe is not null)            as com_valor,
  count(*) filter (where fipe_ref is not null)        as com_referencia
from veiculos;
