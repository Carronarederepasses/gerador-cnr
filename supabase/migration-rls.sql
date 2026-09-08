-- ╔══════════════════════════════════════════════════════════════╗
-- ║  CNR — Fecha a Caixa Preta (RLS em todas as tabelas)          ║
-- ║  Rode no Supabase: SQL Editor → New query                     ║
-- ╚══════════════════════════════════════════════════════════════╝
--
-- POR QUE
-- O alerta do Supabase de 06/set estava certo. Medido em 08/set, de fora,
-- com a chave publishable:
--
--   historico  → 50 linhas legíveis, e DELETE aceito (HTTP 204)
--   as outras  → 0 linhas (já tinham RLS)
--
-- A `historico` é a pior para ficar aberta: ela guarda CÓPIAS COMPLETAS de
-- vendas, veículos e negociações em `dados_antes`/`dados_depois`. Entre os
-- campos: comprador_cpf, comprador_telefone, vendedor_cpf, vendedor_telefone,
-- chassi, placa, renavam, valor_compra, valor_venda, taxa_intermediacao.
--
-- O CPF e o telefone ali não são do Yuri — são de terceiros. É o mesmo
-- argumento que fechou a API em 03/set, e ele não depende de probabilidade.
--
-- A origem está escrita no checkpoint de 19/ago, na Reforma 35 Etapa 1:
-- "Sem RLS nesta etapa — acesso via SERVICE_ROLE (server-side only)". Era
-- verdade sobre o aplicativo e continuou verdade; o que faltou foi voltar.
--
-- POR QUE ISTO NÃO QUEBRA NADA
-- As 12 funções em `api/` usam SUPABASE_SERVICE_ROLE_KEY, e o service_role
-- IGNORA RLS. Conferido função por função: nenhuma usa a chave anon.
-- O navegador nunca fala com o Supabase — zero menção a "supabase" em
-- qualquer arquivo servido ao navegador. A extensão fala com /api, não com
-- o banco. O script da planilha também.
--
-- SEM POLÍTICA NENHUMA, DE PROPÓSITO
-- RLS ligada e sem policy significa: anon e authenticated não enxergam nada.
-- É o que queremos — não existe usuário de banco neste sistema, existe o
-- servidor. Criar policy aqui seria abrir porta que ninguém pede.
--
-- Rodar duas vezes não faz mal: habilitar RLS já habilitada não é erro.

alter table public.historico     enable row level security;

-- As demais já estavam. Vão junto para que a resposta a "todas as tabelas
-- estão protegidas?" seja este arquivo, e não uma inspeção no painel.
alter table public.veiculos      enable row level security;
alter table public.vendas        enable row level security;
alter table public.negociacoes   enable row level security;
alter table public.compradores   enable row level security;
alter table public.eventos       enable row level security;
alter table public.anuncios      enable row level security;
alter table public.buscas        enable row level security;
alter table public.ideias        enable row level security;
alter table public.olx_mensagens enable row level security;

-- Confere o resultado sem sair do editor: rowsecurity tem de ser true em
-- todas as linhas.
select tablename, rowsecurity
  from pg_tables
 where schemaname = 'public'
 order by rowsecurity, tablename;
