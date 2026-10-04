-- Catálogo: varejo × repasse — 03/out/2026
--
-- Ideia do Yuri de 28/set ("catálogo de repasses para lojas, separado do
-- catálogo de estoque de venda"), desenhada com ele em 03/out.
--
-- O caso é do LOJISTA, não do repassador: ele tem o mesmo carro no pátio
-- para vender ao cliente final (varejo) e aceita repassar para outra loja
-- (atacado, mais barato). Hoje o catálogo tem um preço só.
--
-- `valor` SEMPRE foi o preço de repasse — não mexer nele, sob pena de
-- estragar anúncio, Rede, Match e story de uma vez.

alter table veiculos
  add column if not exists valor_varejo numeric,
  add column if not exists destino_venda text;

-- Nulo = não marcado. Quem decide é o dono, carro a carro (decisão dele:
-- "carro que encalhou no varejo vira repasse" é mudança de ideia, não regra
-- que o sistema adivinhe pela origem ou pelo tempo parado).
alter table veiculos
  drop constraint if exists veiculos_destino_venda_check;
alter table veiculos
  add constraint veiculos_destino_venda_check
  check (destino_venda is null or destino_venda in ('varejo', 'repasse', 'ambos'));

-- Nada é preenchido para trás: conta de repassador não tem varejo, e marcar
-- os carros existentes seria inventar decisão que é do dono.

select count(*) as veiculos,
       count(valor_varejo)  as com_preco_varejo,
       count(destino_venda) as marcados
  from veiculos;
