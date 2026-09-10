// ─────────────────────────────────────────────────────────────────
// CNR — Máscaras de campo, fonte única
//
// POR QUE ESTE ARQUIVO EXISTE
// Em 10/set o Yuri notou que o telefone da Captação não se formatava
// sozinho como o do cadastro de Clientes. Ao ir olhar, o quadro era pior
// que um campo faltando:
//
//   compradores.html  telMask   + fmtTel    ← cópia 1
//   vendas.html       telMaskV  + fmtTelV   ← cópia 2, JÁ DIVERGIDA
//   captacao.html     nenhuma
//   negociacoes.html  nenhuma (4 campos)
//
// As duas cópias já não faziam a mesma coisa: com 1 ou 2 dígitos, uma
// mostrava `48` e a outra `(48`. Cópia que diverge em silêncio é o defeito
// que mais voltou neste projeto — foi assim que AVALIAÇÃO e GASTOS sumiram
// do anúncio em 05/set, e que "Salvar no catálogo" quebrou em 08/set.
//
// O PADRÃO
// `(48)99999-9999` — sem espaço depois do parêntese. Decisão do Yuri
// registrada em 02/set, e é o que as duas telas que já funcionam produzem.
// Para pôr o espaço, muda só o `)` na linha marcada abaixo, e muda em todo
// o sistema de uma vez.
// ─────────────────────────────────────────────────────────────────

(function (raiz) {
  'use strict';

  // ── Telefone ──────────────────────────────────────────────────
  // 11 dígitos → celular  (48)99999-9999
  // 10 dígitos → fixo     (48)3333-4444
  // O corte muda porque o celular tem o 9 na frente; sem isso o fixo sairia
  // com um dígito no lugar errado.
  function tel(valor) {
    const d = String(valor == null ? '' : valor).replace(/\D/g, '').slice(0, 11);
    if (!d) return '';
    if (d.length <= 2) return '(' + d;
    const corte = d.length > 10 ? 7 : 6;
    if (d.length <= 6) return '(' + d.slice(0, 2) + ')' + d.slice(2);
    //                                            ↑ para pôr espaço, é aqui
    return '(' + d.slice(0, 2) + ')' + d.slice(2, corte) + '-' + d.slice(corte);
  }

  // ── CPF (11) ou CNPJ (14) no mesmo campo ──────────────────────
  function doc(valor) {
    const d = String(valor == null ? '' : valor).replace(/\D/g, '').slice(0, 14);
    if (d.length <= 11) {
      return d.replace(/(\d{3})(\d)/, '$1.$2')
              .replace(/(\d{3})(\d)/, '$1.$2')
              .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return d.replace(/(\d{2})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1/$2')
            .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }

  // ── CEP ───────────────────────────────────────────────────────
  function cep(valor) {
    const d = String(valor == null ? '' : valor).replace(/\D/g, '').slice(0, 8);
    return d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d;
  }

  // ── Aplicar num input enquanto se digita ──────────────────────
  // Apagar com backspace em cima de um `)` ou de um `-` não fazia nada: a
  // máscara devolvia o caractere na hora, e o dedo dele ficava preso. Aqui,
  // quando o campo encurtou e o que sobrou termina em pontuação, some também
  // o dígito anterior — que é o que ele queria apagar.
  function aplicar(formatador) {
    return function (el) {
      if (!el) return;
      const antes  = el.value;
      let d = antes.replace(/\D/g, '');
      const apagando = el.dataset.cnrAnterior != null &&
                       antes.length < el.dataset.cnrAnterior.length;
      if (apagando && /[^0-9]$/.test(antes) && d.length) d = d.slice(0, -1);
      el.value = formatador(d);
      el.dataset.cnrAnterior = el.value;
    };
  }

  raiz.CNR_MASCARA = {
    tel: tel,
    doc: doc,
    cep: cep,
    telInput: aplicar(tel),
    docInput: aplicar(doc),
    cepInput: aplicar(cep),
  };

  // Atalhos globais para usar direto no `oninput` do HTML, que é como as
  // telas deste projeto sempre ligaram máscara.
  raiz.cnrTelMask = raiz.CNR_MASCARA.telInput;
  raiz.cnrDocMask = raiz.CNR_MASCARA.docInput;
  raiz.cnrCepMask = raiz.CNR_MASCARA.cepInput;
})(window);
