/* Gamers Gold Top-Up — tema global compartido */
(function () {
  "use strict";
  const KEY = "gamersGoldApariencia";
  const STYLE_ID = "gamers-gold-tema-global";
  const css = `
    html:has(body.tema-claro), html.tema-claro { color-scheme: light !important; }
    body.tema-claro {
      color-scheme: light !important;
      background: #f4f7fb !important;
      color: #172033 !important;
    }
    body.tema-claro :is(h1,h2,h3,h4,h5,h6,p,li,label,small,strong,summary,dt,dd,th,td,legend,figcaption) {
      color: #172033 !important;
    }
    body.tema-claro :is(header, main, footer, section, article, aside, nav, .contenedor, .container, .contenido, .contenido-principal, .panel, .card, .tarjeta, .caja, .modal-content, .modal-body, .contenido-acordeon, details, .acordeon, .producto, .producto-card, .game-card, .juego-card, .pedido-card, .wallet-card, .formulario, form) {
      background-color: #ffffff !important;
      color: #172033 !important;
      border-color: #dbe3ed !important;
    }
    body.tema-claro :is(input,select,textarea) {
      background-color: #ffffff !important;
      color: #172033 !important;
      border-color: #cbd5e1 !important;
    }
    body.tema-claro :is(a,.volver,.link,.enlace) { color: #0876d1 !important; }
    body.tema-claro :is(button,.btn, input[type="button"], input[type="submit"]) {
      border-color: #cbd5e1;
    }
    body.tema-claro :is(.rayo,.cian,.texto-cian,.precio, .precio-gvr, .precio-valor, .icono-opcion, .icono-flecha, .icono-seccion) {
      color: #087cff !important;
      text-shadow: none !important;
    }
    body.tema-claro :is(.texto-secundario,.subtitulo,.descripcion,.texto-ayuda,.muted,.dato-titulo) {
      color: #617086 !important;
    }
    body.tema-claro :is(.barra-navegacion,.nav-inferior,.bottom-nav,.navegacion-inferior) {
      background: #ffffff !important;
      border-color: #dbe3ed !important;
    }
  `;
  function ensureStyle() {
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = css;
      (document.head || document.documentElement).appendChild(style);
    }
  }
  function apply(theme) {
    const light = theme === "claro";
    ensureStyle();
    document.body.classList.toggle("tema-claro", light);
    document.documentElement.classList.toggle("tema-claro", light);
    document.documentElement.style.colorScheme = light ? "light" : "dark";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", light ? "#f4f7fb" : "#050b18");
  }
  function read() {
    try { return localStorage.getItem(KEY) === "claro" ? "claro" : "oscuro"; }
    catch (_) { return "oscuro"; }
  }
  function save(theme) {
    try { localStorage.setItem(KEY, theme); } catch (_) {}
    apply(theme);
  }
  function init() {
    apply(read());
    document.addEventListener("click", function (event) {
      const button = event.target.closest("#temaOscuro, #temaClaro");
      if (!button) return;
      save(button.id === "temaClaro" ? "claro" : "oscuro");
    });
    window.addEventListener("storage", function (event) {
      if (event.key === KEY) apply(event.newValue === "claro" ? "claro" : "oscuro");
    });
    window.addEventListener("pageshow", function () { apply(read()); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();