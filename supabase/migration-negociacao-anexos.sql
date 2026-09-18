-- ─────────────────────────────────────────────────────────────────
-- Comprovante do sinal na NEGOCIAÇÃO — preparada em 18/set/2026
--
-- Rodar no SQL Editor do Supabase.
--
-- POR QUE
-- O sinal passou a morar na negociação em 17/set. O comprovante dele não
-- tinha onde ficar: só entrava no sistema quando a venda fechava, e até lá
-- morava no WhatsApp. O Yuri descreveu a regra do mercado assim — "quem
-- colocar sinal primeiro trava" — e o comprovante é a prova da trava.
--
-- Mesmo formato de `vendas.anexos`: uma lista de
--   { tipo, path, nome, mimeType, uploadedAt }
-- O arquivo em si fica no bucket privado `vendas-docs`, na pasta
-- `neg-<id da negociação>/comprovante_sinal/`.
--
-- Na conversão em venda o arquivo é COPIADO para a pasta da venda — cópia
-- física, não referência, para que apagar de um lado não apague do outro.
-- ─────────────────────────────────────────────────────────────────


ALTER TABLE public.negociacoes
  ADD COLUMN IF NOT EXISTS anexos jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.negociacoes.anexos IS
  'Arquivos da negociacao (hoje: comprovante do sinal). So e escrito pelo endpoint de anexos, que confere se o caminho esta na pasta da propria negociacao.';


-- ── Esta coluna NÃO é gravável pelo formulário da negociação ──────
-- `api/compradores.js` tem lista fechada de campos (CAMPOS_NEG) e `anexos`
-- ficou de fora de propósito. Só o endpoint de anexos escreve aqui, e ele
-- recusa caminho fora da pasta `neg-<id>/`. Se o formulário pudesse gravar
-- a lista, bastaria editar o corpo da requisição para "adotar" o arquivo de
-- outra venda.


-- ── RLS ───────────────────────────────────────────────────────────
-- Nada a fazer: `negociacoes` tem RLS ligada sem policy desde 08/set, e o
-- acesso é todo por `service_role`. O bucket `vendas-docs` é privado.


-- ── Conferência depois de rodar ───────────────────────────────────
-- SELECT id, anexos FROM public.negociacoes;
-- Todas devem vir com anexos = [] até o primeiro comprovante ser anexado.
