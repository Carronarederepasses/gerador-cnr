-- ╔══════════════════════════════════════════════════════════════╗
-- ║  CNR — Agenda de avaliações                                   ║
-- ║  Rode no Supabase: SQL Editor → New query                     ║
-- ╚══════════════════════════════════════════════════════════════╝
--
-- POR QUE
-- Pedido do Yuri em 09/set: anotar as avaliações que estão marcadas. Não
-- existia UM campo de data futura no sistema inteiro — tudo que havia era
-- `created_at`, `updated_at` e `ultimo_contato`, todos olhando para trás.
--
-- SOLTA, E NÃO PRESA AO ANÚNCIO
-- A tentação era pôr uma data no card do anúncio: é o lugar onde ele já
-- está. Mas ele disse em 07/set que "carros captados nem sempre vêm da OLX,
-- vêm por indicação, vêm de lojas parceiras" — presa ao anúncio, a agenda
-- serviria um terço dos casos. Por isso a linha existe sozinha e o vínculo
-- com anúncio ou veículo é OPCIONAL.
--
-- SEM FOREIGN KEY, de propósito — mesma decisão da tabela `historico`:
-- o compromisso não pode sumir porque alguém apagou o anúncio. Anúncio
-- excluído deixa o vínculo pendurado, e a tela lida com isso.
--
-- O ALARME NÃO MORA AQUI
-- Quem toca o alarme é o calendário do celular: a tela gera um arquivo .ics
-- e ele entra na agenda do telefone. Alarme nosso só tocaria com o Gerador
-- aberto, e o caso do Yuri é justamente estar na rua sem o notebook — mesmo
-- limite que fez ele descartar a notificação de resposta em 04/set.
-- Esta tabela guarda a LISTA; o telefone guarda o alarme.

create table if not exists public.agenda (
  id          uuid primary key default gen_random_uuid(),

  -- Data E hora: ele marca "terça 10h", não "terça". timestamptz guarda em
  -- UTC e a tela converte para o fuso de quem olha.
  quando      timestamptz not null,

  titulo      text not null,
  local       text,
  observacao  text,

  -- Vínculo opcional. Sem FK: ver o comentário acima.
  anuncio_id  uuid,
  veiculo_id  uuid,

  -- Quem marcou. Mesma lógica de `anuncios.operador`, carimbado pelo
  -- servidor a partir da chave do aparelho. Com duas pessoas trabalhando,
  -- os dois vão querer saber de quem é o compromisso.
  operador    text,

  -- Nulo = ainda vai acontecer. É o que separa a lista do que já passou.
  feito_em    timestamptz,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- A consulta do Painel é sempre "o que vem pela frente, em ordem": filtra por
-- `quando` e ordena por `quando`. Sem índice isso vira varredura da tabela
-- inteira a cada abertura do Painel.
create index if not exists idx_agenda_quando on public.agenda (quando);

-- Pendentes primeiro é a pergunta mais frequente da tela. Índice parcial
-- porque compromisso já feito não interessa para essa consulta e não precisa
-- ocupar o índice.
create index if not exists idx_agenda_pendentes
  on public.agenda (quando)
  where feito_em is null;

-- RLS LIGADA DESDE O NASCIMENTO.
-- Em 08/set o alerta do Supabase pegou a tabela `historico` aberta: 50 linhas
-- legíveis de fora, com CPF e telefone de terceiros dentro. A causa foi ter
-- criado a tabela sem RLS porque "o acesso é só server-side" — verdade que
-- continuou verdade, mas a tabela ficou aberta mesmo assim.
--
-- Sem policy nenhuma, de propósito: anon e authenticated não enxergam nada.
-- As funções de api/ usam SERVICE_ROLE, que ignora RLS.
alter table public.agenda enable row level security;

comment on table public.agenda is
  'Avaliacoes marcadas. Linha solta: o vinculo com anuncio/veiculo e opcional porque nem todo carro vem da OLX. O alarme fica no celular (.ics), nao aqui.';

-- Confere: rowsecurity tem de ser true.
select tablename, rowsecurity
  from pg_tables
 where schemaname = 'public' and tablename = 'agenda';
