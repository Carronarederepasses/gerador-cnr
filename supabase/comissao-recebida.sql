-- Financeiro: o que tenho a receber — 03/out/2026
--
-- A venda era registrada e a comissão que ainda não entrou não aparecia em
-- lugar nenhum (ideia do Yuri, 28/set, olhando o menu do SIG).
--
-- `comissao_recebida_em` nulo = ainda não entrou.
-- É DATA e não sim/não de propósito: "quando entrou" responde quanto tempo o
-- dinheiro demora a cair, que "entrou?" não responde. Custa a mesma coluna.

alter table vendas
  add column if not exists comissao_recebida_em date;

-- As vendas que já estavam no sistema entram como RECEBIDAS.
--
-- O motivo: não existe informação nenhuma sobre pagamento nas 114 antigas —
-- elas vieram da planilha, estão todas `concluido` e com documentação
-- entregue. Deixá-las nulas faria a tela abrir dizendo que há mais de cento e
-- setenta mil reais a receber, o que é falso e assusta à toa.
--
-- A data usada é a da venda, não a de hoje: carimbar hoje diria que o
-- dinheiro de 2024 entrou em outubro de 2026.
--
-- Se alguma dessas de fato não foi paga, é marcar na tela — o botão desfaz
-- nos dois sentidos.
update vendas
   set comissao_recebida_em = coalesce(data_venda, created_at::date)
 where comissao_recebida_em is null;

-- A partir daqui, venda nova nasce NULA (a receber) e só é marcada por ele.

-- Confere: deve dar 114 recebidas e 0 a receber.
select count(*) filter (where comissao_recebida_em is not null) as recebidas,
       count(*) filter (where comissao_recebida_em is null)     as a_receber
  from vendas;
