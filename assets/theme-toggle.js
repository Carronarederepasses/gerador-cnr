// Tema segue automaticamente a preferência do sistema via tokens.css (@media prefers-color-scheme).
// Funções mantidas como no-op para compatibilidade com páginas que ainda as referenciam.
(function () {
  // Remove qualquer override manual salvo anteriormente
  try { localStorage.removeItem('cnr_theme'); } catch (e) {}
  document.documentElement.removeAttribute('data-theme');

  window.cnrToggleTheme = function () {};
  window.cnrThemeIcon   = function () { return ''; };
})();
