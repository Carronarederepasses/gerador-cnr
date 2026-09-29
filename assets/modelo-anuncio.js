/* ══ MODELO DO ANÚNCIO, POR LOJA ═══════════════════════════════════
 *
 * O texto do WhatsApp deixou de ser igual para todo mundo. Cada loja
 * escreve o seu, com marcadores (decisão do Yuri, 29/set: "livre, cada
 * um padroniza do jeito que achar melhor").
 *
 * ── POR QUE MARCADOR DE BLOCO, E NÃO DE CAMPO ─────────────────────
 *
 * `{opcionais}` devolve as linhas com emoji já montadas; `{veiculo}`
 * devolve o nome com as siglas corrigidas (XEI, 16V, MSI, e não "Xei");
 * `{valor}` devolve `*VALOR: R$ 70.990*` com o negrito no lugar.
 *
 * Isso é o que permite liberdade SEM perder o que o sistema acerta
 * sozinho — e cada um desses acertos custou uma correção: as siglas em
 * 02/set, as linhas em branco duplicadas no mesmo dia, o GASTOS que
 * sumia do texto em 05/set.
 *
 * ── A REGRA DA LINHA VAZIA ────────────────────────────────────────
 *
 * Marcador sem valor apaga a LINHA INTEIRA, não vira espaço em branco.
 * Sem isso, um carro sem FIPE deixaria um buraco no meio do anúncio —
 * exatamente o defeito de 02/set, quando faltar valor e FIPE produzia
 * duas linhas vazias antes do link.
 */
(function (raiz) {
  'use strict';

  // O padrão reproduz o texto de hoje, linha por linha. Quem não mexer
  // não vê diferença — é o que permite ligar isto sem avisar ninguém.
  var PADRAO = [
    '{veiculo}',
    '',            // a localização sempre teve uma linha em branco antes
    '{localizacao}',
    '',
    '{opcionais}',
    '',
    '{observacoes}',
    '',
    '{avaliacao}',
    '',
    '{gastos}',
    '',
    '{valor}',
    '{fipe}',
    '',
    '{instagram}',
  ].join('\n');

  // Nome, o que devolve, e um exemplo — a tela do editor lê isto para
  // montar a lista de marcadores. Uma fonte só: acrescentar marcador
  // aqui já o faz aparecer na ajuda.
  var MARCADORES = [
    { nome: 'veiculo',     desc: 'nome, ano, combustível, km e cor', ex: '*Polo Highline 200 TSI*, 2022, flex, 48.000km, preta' },
    { nome: 'localizacao', desc: 'a cidade que você escolheu mostrar', ex: '📍 *LOCALIZAÇÃO:* Garopaba' },
    { nome: 'opcionais',   desc: 'os itens marcados, um por linha, com emoji', ex: '✅ Ar-condicionado\n✅ Direção elétrica' },
    { nome: 'observacoes', desc: 'as observações do carro', ex: 'Único dono' },
    { nome: 'avaliacao',   desc: 'a avaliação que você escreveu', ex: '*AVALIAÇÃO:*\nCarro inteiro' },
    { nome: 'gastos',      desc: 'os serviços que o carro precisa', ex: '*GASTOS:*\npintar o capô' },
    { nome: 'valor',       desc: 'o valor de repasse', ex: '*VALOR: R$ 70.990*' },
    { nome: 'fipe',        desc: 'a tabela FIPE', ex: '*FIPE: R$ 76.750*' },
    { nome: 'instagram',   desc: 'o seu Instagram', ex: '@carronarederepasses' },
  ];

  /**
   * Monta o texto a partir do modelo e dos blocos já prontos.
   *
   * @param {string} modelo  texto com marcadores; vazio usa o padrão
   * @param {object} blocos  { veiculo: '...', valor: '...', ... }
   */
  function montar(modelo, blocos) {
    var texto = String(modelo || '').trim() || PADRAO;

    // Percorre LINHA a linha: é o que permite apagar a linha inteira
    // quando o marcador que ela contém não tem valor. Um `replace` no
    // texto todo deixaria a linha vazia para trás.
    var saida = [];
    texto.split(/\r?\n/).forEach(function (linha) {
      var usados = [];
      var preenchida = linha.replace(/\{(\w+)\}/g, function (todo, nome) {
        var v = blocos[nome];
        usados.push({ nome: nome, temValor: Boolean(v && String(v).trim()) });
        return v == null ? '' : String(v);
      });

      // Linha que SÓ tinha marcadores, e nenhum deles tinha valor: some.
      // Linha com texto fixo do lojista fica, mesmo sem valor nenhum —
      // ele escreveu aquilo de propósito.
      if (usados.length && !usados.some(function (u) { return u.temValor; })) {
        var soMarcadores = linha.replace(/\{\w+\}/g, '').trim() === '';
        if (soMarcadores) return;
      }
      saida.push(preenchida);
    });

    return normalizar(saida.join('\n'));
  }

  /**
   * Tira o excesso de linhas em branco e as pontas.
   *
   * Duas em seguida viram uma: no WhatsApp, três linhas vazias parecem
   * erro de quem mandou. É a mesma limpeza que `_normalizarAnuncio`
   * fazia, e agora vale para qualquer modelo que o lojista escrever.
   */
  function normalizar(txt) {
    return String(txt)
      .replace(/[ \t]+$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\n+/, '')
      .replace(/\n+$/, '');
  }

  // O modelo desta loja. Começa nulo (= padrão) e é preenchido assim que
  // o servidor responde. A tela que monta anúncio lê esta variável no
  // momento de gerar, não na carga — se a resposta chegar depois, o
  // próximo anúncio já sai certo, em vez de a página ter de esperar.
  raiz.CNR_MODELO_LOJA = null;

  (function carregar() {
    try {
      fetch('/api/utils?type=modelo', { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) { if (d && d.modelo) raiz.CNR_MODELO_LOJA = d.modelo; })
        .catch(function () { /* sem resposta: segue no padrão, que é o texto de sempre */ });
    } catch (e) { /* idem */ }
  })();

  raiz.CNR_MODELO = {
    montar: montar,
    normalizar: normalizar,
    PADRAO: PADRAO,
    MARCADORES: MARCADORES,
  };
})(window);
