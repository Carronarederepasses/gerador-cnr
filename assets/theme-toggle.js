// TEMA ÚNICO, fundo preto. Não há alternador e o app NÃO segue o sistema —
// decisão do Yuri em 03/set, e `tokens.css` não tem `prefers-color-scheme`.
//
// (Este cabeçalho dizia o contrário até 11/set: "segue automaticamente a
// preferência do sistema". Era verdade antes de 03/set e ficou para trás.
// Comentário desatualizado é pior que comentário nenhum — descreve um sistema
// que não existe mais e manda o próximo procurar no lugar errado.)
//
// O arquivo continua existindo por duas razões, ambas pequenas:
//  1. apaga `data-theme` e `cnr_theme` que tenham sobrado de antes;
//  2. expõe `cnrToggleTheme`/`cnrThemeIcon` como no-op, para telas antigas
//     que ainda os chamem não quebrarem.
// O congelamento de transição abaixo virou defensivo: sem troca de tema, não
// há o que congelar. Fica porque é barato e porque documenta o defeito.
(function () {
  // Remove qualquer override manual salvo anteriormente
  try { localStorage.removeItem('cnr_theme'); } catch (e) {}
  document.documentElement.removeAttribute('data-theme');

  window.cnrToggleTheme = function () {};
  window.cnrThemeIcon   = function () { return ''; };

  // ── Congela as transições enquanto o tema troca ──────────────────
  //
  // Uma propriedade que tem `transition` E recebe valor de variável de tema
  // FICA PRESA no valor antigo quando a variável muda. Medido isolado neste
  // app em 03/set/2026, com três elementos lado a lado:
  //
  //   background-color: var(--white)                        → acompanhou
  //   background-color: var(--white); transition: … .2s     → travou
  //   background-color: var(--text)                         → acompanhou
  //
  // Na prática: o botão "+ Nova negociação" ficava preto sobre preto ao
  // sistema virar para o escuro. Antes da paleta preto e branco isso passava
  // batido, porque os dois temas eram cremes parecidos e a diferença era sutil.
  //
  // Isso importa porque o app segue o sistema: o Windows troca sozinho no fim
  // do dia, com o Gerador aberto. Ninguém recarrega a página para descobrir.
  //
  // Desligar as transições durante a troca resolve para a página inteira, de
  // uma vez, em vez de caçar cada regra — e as transições de hover, que são o
  // motivo de elas existirem, continuam funcionando normalmente.
  var mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
  if (!mq) return;

  function congelarTransicoes() {
    var st = document.createElement('style');
    st.setAttribute('data-cnr', 'troca-de-tema');
    st.textContent = '*,*::before,*::after{transition:none!important}';
    (document.head || document.documentElement).appendChild(st);
    // Dois quadros: o primeiro aplica a regra, o segundo garante que o
    // navegador já repintou com as cores novas antes de devolver as transições.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { st.remove(); });
    });
  }

  if (mq.addEventListener)   mq.addEventListener('change', congelarTransicoes);
  else if (mq.addListener)   mq.addListener(congelarTransicoes); // Safari antigo
})();
