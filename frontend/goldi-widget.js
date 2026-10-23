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
  style.href = base + "goldi-widget.css?v=20261023-8";
  document.head.appendChild(style);

  var root = document.createElement("div");
  root.id = "gg-goldi-root";
  root.innerHTML =
    '<button id="gg-goldi-launcher" type="button" aria-label="Abrir Goldi" aria-expanded="false" aria-controls="gg-goldi-panel" title="Abrir Goldi">' +
      '<span id="gg-goldi-avatar" aria-hidden="true"><img src="' + base + 'imagenes/goldi-avatar.svg" alt="" /></span>' +
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
    if (!dragState.moved && Math.max(Math.abs(dx), Math.abs(dy)) < 5) return;
    dragState.moved = true;
    dragged = true;
    var nextLeft = Math.max(4, Math.min(window.innerWidth - root.offsetWidth - 4, dragState.left + dx));
    var nextTop = Math.max(4, Math.min(window.innerHeight - root.offsetHeight - 4, dragState.top + dy));
    root.style.left = nextLeft + "px";
    root.style.top = nextTop + "px";
    root.style.right = "auto";
    root.style.bottom = "auto";
    root.classList.toggle("gg-goldi-left", nextLeft < window.innerWidth / 2);
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
    if (savedPosition && Number.isFinite(savedPosition.left)) {
      var restoredLeft = Math.max(4, Math.min(window.innerWidth - 58, savedPosition.left));
      root.style.left = restoredLeft + "px";
      root.style.right = "auto";
      if (Number.isFinite(savedPosition.top)) {
        var restoredTop = Math.max(4, Math.min(window.innerHeight - 58, savedPosition.top));
        root.style.top = restoredTop + "px";
        root.style.bottom = "auto";
      }
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
  function answerFAQ(question) {
    var key = question.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    var faq = {
      "como anado saldo gvr": {
        text: "Para añadir saldo GVR, sigue estos pasos: 1) inicia sesión en tu cuenta; 2) abre Comprar GVR; 3) elige uno de los paquetes disponibles o introduce una cantidad personalizada entera; 4) continúa y selecciona un método de pago que esté habilitado; 5) revisa la cantidad y el importe; 6) sigue las instrucciones que aparezcan en Confirmar compra y utiliza únicamente el receptor que muestre esa página; 7) realiza el pago y guarda el comprobante; 8) sube una imagen JPG, PNG o WEBP de máximo 5 MB; 9) pulsa Enviar comprobante; 10) guarda el ID de solicitud y revisa su estado en Mis pedidos. Importante: el saldo se añade después de que el pago sea revisado y aprobado. Si ya registraste una solicitud, no pagues ni crees otra para el mismo pago.",
        href: base + "recargar-gvr.html", label: "Comprar GVR"
      },
      "como envio el comprobante de pago": {
        text: "Para enviar tu comprobante de pago de GVR: 1) inicia sesión; 2) comienza una compra desde Comprar GVR; 3) elige un método habilitado y continúa hasta Confirmar compra; 4) realiza el pago siguiendo los datos que aparecen en pantalla; 5) selecciona la imagen del comprobante en JPG, PNG o WEBP (máximo 5 MB); 6) pulsa Enviar comprobante; 7) espera la confirmación y guarda el ID de solicitud; 8) consulta el estado en Mis pedidos. El comprobante no acredita el saldo automáticamente: primero debe revisarse y aprobarse. Si la solicitud ya aparece registrada, no la envíes de nuevo; usa su ID para pedir ayuda si algo falla.",
        href: base + "confirmar-gvr.html", label: "Enviar comprobante"
      },
      "como recargo un juego": {
        text: "Para recargar un juego: 1) abre Juegos y selecciona el juego correcto; 2) introduce el ID de jugador y la zona o servidor si se solicitan; 3) utiliza la validación disponible en la página; 4) elige el paquete; 5) comprueba el nombre del juego, paquete, ID y total; 6) confirma solo si todos los datos son correctos; 7) abre Mis pedidos para seguir el estado. Si el pedido ya está pendiente, revisa ese pedido antes de intentar otra compra. Dime qué juego quieres recargar y te indico los pasos específicos.",
        href: links.games, label: "Ver juegos"
      },
      "como recargo free fire": {
        text: "Para recargar Free Fire: 1) abre la página de Free Fire; 2) escribe tu ID de jugador exactamente como aparece en el juego; 3) pulsa la opción de validar si está disponible y revisa el resultado; 4) selecciona el paquete de diamantes; 5) comprueba cuidadosamente el ID, el paquete y el total; 6) confirma la recarga solo si los datos son correctos; 7) después, revisa el estado en Mis pedidos. Si la validación no está disponible o no puede confirmar el ID, no significa necesariamente que el ID sea incorrecto: revisa los datos y contacta Soporte si persiste. No repitas una compra que ya esté pendiente.",
        href: base + "freefire.html", label: "Abrir Free Fire"
      },
      "como consulto mi saldo gvr": {
        text: "Para consultar tu saldo GVR: 1) inicia sesión con la cuenta correcta; 2) abre Wallet; 3) revisa el saldo disponible que aparece en tu cuenta. Si acabas de pagar GVR, recuerda que el saldo solo se actualiza después de que la solicitud y el comprobante sean revisados y aprobados. Goldi no puede ver ni confirmar el saldo privado de tu cuenta desde este chat.",
        href: links.wallet, label: "Abrir Wallet"
      },
      "como reviso mis pedidos": {
        text: "Para revisar tus pedidos: 1) inicia sesión con la misma cuenta con la que realizaste la compra; 2) abre Mis pedidos; 3) selecciona el filtro que necesites: Todos, Completados, Pendientes o Revisión; 4) abre el pedido para ver sus detalles y estado. Si necesitas ayuda, guarda el ID del pedido y envíalo a Soporte junto con una descripción del problema. Si está pendiente, no repitas la compra sin revisar primero el estado.",
        href: links.orders, label: "Abrir Mis pedidos"
      },
      "que hago si mi recarga no llega": {
        text: "Si tu recarga no llega: 1) inicia sesión; 2) abre Mis pedidos; 3) localiza la compra y revisa su estado y el ID; 4) si está pendiente, espera la actualización del pedido y no crees otra compra igual; 5) si aparece fallida, completada pero no recibida, o lleva demasiado tiempo sin cambiar, abre Soporte; 6) incluye el ID del pedido, el juego y una explicación breve. No compartas tu contraseña ni códigos de acceso.",
        href: links.orders, label: "Revisar mis pedidos"
      },
      "como valido mi id de jugador": {
        text: "Para validar tu ID de jugador: 1) abre la página del juego; 2) copia el ID directamente desde el juego, sin espacios adicionales ni números cambiados; 3) completa la zona o servidor si el formulario lo pide; 4) pulsa Validar y espera el resultado; 5) confirma la compra solo si los datos mostrados son correctos. Si la validación no está disponible, no siempre significa que el ID sea incorrecto. No continúes con una compra si tienes dudas; contacta Soporte e indica el juego y el mensaje que aparece.",
        href: links.games, label: "Elegir juego"
      },
      "como creo una cuenta": {
        text: "Para crear una cuenta: 1) abre Registro; 2) completa los datos que solicita el formulario; 3) utiliza un correo al que tengas acceso y crea una contraseña segura; 4) sigue las instrucciones que aparezcan para completar el registro; 5) después, inicia sesión. Nunca compartas tu contraseña ni los códigos de acceso con otras personas.",
        href: base + "registro.html", label: "Crear cuenta"
      },
      "como contacto soporte": {
        text: "Para contactar Soporte: 1) inicia sesión; 2) abre Soporte; 3) selecciona la categoría relacionada con tu problema; 4) escribe un asunto claro; 5) explica qué ocurrió e incluye el ID del pedido o de la solicitud si lo tienes; 6) abre la conversación y vuelve a ella para revisar las respuestas. No envíes tu contraseña ni códigos de acceso.",
        href: links.support, label: "Abrir Soporte"
      },
      "que metodos de pago puedo usar para gvr": {
        text: "Los métodos disponibles para comprar GVR son los que aparezcan habilitados durante el proceso de compra. 1) abre Comprar GVR; 2) selecciona la cantidad; 3) revisa los métodos que se muestran; 4) elige uno habilitado y sigue las instrucciones de Confirmar compra. Si CUP/transferencia aparece deshabilitado o no muestra un receptor, no envíes dinero por ese método. Comprueba siempre los datos y el importe que aparecen en la web en ese momento.",
        href: moneyLink, label: "Ver opciones de GVR"
      },
      "como pago con usdt": {
        text: "Para pagar con USDT: 1) abre Comprar GVR y elige una cantidad; 2) selecciona USDT si aparece habilitado; 3) continúa hasta Confirmar compra; 4) verifica cuidadosamente la red y la dirección que muestre la página (cuando esté disponible, se indicará BNB Smart Chain/BEP20); 5) comprueba el importe antes de enviar; 6) guarda el comprobante; 7) súbelo en la misma página y pulsa Enviar comprobante; 8) guarda el ID de solicitud. Utiliza siempre la dirección y los datos actuales de la web, nunca datos antiguos copiados de un chat.",
        href: proofLink, label: "Ver confirmación de GVR"
      },
      "como pago con saldo movil para gvr": {
        text: "Para pagar con Saldo móvil: 1) abre Comprar GVR y selecciona una cantidad; 2) elige Saldo móvil solo si está habilitado; 3) continúa hasta Confirmar compra; 4) verifica el número receptor y el importe exacto que aparecen en esa página; 5) realiza la operación; 6) guarda una captura del pago; 7) súbela en la misma página y pulsa Enviar comprobante; 8) guarda el ID de solicitud y revisa Mis pedidos. Confirma siempre el número que aparece en pantalla en ese momento.",
        href: proofLink, label: "Ver confirmación de GVR"
      },
      "como recupero mi contrasena": {
        text: "Si olvidaste tu contraseña: 1) abre Recuperar contraseña; 2) introduce los datos que te solicite el formulario; 3) revisa el correo asociado a tu cuenta y sigue las instrucciones recibidas; 4) crea una contraseña nueva y segura. Si no recibes el correo, revisa la carpeta de spam y confirma que escribiste el correo correcto. No compartas enlaces privados ni códigos de recuperación.",
        href: base + "recuperar-contrasena.html", label: "Recuperar contraseña"
      },
      "como veo los movimientos gvr": {
        text: "Para consultar tus movimientos GVR: 1) inicia sesión; 2) abre la sección Movimientos desde la web o tu cuenta; 3) revisa las operaciones que aparezcan registradas. Si no ves un movimiento esperado, comprueba primero el estado de la solicitud en Mis pedidos. Si sigue sin aparecer, contacta Soporte e incluye el ID de la solicitud. Goldi no puede consultar los movimientos privados de tu cuenta desde el chat.",
        href: base + "movimientos.html", label: "Ver movimientos"
      },
      "donde veo los precios de los juegos": {
        text: "Para consultar los precios: 1) abre Juegos; 2) selecciona el juego que te interesa; 3) revisa los paquetes y sus precios en la página del juego; 4) antes de confirmar, comprueba el paquete elegido y el total que muestra la web. Los precios válidos son los que aparecen en el catálogo en ese momento.",
        href: links.games, label: "Ver juegos y precios"
      },
      "que hago si mi comprobante sigue pendiente": {
        text: "Si tu comprobante sigue pendiente: 1) inicia sesión; 2) abre Mis pedidos; 3) selecciona Pendientes o Revisión; 4) abre la solicitud y guarda su ID; 5) espera a que el pago sea revisado. El saldo GVR se acredita cuando la solicitud es aprobada. No envíes otro pago ni crees una segunda solicitud para el mismo pago. Si lleva demasiado tiempo o muestra un error, contacta Soporte e incluye el ID.",
        href: links.orders, label: "Revisar solicitud"
      },
      "como hago un reclamo": {
        text: "Para presentar un reclamo: 1) inicia sesión; 2) abre Soporte; 3) selecciona la categoría que más se ajuste al problema; 4) escribe un asunto breve; 5) describe qué pasó, cuándo ocurrió y qué esperabas que sucediera; 6) incluye el ID del pedido o solicitud y adjunta la evidencia si el formulario lo permite; 7) envía el mensaje y vuelve a la conversación para revisar la respuesta. No compartas contraseñas ni códigos de acceso.",
        href: links.support, label: "Presentar reclamo"
      }
    };
    return faq[key] || null;
  }

  root.querySelectorAll("[data-goldi-faq]").forEach(function (button) {
    button.addEventListener("click", function () {
      var question = button.getAttribute("data-goldi-faq");
      addMessage(question, true);
      var result = answerFAQ(question) || answer(question);
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