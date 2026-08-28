-- =============================================================
-- Reforma 43 — Fundação da Inbox OLX
-- Rodar no Supabase Dashboard → SQL Editor
-- =============================================================
-- Tabela: olx_mensagens
-- Armazena mensagens capturadas pelo olx-chat-monitor.js.
-- Acesso exclusivo via service_role (extensão → API Vercel → Supabase).
-- =============================================================

CREATE TABLE IF NOT EXISTS olx_mensagens (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id      text        NOT NULL,
  origem          text        NOT NULL DEFAULT 'olx',
  direction       text        NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  content         text        NOT NULL,
  -- SHA-256(listing_id:direction:content) — chave de dedup determinística.
  -- Impede que o mesmo MutationObserver dispare duas inserções idênticas.
  msg_hash        text        NOT NULL UNIQUE,
  -- Identificador da conversa na OLX, quando disponível no DOM/URL.
  conversation_id text,
  -- Momento em que a extensão detectou a mensagem (aproximado).
  detected_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Índice principal: buscar todas as mensagens de um anúncio.
CREATE INDEX IF NOT EXISTS olx_mensagens_listing_id_idx
  ON olx_mensagens (listing_id);

-- Índice de ordenação temporal.
CREATE INDEX IF NOT EXISTS olx_mensagens_detected_at_idx
  ON olx_mensagens (detected_at DESC);

-- RLS habilitado por padrão.
-- O acesso é sempre via service_role (que bypass RLS) — sem políticas públicas.
ALTER TABLE olx_mensagens ENABLE ROW LEVEL SECURITY;
