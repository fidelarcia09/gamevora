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
  style.href = base + "goldi-widget.css?v=20261023-4";
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
    if (!isUser) text = text.replace(/ (\d+)\) /g, function (_, n) { return "\nPaso " + n + ": "; }).replace(/^(\d+)\) /, function (_, n) { return "Paso " + n + ": "; });
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
    var direct = function (text, href, label) { return { text: text, href: href, label: label }; };
    var moneyLink = base + "recargar-gvr.html";
    var proofLink = base + "confirmar-gvr.html";
    var accountLink = base + "login.html";

    if (/\b(next level|proveedor|proveedores|api interna|integracion interna|referencia interna|id del proveedor|costo del proveedor)\b/.test(q)) {
      return direct("Puedo explicarte cómo funciona Gamers Gold Top-Up para los clientes, pero no comparto nombres, referencias ni detalles de proveedores o integraciones internas. Sí puedo ayudarte con las recargas, GVR, pedidos o soporte.", links.games, "Ver juegos y precios");
    }
    if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|saludos|que tal)$/.test(q)) {
      return { text: "¡Hola! Soy Goldi. Dime exactamente qué quieres hacer y te doy los pasos que conozco y el enlace directo." };
    }
    if (/\b(quien eres|que eres|que puedes hacer|para que sirves|como me ayudas)\b/.test(q)) {
      return { text: "Soy Goldi, el asistente de orientación de Gamers Gold Top-Up. Puedo guiarte paso a paso para comprar GVR, enviar un comprobante, hacer una recarga de juego, revisar pedidos, gestionar tu cuenta o contactar soporte. No puedo ver ni cambiar tu cuenta por ti." };
    }

    if (/\b(comprobante|captura del pago|captura de pago|enviar prueba|subir prueba|subir imagen|enviar recibo|recibo de pago)\b/.test(q) && /\b(gvr|saldo|wallet|dinero|pago|transferencia|usdt|movil|móvil|cup|recarga|pedido|compra)?\b/.test(q)) {
      return direct("Para enviar el comprobante de una compra de GVR: 1) inicia sesión; 2) entra en Comprar GVR y elige la cantidad; 3) selecciona el método de pago; 4) revisa el importe y pulsa Continuar en los pasos siguientes; 5) en la página de confirmación realiza el pago siguiendo las instrucciones que estén habilitadas; 6) selecciona la captura del pago en JPG, PNG o WEBP (máximo 5 MB); 7) pulsa Enviar comprobante y espera la confirmación con el identificador de solicitud. Guarda ese identificador. La solicitud queda pendiente de revisión: subir una imagen no acredita automáticamente los GVR. No envíes otra solicitud ni pagues otra vez si ya aparece una solicitud registrada.", proofLink, "Abrir confirmación de GVR");
    }
    if (/\b(como añadir gvr|como anadir gvr|añadir gvr|anadir gvr|comprar gvr|recargar gvr|comprar saldo|añadir saldo|anadir saldo|agregar saldo|meter saldo|depositar gvr|conseguir gvr|como recargo mi wallet|como recargar mi saldo|recargar mi cuenta|poner saldo)\b/.test(q)) {
      return direct("PASOS PARA AÑADIR SALDO GVR: 1) inicia sesión en tu cuenta; 2) abre Comprar GVR; 3) elige un paquete de 5, 10, 25, 50 o 100 GVR, o selecciona cantidad personalizada e introduce un número entero desde 1; 4) pulsa para continuar; 5) selecciona uno de los métodos de pago que aparezcan habilitados; 6) revisa la cantidad de GVR, el método y el importe total antes de seguir; 7) pulsa Continuar hasta llegar a Confirmar compra; 8) lee las instrucciones que muestra esa pantalla y envía únicamente el importe exacto al receptor que aparece allí; 9) guarda la captura o comprobante del pago; 10) en la misma página, selecciona la imagen JPG, PNG o WEBP (máximo 5 MB); 11) pulsa Enviar comprobante; 12) espera la confirmación y guarda el identificador de la solicitud; 13) entra en Mis pedidos para revisar el estado. El saldo no se acredita solo por enviar la captura: la solicitud debe ser revisada y aprobada. Si la web muestra un error después de registrar la solicitud, no crees otra ni pagues de nuevo; contacta Soporte con el identificador. IMPORTANTE: CUP/transferencia aparece actualmente como no disponible porque falta configurar el receptor. No envíes dinero por ese método hasta que la web lo habilite. Para USDT, sigue la red y dirección que muestre la confirmación (la página indica BNB Smart Chain/BEP20). Para Saldo móvil, usa el número y el importe exactos que muestre esa misma página.", moneyLink, "Empezar compra de GVR");
    }
    if (/\b(transferencia|pagar en cup|pago cup|pesos cubanos|transferir dinero|tarjeta receptora)\b/.test(q) && /\b(gvr|saldo|wallet|comprobante|pagar|pago|comprar)\b/.test(q)) {
      return direct("La página de confirmación indica que el método CUP/transferencia todavía no está disponible porque falta configurar la tarjeta receptora. No envíes dinero a un número o tarjeta que no aparezca habilitado oficialmente en la web. Revisa los métodos disponibles en el proceso de compra de GVR.", moneyLink, "Ver métodos para comprar GVR");
    }
    if (/\b(usdt|cripto|criptomoneda|bep20|bnb smart chain|direccion usdt|dirección usdt)\b/.test(q) && /\b(gvr|saldo|pagar|pago|comprar|transferir|comprobante)?\b/.test(q)) {
      return direct("Si eliges USDT para comprar GVR, continúa hasta la página Confirmar compra y sigue la dirección y la red que se muestran allí. La web indica BNB Smart Chain (BEP20): comprueba cuidadosamente que la red coincida antes de enviar. Después guarda la captura o comprobante de la operación, súbelo en esa misma página (JPG, PNG o WEBP, máximo 5 MB) y pulsa Enviar comprobante. No copies direcciones desde mensajes antiguos; utiliza siempre la que aparezca en la página al pagar.", proofLink, "Abrir instrucciones y comprobante");
    }
    if (/\b(saldo movil|saldo móvil|recarga telefonica|recarga telefónica|numero receptor|número receptor|63638032)\b/.test(q) && /\b(gvr|saldo|pagar|pago|comprar|comprobante|transferir)?\b/.test(q)) {
      return direct("Si eliges Saldo móvil para comprar GVR, la página de confirmación muestra el número receptor y el importe exacto. Verifica ambos, envía exactamente ese importe al número que aparece allí y guarda la captura de la operación. Luego selecciona esa imagen en la misma página y pulsa Enviar comprobante. Formatos permitidos: JPG, PNG o WEBP, máximo 5 MB. Espera a que la web confirme el registro y guarda el ID de solicitud. No te guíes por números guardados de mensajes antiguos: confirma el receptor que muestra la página.", proofLink, "Ver instrucciones y enviar comprobante");
    }

    if (/\b(precio|precios|cuanto cuesta|cuanto valen|catalogo|catalogo de juegos|que juegos|juegos disponibles|diamantes|paquete|paquetes|oferta|ofertas|recarga de juego|recargas de juegos)\b/.test(q) && !/\b(gvr|saldo|billetera)\b/.test(q)) {
      if (game) return direct("Para " + game.name + ", abre su página y consulta los paquetes y precios que aparecen en ese momento. Sigue las indicaciones del formulario, revisa los datos del jugador y confirma el importe antes de completar la compra. No te doy un precio fijo porque puede cambiar.", game.href, "Abrir " + game.name);
      return direct("Abre el catálogo para ver los juegos, paquetes y precios vigentes. Entra en el juego que quieres, sigue sus instrucciones y confirma siempre el precio mostrado antes de comprar.", links.games, "Ver juegos y precios");
    }
    if (game && /\b(comprar|recargar|como hago|como compro|id|identificador|jugador|nickname|nick|zona|servidor|paquete|diamantes|uc|credito|crédito)\b/.test(q)) {
      return direct("Para recargar " + game.name + ": 1) abre la página del juego; 2) introduce el ID del jugador y la zona/servidor si se solicitan; 3) utiliza la validación que ofrece la página si está disponible; 4) elige el paquete; 5) revisa el juego, paquete, ID y total; 6) confirma solo si todo está correcto; 7) consulta el resultado en Mis pedidos. Si ya hay un pedido pendiente, revisa su estado antes de repetir la compra.", game.href, "Ir a " + game.name);
    }
    if (/\b(como comprar|como funciona una compra|como hago una compra|pasos para comprar|hacer una recarga|comprar diamantes|comprar uc|quiero comprar|quiero recargar|como recargar)\b/.test(q)) {
      return direct("Para comprar una recarga de juego: 1) abre el catálogo; 2) elige el juego; 3) escribe el ID y la zona/servidor si la página los pide; 4) selecciona el paquete; 5) revisa el juego, el ID y el total; 6) confirma la compra; 7) consulta el estado en Mis pedidos. Si el pedido está pendiente, no repitas la compra sin comprobar primero el estado.", links.games, "Elegir un juego");
    }
    if (/\b(validar id|verificar id|id incorrecto|nickname|nombre del jugador|no reconoce mi id|id no valido|id no válido|zona id)\b/.test(q)) {
      return direct("Escribe el ID exactamente como aparece en el juego y añade la zona o servidor si el formulario lo solicita. Si el sistema muestra que no pudo verificarlo, eso no siempre significa que el ID sea incorrecto: revisa los datos y sigue el mensaje de la página. Si persiste, contacta soporte antes de comprar.", links.support, "Contactar soporte");
    }
    if (/\b(saldo|gvr|wallet|billetera|cuanto dinero tengo|mi dinero|mis creditos|mis créditos)\b/.test(q)) {
      return direct("Para consultar tu saldo, inicia sesión y abre Wallet. Allí aparece el saldo GVR disponible y el historial reciente de movimientos. Si acabas de enviar un comprobante de compra, recuerda que el saldo no se acredita hasta que la solicitud sea aprobada.", links.wallet, "Abrir Wallet");
    }
    if (/\b(movimientos|historial de saldo|transacciones|historial wallet)\b/.test(q)) {
      return direct("Inicia sesión y abre Movimientos para consultar los movimientos GVR que estén registrados en tu cuenta.", base + "movimientos.html", "Ver movimientos");
    }
    if (/\b(pedido|pedidos|orden|ordenes|estado|seguimiento|entrega|no llega|no me llega|demora|pendiente|completado|fallido|reembolso|devolucion|devolución)\b/.test(q)) {
      return direct("Para revisar una compra: 1) inicia sesión con la cuenta que utilizaste; 2) abre Mis pedidos; 3) selecciona el filtro Todos, Completados, Pendientes o Revisión; 4) toca el pedido para desplegar sus detalles y estado. Si está pendiente, espera y revisa de nuevo antes de comprar otra vez. Si aparece un error o la entrega se demora, abre Soporte e incluye el ID del pedido. No compartas tu contraseña.", links.orders, "Consultar mis pedidos");
    }
    if (/\b(soporte|ayuda|problema|reclamo|ticket|contacto|error|hablar con alguien|atencion al cliente|atención al cliente)\b/.test(q)) {
      return direct("Para contactar soporte: 1) inicia sesión; 2) abre Soporte; 3) elige la categoría adecuada (GVR y saldo, Recargas de juegos, Pedidos, Pagos, Cuenta u Otro); 4) escribe un asunto claro; 5) describe el problema e incluye el ID de pedido o solicitud si lo tienes; 6) pulsa Abrir conversación; 7) entra en la conversación para seguir los mensajes. No incluyas contraseñas ni códigos de acceso.", links.support, "Abrir Soporte");
    }
    if (/\b(cuenta|perfil|mi perfil|iniciar sesion|iniciar sesión|login|registrar|registro|crear cuenta|contraseña|contrasena|olvide mi clave|olvidé mi clave|recuperar cuenta)\b/.test(q)) {
      if (/\b(registrar|registro|crear cuenta)\b/.test(q)) return direct("Para crear una cuenta, abre Registro, completa los campos solicitados y sigue las instrucciones que aparezcan. Usa un correo al que tengas acceso.", base + "registro.html", "Crear cuenta");
      if (/\b(contraseña|contrasena|olvide|olvidé|recuperar)\b/.test(q)) return direct("Si olvidaste la contraseña, abre Recuperar contraseña y sigue las instrucciones de la página. No compartas contraseñas ni códigos de acceso.", base + "recuperar-contrasena.html", "Recuperar contraseña");
      return direct("Abre Iniciar sesión e introduce los datos de tu cuenta. Si no tienes cuenta, puedes registrarte. Para consultar tus pedidos y saldo personales debes entrar con la cuenta correspondiente.", accountLink, "Iniciar sesión");
    }
    if (/\b(comprobante|captura del pago|captura de pago|enviar prueba|subir prueba|subir imagen|enviar recibo|recibo de pago)\b/.test(q)) {
      return direct("Para adjuntar un comprobante de pago de GVR: entra en el proceso de compra y llega a Confirmar compra; selecciona la captura del pago en JPG, PNG o WEBP, con un tamaño máximo de 5 MB; pulsa Enviar comprobante y espera el mensaje de confirmación. Guarda el identificador de solicitud y consulta su estado. La solicitud queda pendiente hasta que se revise y apruebe el pago. Si ya aparece registrada, no crees otra solicitud ni vuelvas a pagar; contacta Soporte con el identificador si aparece un error.", proofLink, "Abrir confirmación de GVR");
    }
    if (/\b(pago|pagos|pagar|metodo de pago|metodos de pago|confirmar pago|pago rechazado)\b/.test(q)) {
      return direct("Utiliza únicamente los métodos que estén habilitados y las instrucciones que aparezcan en la página de pago. Antes de enviar dinero, comprueba el importe y el receptor. Si ya pagaste y no se refleja, conserva el comprobante y abre un caso en Soporte; no vuelvas a pagar sin revisar la solicitud.", links.support, "Contactar soporte");
    }
    if (/\b(resena|reseña|resenas|reseñas|opinion|opiniones|experiencia)\b/.test(q)) {
      return direct("Abre la sección de Reseñas para consultar las opiniones publicadas en la web.", base + "reseñas.html", "Ver reseñas");
    }
    if (/\b(privacidad|datos personales|seguridad|es seguro|estafa|fraude|confiable)\b/.test(q)) {
      return direct("Comprueba el nombre del juego, el ID, el paquete y el importe antes de confirmar. Conserva los comprobantes, no compartas tu contraseña ni códigos y usa las instrucciones de pago que aparecen en la web. Si detectas un problema, contacta soporte.", links.support, "Ir a Soporte");
    }
    if (/\b(cuba|cubano|desde cuba|internacional|pais|país|moneda|usd|dolar|dólar)\b/.test(q)) {
      return direct("Las opciones disponibles son las que muestra la web durante el proceso de compra. Revisa los métodos y sus instrucciones antes de pagar. Si no aparece una opción válida para ti, consulta soporte.", links.support, "Consultar soporte");
    }
    if (game) return direct("Puedo orientarte sobre " + game.name + ". Abre su página para consultar los paquetes, precios e instrucciones disponibles en ese momento.", game.href, "Abrir " + game.name);
    return direct("Puedo explicarte paso a paso cómo comprar GVR, pagar y enviar el comprobante, recargar cualquiera de los juegos, validar tu ID, revisar el saldo y los movimientos, consultar un pedido, crear o recuperar tu cuenta y contactar soporte. Escribe qué quieres hacer y, si se trata de una recarga, dime también el juego para darte las instrucciones correspondientes.", links.games, "Ver juegos y precios");
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