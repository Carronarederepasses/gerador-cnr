-- ════════════════════════════════════════════════════════════════════
-- CONVERSAS 1 A 1 — o outro lado do WhatsApp
--
-- Rodar no banco da operação, depois das outras da rede. Só acrescenta.
--
-- ── Por quê [YURI, 27/set] ──────────────────────────────────────────
-- *"Essa parte da troca de msgs, quero igual ao WhatsApp."*
--
-- Lá são duas coisas, e a gente só tinha uma:
--
--   • **Transmissão** — 1 para muitos. Cada um recebe sozinho e ninguém
--     vê quem mais recebeu. É o que já existe (`ofertas`).
--   • **Conversa** — 1 a 1. Quem recebeu responde, e a conversa é só
--     entre os dois. **É o que falta.**
--
-- No WhatsApp a resposta a uma transmissão cai no chat privado com a
-- pessoa. Aqui vai ser igual: o carro chega pela transmissão, e quem se
-- interessa fala direto com o dono.
--
-- ── Uma conversa por PAR de lojas, não por carro ────────────────────
-- Como no WhatsApp: você tem UM chat com cada pessoa, e dentro dele
-- passam vários assuntos. Se fosse por carro, a mesma dupla teria dez
-- conversas soltas e ninguém acharia nada.
--
-- O carro entra como ASSUNTO de uma mensagem (`oferta_id`), do jeito que
-- lá se compartilha um produto dentro do chat.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. A conversa ───────────────────────────────────────────────────
-- `conta_a` e `conta_b` guardadas em ordem (a menor primeiro) para que o
-- par (X,Y) e o par (Y,X) sejam a MESMA linha. Sem isso, cada lado
-- abriria a sua conversa e as mensagens se perderiam em duas threads.
create table if not exists public.conversas (
  id            uuid primary key default gen_random_uuid(),
  conta_a       uuid not null references public.contas(id),
  conta_b       uuid not null references public.contas(id),
  criada_em     timestamptz not null default now(),
  ultima_em     timestamptz not null default now(),
  constraint conversas_ordem check (conta_a < conta_b),
  constraint conversas_par_unico unique (conta_a, conta_b)
);
create index if not exists conversas_a_idx on public.conversas (conta_a, ultima_em desc);
create index if not exists conversas_b_idx on public.conversas (conta_b, ultima_em desc);

-- ── 2. As mensagens ─────────────────────────────────────────────────
-- `oferta_id` é opcional: a mensagem pode falar de um carro específico
-- (como compartilhar um produto no chat) ou ser conversa solta.
--
-- Sem FK para `ofertas` de propósito: a oferta pode ser encerrada, e a
-- conversa sobre ela não pode sumir junto. Mesmo raciocínio da tabela
-- `historico`.
create table if not exists public.mensagens_rede (
  id           uuid primary key default gen_random_uuid(),
  conversa_id  uuid not null references public.conversas(id) on delete cascade,
  de_conta_id  uuid not null references public.contas(id),
  de_usuario_id uuid references public.usuarios(id),
  texto        text not null,
  oferta_id    uuid,
  criado_em    timestamptz not null default now(),
  lida_em      timestamptz,
  constraint mensagens_texto_nao_vazio check (length(trim(texto)) > 0)
);
create index if not exists mensagens_conversa_idx on public.mensagens_rede (conversa_id, criado_em);
-- As não lidas de quem abre a tela: é o número da bolinha.
create index if not exists mensagens_nao_lidas_idx on public.mensagens_rede (conversa_id, de_conta_id)
  where lida_em is null;

-- ── 3. RLS ──────────────────────────────────────────────────────────
-- Ligada e sem policy, como as outras. Quem decide o que cada loja
-- enxerga é `api/_rede.js`, à mão — e aqui a regra é dura: só participa
-- da conversa quem é uma das duas contas dela.
alter table public.conversas       enable row level security;
alter table public.mensagens_rede  enable row level security;

-- ── Conferir depois de rodar ────────────────────────────────────────
-- select tablename, rowsecurity from pg_tables
--  where schemaname='public' and tablename in ('conversas','mensagens_rede');
-- Esperado: 2 linhas, rowsecurity = true.
