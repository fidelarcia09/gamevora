/* Goldi floating assistant. Isolated from the site's existing business logic. */
(function () {
  "use strict";
  if (document.getElementById("gg-goldi-root")) return;

  var inFrontend = /\/frontend\//i.test(window.location.pathname);
  var base = inFrontend ? "./" : "frontend/";
  var links = {
    games: base + "juegos.html",
    wallet: base + "wallet.html",
    orders: base + "pedidos.html",
    support: base + "soporte.html"
  };

  var style = document.createElement("link");
  style.rel = "stylesheet";
  style.href = base + "goldi-widget.css?v=20261023-1";
  document.head.appendChild(style);

  var root = document.createElement("div");
  root.id = "gg-goldi-root";
  root.innerHTML =
    '<button id="gg-goldi-launcher" type="button" aria-label="Abrir Goldi" aria-expanded="false" aria-controls="gg-goldi-panel" title="Abrir Goldi">' +
      '<span id="gg-goldi-avatar" aria-hidden="true">G</span>' +
    '</button>' +
    '<section id="gg-goldi-panel" aria-label="Asistente Goldi" hidden>' +
      '<header id="gg-goldi-header">' +
        '<div id="gg-goldi-heading"><span id="gg-goldi-mark" aria-hidden="true">G</span><div><h2 id="gg-goldi-title">Goldi</h2><span id="gg-goldi-subtitle">Asistente IA Disponible 24/7</span></div></div>' +
        '<button id="gg-goldi-close" type="button" aria-label="Cerrar Goldi">×</button>' +
      '</header>' +
      '<nav id="gg-goldi-shortcuts" aria-label="Accesos rápidos">' +
        '<button type="button" data-goldi-link="games">Juegos y precios</button>' +
        '<button type="button" data-goldi-link="wallet">Saldo GVR</button>' +
        '<button type="button" data-goldi-link="orders">Mis pedidos</button>' +
        '<button type="button" data-goldi-link="support">Soporte</button>' +
      '</nav>' +
      '<div id="gg-goldi-messages" role="log" aria-live="polite" aria-relevant="additions"></div>' +
      '<form id="gg-goldi-form">' +
        '<input id="gg-goldi-input" type="text" maxlength="500" autocomplete="off" placeholder="Escribe tu pregunta…" aria-label="Escribe tu pregunta" />' +
        '<button id="gg-goldi-send" type="submit" aria-label="Enviar mensaje">➤</button>' +
      '</form>' +
      '<div id="gg-goldi-disclaimer">Goldi ofrece orientación general; consulta tu cuenta para confirmar saldos y pedidos.</div>' +
    '</section>';
  document.body.appendChild(root);

  var launcher = root.querySelector("#gg-goldi-launcher");
  var panel = root.querySelector("#gg-goldi-panel");
  var close = root.querySelector("#gg-goldi-close");
  var messages = root.querySelector("#gg-goldi-messages");
  var input = root.querySelector("#gg-goldi-input");
  var form = root.querySelector("#gg-goldi-form");
  var welcomed = false;

  function addMessage(text, isUser, link) {
    var item = document.createElement("div");
    item.className = "gg-goldi-message" + (isUser ? " gg-user" : "");
    item.textContent = text;
    if (link) {
      item.appendChild(document.createTextNode(" "));
      var anchor = document.createElement("a");
      anchor.href = link.href;
      anchor.textContent = link.label;
      item.appendChild(anchor);
    }
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
  }

  function openPanel() {
    panel.hidden = false;
    launcher.setAttribute("aria-expanded", "true");
    if (!welcomed) {
      welcomed = true;
      var name = "";
      try {
        if (typeof supabaseClient !== "undefined" && supabaseClient && supabaseClient.auth) {
          supabaseClient.auth.getSession().then(function (result) {
            var user = result && result.data && result.data.session && result.data.session.user;
            var metadata = user && user.user_metadata;
            var displayName = metadata && (metadata.full_name || metadata.name || metadata.display_name);
            if (displayName) name = String(displayName).trim().split(/\s+/)[0];
            addMessage("¡Hola" + (name ? ", " + name : "") + "! Soy Goldi. ¿En qué puedo ayudarte?", false);
          }).catch(function () {
            addMessage("¡Hola! Soy Goldi. ¿En qué puedo ayudarte?", false);
          });
          return;
        }
      } catch (error) { /* The widget must work even if auth is unavailable. */ }
      addMessage("¡Hola! Soy Goldi. ¿En qué puedo ayudarte?", false);
    }
    window.setTimeout(function () { input.focus(); }, 40);
  }

  function closePanel() {
    panel.hidden = true;
    launcher.setAttribute("aria-expanded", "false");
    launcher.focus();
  }

  function navigate(key) {
    if (links[key]) window.location.href = links[key];
  }

  function answer(question) {
    var q = question.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (/\b(hola|buenas|hey|saludos)\b/.test(q)) {
      return { text: "¡Hola! Puedo orientarte sobre juegos, saldo GVR, pedidos y soporte. Usa los accesos rápidos o dime qué necesitas." };
    }
    if (/\b(precio|precios|diamantes|recarga|recargar|juegos|paquete|oferta|ofertas)\b/.test(q)) {
      return { text: "Puedes ver los juegos disponibles y sus precios actualizados directamente en el catálogo.", href: links.games, label: "Ver juegos y precios" };
    }
    if (/\b(saldo|gvr|wallet|billetera|recargar saldo)\b/.test(q)) {
      return { text: "En Wallet puedes consultar tu saldo GVR y las opciones disponibles para tu cuenta.", href: links.wallet, label: "Abrir Wallet" };
    }
    if (/\b(pedido|pedidos|orden|ordenes|ordenes|estado|envio|entrega|compr(e|é)|compra)\b/.test(q)) {
      return { text: "Abre Mis pedidos para consultar el historial y el estado de tus compras.", href: links.orders, label: "Ver mis pedidos" };
    }
    if (/\b(soporte|ayuda|problema|reclamo|ticket|contacto|error)\b/.test(q)) {
      return { text: "El equipo de soporte puede ayudarte desde la página de Soporte.", href: links.support, label: "Ir a Soporte" };
    }
    if (/\b(cuenta|perfil|iniciar sesion|login|registr(ar|o)|contraseña|contrasena)\b/.test(q)) {
      return { text: "Para opciones de cuenta, abre tu perfil. Si necesitas ayuda con el acceso, el equipo de soporte puede orientarte.", href: links.support, label: "Contactar soporte" };
    }
    return { text: "Puedo orientarte con juegos y precios, saldo GVR, pedidos o soporte. Prueba una de esas opciones o abre el acceso rápido correspondiente." };
  }

  var dragState = null;
  var dragged = false;
  launcher.addEventListener("pointerdown", function (event) {
    if (event.button !== undefined && event.button !== 0) return;
    var rect = root.getBoundingClientRect();
    dragState = { startX: event.clientX, startY: event.clientY, left: rect.left, top: rect.top, moved: false };
    dragged = false;
    if (launcher.setPointerCapture && event.pointerId !== undefined) {
      try { launcher.setPointerCapture(event.pointerId); } catch (error) {}
    }
  });
  launcher.addEventListener("pointermove", function (event) {
    if (!dragState) return;
    var dx = event.clientX - dragState.startX;
    var dy = event.clientY - dragState.startY;
    if (!dragState.moved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
    dragState.moved = true;
    dragged = true;
    var nextLeft = Math.max(4, Math.min(window.innerWidth - root.offsetWidth - 4, dragState.left + dx));
    var nextTop = Math.max(4, Math.min(window.innerHeight - root.offsetHeight - 4, dragState.top + dy));
    root.style.left = nextLeft + "px";
    root.style.right = "auto";
    root.style.top = nextTop + "px";
    root.style.bottom = "auto";
    try { localStorage.setItem("ggGoldiPosition", JSON.stringify({ left: nextLeft, top: nextTop })); } catch (error) {}
  });
  function finishDrag() { dragState = null; if (dragged) window.setTimeout(function () { dragged = false; }, 80); }
  launcher.addEventListener("pointerup", finishDrag);
  launcher.addEventListener("pointercancel", finishDrag);
  launcher.addEventListener("click", function (event) {
    if (dragged) { event.preventDefault(); event.stopPropagation(); dragged = false; return; }
    if (panel.hidden) openPanel();
    else closePanel();
  });
  try {
    var savedPosition = JSON.parse(localStorage.getItem("ggGoldiPosition") || "null");
    if (savedPosition && Number.isFinite(savedPosition.left) && Number.isFinite(savedPosition.top)) {
      root.style.left = Math.max(4, Math.min(window.innerWidth - 58, savedPosition.left)) + "px";
      root.style.right = "auto";
      root.style.top = Math.max(4, Math.min(window.innerHeight - 58, savedPosition.top)) + "px";
      root.style.bottom = "auto";
    }
  } catch (error) {}
  window.addEventListener("resize", function () {
    if (root.style.left && root.style.top) {
      root.style.left = Math.max(4, Math.min(window.innerWidth - root.offsetWidth - 4, parseFloat(root.style.left) || 4)) + "px";
      root.style.top = Math.max(4, Math.min(window.innerHeight - root.offsetHeight - 4, parseFloat(root.style.top) || 4)) + "px";
    }
  });
  close.addEventListener("click", closePanel);
  root.querySelectorAll("[data-goldi-link]").forEach(function (button) {
    button.addEventListener("click", function () { navigate(button.getAttribute("data-goldi-link")); });
  });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var question = input.value.trim();
    if (!question) return;
    addMessage(question, true);
    input.value = "";
    var result = answer(question);
    addMessage(result.text, false, result.href ? { href: result.href, label: result.label } : null);
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !panel.hidden) closePanel();
  });
})();