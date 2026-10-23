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
  style.href = base + "goldi-widget.css?v=20261023-6";
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
      '<section id="gg-goldi-faq" aria-label="Preguntas frecuentes">' +
        '<button id="gg-goldi-faq-toggle" type="button" aria-expanded="false" aria-controls="gg-goldi-faq-list"><span>Preguntas frecuentes</span><span id="gg-goldi-faq-chevron" aria-hidden="true">⌄</span></button>' +
        '<div id="gg-goldi-faq-list" hidden>' +
          '<button type="button" data-goldi-faq="¿Cómo añado saldo GVR?">¿Cómo añado saldo GVR?</button>' +
          '<button type="button" data-goldi-faq="¿Cómo envío el comprobante de pago?">¿Cómo envío el comprobante?</button>' +
          '<button type="button" data-goldi-faq="¿Cómo recargo un juego?">¿Cómo recargo un juego?</button>' +
          '<button type="button" data-goldi-faq="¿Cómo recargo Free Fire?">¿Cómo recargo Free Fire?</button>' +
          '<button type="button" data-goldi-faq="¿Cómo consulto mi saldo GVR?">¿Cómo consulto mi saldo?</button>' +
          '<button type="button" data-goldi-faq="¿Cómo reviso mis pedidos?">¿Cómo reviso mis pedidos?</button>' +
          '<button type="button" data-goldi-faq="¿Qué hago si mi recarga no llega?">¿Qué hago si mi recarga no llega?</button>' +
          '<button type="button" data-goldi-faq="¿Cómo valido mi ID de jugador?">¿Cómo valido mi ID?</button>' +
          '<button type="button" data-goldi-faq="¿Cómo creo una cuenta?">¿Cómo creo una cuenta?</button>' +
          '<button type="button" data-goldi-faq="¿Cómo contacto soporte?">¿Cómo contacto soporte?</button>' +
          '<button type="button" data-goldi-faq="¿Qué métodos de pago puedo usar para GVR?">¿Qué métodos de pago hay?</button>' +
          '<button type="button" data-goldi-faq="¿Cómo pago con USDT?">¿Cómo pago con USDT?</button>' +
          '<button type="button" data-goldi-faq="¿Cómo pago con Saldo móvil para GVR?">¿Cómo pago con Saldo móvil?</button>' +
          '<button type="button" data-goldi-faq="¿Cómo recupero mi contraseña?">¿Olvidé mi contraseña?</button>' +
          '<button type="button" data-goldi-faq="¿Cómo veo los movimientos GVR?">¿Cómo veo movimientos?</button>' +
          '<button type="button" data-goldi-faq="¿Dónde veo los precios de los juegos?">¿Dónde veo los precios?</button>' +
          '<button type="button" data-goldi-faq="¿Qué hago si mi comprobante sigue pendiente?">¿Comprobante pendiente?</button>' +
          '<button type="button" data-goldi-faq="¿Cómo hago un reclamo?">¿Cómo hago un reclamo?</button>' +
        '</div>' +
      '</section>' +
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
  var faqToggle = root.querySelector("#gg-goldi-faq-toggle");
  var faqList = root.querySelector("#gg-goldi-faq-list");
  var welcomed = false;
  var conversationHistory = [];
  

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
      { terms: /\b(free fire|freefire|\bff\b|diamantes de free fire)\b/, name: "Free Fire", href: base + "freefire.html" },
      { terms: /\b(mobile legends|mobilelegends|mlbb)\b/, name: "Mobile Legends", href: base + "mobilelegends.html" },
      { terms: /\b(pubg|pubg mobile|pubgmobile|uc de pubg)\b/, name: "PUBG Mobile", href: base + "pubgmobile.html" },
      { terms: /\b(arena breakout|arenabreakout)\b/, name: "Arena Breakout", href: base + "arenabreakout.html" },
      { terms: /\b(blood strike|bloodstrike)\b/, name: "Blood Strike", href: base + "bloodstrike.html" },
      { terms: /\b(genshin|genshin impact)\b/, name: "Genshin Impact", href: base + "genshinimpact.html" },
      { terms: /\b(honor of kings|honorofkings|\bhok\b)\b/, name: "Honor of Kings", href: base + "honorofkings.html" },
      { terms: /\b(call of duty|cod mobile|codmobile)\b/, name: "Call of Duty: Mobile", href: base + "codmobile.html" }
    ];
    var game = gamePages.find(function (item) { return item.terms.test(q); });
    var direct = function (text, href, label) { return { text: text, href: href, label: label }; };
    var moneyLink = base + "recargar-gvr.html";
    var proofLink = base + "confirmar-gvr.html";
    var accountLink = base + "login.html";
    var previous = conversationHistory.length ? conversationHistory[conversationHistory.length - 1] : null;
    var followUp = /^(y ahora|y despues|y despues que|que hago ahora|y luego|como sigo|despues que|despues de eso|y si|eso hice|ya lo hice|no entiendo|explicame mejor|mas detalles|continua|sigue|ok y ahora|listo y ahora|me sale error|me da error|no funciona|no me funciona|no aparece|no sale|donde|donde esta|cual es|cual elijo)$/.test(q);
    if (followUp && previous && previous.topic) q = previous.topic + " " + q;

    if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|saludos|que tal|holi|ola)$/.test(q)) {
      return { text: "¡Hola! Soy Goldi 💙 Cuéntame qué necesitas hacer en la web y te guío paso a paso." };
    }
    if (/\b(quien eres|que eres|que puedes hacer|para que sirves|como me ayudas)\b/.test(q)) {
      return { text: "Soy Goldi, el asistente de Gamers Gold Top-Up. Puedo guiarte para comprar GVR, hacer recargas de juegos, revisar precios, validar datos de jugador, enviar comprobantes, consultar pedidos y saldo, recuperar tu cuenta o contactar soporte. Dime qué quieres hacer y te explico los pasos." };
    }
    if (/\b(next level|proveedor|proveedores|api interna|integracion interna|referencia interna|id del proveedor|costo del proveedor|clave secreta)\b/.test(q)) {
      return { text: "Puedo ayudarte con las funciones de la web para clientes, pero no comparto claves, datos internos ni información privada de integraciones. Sí puedo explicarte cómo hacer una recarga, comprar GVR, enviar un comprobante o revisar un pedido." };
    }

    if (/\b(comprobante|solicitud)\b/.test(q) && /\b(pendiente|sin revisar|no aprobado|no se acredita|no se acredito|no se acreditó|demora)\b/.test(q)) {
      return direct("Si tu comprobante o solicitud sigue pendiente: 1) inicia sesión; 2) abre Mis pedidos; 3) revisa el filtro Pendientes o Revisión; 4) abre la solicitud y guarda su identificador. El saldo se acredita cuando el pago se revisa y aprueba. No envíes otro pago ni crees otra solicitud mientras la anterior esté registrada. Si lleva demasiado tiempo o muestra un error, contacta Soporte e incluye el ID de solicitud.", links.orders, "Revisar solicitud");
    }
    if (/\b(comprobante|captura del pago|captura de pago|enviar prueba|subir prueba|subir imagen|enviar recibo|recibo de pago|justificante|prueba de pago)\b/.test(q)) {
      if (/\b(juego|free fire|freefire|pubg|mobile legends|arena breakout|blood strike|genshin|honor of kings|cod mobile)\b/.test(q) && !/\b(gvr|saldo|wallet|comprar gvr)\b/.test(q)) {
        return direct("Si la página del juego te pide confirmar una compra, sigue el proceso que aparece en pantalla y revisa el pedido en Mis pedidos. No subas el comprobante de una compra de GVR en una recarga de juego ni al revés. Si el sitio no te muestra dónde adjuntarlo, abre Soporte e incluye el ID del pedido.", links.support, "Contactar soporte");
      }
      return direct("Para enviar el comprobante de compra de GVR: 1) inicia sesión; 2) abre Comprar GVR y selecciona la cantidad; 3) elige un método que esté habilitado; 4) continúa hasta Confirmar compra; 5) sigue las instrucciones de pago que aparecen en esa página; 6) selecciona una captura en JPG, PNG o WEBP de máximo 5 MB; 7) pulsa Enviar comprobante; 8) espera el mensaje de confirmación y guarda el identificador de solicitud; 9) revisa el estado en Mis pedidos. El saldo solo se acredita cuando la solicitud es revisada y aprobada. Si ya se registró una solicitud, no vuelvas a pagar ni crees otra: contacta Soporte con el identificador si hay un error.", proofLink, "Abrir confirmación de GVR");
    }

    if (/\b(como anadir saldo|como anado saldo|como anadir gvr|como anado gvr|anadir saldo gvr|anado saldo gvr|anadir gvr|anado gvr|agregar saldo gvr|agregar saldo|como agregar saldo|como meter saldo|meter saldo gvr|depositar saldo|depositar gvr|comprar gvr|recargar gvr|comprar saldo|anadir saldo|anado saldo|conseguir gvr|recargar mi wallet|recargar mi saldo|recargar mi cuenta|poner saldo|saldo virtual|como funciona gvr)\b/.test(q) || (/\b(saldo|gvr|wallet|billetera)\b/.test(q) && /\b(como|anadir|anado|agregar|agrego|meter|poner|comprar|recargar|depositar|cargar|conseguir)\b/.test(q) && !/\b(consultar|ver|revisar|cuanto tengo|historial|movimientos)\b/.test(q))) {
      return direct("PASOS PARA AÑADIR SALDO GVR: 1) inicia sesión; 2) abre Comprar GVR; 3) elige 5, 10, 25, 50 o 100 GVR, o una cantidad personalizada entera; 4) continúa y selecciona un método que esté habilitado; 5) comprueba la cantidad y el importe; 6) sigue las instrucciones que muestra Confirmar compra y envía solo al receptor que aparezca allí; 7) guarda la captura del pago; 8) adjunta la imagen JPG, PNG o WEBP (máximo 5 MB); 9) pulsa Enviar comprobante; 10) guarda el ID de solicitud; 11) revisa Mis pedidos. El saldo se acredita después de la revisión y aprobación, no inmediatamente al subir una imagen. CUP/transferencia puede aparecer deshabilitado si falta configurar el receptor; no envíes dinero por ese método hasta que la página lo habilite. Para USDT o Saldo móvil, utiliza siempre la red, dirección, número e importe que muestre la confirmación en ese momento.", moneyLink, "Empezar compra de GVR");
    }
    if (/\b(transferencia|pagar en cup|pago cup|pesos cubanos|transferir dinero|tarjeta receptora)\b/.test(q) && /\b(gvr|saldo|wallet|comprobante|pagar|pago|comprar|metodo|metodos)\b/.test(q)) {
      return direct("La página puede mostrar CUP/transferencia como no disponible cuando el receptor no está configurado. Antes de enviar dinero, comprueba que el método esté habilitado y que la propia página muestre el receptor. No uses números o tarjetas de mensajes antiguos.", moneyLink, "Ver opciones de GVR");
    }
    if (/\b(usdt|cripto|criptomoneda|bep20|bnb smart chain|direccion usdt)\b/.test(q)) {
      return direct("Para pagar con USDT: 1) selecciona USDT si aparece habilitado; 2) continúa hasta Confirmar compra; 3) verifica la red y la dirección que aparecen allí (la página indica BNB Smart Chain/BEP20 cuando está disponible); 4) comprueba el importe antes de enviar; 5) guarda la captura; 6) adjúntala en esa página y pulsa Enviar comprobante. Usa los datos actuales de la web, no direcciones guardadas de conversaciones antiguas.", proofLink, "Ver confirmación de GVR");
    }
    if (/\b(saldo movil|recarga telefonica|numero receptor|63638032)\b/.test(q) && /\b(gvr|saldo|pagar|pago|comprar|comprobante|transferir|numero|receptor)\b/.test(q)) {
      return direct("Para pagar con Saldo móvil: 1) selecciona el método si aparece habilitado; 2) abre Confirmar compra; 3) verifica el número receptor y el importe exacto que muestra la página; 4) realiza la operación; 5) guarda la captura; 6) súbela en esa misma página y pulsa Enviar comprobante; 7) guarda el identificador de solicitud. Confirma siempre el número que aparece en pantalla en ese momento.", proofLink, "Ver confirmación de GVR");
    }

    if (game && /\b(comprar|recargar|como hago|como compro|id|identificador|jugador|nickname|nick|zona|servidor|paquete|diamantes|uc|credito|recarga|recargar|precio|precios|oferta|ofertas)\b/.test(q)) {
      if (/\b(precio|precios|cuanto cuesta|cuanto valen|paquete|paquetes|diamantes|uc|oferta|ofertas)\b/.test(q) && !/\b(como|hacer|hago|comprar|recargar|recarga|pasos)\b/.test(q)) {
        return direct("Para consultar los precios de " + game.name + ", abre su página y revisa los paquetes disponibles en ese momento. Los importes vigentes son los que muestra el catálogo; comprueba el total antes de confirmar.", game.href, "Ver paquetes de " + game.name);
      }
      return direct("Para recargar " + game.name + ": 1) abre la página del juego; 2) introduce el ID del jugador y la zona/servidor si se solicita; 3) usa la validación que aparezca en la página, si está disponible; 4) elige el paquete; 5) revisa juego, paquete, ID y total; 6) confirma solo si todos los datos están correctos; 7) revisa el pedido en Mis pedidos. Si ya tienes un pedido pendiente, comprueba su estado antes de repetir la compra.", game.href, "Ir a " + game.name);
    }
    if (/\b(precio|precios|cuanto cuesta|cuanto valen|catalogo|catalogo de juegos|que juegos|juegos disponibles|diamantes|paquete|paquetes|oferta|ofertas|recarga de juego|recargas de juegos)\b/.test(q) && !/\b(gvr|saldo|billetera)\b/.test(q)) {
      return direct("Abre Juegos para ver el catálogo. Entra en el juego que te interesa y consulta los paquetes y precios que aparecen en ese momento. Si me dices el nombre del juego, te llevo directamente a su página.", links.games, "Ver juegos y precios");
    }
    if (/\b(como comprar|como funciona una compra|como hago una compra|pasos para comprar|hacer una recarga|comprar diamantes|comprar uc|quiero comprar|quiero recargar|como recargar|recargar un juego|recargar mis juegos)\b/.test(q)) {
      return direct("Para hacer una recarga: 1) abre Juegos; 2) selecciona el juego; 3) introduce el ID y la zona/servidor si se solicitan; 4) elige el paquete; 5) revisa los datos y el total; 6) confirma; 7) consulta el estado en Mis pedidos. Si me dices el juego, te doy el enlace directo.", links.games, "Elegir un juego");
    }
    if (/\b(validar id|verificar id|id incorrecto|nickname|nombre del jugador|no reconoce mi id|id no valido|id no aparece|zona id|no puedo validar|no se valida)\b/.test(q)) {
      return direct("Escribe el ID exactamente como aparece en el juego y añade la zona o servidor si el formulario lo solicita. Si la página no puede verificarlo, revisa los datos: ese mensaje no siempre significa que el ID sea incorrecto. Si persiste, no confirmes la compra hasta aclararlo y contacta Soporte.", links.support, "Contactar soporte");
    }
    if (/\b(saldo|gvr|wallet|billetera|cuanto dinero tengo|mi dinero|mis creditos|mi credito|mi cuenta tiene|saldo disponible)\b/.test(q)) {
      return direct("Para consultar tu saldo personal, inicia sesión y abre Wallet. Allí verás el saldo GVR disponible. Si acabas de enviar un comprobante, el saldo se actualiza después de que la solicitud sea revisada y aprobada. Goldi no puede ver tu saldo privado desde el chat.", links.wallet, "Abrir Wallet");
    }
    if (/\b(movimientos|historial de saldo|transacciones|historial wallet)\b/.test(q)) {
      return direct("Inicia sesión y abre Movimientos para consultar el historial de movimientos GVR que esté registrado en tu cuenta.", base + "movimientos.html", "Ver movimientos");
    }
    if (/\b(pedido|pedidos|orden|ordenes|estado|seguimiento|entrega|no llega|no me llega|demora|pendiente|completado|fallido|reembolso|devolucion|me cobraron|no se acredito|no se acreditó)\b/.test(q)) {
      return direct("Para revisar tu compra: 1) inicia sesión con la cuenta utilizada; 2) abre Mis pedidos; 3) usa el filtro Todos, Completados, Pendientes o Revisión; 4) abre el pedido para ver los detalles y el estado. Si está pendiente, compruébalo antes de repetir la compra. Si aparece un error o la entrega se demora, abre Soporte e incluye el ID del pedido. No compartas tu contraseña.", links.orders, "Consultar mis pedidos");
    }
    if (/\b(soporte|ayuda|problema|reclamo|ticket|contacto|error|hablar con alguien|atencion al cliente|no funciona|no me funciona|me da error)\b/.test(q)) {
      return direct("Para contactar Soporte: 1) inicia sesión; 2) abre Soporte; 3) elige la categoría adecuada; 4) escribe un asunto; 5) describe el problema e incluye el ID de pedido o solicitud si lo tienes; 6) abre la conversación; 7) vuelve a ella para revisar las respuestas. Nunca incluyas tu contraseña ni códigos de acceso.", links.support, "Abrir Soporte");
    }
    if (/\b(cuenta|perfil|iniciar sesion|login|registrar|registro|crear cuenta|contraseña|contrasena|olvide mi clave|recuperar cuenta)\b/.test(q)) {
      if (/\b(registrar|registro|crear cuenta)\b/.test(q)) return direct("Para crear una cuenta, abre Registro, completa los datos solicitados y sigue las instrucciones. Usa un correo al que tengas acceso.", base + "registro.html", "Crear cuenta");
      if (/\b(contraseña|contrasena|olvide|recuperar)\b/.test(q)) return direct("Si olvidaste la contraseña, abre Recuperar contraseña y sigue las instrucciones. No compartas contraseñas ni códigos de acceso.", base + "recuperar-contrasena.html", "Recuperar contraseña");
      return direct("Abre Iniciar sesión e introduce los datos de tu cuenta. Si todavía no tienes una, puedes registrarte. Para ver tus pedidos y saldo personales necesitas iniciar sesión.", accountLink, "Iniciar sesión");
    }
    if (/\b(pago|pagos|pagar|metodo de pago|metodos de pago|confirmar pago|pago rechazado|me cobraron)\b/.test(q)) {
      return direct("Usa únicamente los métodos que estén habilitados y sigue las instrucciones de la página de pago. Comprueba el importe y el receptor antes de enviar dinero. Si ya pagaste y no se refleja, guarda el comprobante, revisa Mis pedidos y contacta Soporte; no vuelvas a pagar sin revisar la solicitud.", links.support, "Contactar soporte");
    }
    if (/\b(resena|resenas|opinion|opiniones|experiencia)\b/.test(q)) {
      return direct("Abre la sección de Reseñas para consultar las opiniones publicadas en la web.", base + "reseñas.html", "Ver reseñas");
    }
    if (/\b(privacidad|datos personales|seguridad|es seguro|estafa|fraude|confiable)\b/.test(q)) {
      return direct("Antes de confirmar, comprueba el juego, el ID, el paquete y el importe. Conserva los comprobantes, no compartas contraseñas ni códigos y usa únicamente las instrucciones de pago que aparecen en la web. Si detectas un problema, contacta Soporte.", links.support, "Ir a Soporte");
    }
    if (/\b(cuba|cubano|desde cuba|internacional|pais|moneda|usd|dolar)\b/.test(q)) {
      return direct("Las opciones disponibles dependen de los métodos que muestre la web durante la compra. Revisa las instrucciones y no envíes dinero si no aparece un receptor habilitado. Si no ves una opción válida para ti, consulta Soporte.", links.support, "Consultar soporte");
    }
    if (game) return direct("Puedo orientarte sobre " + game.name + ". Abre su página para consultar paquetes, precios e instrucciones disponibles en ese momento.", game.href, "Abrir " + game.name);
    return direct("Te puedo guiar con los procesos de la web: comprar GVR, pagar y enviar comprobantes, recargar juegos, revisar precios, validar el ID, consultar Wallet y movimientos, revisar pedidos, gestionar tu cuenta y contactar Soporte. Escríbeme qué quieres hacer con tus propias palabras. Si se trata de una recarga, dime también el juego.", links.games, "Ver juegos y precios");
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
  faqToggle.addEventListener("click", function () {
    var expanded = faqToggle.getAttribute("aria-expanded") === "true";
    faqToggle.setAttribute("aria-expanded", String(!expanded));
    faqList.hidden = expanded;
    root.querySelector("#gg-goldi-faq-chevron").textContent = expanded ? "⌄" : "⌃";
  });
  root.querySelectorAll("[data-goldi-link]").forEach(function (button) {
    button.addEventListener("click", function () { navigate(button.getAttribute("data-goldi-link")); });
  });
  root.querySelectorAll("[data-goldi-faq]").forEach(function (button) {
    button.addEventListener("click", function () {
      var question = button.getAttribute("data-goldi-faq");
      addMessage(question, true);
      var result = answer(question);
      addMessage(result.text, false, result.href ? { href: result.href, label: result.label } : null);
      var normalized = question.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
      conversationHistory.push({ role: "user", text: question, topic: normalized }, { role: "model", text: result.text, topic: normalized });
      if (conversationHistory.length > 8) conversationHistory = conversationHistory.slice(-8);
    });
  });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var question = input.value.trim();
    if (!question) return;
    addMessage(question, true);
    input.value = "";
    var result = answer(question);
    addMessage(result.text, false, result.href ? { href: result.href, label: result.label } : null);
    var normalizedQuestion = question.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    var topic = normalizedQuestion;
    conversationHistory.push({ role: "user", text: question, topic: topic }, { role: "model", text: result.text, topic: topic });
    if (conversationHistory.length > 8) conversationHistory = conversationHistory.slice(-8);
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !panel.hidden) closePanel();
  });
})();