/* ══ COMPRIMIR FOTO NO APARELHO ══════════════════════════════════════
 *
 * A decisão mais cara do projeto cabe neste arquivo.
 *
 * Foto de celular moderno sai com 3 a 5 MB. Comprimida a 1600px vai para
 * ~250 KB — **vinte vezes menos**. No plano grátis do Supabase (1 GB de
 * arquivo e 5 GB de saída por mês) isso é a diferença entre:
 *
 *     sem comprimir   ~16 carros de conversa
 *     comprimido      ~200 carros de conversa
 *
 * E a saída aperta antes do espaço: a mesma foto numa transmissão para 50
 * lojas é 50 downloads. Cada 250 KB economizados aqui valem 50 vezes lá.
 *
 * ── POR QUE DEVOLVE BLOB, E NÃO base64 ───────────────────────────────
 *
 * `captacao.html` tem um irmão desta função que devolve base64 — ele nasceu
 * para o caminho antigo, em que o arquivo subia DENTRO do pedido para a
 * nossa função. base64 incha o dado em 33% e faz a foto atravessar a
 * Vercel.
 *
 * Aqui o arquivo vai direto do aparelho para o Supabase por URL assinada, e
 * para isso o que serve é o Blob. **São dois caminhos diferentes, não uma
 * duplicação por descuido** — quando a captação migrar para o envio direto,
 * os dois viram um só, e é aqui que ele fica.
 *
 * ── O QUE NÃO SE COMPRIME ────────────────────────────────────────────
 *
 * PDF e áudio passam intactos. Recomprimir um PDF o destrói, e áudio já
 * vem comprimido pelo gravador — passar de novo só perde qualidade e não
 * ganha espaço.
 */
(function (raiz) {
  'use strict';

  // 1600px no lado maior: é o suficiente para ver amassado, risco e
  // detalhe de roda num celular, e foi o valor que a captação já usava.
  var LADO = 1600;
  var QUALIDADE = 0.82;

  function ehFoto(file) {
    return Boolean(file) && /^image\//.test(file.type || '')
      // HEIC do iPhone o canvas não abre. Sobe como está — o teto de 8 MB
      // segura, e a tela mostra pelo navegador de quem recebe.
      && !/heic|heif/i.test(file.type);
  }

  /**
   * Devolve { blob, tipo, bytes, w, h }. Para o que não é foto, devolve o
   * próprio arquivo sem tocar.
   */
  function comprimir(file, lado, qualidade) {
    lado = lado || LADO;
    qualidade = qualidade || QUALIDADE;

    return new Promise(function (resolve, reject) {
      if (!ehFoto(file)) {
        resolve({ blob: file, tipo: file.type, bytes: file.size, w: null, h: null });
        return;
      }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight;
        if (Math.max(w, h) > lado) {
          var s = lado / Math.max(w, h);
          w = Math.round(w * s); h = Math.round(h * s);
        }
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        c.toBlob(function (blob) {
          URL.revokeObjectURL(url);
          if (!blob) { reject(new Error('não consegui preparar a imagem')); return; }
          // Se a compressão ficou MAIOR que o original (acontece com foto
          // já pequena e muito comprimida), vale o original. Comprimir não
          // pode piorar.
          if (blob.size >= file.size) {
            resolve({ blob: file, tipo: file.type, bytes: file.size, w: w, h: h });
          } else {
            resolve({ blob: blob, tipo: 'image/jpeg', bytes: blob.size, w: w, h: h });
          }
        }, 'image/jpeg', qualidade);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        // Formato que o navegador não abre: sobe como está, em vez de
        // impedir o envio. O teto de 8 MB continua valendo.
        resolve({ blob: file, tipo: file.type, bytes: file.size, w: null, h: null });
      };
      img.src = url;
    });
  }

  raiz.CNR_COMPRIMIR = { comprimir: comprimir, ehFoto: ehFoto, LADO: LADO, QUALIDADE: QUALIDADE };
}(window));
