-- ════════════════════════════════════════════════════════════════════
-- A MARCA SAI DO SITE E VAI PARA A LOJA
--
-- RODAR NO BANCO DA OPERAÇÃO (o teu). Só acrescenta colunas — nenhuma
-- tabela existente muda de forma, nenhum dado é tocado.
--
-- ── Por que ─────────────────────────────────────────────────────────
-- A fase 1 (27/set) fez o `conta_id` vir da pessoa que entrou. Mas o
-- nome, o logo, o Instagram e as telas escondidas continuam saindo de
-- variável de ambiente (`MARCA_*`), lidas em `api/_marca.js`.
--
-- Enquanto for assim, "um site atende todas as lojas" está pela metade:
-- o lojista ainda precisa de um projeto próprio na Vercel — não pelos
-- dados, que a sessão já separa, mas para o logo dele aparecer no topo.
--
-- Com estas colunas, a marca passa a ser da LOJA. Sem sessão, tudo cai na
-- variável de ambiente, que é o comportamento de hoje — mesma transição
-- da fase 1, e pela mesma razão: não derrubar o que já funciona.
--
-- ── O nome ──────────────────────────────────────────────────────────
-- `contas.nome` já existe e já guarda "Carro na Rede Repasses". Ele é o
-- nome da marca — não criamos um segundo. Dois nomes para a mesma coisa
-- é como as cópias divergem, e este projeto já pagou por isso seis vezes.
-- ════════════════════════════════════════════════════════════════════

alter table public.contas
  add column if not exists subtitulo text,   -- "Repasses" · slogan do lojista
  add column if not exists instagram text,   -- sem o @; o código põe
  add column if not exists email     text,
  add column if not exists logo      text,   -- endereço da imagem
  add column if not exists icone     text,   -- quadrado, para a tela inicial do celular
  add column if not exists esconder  text;   -- "radar,anuncios" — mesmo formato do MARCA_ESCONDER

-- Formato igual ao da variável de ambiente de propósito: o mesmo código
-- corta os dois, então não existem duas regras de leitura para divergir.

-- ── A conta da Carro na Rede ────────────────────────────────────────
-- Preenchida com o que hoje está no código como padrão (`_marca.js`),
-- para o site do Yuri continuar idêntico quando passar a ler daqui.
--
-- O `nome` vira **"Carro na Rede"**, não "Carro na Rede Repasses": nome e
-- subtítulo são campos separados, e quem junta os dois é a tela (o título
-- sai "Carro na Rede Repasses"). Com o nome completo aqui, o título sairia
-- "Carro na Rede Repasses Repasses" — peguei isso comparando a saída dos
-- dois caminhos antes de ligar, não olhando a tela depois.
update public.contas
   set nome      = 'Carro na Rede',
       subtitulo = coalesce(subtitulo, 'Repasses'),
       instagram = coalesce(instagram, 'carronarederepasses'),
       email     = coalesce(email,     'carronarederepasses@gmail.com')
 where id = '00000000-0000-4000-8000-000000000001';

-- ── Conferir depois de rodar ────────────────────────────────────────
-- select nome, subtitulo, instagram, email, esconder from public.contas;
-- Esperado: 1 linha, Carro na Rede Repasses · Repasses · carronarederepasses
