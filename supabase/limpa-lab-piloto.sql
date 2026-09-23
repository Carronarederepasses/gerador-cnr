-- Remove as tabelas de ensaio da fase 0 do banco do PILOTO (BHM Autos).
--
-- RODAR NO PROJETO `cnr-piloto`, NÃO no da CNR.
--
-- O que são: em 23/set ensaiei a migração da fase 0 em tabelas `lab_*`
-- antes de tocar nas reais (10/10 no ensaio). O ensaio cumpriu a função e
-- as tabelas ficaram para trás — no banco do lojista, não no meu.
--
-- Conferido em 23/set à noite, antes de escrever este arquivo:
--   lab_contas 2 · lab_usuarios 3 · lab_conta_membros 3 · lab_veiculos 3
--   lab_vendas 1  → 12 linhas, todas inventadas por mim no ensaio.
--   Nenhum arquivo do Gerador cita `lab_` — conferido no repositório.
--
-- Por que remover: o comparador (`supabase/confere-bancos.js`) acusa os
-- dois bancos como diferentes enquanto elas existirem, e alarme que sempre
-- toca é alarme que se aprende a ignorar. E lixo de teste no banco do
-- cliente é lixo no banco do cliente.

-- A ORDEM IMPORTA: quem aponta sai antes de quem é apontado.
-- `lab_vendas` tem chave estrangeira para `lab_veiculos`; a primeira
-- versão deste arquivo mandava apagar o veículo antes da venda e o banco
-- recusou (2BP01), com razão. `CASCADE` resolveria e está fora de
-- propósito: ele apagaria junto o que dependesse, sem dizer o quê.
drop table if exists lab_conta_membros;
drop table if exists lab_vendas;
drop table if exists lab_veiculos;
drop table if exists lab_usuarios;
drop table if exists lab_contas;

-- Depois de rodar, conferir daqui:  node supabase/confere-bancos.js
-- Esperado:  15 tabelas · 227 colunas · ok — as colunas batem.
