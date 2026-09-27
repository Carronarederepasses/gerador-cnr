-- ════════════════════════════════════════════════════════════════════
-- AVISO NO CELULAR — onde fica guardado quem quer ser avisado
--
-- Rodar no banco da operação. Uma tabela, nada mais.
--
-- ── Por que agora ───────────────────────────────────────────────────
-- É a fase 3 do plano (§10 do PROJETO-APP): *"app embrulhado +
-- notificação — quando a lista existir e tiver o que notificar"*. A
-- lista existe desde hoje, e o que notificar também: carro que chegou e
-- mensagem nova.
--
-- Sem aviso, o carro só é visto por quem abrir o app por acaso — e aí a
-- rede não é rede, é um mural que ninguém visita.
--
-- ── O que é uma "assinatura" ────────────────────────────────────────
-- Quando a pessoa aceita ser avisada, o NAVEGADOR dela devolve um
-- endereço próprio (`endpoint`) no servidor da Google/Apple/Mozilla. É
-- para lá que o aviso é enviado. Não é o telefone dela, não é e-mail: é
-- um endereço que só serve para isso e que ela pode revogar sozinha.
--
-- Um endereço por APARELHO, não por pessoa: quem usa celular e notebook
-- tem dois, e quer ser avisado nos dois.
--
-- ── Por que guardar `conta_id` e `usuario_id` ───────────────────────
-- `conta_id` para saber a quem mandar ("chegou carro para a loja X").
-- `usuario_id` porque quem sai da loja tem de parar de ser avisado dela.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.push_assinaturas (
  id          uuid primary key default gen_random_uuid(),
  conta_id    uuid not null references public.contas(id),
  usuario_id  uuid references public.usuarios(id),
  endpoint    text not null,
  p256dh      text,
  auth        text,
  aparelho    text,
  criado_em   timestamptz not null default now(),
  ultimo_erro text,
  -- O mesmo aparelho reassinando tem de atualizar a linha, não criar
  -- outra — senão a pessoa recebe o mesmo aviso três vezes.
  constraint push_endpoint_unico unique (endpoint)
);
create index if not exists push_conta_idx on public.push_assinaturas (conta_id);

alter table public.push_assinaturas enable row level security;

-- ── Conferir depois de rodar ────────────────────────────────────────
-- select tablename, rowsecurity from pg_tables
--  where schemaname='public' and tablename = 'push_assinaturas';
-- Esperado: 1 linha, rowsecurity = true.
