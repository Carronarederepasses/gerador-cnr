// ─────────────────────────────────────────────────────────────────
// Anexos — o caminho do arquivo até o Supabase, num lugar só (18/set)
//
// Nasceu quando o comprovante de sinal precisou existir na NEGOCIAÇÃO além da
// venda. A alternativa era copiar o upload de `vendas.html` para
// `negociacoes.html` — e cópia é como os dois montadores de anúncio
// divergiram até a AVALIAÇÃO sumir do WhatsApp, sem ninguém notar.
//
// Aqui mora só o que é REDE: preparar, subir, confirmar, abrir, remover.
// Toast, alerta e recarregar a lista continuam em cada tela, porque cada uma
// mostra progresso do seu jeito (card na venda, modal na negociação).
//
// `dono` diz de quem é o arquivo — e é SEMPRE um destes dois formatos:
//   { vendaId: '<uuid>' }      ou      { negociacaoId: '<uuid>' }
// O servidor traduz para a tabela. A tela nunca escolhe nome de tabela.
//
// A chave de acesso não aparece aqui: `assets/auth.js` envolve o fetch.
// ─────────────────────────────────────────────────────────────────
(function (raiz) {
  'use strict';

  const JSON_H = { 'Content-Type': 'application/json' };

  async function erroDe(r, padrao) {
    try { return (await r.json()).error || padrao; } catch { return padrao; }
  }

  // Três passos, e a ordem importa: o arquivo sobe DIRETO para o storage
  // (a Vercel tem limite de corpo e cortaria foto grande de celular), e só
  // depois de subido é registrado. Registrar antes deixaria um anexo
  // apontando para arquivo que não existe.
  async function enviar(dono, tipo, arquivo) {
    const mimeType = arquivo.type || 'application/octet-stream';
    const base = { ...dono, tipo, mimeType, nome: arquivo.name };

    const prep = await fetch('/api/vendas?anexo=1&action=prepare-upload', {
      method: 'POST', headers: JSON_H, body: JSON.stringify(base),
    });
    if (!prep.ok) throw new Error(await erroDe(prep, 'erro ao preparar o envio'));
    const { path, uploadUrl } = await prep.json();

    const up = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': mimeType }, body: arquivo });
    if (!up.ok) throw new Error('falha ao subir o arquivo para o armazenamento');

    const conf = await fetch('/api/vendas?anexo=1&action=confirm-upload', {
      method: 'POST', headers: JSON_H, body: JSON.stringify({ ...base, path }),
    });
    if (!conf.ok) throw new Error(await erroDe(conf, 'erro ao registrar o arquivo'));
    return (await conf.json()).anexos || [];
  }

  // Link temporário (1 h). O bucket é privado: não existe link permanente.
  async function abrir(path) {
    const r = await fetch('/api/vendas?anexo=1&path=' + encodeURIComponent(path), { headers: JSON_H });
    if (!r.ok) throw new Error(await erroDe(r, 'erro ao abrir'));
    const { url } = await r.json();
    window.open(url, '_blank');
  }

  async function remover(dono, path) {
    const r = await fetch('/api/vendas?anexo=1', {
      method: 'DELETE', headers: JSON_H, body: JSON.stringify({ ...dono, path }),
    });
    if (!r.ok) throw new Error(await erroDe(r, 'erro ao remover'));
    return (await r.json()).anexos || [];
  }

  // "aparelho não liberado" pede outra resposta que um erro comum: não é
  // tentar de novo, é abrir /entrar.html uma vez.
  const semChave = (err) => /acesso negado|não liberado|nao liberado/i.test((err && err.message) || '');

  raiz.cnrAnexo = { enviar, abrir, remover, semChave };
})(window);
