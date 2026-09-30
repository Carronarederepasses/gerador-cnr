-- ════════════════════════════════════════════════════════════════
-- Lojista × repassador, e a preparação do carro
-- ════════════════════════════════════════════════════════════════
--
-- Desenho do Yuri (29/set), nas palavras dele:
--
--   "os carros que forem entrando pra estoque, depois do checklist feito,
--    ele pegar e direcionar para onde o carro deve ir: esse carro precisa
--    trocar pneus, pintar para-choque, depois higienização e preparação,
--    aí sim carro pronto pra vender — o vendedor vai vendo onde o carro
--    está antes de ficar pronto, pra não se perder ou esquecerem onde tá."
--
-- E a correção dele sobre o "uma etapa por vez":
--
--   "coloque mais de uma opção, pq às vezes para ganhar tempo, enquanto o
--    carro tá pintando para-choque, o lojista manda fazer outra coisa"
--
-- Então são DUAS coisas, não uma: o carro está num lugar, e pode ter mais
-- de um serviço acontecendo. É por isso que não existe uma coluna "local":
-- o lugar é derivado dos serviços em andamento. Duas fontes para a mesma
-- verdade é como elas divergem, e aqui divergiriam na cara do vendedor.
--
-- ── 1. O tipo da loja ────────────────────────────────────────────
--
-- Quem se cadastra escolhe o que é. Muda o que aparece: repassador não tem
-- pátio, não tem funcionário levando carro na funilaria, e o carro não
-- entra em estoque dele.
--
-- SEM DEFAULT de propósito. Um padrão aqui decidiria pelo lojista que
-- acabou de entrar, e ele descobriria depois — que é o defeito que o
-- `horas_antes_da_vitrine` tinha em 28/set e foi tirado por isso.
-- Conta sem tipo = "ainda não escolheu", e a tela pergunta.

alter table contas add column if not exists tipo text
  check (tipo in ('repassador', 'lojista'));

comment on column contas.tipo is
  'repassador | lojista. Nulo = ainda não escolheu. Sem default: padrão aqui decide pelo dono sem ele saber.';

-- A Carro na Rede é repassador — dito pelo Yuri, não deduzido.
update contas set tipo = 'repassador' where nome = 'Carro na Rede' and tipo is null;

-- ── 2. A preparação ──────────────────────────────────────────────
--
-- Uma coluna jsonb no veículo, e não tabela própria: são poucos itens por
-- carro, sempre lidos junto com o carro, e nunca consultados sozinhos.
-- É a Estrutura Emergente do projeto — vira tabela no dia em que a
-- ausência dela limitar alguma coisa, não porque parece mais arrumado.
--
-- Cada item:
--   { id, etapa, oque, valor, status, criado_em, feito_em }
--
--   etapa   uma das cinco fixas (decisão do Yuri, 29/set: fixas por ora)
--           oficina | funilaria | pneu | lavajato | patio
--   oque    o serviço em texto livre: "pintar para-choque dianteiro"
--   valor   quanto custou, em reais. Null = ainda não sei
--   status  'fazer' | 'andando' | 'feito'
--
-- O carro está onde houver item 'andando'. Pode ser mais de um lugar ao
-- mesmo tempo, que é justamente o caso que o Yuri levantou.

alter table veiculos add column if not exists preparacao jsonb not null default '[]'::jsonb;

comment on column veiculos.preparacao is
  'Serviços da preparação. Onde o carro ESTÁ é derivado: os itens com status=andando. Sem coluna de local — duas fontes para a mesma verdade divergem.';

-- ── Conferência ──────────────────────────────────────────────────
select
  (select tipo from contas where nome = 'Carro na Rede')                        as tipo_da_cnr,
  (select count(*) from contas where tipo is null)                              as contas_sem_tipo,
  (select count(*) from veiculos where preparacao is null)                      as veiculos_sem_preparacao,
  (select count(*) from veiculos)                                               as veiculos;
