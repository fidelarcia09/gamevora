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
  style.href = base + "goldi-widget.css?v=20261023-3";
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
    var q = question.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[¿?¡!.,;:()[\]{}]/g, " ").replace(/\s+/g, " ").trim();
    var gamePages = [
      { terms: /\b(free fire|freefire|ff|diamantes de free fire)\b/, name: "Free Fire", href: base + "freefire.html" },
      { terms: /\b(mobile legends|mobilelegends|mlbb)\b/, name: "Mobile Legends", href: base + "mobilelegends.html" },
      { terms: /\b(pubg|pubg mobile|pubgmobile|uc de pubg)\b/, name: "PUBG Mobile", href: base + "pubgmobile.html" },
      { terms: /\b(arena breakout|arenabreakout)\b/, name: "Arena Breakout", href: base + "arenabreakout.html" },
      { terms: /\b(blood strike|bloodstrike)\b/, name: "Blood Strike", href: base + "bloodstrike.html" },
      { terms: /\b(genshin|genshin impact)\b/, name: "Genshin Impact", href: base + "genshinimpact.html" },
      { terms: /\b(honor of kings|honorofkings|hok)\b/, name: "Honor of Kings", href: base + "honorofkings.html" },
      { terms: /\b(call of duty|cod mobile|codmobile)\b/, name: "Call of Duty: Mobile", href: base + "codmobile.html" }
    ];
    var game = gamePages.find(function (item) { return item.terms.test(q); });

    if (/\b(next level|proveedor|proveedores|api interna|integracion interna|referencia interna|id del proveedor)\b/.test(q)) {
      return { text: "Puedo explicarte cómo funciona Gamers Gold Top-Up para los clientes, pero no comparto referencias ni detalles de proveedores o integraciones internas. ¿Quieres ayuda con una recarga, tu saldo o un pedido?", href: links.games, label: "Ver juegos y precios" };
    }
    if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|saludos|que tal)$/.test(q)) {
      return { text: "¡Hola! Soy Goldi. Te ayudo con las funciones visibles de la página: juegos, precios, compras, saldo GVR, cuenta y pedidos. ¿Qué necesitas?" };
    }
    if (/\b(quien eres|que eres|que puedes hacer|para que sirves|como me ayudas)\b/.test(q)) {
      return { text: "Soy Goldi, el asistente de orientación de Gamers Gold Top-Up. Puedo indicarte dónde ver precios, cómo empezar una compra, dónde consultar el saldo y pedidos, y cómo contactar soporte. No puedo ver ni modificar tu cuenta por ti." };
    }
    if (/\b(precio|precios|cuanto cuesta|cuanto valen|catalogo|catalogo de juegos|que juegos|juegos disponibles|diamantes|paquete|paquetes|oferta|ofertas|recarga de juego|recargas de juegos)\b/.test(q) && !/\b(gvr|saldo|billetera)\b/.test(q)) {
      if (game) return { text: "Para " + game.name + ", abre su página para consultar los paquetes disponibles y el precio que muestra actualmente la web. Selecciona el paquete allí; no quiero darte un precio desactualizado.", href: game.href, label: "Abrir " + game.name };
      return { text: "Los juegos disponibles y sus precios se consultan en el catálogo. Los importes pueden cambiar, así que confirma siempre el precio que aparece en la página del juego antes de confirmar.", href: links.games, label: "Ver juegos y precios" };
    }
    if (game && /\b(comprar|recargar|como hago|como compro|id|identificador|jugador|nickname|nick|zona|servidor|servidor|paquete|diamantes|uc|credito)\b/.test(q)) {
      return { text: "Entra en la página de " + game.name + ", escribe los datos del jugador que solicite el formulario, revisa los paquetes y selecciona el que quieras. Antes de confirmar, comprueba el juego, los datos del jugador y el total mostrado. Después revisa el estado en Mis pedidos.", href: game.href, label: "Ir a " + game.name };
    }
    if (/\b(como comprar|como funciona una compra|como hago una compra|pasos para comprar|hacer una recarga|comprar diamantes|comprar uc|quiero comprar|quiero recargar)\b/.test(q)) {
      return { text: "Para hacer una recarga: 1) abre el catálogo; 2) elige el juego; 3) introduce el ID y la zona si esa página los solicita; 4) elige un paquete; 5) revisa los datos y el total antes de confirmar. Luego consulta el estado en Mis pedidos. No repitas la compra si ya tienes una pendiente; comprueba primero su estado.", href: links.games, label: "Elegir un juego" };
    }
    if (/\b(validar id|verificar id|id incorrecto|nickname|nombre del jugador|no reconoce mi id|id no valido|id no válido|zona id)\b/.test(q)) {
      return { text: "Escribe el identificador exactamente como aparece en el juego y añade la zona o servidor si el formulario lo pide. Si la página no puede verificarlo o muestra un error, no confirmes con datos dudosos: revisa el ID y, si persiste, contacta soporte.", href: links.games, label: "Elegir el juego" };
    }
    if (/\b(saldo|gvr|wallet|billetera|cuanto dinero tengo|mi dinero|mis creditos|mis créditos)\b/.test(q)) {
      return { text: "Wallet es donde puedes consultar el saldo GVR que aparece asociado a tu cuenta y las opciones disponibles para gestionarlo. Para confirmar tu saldo real, inicia sesión y revisa esa página.", href: links.wallet, label: "Abrir Wallet" };
    }
    if (/\b(comprar gvr|recargar gvr|como conseguir gvr|como obtengo gvr|añadir saldo|agregar saldo|depositar|meter saldo|comprar saldo)\b/.test(q)) {
      return { text: "Para ver las opciones disponibles para añadir saldo GVR, abre Comprar GVR. Revisa allí las instrucciones y confirma los datos que muestre la página antes de realizar cualquier pago.", href: base + "recargar-gvr.html", label: "Ver opciones de GVR" };
    }
    if (/\b(movimientos|historial de saldo|transacciones|historial wallet)\b/.test(q)) {
      return { text: "Puedes consultar los movimientos de tu cuenta desde la sección de Movimientos. Es posible que necesites iniciar sesión.", href: base + "movimientos.html", label: "Ver movimientos" };
    }
    if (/\b(pedido|pedidos|orden|ordenes|ordenes|estado|seguimiento|entrega|no llega|no me llega|demora|pendiente|completado|fallido|reembolso|devolucion|devolución)\b/.test(q)) {
      return { text: "En Mis pedidos puedes revisar tus compras y el estado que registra la web. Si un pedido sigue pendiente, comprueba su estado antes de volver a comprar. Si ves un error, una entrega que no llega o necesitas revisar un reembolso, contacta soporte con los datos del pedido; no compartas tu contraseña.", href: links.orders, label: "Consultar mis pedidos" };
    }
    if (/\b(soporte|ayuda|problema|reclamo|ticket|contacto|error|hablar con alguien|atencion al cliente|atención al cliente)\b/.test(q)) {
      return { text: "Desde Soporte puedes buscar ayuda con un problema o gestionar la comunicación con el equipo. Explica qué ocurrió e incluye el juego y los datos del pedido que sean necesarios, pero nunca envíes tu contraseña.", href: links.support, label: "Ir a Soporte" };
    }
    if (/\b(cuenta|perfil|mi perfil|iniciar sesion|iniciar sesión|login|registrar|registro|crear cuenta|contraseña|contrasena|olvide mi clave|olvidé mi clave|recuperar cuenta)\b/.test(q)) {
      if (/\b(registrar|registro|crear cuenta)\b/.test(q)) return { text: "Puedes crear una cuenta desde Registro. Usa un correo al que tengas acceso y sigue las indicaciones que aparezcan en la página.", href: base + "registro.html", label: "Crear cuenta" };
      if (/\b(contraseña|contrasena|olvide|olvidé|recuperar)\b/.test(q)) return { text: "Si no recuerdas tu contraseña, abre Recuperar contraseña y sigue las instrucciones. No compartas tu contraseña ni códigos de acceso con nadie.", href: base + "recuperar-contrasena.html", label: "Recuperar contraseña" };
      return { text: "Para entrar en tu cuenta, inicia sesión. Si todavía no tienes una, puedes registrarte. Algunas funciones personales requieren que hayas iniciado sesión.", href: base + "login.html", label: "Iniciar sesión" };
    }
    if (/\b(pago|pagos|pagar|metodo de pago|metodos de pago|transferencia|confirmar pago|pago rechazado)\b/.test(q)) {
      return { text: "Consulta las instrucciones de pago que aparecen en el flujo de compra o en la página correspondiente. Los métodos disponibles pueden depender de las opciones que la web muestre en ese momento. Si ya pagaste y no se refleja, conserva el comprobante y contacta soporte.", href: links.support, label: "Contactar soporte" };
    }
    if (/\b(resena|reseña|resenas|reseñas|opinion|opiniones|experiencia)\b/.test(q)) {
      return { text: "Puedes consultar la sección de reseñas para conocer las opiniones publicadas en la web.", href: base + "reseñas.html", label: "Ver reseñas" };
    }
    if (/\b(privacidad|datos personales|seguridad|es seguro|estafa|fraude|confiable)\b/.test(q)) {
      return { text: "Protege tu cuenta: no compartas contraseñas ni códigos de acceso, verifica el juego y el ID antes de confirmar y conserva los comprobantes de pago. Si detectas algo extraño, comunícalo a soporte. Para detalles concretos sobre una operación, revisa la información que muestra la propia página.", href: links.support, label: "Ir a Soporte" };
    }
    if (/\b(cuba|cubano|desde cuba|internacional|pais|país|moneda|usd|dolar|dólar)\b/.test(q)) {
      return { text: "La disponibilidad puede depender de las opciones que muestre la web para tu cuenta y ubicación. Revisa las instrucciones visibles antes de pagar; si no aparece una opción válida para ti, consulta soporte.", href: links.support, label: "Consultar soporte" };
    }
    if (game) {
      return { text: "Puedo orientarte sobre " + game.name + ". Entra a su página para ver los paquetes y las indicaciones específicas que estén disponibles.", href: game.href, label: "Abrir " + game.name };
    }
    return { text: "No quiero inventarte una respuesta. Puedo ayudarte con cómo comprar una recarga, juegos y precios, saldo GVR, movimientos, pedidos, cuenta, pagos o soporte. Prueba preguntarme por uno de esos temas y te paso el enlace directo.", href: links.games, label: "Ver juegos y precios" };
  }

  var dragState = null;
  var dragged = false;
  launcher.addEventListener("pointerdown", function (event) {
    if (event.button !== undefined && event.button !== 0) return;
    var rect = root.getBoundingClientRect();
    dragState = { startX: event.clientX, left: rect.left, moved: false };
    dragged = false;
    if (launcher.setPointerCapture && event.pointerId !== undefined) {
      try { launcher.setPointerCapture(event.pointerId); } catch (error) {}
    }
  });
  launcher.addEventListener("pointermove", function (event) {
    if (!dragState) return;
    var dx = event.clientX - dragState.startX;
    if (!dragState.moved && Math.abs(dx) < 5) return;
    dragState.moved = true;
    dragged = true;
    var nextLeft = Math.max(4, Math.min(window.innerWidth - root.offsetWidth - 4, dragState.left + dx));
    root.style.left = nextLeft + "px";
    root.style.right = "auto";
    root.classList.toggle("gg-goldi-left", nextLeft < window.innerWidth / 2);
    try { localStorage.setItem("ggGoldiPosition", JSON.stringify({ left: nextLeft })); } catch (error) {}
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
    if (savedPosition && Number.isFinite(savedPosition.left)) {
      var restoredLeft = Math.max(4, Math.min(window.innerWidth - 58, savedPosition.left));
      root.style.left = restoredLeft + "px";
      root.style.right = "auto";
      root.classList.toggle("gg-goldi-left", restoredLeft < window.innerWidth / 2);
    }
  } catch (error) {}
  window.addEventListener("resize", function () {
    if (root.style.left) {
      var resizedLeft = Math.max(4, Math.min(window.innerWidth - root.offsetWidth - 4, parseFloat(root.style.left) || 4));
      root.style.left = resizedLeft + "px";
      root.classList.toggle("gg-goldi-left", resizedLeft < window.innerWidth / 2);
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