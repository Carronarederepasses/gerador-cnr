/* ══ TEXTO DO WHATSAPP ═══════════════════════════════════════════════
 *
 * [YURI, 07/out: "faça as mesmas configurações de texto do whatsapp, *
 * para deixar em negrito.. e tal"]
 *
 *   *negrito*      _itálico_      ~riscado~      ```sem serifa```
 *
 * Vale duplo neste projeto: o texto do anúncio que o Gerador monta JÁ é
 * escrito nessa convenção (`*VALOR: R$ 70.990*`, `*FIPE: ...*`). Antes
 * disto, um anúncio colado no chat aparecia com os asteriscos à mostra —
 * e era o mesmo texto que no WhatsApp sai formatado.
 *
 * ── A ORDEM IMPORTA, E É QUESTÃO DE SEGURANÇA ────────────────────────
 *
 * **Escapar vem primeiro, sempre.** O texto é escrito por outra loja: se
 * a marcação fosse aplicada antes, um `<script>` digitado por alguém
 * viraria `<script>` de verdade na tela de quem recebe. Escapando antes,
 * `<` já virou `&lt;` e as únicas etiquetas na saída são as que este
 * arquivo põe.
 *
 * Por isso a função recebe o texto CRU e escapa ela mesma, em vez de
 * aceitar texto já escapado: assim não existe o jeito errado de chamar.
 *
 * ── AS REGRAS DO WHATSAPP, QUE NÃO SÃO ÓBVIAS ────────────────────────
 *
 * 1. O marcador não pode ter espaço logo depois da abertura nem logo
 *    antes do fechamento: `* isto *` fica literal. É o que faz uma
 *    multiplicação escrita (`2 * 3 * 4`) não virar negrito.
 * 2. Precisa estar na borda de uma palavra. `a*b*c` fica literal.
 * 3. Não atravessa linha em branco — parágrafo novo começa limpo, senão
 *    um asterisco esquecido formata o resto da mensagem inteira.
 * 4. Dentro de ```sem serifa``` nada mais é marcação.
 */
(function (raiz) {
  'use strict';

  function escapar(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // `\u0000` não aparece em texto digitado — serve de marca temporária
  // para o que já foi resolvido e não pode ser mexido de novo.
  var MARCA = '\u0000';

  function formatar(cru) {
    var texto = escapar(cru);

    // 1. ```sem serifa``` sai de cena primeiro: o que está dentro dele
    //    não é marcação, é conteúdo.
    var guardados = [];
    texto = texto.replace(/```([\s\S]+?)```/g, function (_, dentro) {
      guardados.push('<code>' + dentro + '</code>');
      return MARCA + (guardados.length - 1) + MARCA;
    });

    // 2. Os três pares. O mesmo desenho para os três:
    //    - antes: começo, espaço ou pontuação (nunca letra ou número);
    //    - o conteúdo não começa nem termina com espaço;
    //    - o conteúdo não atravessa linha em branco.
    var PARES = [
      ['\\*', 'strong'],
      ['_', 'em'],
      ['~', 's'],
    ];
    PARES.forEach(function (par) {
      var m = par[0], etiqueta = par[1];
      var re = new RegExp(
        '(^|[\\s.,;:!?(\\[{\'"])' +          // borda de palavra antes
        m +
        '(?![\\s' + m + '])' +                // nada de espaço logo depois
        '((?:(?!\\n\\s*\\n)[\\s\\S])+?)' +    // conteúdo, sem linha em branco
        '(?<![\\s])' +                        // nada de espaço logo antes
        m +
        '(?![\\w])',                          // borda de palavra depois
        'g'
      );
      texto = texto.replace(re, '$1<' + etiqueta + '>$2</' + etiqueta + '>');
    });

    // 3. Devolve o que foi guardado.
    texto = texto.replace(new RegExp(MARCA + '(\\d+)' + MARCA, 'g'), function (_, i) {
      return guardados[Number(i)];
    });
    return texto;
  }

  /** Tira a marcação, deixando só as palavras. Para a prévia de uma linha
   *  na lista de conversas, onde `*oi*` não deve aparecer com asterisco
   *  nem com negrito — ali é uma linha de resumo. */
  function semMarcacao(cru) {
    return String(cru == null ? '' : cru)
      .replace(/```([\s\S]+?)```/g, '$1')
      .replace(/(^|[\s.,;:!?(\[{'"])([*_~])(?![\s])((?:(?!\n\s*\n)[\s\S])+?)(?<![\s])\2(?![\w])/g, '$1$3');
  }

  raiz.CNR_TEXTO = { formatar: formatar, semMarcacao: semMarcacao, escapar: escapar };
}(window));
