-- ══ MODELO DO ANÚNCIO, POR LOJA ════════════════════════════════════
--
-- Hoje o texto do anúncio do WhatsApp é igual para todo mundo. Cada
-- lojista tem o seu jeito de escrever, e no dia em que o sistema for
-- vendido, o texto da Carro na Rede sairia com o nome dele.
--
-- Decisão do Yuri (29/set): modelo LIVRE — "cada um padroniza do jeito
-- que achar melhor, e o sistema salva como padrão do usuário".
--
-- NULO = usa o modelo padrão do sistema, que reproduz exatamente o texto
-- de hoje. Quem não mexer não vê diferença nenhuma — é o que permite
-- ligar isto sem combinar nada com ninguém.
--
-- Guardado como TEXTO com marcadores ({veiculo}, {valor}, {opcionais}…)
-- e não como uma lista de blocos ligados/desligados: o Yuri escolheu
-- liberdade, e uma lista de opções nunca cobre o jeito de escrever de
-- cada um. O que o sistema acerta sozinho — emoji por opcional, siglas
-- em caixa alta, negrito, linhas em branco — continua acontecendo DENTRO
-- de cada marcador, então a liberdade não custa a formatação.
--
-- ROLE ESTE ARQUIVO NO SQL EDITOR DO SUPABASE (projeto Carro na Rede).
-- Nada quebra antes de rodar: sem a coluna, todo mundo usa o padrão.

alter table contas
  add column if not exists modelo_anuncio text;

-- Conferir depois de rodar (deve devolver as lojas com a coluna vazia):
--   select nome, modelo_anuncio from contas;
