/* =========================================================
   GAMERS GOLD TOP-UP
   MOTOR DE OFERTAS Y PEDIDOS
   ========================================================= */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

"use strict";

const SUPABASE_URL =
    "https://gsuhzcavghsiolmipnzi.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_VEu9lvcUF1mp0xS0fXHPdA_592bfknx";

const URL_CATALOGO =
    `${SUPABASE_URL}/functions/v1/nextlevel-catalogo`;

const URL_CREAR_PEDIDO =
    `${SUPABASE_URL}/functions/v1/nextlevel-crear-pedido`;

const URL_CONSULTAR_PEDIDO =
    `${SUPABASE_URL}/functions/v1/nextlevel-consultar-pedido`;

const TIEMPO_LIMITE = 15000;

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);

const CONFIG =
    window.CONFIG_OFERTAS &&
    typeof window.CONFIG_OFERTAS === "object"
        ? window.CONFIG_OFERTAS
        : null;

const NOMBRE_JUEGO =
    String(CONFIG?.juego || "").trim();

const PAGINA_VOLVER =
    CONFIG?.paginaVolver || "index.html";

const TEXTO_ID =
    CONFIG?.textoId || "ID del jugador";

const PLACEHOLDER_ID =
    CONFIG?.placeholderId || "Escribe tu ID";

const JUEGO_NORMALIZADO =
    normalizarTexto(NOMBRE_JUEGO);

const JUEGOS_API = {
    freefire: "free-fire",
    mobilelegends: "mobile-legends",
    bloodstrike: "blood-strike",
    pubgmobile: "pubg-mobile",
    honorofkings: "honor-of-kings",
    arenabreakout: "arena-breakout",
    genshinimpact: "genshin-impact"
};

const JUEGO_API =
    JUEGOS_API[JUEGO_NORMALIZADO] || null;

const ES_FREE_FIRE =
    JUEGO_NORMALIZADO === "freefire";

const ES_BLOOD_STRIKE =
    JUEGO_NORMALIZADO === "bloodstrike";

const ES_HONOR_OF_KINGS =
    JUEGO_NORMALIZADO === "honorofkings";

const ES_GENSHIN_IMPACT =
    JUEGO_NORMALIZADO === "genshinimpact";

const ES_ARENA_BREAKOUT =
    JUEGO_NORMALIZADO === "arenabreakout";
/*
 * Se conserva la habilitación anterior de cada juego.
 * El cambio de servidor solo afecta a Genshin Impact.
 */
const ES_VENTAS_HABILITADAS =
    ES_FREE_FIRE ||
    (
        ES_BLOOD_STRIKE &&
        CONFIG?.habilitarCompras === true
    ) ||
    (
        ES_HONOR_OF_KINGS &&
        CONFIG?.habilitarCompras === true
    ) ||
    (
        ES_GENSHIN_IMPACT &&
        CONFIG?.habilitarCompras === true
    )
    (
        ES_ARENA_BREAKOUT &&
        CONFIG?.habilitarCompras === true
    );

let productosLocales = [];
let productosProveedor = [];

let productosPorId = Object.create(null);
let productosMostrados = Object.create(null);

let productoSeleccionado = null;
let precioSeleccionado = 0;

let procesandoCompra = false;
let usuarioActualId = null;
let pedidoPendienteId = null;
let accionPendiente = "crear";

const el = id => document.getElementById(id);


/* =========================================================
   UTILIDADES
   ========================================================= */

function normalizarTexto(valor) {
    return String(valor ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[\s_-]/g, "");
}

function mostrarPrecio(valor) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return "Precio pendiente";
    }

    return new Intl.NumberFormat("es-ES", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(numero) + " GVR";
}

function actualizarEstadoCarga(
    mensaje,
    mostrar = true,
    tipo = ""
) {
    const estado = el("estadoProductos");

    if (!estado) return;

    estado.textContent = mensaje;
    estado.style.display = mostrar ? "block" : "none";
    estado.classList.toggle("error", tipo === "error");
}

function mostrarEstadoPedido(
    mensaje,
    tipo = ""
) {
    const estado = el("estadoPedido");

    if (!estado) return;

    estado.textContent = mensaje;
    estado.style.display = "block";
    estado.classList.toggle("error", tipo === "error");
}

function ocultarEstadoPedido() {
    const estado = el("estadoPedido");

    if (!estado) return;

    estado.style.display = "none";
    estado.textContent = "";
    estado.classList.remove("error");
}

function mensajeErrorCatalogo(error) {
    console.error(
        "[Gamers Gold] Error al cargar el catálogo:",
        error
    );

    return "No pudimos cargar las ofertas. Inténtalo de nuevo más tarde.";
}


/* =========================================================
   MENSAJES DE ERROR PARA EL CLIENTE
   ========================================================= */

function mensajeErrorPedido(error) {
    const mensaje = String(error?.message || "").trim();
    const datos = error?.data || {};

    const textoCompleto = [
        mensaje,
        datos.error,
        datos.message,
        datos.provider_error,
        datos.details,
        datos.hint
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    if (
        textoCompleto.includes("reembols") ||
        textoCompleto.includes("proveedor") ||
        textoCompleto.includes("nextlevel") ||
        textoCompleto.includes("next level") ||
        textoCompleto.includes("nxc") ||
        textoCompleto.includes("insufficient_balance") ||
        textoCompleto.includes("saldo insuficiente") ||
        textoCompleto.includes("saldo gvr utilizado") ||
        textoCompleto.includes("no se pudo confirmar la creación del pedido")
    ) {
        return "No se pudo completar tu pedido. Si el reembolso fue confirmado, el saldo GVR estará disponible en tu cuenta. Comprueba tu saldo antes de volver a intentarlo.";
    }

    if (
        mensaje.startsWith("Escribe tu ID de jugador") ||
        mensaje.startsWith("El ID de jugador")
    ) {
        return mensaje;
    }

    const mensajesPermitidos = [
        "No hay un pedido guardado para consultar.",
        "No hay pedido pendiente para enviar.",
        "Selecciona primero una oferta.",
        "Esta oferta no está correctamente configurada para la compra.",
        "No se pudo verificar el producto antes de comprar.",
        "El producto o su precio cambió. Actualiza la página antes de comprar.",
        "Selecciona una oferta activa con precio configurado.",
        "Debes iniciar sesión para comprar.",
        "No se pudo comprobar la sesión.",
        "Tu sesión no es válida o ha caducado. Inicia sesión nuevamente.",
        "El ID de jugador es demasiado largo.",
        "No recibimos un ID de pedido válido. Revisa el pedido antes de volver a intentarlo.",
        "No pudimos verificar tu pedido anterior. Conservamos su referencia para evitar duplicarlo. Intenta consultar su estado nuevamente.",
        "No encontramos el pedido en el registro. Conservamos su referencia por seguridad. No hagas otra compra hasta aclarar su estado.",
        "La referencia guardada del pedido no es válida. No iniciaremos otra compra automáticamente.",
        "La información guardada del pedido no es válida. No iniciaremos otra compra automáticamente.",
        "No pudimos recuperar la referencia del pedido. No iniciaremos otra compra automáticamente.",
        "La solicitud tardó demasiado. Verifica el estado del pedido antes de intentarlo otra vez.",
        "No se pudo crear el pedido. Comprueba tu sesión y saldo.",
        "Selecciona el servidor de tu cuenta de Genshin Impact."
    ];

    if (mensajesPermitidos.includes(mensaje)) {
        return mensaje;
    }

    return "No pudimos procesar la solicitud. Consulta el estado de tu pedido antes de volver a intentarlo.";
}

function extraerProductos(resultado) {
    if (Array.isArray(resultado)) {
        return resultado;
    }

    if (!resultado || typeof resultado !== "object") {
        return [];
    }

    const listas = [
        resultado.productos,
        resultado.products,
        resultado.data,
        resultado.items,
        resultado.results,
        resultado.data?.products,
        resultado.data?.items,
        resultado.data?.results
    ];

    return listas.find(Array.isArray) || [];
}

function obtenerIdProveedor(producto) {
    const valor =
        producto?.productId ??
        producto?.product_id ??
        producto?.provider_product_id ??
        producto?.providerProductId ??
        producto?.id;

    return valor == null ? "" : String(valor).trim();
}

function obtenerNombreProveedor(producto) {
    return String(
        producto?.name ??
        producto?.productName ??
        producto?.product_name ??
        producto?.title ??
        obtenerIdProveedor(producto) ??
        `Oferta de ${NOMBRE_JUEGO || "juego"}`
    ).trim();
}

function obtenerPrecioLocal(producto) {
    const precio = Number(producto?.price_gvr);

    return Number.isFinite(precio) && precio > 0
        ? precio
        : null;
}


/* =========================================================
   SERVIDOR DE GENSHIN IMPACT
   Solo se utiliza en la página de Genshin.
   ========================================================= */

function obtenerServidorGenshin() {
    if (!ES_GENSHIN_IMPACT) {
        return null;
    }

    const zona = String(
        el("zonaJugador")?.value || ""
    ).trim();

    const servidoresValidos = [
        "America",
        "Europe",
        "Asia",
        "TW_HK_MO"
    ];

    if (!servidoresValidos.includes(zona)) {
        throw new Error(
            "Selecciona el servidor de tu cuenta de Genshin Impact."
        );
    }

    return zona;
}


/* =========================================================
   GUARDADO DEL PEDIDO PENDIENTE
   ========================================================= */

function clavePedidoPendiente(userId) {
    return `ggtopup_ofertas_${JUEGO_NORMALIZADO}_pedido_${userId}`;
}

function guardarPedidoPendiente() {
    if (!usuarioActualId || !pedidoPendienteId) return;

    try {
        localStorage.setItem(
            clavePedidoPendiente(usuarioActualId),
            JSON.stringify({
                orderId: pedidoPendienteId,
                accion: accionPendiente
            })
        );
    } catch (error) {
        console.error(
            "[Gamers Gold] No se pudo guardar el pedido:",
            error
        );
    }
}

function borrarPedidoPendiente() {
    if (usuarioActualId) {
        try {
            localStorage.removeItem(
                clavePedidoPendiente(usuarioActualId)
            );
        } catch (error) {
            console.error(
                "[Gamers Gold] No se pudo borrar el pedido:",
                error
            );
        }
    }

    pedidoPendienteId = null;
    accionPendiente = "crear";
}

function recuperarPedidoPendiente(userId) {
    let guardado;

    try {
        guardado = localStorage.getItem(
            clavePedidoPendiente(userId)
        );
    } catch {
        throw new Error(
            "No pudimos recuperar la referencia del pedido. " +
            "No iniciaremos otra compra automáticamente."
        );
    }

    if (!guardado) {
        pedidoPendienteId = null;
        accionPendiente = "crear";
        return;
    }

    let datos;

    try {
        datos = JSON.parse(guardado);
    } catch {
        throw new Error(
            "La información guardada del pedido no es válida. " +
            "No iniciaremos otra compra automáticamente."
        );
    }

    if (
        typeof datos?.orderId !== "string" ||
        !UUID_RE.test(datos.orderId)
    ) {
        throw new Error(
            "La referencia guardada del pedido no es válida. " +
            "No iniciaremos otra compra automáticamente."
        );
    }

    pedidoPendienteId = datos.orderId;

    accionPendiente =
        datos.accion === "consultar"
            ? "consultar"
            : "enviar";
}


/* =========================================================
   CATÁLOGO NEXT LEVEL
   ========================================================= */

async function consultarCatalogoNextLevel() {
    if (!JUEGO_API) {
        throw new Error(
            "El juego de esta página no está configurado correctamente."
        );
    }

    const controlador = new AbortController();

    const temporizador = setTimeout(
        () => controlador.abort(),
        TIEMPO_LIMITE
    );

    try {
        const respuesta = await fetch(
            `${URL_CATALOGO}?game=${encodeURIComponent(JUEGO_API)}`,
            {
                method: "GET",
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                    Accept: "application/json"
                },
                signal: controlador.signal,
                cache: "no-store"
            }
        );

        const texto = await respuesta.text();

        let resultado;

        try {
            resultado = JSON.parse(texto);
        } catch {
            throw new Error(
                "Respuesta no válida al cargar el catálogo."
            );
        }

        if (!respuesta.ok) {
            throw new Error(
                resultado.error ||
                resultado.message ||
                `Error HTTP ${respuesta.status}`
            );
        }

        return extraerProductos(resultado);

    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error(
                "La consulta del catálogo agotó el tiempo de espera."
            );
        }

        throw error;

    } finally {
        clearTimeout(temporizador);
    }
}

async function cargarProductosLocales() {
    const { data, error } = await supabase
        .from("game_products")
        .select(
            "id,game,product_name,price_gvr,active,provider,provider_product_id,provider_region"
        )
        .eq("provider", "nextlevel");

    if (error) {
        console.error(
            "[Gamers Gold] Error consultando productos locales:",
            error
        );

        throw new Error(
            "No se pudieron verificar los productos y sus precios GVR."
        );
    }

    productosLocales = (data || []).filter(
        producto =>
            normalizarTexto(producto.game) === JUEGO_NORMALIZADO
    );
}

function buscarProductoLocal(productoProveedor) {
    const id = obtenerIdProveedor(productoProveedor);

    return productosLocales.find(
        producto =>
            String(producto.provider_product_id || "").trim() === id
    ) || null;
}

function productoComprable(local) {
    return Boolean(
        local &&
        local.active === true &&
        local.provider === "nextlevel" &&
        String(local.provider_product_id || "").trim() &&
        obtenerPrecioLocal(local) !== null
    );
}


/* =========================================================
   TARJETAS
   ========================================================= */

function crearTarjetaOferta(oferta, proveedor) {
    const local = buscarProductoLocal(proveedor);

    const comprable =
        ES_VENTAS_HABILITADAS &&
        productoComprable(local);

    const tarjeta = document.createElement("button");

    tarjeta.type = "button";
    tarjeta.className = "boton-oferta";
    tarjeta.disabled = !comprable;

    const foto = document.createElement("div");
    foto.className = "foto-oferta";

    const emoji = document.createElement("span");
    emoji.className = "emoji-oferta";
    emoji.textContent = oferta.emoji || "🎁";

    const nombre = document.createElement("div");
    nombre.className = "nombre-oferta";
    nombre.textContent =
        oferta.nombre || obtenerNombreProveedor(proveedor);

    foto.appendChild(emoji);
    tarjeta.append(foto, nombre);

    const detalle = document.createElement("div");

    detalle.style.cssText =
        "padding:9px;font-size:13px;background:#061226;" +
        "width:100%;text-align:center;";

    if (comprable) {
        detalle.style.color = "#00baff";
        detalle.style.fontWeight = "bold";
        detalle.textContent = mostrarPrecio(local.price_gvr);

        tarjeta.addEventListener("click", () => {
            seleccionarOferta(
                tarjeta,
                oferta,
                proveedor,
                local
            );
        });
    } else {
        detalle.style.color = "#8fa5bd";

        detalle.textContent = !ES_VENTAS_HABILITADAS
            ? "Ventas de este juego aún no habilitadas"
            : "Precio pendiente o producto inactivo";
    }

    tarjeta.appendChild(detalle);

    return tarjeta;
}

async function cargarOfertas() {
    const lista = el("listaOfertas");

    if (!lista) return;

    if (el("precioSeleccionado")) {
        el("precioSeleccionado").style.display = "none";
    }

    if (el("continuarBtn")) {
        el("continuarBtn").style.display = "none";
        el("continuarBtn").disabled = true;
    }

    lista.replaceChildren();
    lista.style.display = "none";

    productoSeleccionado = null;
    precioSeleccionado = 0;
    productosMostrados = Object.create(null);

    actualizarEstadoCarga(
        "Cargando ofertas disponibles...",
        true
    );

    try {
        const [proveedor] = await Promise.all([
            consultarCatalogoNextLevel(),
            cargarProductosLocales()
        ]);

        productosProveedor = proveedor;
        productosPorId = Object.create(null);

        proveedor.forEach(producto => {
            const id = obtenerIdProveedor(producto);

            if (id) {
                productosPorId[id] = producto;
            }
        });

        const configuradas =
            Array.isArray(CONFIG?.ofertas)
                ? CONFIG.ofertas
                : [];

        let cantidad = 0;

        configuradas.forEach(oferta => {
            const id = String(oferta.id || "").trim();

            if (!id) {
                console.warn(
                    "[Gamers Gold] Oferta sin identificador:",
                    oferta
                );

                return;
            }

            const productoProveedor = productosPorId[id];

            if (!productoProveedor) {
                console.warn(
                    "[Gamers Gold] Oferta no encontrada en el catálogo:",
                    id
                );

                return;
            }

            if (
                productoProveedor.available === false ||
                productoProveedor.available === "false"
            ) {
                return;
            }

            productosMostrados[id] = {
                ...oferta,
                productoProveedor
            };

            lista.appendChild(
                crearTarjetaOferta(oferta, productoProveedor)
            );

            cantidad++;
        });

        if (!cantidad) {
            actualizarEstadoCarga(
                "No hay ofertas disponibles en este momento.",
                true
            );

            return;
        }

        lista.style.display = "flex";
        actualizarEstadoCarga("", false);

        if (el("notaOfertas")) {
            el("notaOfertas").textContent =
                ES_VENTAS_HABILITADAS
                    ? "Precios en GVR. Comprueba tu ID de jugador antes de confirmar."
                    : "Las ventas de este juego aún no están habilitadas.";
        }

    } catch (error) {
        actualizarEstadoCarga(
            mensajeErrorCatalogo(error),
            true,
            "error"
        );
    }
}

function seleccionarOferta(
    tarjeta,
    oferta,
    proveedor,
    local
) {
    if (procesandoCompra || pedidoPendienteId) {
        mostrarEstadoPedido(
            "Tienes un pedido anterior por verificar. " +
            "Consulta su estado antes de iniciar otra compra.",
            "error"
        );

        return;
    }

    if (!ES_VENTAS_HABILITADAS) {
        alert("Las ventas de este juego aún no están habilitadas.");
        return;
    }

    if (!productoComprable(local)) {
        alert("Esta oferta no tiene un precio válido o está inactiva.");
        return;
    }

    document.querySelectorAll(".boton-oferta").forEach(
        boton => boton.classList.remove("seleccionado")
    );

    tarjeta.classList.add("seleccionado");

    productoSeleccionado = {
        oferta,
        proveedor,
        local
    };

    precioSeleccionado = Number(local.price_gvr);

    if (el("precio")) {
        el("precio").textContent =
            mostrarPrecio(precioSeleccionado);
    }

    if (el("precioSeleccionado")) {
        el("precioSeleccionado").style.display = "block";
    }

    if (el("continuarBtn")) {
        el("continuarBtn").style.display = "block";
        el("continuarBtn").disabled = false;
        el("continuarBtn").textContent = "Continuar ⚡";
    }

    ocultarEstadoPedido();
}


/* =========================================================
   NAVEGACIÓN
   ========================================================= */

function cambiarPantalla(idMostrar) {
    [
        "pantallaOfertas",
        "pantallaConfirmacion",
        "pantallaExito"
    ].forEach(id => {
        const pantalla = el(id);

        if (pantalla) {
            pantalla.classList.toggle(
                "activa",
                id === idMostrar
            );
        }
    });

    window.scrollTo(0, 0);
}

function irAConfirmacion() {
    if (!ES_VENTAS_HABILITADAS) {
        alert("Las ventas de este juego aún no están habilitadas.");
        return;
    }

    if (
        !productoSeleccionado ||
        !productoComprable(productoSeleccionado.local)
    ) {
        alert("Selecciona una oferta activa con precio configurado.");
        return;
    }

    if (el("confirmarOferta")) {
        el("confirmarOferta").textContent =
            productoSeleccionado.oferta.nombre;
    }

    if (el("juegoConfirmacion")) {
        el("juegoConfirmacion").textContent = NOMBRE_JUEGO;
    }

    if (el("confirmarPrecio")) {
        el("confirmarPrecio").textContent =
            mostrarPrecio(productoSeleccionado.local.price_gvr);
    }

    if (el("idJugador")) {
        el("idJugador").value = "";
    }

    /*
     * No se cambia ni se elimina el selector de servidor.
     * Genshin necesita conservar la selección del usuario.
     */
    ocultarEstadoPedido();

    const boton = el("confirmarBtn");

    if (boton) {
        boton.disabled = false;
        boton.textContent = "Confirmar y recargar ⚡";
    }

    cambiarPantalla("pantallaConfirmacion");
}

function volverOfertas() {
    cambiarPantalla("pantallaOfertas");
    ocultarEstadoPedido();
}


/* =========================================================
   PETICIONES A LAS EDGE FUNCTIONS
   ========================================================= */

async function llamarFuncion(url, accessToken, body) {
    const controlador = new AbortController();

    const temporizador = setTimeout(
        () => controlador.abort(),
        TIEMPO_LIMITE
    );

    try {
        const respuesta = await fetch(url, {
            method: "POST",
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify(body),
            signal: controlador.signal
        });

        const texto = await respuesta.text();

        let datos;

        try {
            datos = JSON.parse(texto);
        } catch {
            throw new Error(
                "El sistema devolvió una respuesta no válida."
            );
        }

        if (!respuesta.ok) {
            console.error(
                "[Gamers Gold] Error del sistema de pedidos:",
                respuesta.status,
                datos
            );

            const mensajeBase =
                (
                    typeof datos?.error === "string" &&
                    datos.error.trim()
                ) ||
                (
                    typeof datos?.message === "string" &&
                    datos.message.trim()
                ) ||
                `La solicitud falló (HTTP ${respuesta.status}).`;

            const error = new Error(mensajeBase);

            error.status = respuesta.status;
            error.data = datos;
            error.retry_safe = datos?.retry_safe;
            error.reconciliation_required =
                datos?.reconciliation_required === true;

            throw error;
        }

        return datos;

    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error(
                "La solicitud tardó demasiado. " +
                "Verifica el estado del pedido antes de intentarlo otra vez."
            );
        }

        throw error;

    } finally {
        clearTimeout(temporizador);
    }
}


/* =========================================================
   MOSTRAR RESULTADO
   ========================================================= */

function mostrarResultado(titulo, mensaje, pedidoId) {
    if (el("tituloEstadoPedido")) {
        el("tituloEstadoPedido").textContent = titulo;
    }

    if (el("mensajeEstadoPedido")) {
        el("mensajeEstadoPedido").textContent = mensaje;
    }

    if (el("pedidoIdVisible")) {
        el("pedidoIdVisible").textContent =
            "Pedido: " + pedidoId;

        el("pedidoIdVisible").style.display = "block";
    }

    cambiarPantalla("pantallaExito");
}


/* =========================================================
   CONSULTAR ESTADO DEL PEDIDO
   ========================================================= */

async function consultarPedido(accessToken) {
    if (!pedidoPendienteId) {
        throw new Error("No hay un pedido guardado para consultar.");
    }

    const datos = await llamarFuncion(
        URL_CONSULTAR_PEDIDO,
        accessToken,
        {
            game_order_id: pedidoPendienteId
        }
    );

    const local =
        String(datos.status || "").toLowerCase();

    const proveedor =
        String(datos.provider_status || "").toUpperCase();

    if (local === "completed") {
        const id = pedidoPendienteId;

        borrarPedidoPendiente();

        mostrarResultado(
            "¡Recarga completada!",
            "Tu recarga se completó correctamente.",
            id
        );

        return;
    }

    if (local === "refunded") {
        const id = pedidoPendienteId;

        borrarPedidoPendiente();

        mostrarResultado(
            "Pedido reembolsado",
            "El pedido figura como reembolsado. " +
            "Verifica tu saldo GVR antes de volver a comprar.",
            id
        );

        return;
    }

    accionPendiente = "consultar";
    guardarPedidoPendiente();

    mostrarResultado(
        proveedor === "FAILED"
            ? "Pedido pendiente de revisión"
            : "Pedido en proceso",
        proveedor === "FAILED"
            ? "No se ha podido confirmar la recarga. No realices otra compra todavía. Verifica el estado antes de continuar."
            : "Tu pedido sigue en proceso. Puedes volver a consultar su estado dentro de unos segundos.",
        pedidoPendienteId
    );
}


/* =========================================================
   ENVIAR PEDIDO AL PROVEEDOR
   ========================================================= */

async function enviarPedido(accessToken) {
    if (!pedidoPendienteId) {
        throw new Error("No hay pedido pendiente para enviar.");
    }

    /*
     * Se conserva la referencia y se pasa a consulta antes
     * de enviar. Así no se repite una compra a ciegas si
     * se pierde la respuesta de la Edge Function.
     */
    accionPendiente = "consultar";
    guardarPedidoPendiente();

    const datos = await llamarFuncion(
        URL_CREAR_PEDIDO,
        accessToken,
        {
            game_order_id: pedidoPendienteId
        }
    );

    accionPendiente = "consultar";
    guardarPedidoPendiente();

    const idPedido = pedidoPendienteId;

    mostrarResultado(
        "Pedido enviado",
        "La solicitud fue recibida por el sistema. Consulta el estado para comprobar cuándo se completa la recarga.",
        idPedido
    );

    console.info(
        "[Gamers Gold] Respuesta de creación del pedido:",
        datos
    );
}


/* =========================================================
   VERIFICAR PEDIDO PENDIENTE EN SUPABASE
   ========================================================= */

async function verificarPedidoGuardado(userId) {
    if (!pedidoPendienteId) {
        return false;
    }

    const id = pedidoPendienteId;
    const accionAnterior = accionPendiente;

    const { data, error } = await supabase
        .from("game_orders")
        .select(
            "id,status,provider_order_id,provider_client_reference,provider_submitted_at"
        )
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        console.error(
            "[Gamers Gold] Error verificando pedido:",
            error
        );

        accionPendiente = "consultar";
        guardarPedidoPendiente();

        throw new Error(
            "No pudimos verificar tu pedido anterior. " +
            "Conservamos su referencia para evitar duplicarlo. " +
            "Intenta consultar su estado nuevamente."
        );
    }

    if (!data) {
        accionPendiente = "consultar";
        guardarPedidoPendiente();

        throw new Error(
            "No encontramos el pedido en el registro. " +
            "Conservamos su referencia por seguridad. " +
            "No hagas otra compra hasta aclarar su estado."
        );
    }

    const status = String(data.status || "").toLowerCase();

    if (status === "completed" || status === "refunded") {
        borrarPedidoPendiente();
        return false;
    }

    const tieneDatosProveedor = Boolean(
        data.provider_order_id ||
        data.provider_client_reference ||
        data.provider_submitted_at
    );

    if (tieneDatosProveedor) {
        accionPendiente = "consultar";
    } else if (accionAnterior === "consultar") {
        accionPendiente = "consultar";
    } else if (status === "pending") {
        accionPendiente = "enviar";
    } else {
        accionPendiente = "consultar";
    }

    guardarPedidoPendiente();

    return true;
}


/* =========================================================
   CREAR PEDIDO LOCAL
   ========================================================= */

/*
 * IMPORTANTE:
 * - Genshin valida y envía p_zone_id.
 * - Los demás juegos siguen enviando únicamente
 *   p_product_id y p_player_id, como antes.
 */
async function crearCompra(
    accessToken,
    playerId,
    zoneId = null
) {
    if (!productoSeleccionado) {
        throw new Error("Selecciona primero una oferta.");
    }

    const local = productoSeleccionado.local;

    if (
        !local ||
        local.active !== true ||
        local.provider !== "nextlevel" ||
        !local.provider_product_id ||
        obtenerPrecioLocal(local) === null
    ) {
        throw new Error(
            "Esta oferta no está correctamente configurada para la compra."
        );
    }

    /*
     * Validar el servidor únicamente en Genshin Impact.
     * No se exige servidor a los demás juegos.
     */
    if (ES_GENSHIN_IMPACT) {
        zoneId = String(zoneId || "").trim();

        const servidoresValidos = [
            "America",
            "Europe",
            "Asia",
            "TW_HK_MO"
        ];

        if (!servidoresValidos.includes(zoneId)) {
            throw new Error(
                "Selecciona el servidor de tu cuenta de Genshin Impact."
            );
        }
    } else {
        zoneId = null;
    }

    /*
     * Revalidar el producto en Supabase antes de cobrar.
     */
    const { data: actual, error } = await supabase
        .from("game_products")
        .select(
            "id,game,price_gvr,active,provider,provider_product_id"
        )
        .eq("id", local.id)
        .eq("provider", "nextlevel")
        .eq("active", true)
        .maybeSingle();

    if (error) {
        console.error(
            "[Gamers Gold] Error verificando el producto:",
            error
        );

        throw new Error(
            "No se pudo verificar el producto antes de comprar."
        );
    }

    if (
        !actual ||
        normalizarTexto(actual.game) !== JUEGO_NORMALIZADO ||
        String(actual.provider_product_id || "").trim() !==
            obtenerIdProveedor(productoSeleccionado.proveedor) ||
        obtenerPrecioLocal(actual) === null
    ) {
        throw new Error(
            "El producto o su precio cambió. Actualiza la página antes de comprar."
        );
    }

    const precioConfirmado = Number(actual.price_gvr);

    const confirmado = window.confirm(
        `Confirma tu oferta de ${NOMBRE_JUEGO}:\n\n` +
        `Oferta: ${productoSeleccionado.oferta.nombre}\n` +
        `ID de jugador: ${playerId}\n` +
        (
            ES_GENSHIN_IMPACT
                ? `Servidor: ${zoneId}\n`
                : ""
        ) +
        `Precio: ${mostrarPrecio(precioConfirmado)}\n\n` +
        "¿Deseas continuar con el pedido?"
    );

    if (!confirmado) {
        return;
    }

    mostrarEstadoPedido(
        "Creando tu pedido. No cierres esta página..."
    );

    /*
     * Parámetros originales para todos los juegos.
     * Solo Genshin recibe el parámetro adicional p_zone_id.
     */
    const parametrosCompra = {
        p_product_id: actual.id,
        p_player_id: playerId
    };

    if (ES_GENSHIN_IMPACT) {
        parametrosCompra.p_zone_id = zoneId;
    }

    const {
        data: orderId,
        error: errorCompra
    } = await supabase.rpc(
        "purchase_game_product",
        parametrosCompra
    );

    if (errorCompra) {
        console.error(
            "[Gamers Gold] Error creando el pedido:",
            errorCompra
        );

        throw new Error(
            "No se pudo crear el pedido. Comprueba tu sesión y saldo."
        );
    }

    if (
        typeof orderId !== "string" ||
        !UUID_RE.test(orderId)
    ) {
        /*
         * Si el RPC devolviera una forma inesperada, no se
         * inicia una segunda compra automáticamente.
         */
        throw new Error(
            "No recibimos un ID de pedido válido. " +
            "Revisa el estado del pedido antes de volver a intentarlo."
        );
    }

    pedidoPendienteId = orderId;
    accionPendiente = "enviar";

    guardarPedidoPendiente();

    await enviarPedido(accessToken);
}


/* =========================================================
   CONFIRMAR O RECUPERAR PEDIDO
   ========================================================= */

async function manejarConfirmacion() {
    if (procesandoCompra) return;

    if (!ES_VENTAS_HABILITADAS) {
        alert("Las ventas de este juego aún no están habilitadas.");
        return;
    }

    procesandoCompra = true;

    const boton = el("confirmarBtn");

    if (boton) {
        boton.disabled = true;
        boton.textContent = "Verificando pedido...";
    }

    try {
        const {
            data: { session },
            error: sessionError
        } = await supabase.auth.getSession();

        if (sessionError) {
            throw new Error("No se pudo comprobar la sesión.");
        }

        if (!session?.access_token) {
            throw new Error("Debes iniciar sesión para comprar.");
        }

        const {
            data: { user },
            error: userError
        } = await supabase.auth.getUser();

        if (userError || !user) {
            throw new Error(
                "Tu sesión no es válida o ha caducado. Inicia sesión nuevamente."
            );
        }

        usuarioActualId = user.id;

        recuperarPedidoPendiente(user.id);

        /*
         * La recuperación de pedidos existentes se conserva.
         * No se les cambia el servidor ni se crean pedidos
         * adicionales al recuperarlos.
         */
        if (pedidoPendienteId) {
            await verificarPedidoGuardado(user.id);

            if (!pedidoPendienteId) {
                mostrarResultado(
                    "Pedido anterior finalizado",
                    "El pedido anterior ya terminó. Comprueba su resultado antes de iniciar otra compra.",
                    "Finalizado"
                );

                return;
            }

            if (accionPendiente === "consultar") {
                await consultarPedido(session.access_token);
                return;
            }

            if (accionPendiente === "enviar") {
                await enviarPedido(session.access_token);
                return;
            }
        }

        const playerId = String(
            el("idJugador")?.value || ""
        ).trim();

        if (!playerId) {
            throw new Error(
                `Escribe tu ID de jugador de ${NOMBRE_JUEGO}.`
            );
        }

        if (playerId.length > 80) {
            throw new Error("El ID de jugador es demasiado largo.");
        }

        /*
         * Solo se lee zonaJugador en Genshin Impact.
         * Los demás juegos pasan null y conservan su flujo.
         */
        const zoneId = ES_GENSHIN_IMPACT
            ? obtenerServidorGenshin()
            : null;

        await crearCompra(
            session.access_token,
            playerId,
            zoneId
        );

    } catch (error) {
        console.error(
            "[Gamers Gold] Error procesando oferta:",
            error
        );

        const mensaje = mensajeErrorPedido(error);

        mostrarEstadoPedido(mensaje, "error");
        alert(mensaje);

    } finally {
        procesandoCompra = false;

        if (boton) {
            boton.disabled = !ES_VENTAS_HABILITADAS;

            boton.textContent = pedidoPendienteId
                ? (
                    accionPendiente === "enviar"
                        ? "RECUPERAR PEDIDO"
                        : "CONSULTAR PEDIDO"
                )
                : (
                    ES_VENTAS_HABILITADAS
                        ? "Confirmar y recargar ⚡"
                        : "Ventas no habilitadas"
                );
        }
    }
}


/* =========================================================
   CONSULTAR DESDE LA PANTALLA DE RESULTADO
   ========================================================= */

async function consultarDesdeResultado() {
    if (procesandoCompra) return;

    if (!pedidoPendienteId) {
        alert(
            "No hay un pedido pendiente guardado para consultar."
        );
        return;
    }

    cambiarPantalla("pantallaConfirmacion");

    /*
     * El manejador detecta el pedido guardado y lo consulta
     * sin crear un segundo pedido.
     */
    await manejarConfirmacion();
}


/* =========================================================
   INICIALIZACIÓN
   ========================================================= */

function inicializar() {
    const label =
        document.querySelector('label[for="idJugador"]');

    const input = el("idJugador");

    if (label) {
        label.textContent = TEXTO_ID;
    }

    if (input) {
        input.placeholder = PLACEHOLDER_ID;
    }

    if (el("juegoConfirmacion")) {
        el("juegoConfirmacion").textContent = NOMBRE_JUEGO;
    }

    if (el("descripcionOfertas")) {
        el("descripcionOfertas").textContent =
            `Elige una oferta especial de ${NOMBRE_JUEGO || "este juego"}.`;
    }

    if (el("notaOfertas")) {
        el("notaOfertas").textContent =
            ES_VENTAS_HABILITADAS
                ? "Precios en GVR. Comprueba tu ID de jugador antes de confirmar."
                : "Las ventas de este juego aún no están habilitadas.";
    }

    const confirmar = el("confirmarBtn");

    if (confirmar) {
        confirmar.disabled = !ES_VENTAS_HABILITADAS;

        confirmar.textContent = ES_VENTAS_HABILITADAS
            ? "Confirmar y recargar ⚡"
            : "Ventas no habilitadas";

        confirmar.addEventListener(
            "click",
            manejarConfirmacion
        );
    }

    const consultar = el("consultarPedidoBtn");

    if (consultar) {
        consultar.addEventListener(
            "click",
            consultarDesdeResultado
        );
    }

    if (el("continuarBtn")) {
        el("continuarBtn").disabled = true;
    }

    if (!CONFIG || !NOMBRE_JUEGO || !JUEGO_API) {
        actualizarEstadoCarga(
            "Esta página no está configurada correctamente.",
            true,
            "error"
        );

        return;
    }

    cargarOfertas();
}

/*
 * La página HTML no debe declarar de nuevo estas funciones:
 * el módulo es el propietario de la navegación.
 */
window.irAConfirmacion = irAConfirmacion;
window.volverOfertas = volverOfertas;

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        inicializar,
        { once: true }
    );
} else {
    inicializar();
       }
