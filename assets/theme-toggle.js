// Carro na Rede Repasses — toggle claro/escuro compartilhado (Fase 3 do plano UX/UI)
// Aplica o tema salvo ANTES do primeiro paint (evita flash de tema errado),
// e expõe window.cnrToggleTheme() pro botão de cada página chamar.
(function () {
  var KEY = 'cnr_theme'; // 'dark' | 'light' | ausente = segue o sistema

  function aplicar(tema) {
    if (tema === 'dark' || tema === 'light') {
      document.documentElement.setAttribute('data-theme', tema);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  var salvo = null;
  try { salvo = localStorage.getItem(KEY); } catch (e) {}
  aplicar(salvo);

  window.cnrToggleTheme = function () {
    var atualEscuro = matchMedia('(prefers-color-scheme: dark)').matches;
    var atual = salvo || (atualEscuro ? 'dark' : 'light');
    var novo = atual === 'dark' ? 'light' : 'dark';
    salvo = novo;
    try { localStorage.setItem(KEY, novo); } catch (e) {}
    aplicar(novo);
    var btn = document.getElementById('cnr-theme-btn');
    if (btn) btn.textContent = novo === 'dark' ? '☀️' : '🌙';
  };

  window.cnrThemeIcon = function () {
    var atualEscuro = matchMedia('(prefers-color-scheme: dark)').matches;
    var atual = salvo || (atualEscuro ? 'dark' : 'light');
    return atual === 'dark' ? '☀️' : '🌙';
  };
})();
