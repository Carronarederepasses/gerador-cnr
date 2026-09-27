-- ════════════════════════════════════════════════════════════════════
-- AS TABELAS DA REDE — fase 2 do app ("o coração")
--
-- NÃO RODAR AINDA. Este arquivo é preparação, escrito em 27/set para
-- estar pronto no dia em que existir um banco para o app. Hoje não
-- existe: o Supabase grátis dá 2 projetos ativos por conta, e os dois
-- estão ocupados (Carro na Rede e o piloto do Bruno).
--
-- Quando rodar, rodar NO BANCO DO APP — vazio, separado. Nunca no banco
-- da operação do Yuri.
--
-- ── O AVISO QUE IMPORTA MAIS QUE O SQL ──────────────────────────────
--
-- O funil `api/_db.js` isola conta de conta filtrando `conta_id=eq.<id>`
-- em toda consulta. **Estas tabelas são a exceção, por definição:** a
-- rede existe justamente para um dado atravessar de uma conta para
-- outra. Uma oferta é criada pela loja A e tem que ser LIDA pela loja B.
--
-- Por isso elas **não entram no `DE_CONTA` do `_db.js`**. Se entrarem, o
-- feed "Chegou para ti" nasce vazio e ninguém entende por quê — o filtro
-- não dá erro, só devolve nada.
--
-- E como não entram no funil, cada consulta a elas precisa da regra
-- própria, escrita à mão no endpoint:
--
--   ofertas      → leio se sou o dono OU se estou em `oferta_destinos`
--   interesses   → o dono da oferta vê todos; cada loja vê o seu
--   reservas     → o dono da oferta vê para quem; os outros só que existe
--   contatos     → só o dono da lista
--
-- Isso é mais trabalho que o funil e é onde um vazamento nasceria.
-- Quando for construir: um teste por regra, com duas contas, antes de
-- qualquer tela.
--
-- ── Escolhas de desenho, e por quê ──────────────────────────────────
--
-- • `uuid` como chave, para acompanhar o resto do banco (e porque o id
--   viaja em URL e no navegador). Custa fragmentação de índice; no
--   volume desta operação não paga trocar.
-- • **Sem chave estrangeira para `veiculos`**, de propósito: carro é
--   apagado com frequência (7 exclusões até 08/set), e apagar um carro
--   não pode apagar o histórico de quem reservou e desistiu. Mesmo
--   raciocínio da tabela `historico`.
-- • **Com chave estrangeira para `contas`**: conta não se apaga, e a
--   integridade aqui é o que sustenta a reputação.
-- • Todo campo de chave estrangeira ganha índice explícito — o Postgres
--   não cria sozinho, e sem ele o JOIN varre a tabela inteira.
-- • RLS ligada e **sem policy**, igual ao resto do projeto: quem entra é
--   o servidor com a chave de serviço, que passa por cima dela. A RLS
--   aqui fecha a porta de quem chegar com a chave pública.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. A pessoa dentro da loja ──────────────────────────────────────
-- `conta_membros.papel` já existe desde a fase 0. Falta a chave que o
-- dono liga pessoa a pessoa.
--
-- Por que é coluna à parte e não um papel: perguntei ao Yuri quem pode
-- mandar carro para a lista e ele respondeu "quem for responsável por
-- isso, aí não temos como definir". Varia de loja para loja. Amarrar ao
-- cargo seria inventar regra que o mercado não tem.
alter table public.conta_membros
  add column if not exists pode_ofertar boolean not null default false;

-- Papéis válidos. `operador` é o caso da própria Carro na Rede: a mãe do
-- Yuri faz abordagem numa repassadora, e nenhum dos quatro papéis de
-- loja descreve isso. Os dados existentes provaram antes de eu impor o
-- vocabulário errado.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'conta_membros_papel_valido'
      and conrelid = 'public.conta_membros'::regclass
  ) then
    alter table public.conta_membros
      add constraint conta_membros_papel_valido
      check (papel in ('dono','gerente','vendedor','patio','operador'));
  end if;
end $$;

-- ── 2. A lista ──────────────────────────────────────────────────────
-- A aresta conta → conta. `conta_id` é o DONO da lista; `contato_conta_id`
-- é quem está nela. Não é recíproco: estar na lista de alguém não põe
-- essa pessoa na tua.
create table if not exists public.contatos (
  id                uuid primary key default gen_random_uuid(),
  conta_id          uuid not null references public.contas(id),
  contato_conta_id  uuid not null references public.contas(id),
  estado            text not null default 'ativo',
  criado_em         timestamptz not null default now(),
  encerrado_em      timestamptz,
  constraint contatos_estado_valido check (estado in ('ativo','saiu','removido')),
  constraint contatos_nao_a_si_mesmo check (conta_id <> contato_conta_id),
  constraint contatos_sem_repetir unique (conta_id, contato_conta_id)
);
create index if not exists contatos_conta_idx   on public.contatos (conta_id) where estado = 'ativo';
create index if not exists contatos_contato_idx on public.contatos (contato_conta_id);

-- ── 3. Pedido para entrar ───────────────────────────────────────────
-- "Ninguém é adicionado sem pedir" (§3.2). O interessado solicita, o
-- dono aceita ou recusa.
create table if not exists public.solicitacoes (
  id             uuid primary key default gen_random_uuid(),
  de_conta_id    uuid not null references public.contas(id),
  para_conta_id  uuid not null references public.contas(id),
  estado         text not null default 'pendente',
  criado_em      timestamptz not null default now(),
  respondido_em  timestamptz,
  constraint solicitacoes_estado_valido check (estado in ('pendente','aceita','recusada','cancelada')),
  constraint solicitacoes_nao_a_si_mesmo check (de_conta_id <> para_conta_id)
);
-- Um pedido pendente por par. Índice parcial em vez de UNIQUE simples:
-- depois de recusado, a pessoa pode pedir de novo um dia.
create unique index if not exists solicitacoes_uma_pendente
  on public.solicitacoes (de_conta_id, para_conta_id) where estado = 'pendente';
create index if not exists solicitacoes_para_idx on public.solicitacoes (para_conta_id) where estado = 'pendente';

-- ── 4. O carro enviado ──────────────────────────────────────────────
-- `vitrine_em` é quando o carro abre para o país. NULL = não abrir
-- ("Não abrir" é uma das opções da tela). Data no passado = já está na
-- vitrine.
create table if not exists public.ofertas (
  id           uuid primary key default gen_random_uuid(),
  conta_id     uuid not null references public.contas(id),
  veiculo_id   uuid not null,  -- sem FK: ver cabeçalho
  criado_em    timestamptz not null default now(),
  vitrine_em   timestamptz,
  estado       text not null default 'aberta',
  encerrada_em timestamptz,
  constraint ofertas_estado_valido check (estado in ('aberta','reservada','encerrada'))
);
create index if not exists ofertas_conta_idx   on public.ofertas (conta_id, criado_em desc);
create index if not exists ofertas_veiculo_idx on public.ofertas (veiculo_id);
-- A vitrine: o que já abriu e ainda está de pé.
create index if not exists ofertas_vitrine_idx on public.ofertas (vitrine_em)
  where estado = 'aberta' and vitrine_em is not null;

-- ── 5. Para quem a oferta foi ───────────────────────────────────────
-- Guarda o destino linha a linha, em vez de "foi para a lista inteira".
-- Motivo: a lista muda. Se amanhã alguém sair, o feed de ontem dela não
-- pode mudar junto — e o histórico de quem recebeu o quê é o que
-- explica, meses depois, por que um carro girou ou não.
create table if not exists public.oferta_destinos (
  oferta_id  uuid not null references public.ofertas(id) on delete cascade,
  conta_id   uuid not null references public.contas(id),
  criado_em  timestamptz not null default now(),
  primary key (oferta_id, conta_id)
);
-- O feed "Chegou para ti": as ofertas que chegaram para mim, novas em cima.
create index if not exists oferta_destinos_conta_idx on public.oferta_destinos (conta_id, criado_em desc);

-- ── 6. Quem levantou a mão ──────────────────────────────────────────
-- `criado_em` é a hora do SERVIDOR — relógio de celular erra e pode ser
-- mexido. Mas depois de 25/set ela não julga disputa: no empate, "ambos
-- recebem material, o primeiro que decidir é dele". A fila é ordem de
-- atenção, não fechadura. A hora serve para ordenar e registrar.
--
-- `usuario_id` guarda QUEM da loja tocou — é o que dá sentido aos papéis.
create table if not exists public.interesses (
  id          uuid primary key default gen_random_uuid(),
  oferta_id   uuid not null references public.ofertas(id) on delete cascade,
  conta_id    uuid not null references public.contas(id),
  usuario_id  uuid references public.usuarios(id),
  criado_em   timestamptz not null default now(),
  estado      text not null default 'quer',
  desistiu_em timestamptz,
  constraint interesses_estado_valido check (estado in ('quer','desistiu')),
  constraint interesses_uma_vez unique (oferta_id, conta_id)
);
create index if not exists interesses_oferta_idx  on public.interesses (oferta_id, criado_em);
create index if not exists interesses_conta_idx   on public.interesses (conta_id, criado_em desc);
create index if not exists interesses_usuario_idx on public.interesses (usuario_id);

-- ── 7. A reserva ────────────────────────────────────────────────────
-- Desenhada com o Yuri em 25/set, com as palavras do mercado dele:
--
--   "No WhatsApp, apenas colocamos carro reservado (com sinal na conta)
--    quando tem; quando não tem sinal, somente reservado. Assim, todos
--    veem."
--
-- Duas coisas que NÃO existem aqui, e cada ausência é uma decisão:
--
-- • **Sem prazo.** Nada de `expira_em`. "Depende de N situações, mas
--   geralmente é o prazo de esperar o resultado da cautelar, a menos que
--   o carro demore a entrar, não tenha documento ainda pra poder pagar."
--   Um relógio derrubaria justamente as reservas legítimas. No lugar
--   dele, a tela mostra há quanto tempo está reservado — e quem sumiu
--   aparece sozinho.
-- • **Sem garantia de dinheiro.** `valor_sinal` é declaração do dono, não
--   pagamento processado. O app registra que ele disse que entrou; não
--   atesta que entrou.
create table if not exists public.reservas (
  id              uuid primary key default gen_random_uuid(),
  oferta_id       uuid not null references public.ofertas(id) on delete cascade,
  para_conta_id   uuid not null references public.contas(id),
  com_sinal       boolean not null default false,
  valor_sinal     numeric(12,2),
  motivo          text,        -- aguardando cautelar · documento · carro não entrou
  criado_em       timestamptz not null default now(),
  desfeita_em     timestamptz,
  desfeita_motivo text,
  -- Valor só faz sentido quando há sinal, e sinal declarado precisa de valor.
  constraint reservas_sinal_coerente check (
    (com_sinal and valor_sinal is not null and valor_sinal > 0)
    or (not com_sinal and valor_sinal is null)
  )
);
-- Uma reserva de pé por oferta. Parcial, porque o histórico das desfeitas
-- é justamente o que alimenta o "0 desistências" do perfil da loja.
create unique index if not exists reservas_uma_de_pe
  on public.reservas (oferta_id) where desfeita_em is null;
create index if not exists reservas_para_idx on public.reservas (para_conta_id, criado_em desc);

-- ── 8. RLS ──────────────────────────────────────────────────────────
-- Ligada e sem policy, como as outras 12. Quem entra é o servidor com a
-- chave de serviço. A porta entre contas é a regra no endpoint — ver o
-- aviso no cabeçalho deste arquivo.
alter table public.contatos        enable row level security;
alter table public.solicitacoes    enable row level security;
alter table public.ofertas         enable row level security;
alter table public.oferta_destinos enable row level security;
alter table public.interesses      enable row level security;
alter table public.reservas        enable row level security;

-- ── Conferir depois de rodar ────────────────────────────────────────
-- select tablename, rowsecurity from pg_tables
--   where schemaname='public'
--     and tablename in ('contatos','solicitacoes','ofertas',
--                       'oferta_destinos','interesses','reservas');
-- Esperado: 6 linhas, todas com rowsecurity = true.
