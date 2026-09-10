// ─────────────────────────────────────────────────────────────────
// CNR — Story do carro (1080×1920)
//
// Desenha a arte de story a partir do registro do veículo. Pedido do Yuri em
// 10/set: "todos os carros captados virarem posts de stories", com legenda
// padronizada e diferente da do WhatsApp.
//
// DECISÕES QUE VALEM LEMBRAR
//
// • O preço é `veiculo.valor` — o REPASSE. Nunca `valor_compra`, que é o que
//   ele pagou. Um story é público; trocar os dois entregaria a margem dele.
//   Por isso esta função só recebe o que vai aparecer, e `valor_compra` não
//   entra no objeto.
//
// • A foto padrão é a de índice 1 (a SEGUNDA). Não é chute: em 10/set olhei
//   os cinco carros disponíveis do catálogo — Corolla, Polo, March, Aircross
//   e Voyage — e nos cinco a foto 1 é frontal reta e a foto 2 é a de 45° com
//   a frente para a esquerda, com tampa-placa, em retrato. É o padrão que ele
//   mesmo segue ao fotografar. Continua sendo trocável, para quando fugir.
//
// • Câmbio é opcional e desligado por padrão. Ele levantou o motivo: em muito
//   carro é tácito, e há modelo com as duas opções. Quem decide é ele, na hora.
// ─────────────────────────────────────────────────────────────────

(function (raiz) {
  'use strict';

  const W = 1080, H = 1920;
  const AF = 1240;              // altura da área da foto
  const FUNDO = '#0a0a0a';

  // A marca vem da FIPE em caixa inconsistente: "VW - VolksWagen" ao lado de
  // "Audi", "ASTON MARTIN" ao lado de "Corolla".
  const MARCAS = {
    'vw - volkswagen': 'Volkswagen',
    'gm - chevrolet':  'Chevrolet',
    'fiat':            'Fiat',
  };
  function limparMarca(m) {
    const k = String(m || '').toLowerCase().trim();
    if (MARCAS[k]) return MARCAS[k];
    return String(m || '').replace(/\s+/g, ' ').trim();
  }

  // "Corolla XEi 2.0 Flex 16V Aut." não cabe nem se lê num story. Fica o
  // essencial; combustível, válvulas, portas e câmbio saem do nome.
  function limparVersao(v) {
    return String(v || '')
      .replace(/\b(\d+\s*V|Mec\.?|Aut\.?|Autom[aá]tico|CVT|Flex|Gasolina|[452]p|T\.\s*Flex|Fuel)\b/gi, ' ')
      .replace(/\s{2,}/g, ' ')
      .replace(/[\s.\-\/]+$/, '')    // sobra do "Aut." removido
      .trim();
  }

  function cambioDe(v) {
    const s = String(v || '');
    if (/\bCVT\b/i.test(s))                 return 'CVT';
    if (/\bAut\.?\b|autom[aá]tic/i.test(s)) return 'Automático';
    if (/\bMec\.?\b|manual/i.test(s))       return 'Manual';
    return '';
  }

  const fmtKm = (n) => Number(n).toLocaleString('pt-BR') + 'km';
  const fmtR  = (n) => 'R$ ' + Number(n).toLocaleString('pt-BR');

  // Canvas não tem letter-spacing em todo navegador — desenha letra a letra.
  function texto(cx, txt, x, y, o) {
    cx.font = o.font;
    cx.fillStyle = o.cor;
    const esp = o.esp || 0;
    if (!esp) { cx.textAlign = o.alinha || 'left'; cx.fillText(txt, x, y); return; }
    cx.textAlign = 'left';
    const larg = [...txt].reduce((s, ch) => s + cx.measureText(ch).width + esp, 0) - esp;
    let cur = o.alinha === 'center' ? x - larg / 2 : o.alinha === 'right' ? x - larg : x;
    for (const ch of txt) { cx.fillText(ch, cur, y); cur += cx.measureText(ch).width + esp; }
  }

  // ── Nome do carro: letras em Playfair, números em DM Sans ───────
  //
  // A Playfair desenha algarismos no estilo antigo — o 1 e o 2 na altura da
  // minúscula, o 4 e o 8 descendo. Em "Polo Highline 200 TSI" o "200" fica
  // parecendo "zoo". O Yuri reportou isso em 10/set nas telas, onde resolvi
  // com uma linha de CSS (`lining-nums`, em assets/tokens.css).
  //
  // Aqui não dá: **canvas 2D não tem font-variant-numeric**. Conferido — só
  // existe `fontVariantCaps`, que é outra coisa, e passar "lining-nums" na
  // string da fonte é ignorado.
  //
  // Então os trechos numéricos saem em DM Sans, que já tem algarismos
  // alinhados. A 0,86 do corpo eles casam com a altura das maiúsculas da
  // serifada; comparado lado a lado antes de escolher o número.
  const ESCALA_NUM = 0.86;
  const PARTES = (txt) => String(txt).split(/(\d[\d.,]*)/).filter(Boolean);
  const fontePara = (parte, px) => /^\d/.test(parte)
    ? `700 ${Math.round(px * ESCALA_NUM)}px "DM Sans"`
    : `700 ${px}px "Playfair Display"`;

  function medirMisto(cx, txt, px) {
    return PARTES(txt).reduce((s, p) => { cx.font = fontePara(p, px); return s + cx.measureText(p).width; }, 0);
  }

  function desenharMisto(cx, txt, xCentro, y, px) {
    cx.textAlign = 'left';
    let cur = xCentro - medirMisto(cx, txt, px) / 2;
    for (const p of PARTES(txt)) {
      cx.font = fontePara(p, px);
      cx.fillText(p, cur, y);
      cur += cx.measureText(p).width;
    }
  }

  // Encolhe até caber — nome de carro varia muito ("March S" contra
  // "ALTIS/A.Premiu. 2.0"), e cortar com "..." num story fica pior.
  function pxQueCabe(cx, txt, base, maxLarg) {
    let px = base;
    while (px > 40 && medirMisto(cx, txt, px) > maxLarg) px -= 4;
    return px;
  }

  async function carregarFontes() {
    if (!document.fonts) return;
    // Sem isto o canvas desenha antes de a fonte chegar e cai na serifada
    // padrão do navegador — aconteceu no primeiro rascunho, o preço saiu em
    // Playfair sem ninguém ter pedido.
    await Promise.all([
      document.fonts.load('900 112px "DM Sans"'),
      document.fonts.load('500 40px "DM Sans"'),
      document.fonts.load('700 34px "DM Sans"'),
      document.fonts.load('700 92px "Playfair Display"'),
    ]).catch(() => {});
    await document.fonts.ready;
  }

  function carregarImagem(url) {
    return new Promise((ok, err) => {
      const img = new Image();
      // O bucket do Supabase devolve `access-control-allow-origin: *`
      // (conferido em 10/set). Sem isto o canvas fica "contaminado" e o
      // download falha na hora de exportar.
      img.crossOrigin = 'anonymous';
      img.onload  = () => ok(img);
      img.onerror = () => err(new Error('não consegui carregar a foto'));
      img.src = url;
    });
  }

  /**
   * Desenha o story. Devolve o que foi usado, para a tela poder mostrar.
   * @param {HTMLCanvasElement} canvas
   * @param {{marca,versao,modelo,ano,km,valor,fotos}} v  registro do veículo
   * @param {{fotoIndex,mostrarAno,mostrarCambio}} [op]
   */
  async function desenhar(canvas, v, op) {
    op = op || {};
    const fotos = Array.isArray(v.fotos) ? v.fotos : [];
    if (!fotos.length) throw new Error('este carro não tem foto no catálogo');
    if (!v.valor)      throw new Error('falta o valor de repasse');

    const idx = Math.min(Math.max(op.fotoIndex != null ? op.fotoIndex : 1, 0), fotos.length - 1);

    canvas.width = W; canvas.height = H;
    const cx = canvas.getContext('2d');

    await carregarFontes();
    const img = await carregarImagem(fotos[idx]);

    cx.fillStyle = FUNDO; cx.fillRect(0, 0, W, H);

    // Foto: preenche a área e é CORTADA nela. Sem o clip ela vaza por cima do
    // texto e o degradê fica embaixo dela, sem efeito nenhum.
    cx.save();
    cx.beginPath(); cx.rect(0, 0, W, AF); cx.clip();
    const escala = Math.max(W / img.width, AF / img.height);
    const lw = img.width * escala, lh = img.height * escala;
    cx.drawImage(img, (W - lw) / 2, (AF - lh) / 2, lw, lh);
    const g = cx.createLinearGradient(0, AF - 360, 0, AF);
    g.addColorStop(0, 'rgba(10,10,10,0)');
    g.addColorStop(1, FUNDO);
    cx.fillStyle = g; cx.fillRect(0, AF - 360, W, 360);
    cx.restore();

    const meio = W / 2;
    let y = AF - 30;

    texto(cx, limparMarca(v.marca).toUpperCase(), meio, y,
      { font: '700 34px "DM Sans"', cor: '#9a9a9a', esp: 9, alinha: 'center' });

    const nome = limparVersao(v.versao || v.modelo);
    y += 104;
    cx.fillStyle = '#f5f5f5';
    desenharMisto(cx, nome, meio, y, pxQueCabe(cx, nome, 92, W - 120));

    const cambio = op.mostrarCambio ? cambioDe(v.versao || v.modelo) : '';
    const partes = [op.mostrarAno === false ? '' : v.ano, v.km ? fmtKm(v.km) : '', cambio].filter(Boolean);
    if (partes.length) {
      y += 66;
      texto(cx, partes.join('   ·   '), meio, y,
        { font: '500 40px "DM Sans"', cor: '#a8a8a8', esp: 2, alinha: 'center' });
    }

    y += 92;
    cx.strokeStyle = '#2a2a2a'; cx.lineWidth = 2;
    cx.beginPath(); cx.moveTo(meio - 150, y); cx.lineTo(meio + 150, y); cx.stroke();

    y += 118;
    texto(cx, fmtR(v.valor), meio, y,
      { font: '900 112px "DM Sans"', cor: '#f5f5f5', alinha: 'center' });

    // Embaixo fica vazio de propósito: é onde o Instagram põe a barra de
    // responder, e texto ali some atrás dela.
    texto(cx, '@carronarederepasses', meio, H - 96,
      { font: '500 32px "DM Sans"', cor: '#6f6f6f', esp: 5, alinha: 'center' });

    return { fotoIndex: idx, nome, cambio: cambioDe(v.versao || v.modelo), totalFotos: fotos.length };
  }

  // Nome do arquivo — ele vai ver isto na pasta de downloads do celular.
  function nomeArquivo(v) {
    const base = [limparMarca(v.marca), limparVersao(v.versao || v.modelo), v.ano]
      .filter(Boolean).join('-')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
    return 'story-' + (base || 'carro') + '.png';
  }

  raiz.CNR_STORY = { desenhar, nomeArquivo, cambioDe, limparMarca, limparVersao, W, H };
})(window);
