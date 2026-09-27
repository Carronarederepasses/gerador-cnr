-- ════════════════════════════════════════════════════════════════════
-- COMPLEMENTO DA REDE — a oferta leva os dados do carro
--
-- Rodar depois do `rede-fase2.sql`, no mesmo banco. Existe como arquivo
-- à parte por um motivo bobo e honesto: eu editei o `rede-fase2.sql`
-- DEPOIS de o Yuri já ter copiado o conteúdo para o SQL Editor, então
-- ele rodou a versão anterior. `create table if not exists` não
-- acrescenta coluna em tabela que já existe — daí este arquivo.
--
-- ── Por que a oferta não é um ponteiro ──────────────────────────────
-- 1. **O funil não pode ser furado aqui.** Se a oferta fosse só o id do
--    carro, a loja que recebe teria de ler `veiculos` da loja que mandou
--    — exatamente a consulta que `api/_db.js` existe para impedir. Com a
--    fotografia, nada atravessa a fronteira: o que cruza é o que o dono
--    escolheu mandar.
-- 2. **O que não deve atravessar, não atravessa.** Placa é uso interno e
--    `valor_compra` é a margem dele. Nenhum dos dois tem coluna aqui, e
--    por isso não há como vazarem por descuido de um `select`.
-- 3. **A oferta é do momento em que foi feita.** Se o dono baixar o preço
--    amanhã, o que os outros viram ontem não muda sozinho — e a fila de
--    quem levantou a mão continua fazendo sentido.
--
-- Colunas soltas para o que a vitrine filtra e ordena; o resto em
-- `dados` (versão, cor, câmbio, combustível, fotos, FIPE), que muda com
-- o tempo sem pedir migração.
-- ════════════════════════════════════════════════════════════════════

alter table public.ofertas
  add column if not exists marca  text,
  add column if not exists modelo text,
  add column if not exists ano    integer,
  add column if not exists km     integer,
  add column if not exists preco  numeric(12,2),
  add column if not exists cidade text,
  add column if not exists uf     text,
  add column if not exists dados  jsonb not null default '{}'::jsonb;

-- A vitrine ordena por preço e filtra por ano — sem isto, varre tudo.
create index if not exists ofertas_preco_idx on public.ofertas (preco)
  where estado = 'aberta' and vitrine_em is not null;

-- ── Conferir depois de rodar ────────────────────────────────────────
-- select column_name from information_schema.columns
--  where table_name = 'ofertas' order by ordinal_position;
-- Esperado: aparecerem marca, modelo, ano, km, preco, cidade, uf, dados.
