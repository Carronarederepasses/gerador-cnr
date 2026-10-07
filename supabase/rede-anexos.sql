-- ╔══════════════════════════════════════════════════════════════╗
-- ║  A Rede — anexo na conversa (06/out/2026)                     ║
-- ║  RODAR NO PROJETO DA CNR. Seguro de rodar duas vezes.          ║
-- ╚══════════════════════════════════════════════════════════════╝
--
-- ── POR QUE ESTE BALDE É PRIVADO, AO CONTRÁRIO DO `veiculos` ──────
--
-- O balde `veiculos` é público de propósito: foto de carro vai no anúncio,
-- é feita para ser vista, e o `<img src>` precisa alcançá-la sem login.
--
-- O anexo de conversa é o oposto. Numa negociação de repasse circulam
-- CRLV, CNH, comprovante, dado bancário. Balde público significa que uma
-- URL que vaze — num encaminhamento, num print, no histórico de um
-- navegador — é legível por **qualquer pessoa, para sempre, sem login**.
-- Caminho por UUID não resolve isso: não ser adivinhável não é o mesmo que
-- ser protegido.
--
-- Então aqui a leitura é por URL ASSINADA, com prazo, emitida pela API
-- depois de conferir que quem pede é um dos dois lados da conversa. É o
-- mesmo desenho que `vendas-docs` já usa desde que existe.
--
-- ── O CAMINHO DO ARQUIVO ──────────────────────────────────────────
--
--   <conta_id de quem mandou>/<conversa_id>/<momento>-<acaso>.<ext>
--
-- A conta vem PRIMEIRO porque é por ela que se mede o espaço de cada loja
-- e por ela que se apaga tudo de uma loja que sair. A conversa depois,
-- porque é o que agrupa na hora de mostrar.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'rede-anexos', 'rede-anexos', false,
  -- 8 MB por arquivo. A foto comprimida no aparelho sai com ~250 KB, então
  -- 8 MB é folga larga para foto e cabe um documento de verdade. O teto
  -- existe para o engano não passar: foto crua de celular moderno chega a
  -- 12 MB, e uma dessas por mensagem enche o plano grátis em 80 mensagens.
  8388608,
  -- Só o que o chat sabe mostrar. Lista fechada, e não aberta com exceções:
  -- aberta, o primeiro arquivo estranho entra e só se descobre depois.
  array['image/jpeg','image/png','image/webp','image/heic','image/heif',
        'audio/webm','audio/ogg','audio/mpeg','audio/mp4','audio/aac',
        'application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ── O anexo na mensagem ───────────────────────────────────────────
--
-- Coluna em `mensagens_rede`, não tabela nova: um anexo não existe sem a
-- mensagem dele, não é consultado por si só, e some junto quando ela some.
-- É a mesma forma de `vendas.anexos`, que já funciona assim.
--
-- Cada item: { caminho, tipo, nome, bytes, w, h }  — `w`/`h` para a tela
-- reservar o espaço da foto antes de ela chegar, e não pular quando chega.
alter table public.mensagens_rede
  add column if not exists anexos jsonb not null default '[]'::jsonb;

-- A conta de espaço por loja (o aviso dos 80%) percorre os anexos de todas
-- as conversas dela. Sem índice isso é varredura; com ele, é consulta.
create index if not exists mensagens_rede_com_anexo_idx
  on public.mensagens_rede (de_conta_id)
  where anexos <> '[]'::jsonb;

-- Depois de rodar, conferir daqui:
--   select count(*) from mensagens_rede where anexos <> '[]'::jsonb;  -- 0
