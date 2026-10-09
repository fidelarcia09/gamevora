/* =========================================================
GAMERS GOLD TOP-UP
MOTOR UNIVERSAL DE OFERTAS
CATÁLOGO NEXT LEVEL

JUEGOS:
FREE FIRE
MOBILE LEGENDS
BLOOD STRIKE
PUBG MOBILE
HONOR OF KINGS
ARENA BREAKOUT

IMPORTANTE:
- Solo muestra ofertas configuradas.
- Consulta el catálogo mediante una función de Supabase.
- No realiza compras.
- No crea pedidos.
- No modifica saldos.
- Precios pendientes de configurar.
========================================================= */

"use strict";

/* =========================================================
CONFIGURACIÓN
========================================================= */

const SUPABASE_URL =
    "https://gsuhzcavghsiolmipnzi.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_VEu9lvcUF1mp0xS0fXHPdA_592bfknx";

const URL_CATALOGO =
    SUPABASE_URL + "/functions/v1/nextlevel-catalogo";

const TIEMPO_LIMITE_CATALOGO = 15000;

/* =========================================================
CONFIGURACIÓN DEL JUEGO
========================================================= */

const CONFIG_OFERTAS =
    window.CONFIG_OFERTAS || {};

const NOMBRE_JUEGO =
    CONFIG_OFERTAS.juego || "Free Fire";

const PAGINA_VOLVER =
    CONFIG_OFERTAS.paginaVolver || "freefire.html";

const TEXTO_ID =
    CONFIG_OFERTAS.textoId || "ID del jugador";

const PLACEHOLDER_ID =
    CONFIG_OFERTAS.placeholderId || "Escribe tu ID";

const JUEGO_NORMALIZADO =
    NOMBRE_JUEGO.toLowerCase().trim();

const JUEGOS_API = {
    "free fire": "free-fire",
    "mobile legends": "mobile-legends",
    "blood strike": "blood-strike",
    "pubg mobile": "pubg-mobile",
    "honor of kings": "honor-of-kings",
    "arena breakout": "arena-breakout"
};

const JUEGO_API =
    JUEGOS_API[JUEGO_NORMALIZADO];

/* =========================================================
VARIABLES
========================================================= */

let ofertaSeleccionada = "";
let productoSeleccionado = null;
let precioSeleccionado = 0;
let procesandoCompra = false;

/* =========================================================
OFERTAS DE FREE FIRE
========================================================= */

const PRODUCTOS_FREE_FIRE = [
    {
        id: "fz-free_fire_latam-booyah_pass",
        nombre: "Booyah Pass",
        emoji: "🎟️"
    },
    {
        id: "fz-free_fire_latam-weekly_membership",
        nombre: "Membresía Semanal",
        emoji: "💎"
    },
    {
        id: "fz-free_fire_latam-monthly_membership",
        nombre: "Membresía Mensual",
        emoji: "👑"
    }
];

/* =========================================================
OFERTAS DE MOBILE LEGENDS
========================================================= */

const PRODUCTOS_MOBILE_LEGENDS = [
    {
        id: "fz-mobile_legends_global-weekly_elite_pack",
        nombre: "Weekly Elite Pack",
        emoji: "🎁"
    },
    {
        id: "fz-mobile_legends_global-weekly_pass",
        nombre: "Weekly Pass",
        emoji: "🎟️"
    },
    {
        id: "fz-mobile_legends_global-weekly_diamond_pass",
        nombre: "Weekly Diamond Pass",
        emoji: "💎"
    },
    {
        id: "fz-mobile_legends_global-monthly_elite_pack",
        nombre: "Monthly Elite Pack",
        emoji: "👑"
    },
    {
        id: "fz-mobile_legends_global-twilight_pass",
        nombre: "Twilight Pass",
        emoji: "🌌"
    }
];

/* =========================================================
OFERTAS DE BLOOD STRIKE
========================================================= */

const PRODUCTOS_BLOOD_STRIKE = [
    {
        id: "fz-blood_strike-lucky_bag_week",
        nombre: "Semana de Bolsa de la Suerte",
        emoji: "🎁"
    },
    {
        id: "fz-blood_strike-level_up_pass",
        nombre: "Level Up Pass",
        emoji: "🚀"
    },
    {
        id: "fz-blood_strike-strike_pass_elite",
        nombre: "Strike Pass Elite",
        emoji: "🎟️"
    },
    {
        id: "fz-blood_strike-strike_pass_premium",
        nombre: "Strike Pass Premium",
        emoji: "👑"
    }
];

/* =========================================================
OFERTAS DE PUBG MOBILE
SOLO OFERTAS ESPECIALES
========================================================= */

const PRODUCTOS_PUBG_MOBILE = [
    {
        id: "fz-pubg_mobile_auto-elite_pass_lv1_100",
        nombre: "Elite Pass LV1-100",
        emoji: "🎟️"
    },
    {
        id: "fz-pubg_mobile_auto-elite_pass_lv1_50",
        nombre: "Elite Pass LV1-50",
        emoji: "🎟️"
    },
    {
        id: "fz-pubg_mobile_auto-elite_pass_plus_lv1_100",
        nombre: "Elite Pass Plus LV1-100",
        emoji: "👑"
    },
    {
        id: "fz-pubg_mobile_auto-first_purchase_pack",
        nombre: "First Purchase Pack",
        emoji: "🎁"
    },
    {
        id: "fz-pubg_mobile_auto-mythic_emblem_pack",
        nombre: "Mythic Emblem Pack",
        emoji: "💎"
    },
    {
        id: "fz-pubg_mobile_auto-prime_1_month",
        nombre: "Prime (1 Month)",
        emoji: "⭐"
    },
    {
        id: "fz-pubg_mobile_auto-prime_3_months",
        nombre: "Prime (3 Months)",
        emoji: "⭐"
    },
    {
        id: "fz-pubg_mobile_auto-prime_6_months",
        nombre: "Prime (6 Months)",
        emoji: "⭐"
    },
    {
        id: "fz-pubg_mobile_auto-prime_12_months",
        nombre: "Prime (12 Months)",
        emoji: "⭐"
    },
    {
        id: "fz-pubg_mobile_auto-prime_plus_1_month",
        nombre: "Prime Plus (1 Month)",
        emoji: "👑"
    },
    {
        id: "fz-pubg_mobile_auto-prime_plus_3_months",
        nombre: "Prime Plus (3 Months)",
        emoji: "👑"
    },
    {
        id: "fz-pubg_mobile_auto-prime_plus_6_months",
        nombre: "Prime Plus (6 Months)",
        emoji: "👑"
    },
    {
        id: "fz-pubg_mobile_auto-prime_plus_12_months",
        nombre: "Prime Plus (12 Months)",
        emoji: "👑"
    },
    {
        id: "fz-pubg_mobile_auto-upgradable_firearm_materials_pack",
        nombre: "Upgradable Firearm Materials Pack",
        emoji: "🔥"
    },
    {
        id: "fz-pubg_mobile_auto-weekly_deal_pack_1",
        nombre: "Weekly Deal Pack 1",
        emoji: "🎁"
    },
    {
        id: "fz-pubg_mobile_auto-weekly_deal_pack_2",
        nombre: "Weekly Deal Pack 2",
        emoji: "🎁"
    },
    {
        id: "fz-pubg_mobile_auto-weekly_mythic_emblem_value_pack",
        nombre: "Weekly Mythic Emblem Value Pack",
        emoji: "💎"
    }
];

/* =========================================================
OFERTAS DE HONOR OF KINGS
========================================================= */

const PRODUCTOS_HONOR_OF_KINGS = [
    {
        id: "fz-honor_of_kings-standard_purchase_rebate_pack",
        nombre: "Standard Purchase Rebate Pack",
        emoji: "🎁"
    },
    {
        id: "fz-honor_of_kings-weekly_card",
        nombre: "Weekly Card",
        emoji: "📅"
    },
    {
        id: "fz-honor_of_kings-premium_purchase_rebate_pack",
        nombre: "Premium Purchase Rebate Pack",
        emoji: "👑"
    },
    {
        id: "fz-honor_of_kings-weekly_card_plus",
        nombre: "Weekly Card Plus",
        emoji: "⭐"
    }
];

/* =========================================================
OFERTAS DE ARENA BREAKOUT
========================================================= */

const PRODUCTOS_ARENA_BREAKOUT = [
    {
        id: "fz-arena_breakout-beginner_select",
        nombre: "Beginner Select",
        emoji: "🎯"
    },
    {
        id: "fz-arena_breakout-66_bonds",
        nombre: "66 Bonds",
        emoji: "💎"
    },
    {
        id: "fz-arena_breakout-monthly_advanced_battle_pass_activation_pass",
        nombre: "Monthly Advanced Battle Pass Activation Pass",
        emoji: "🎟️"
    },
    {
        id: "fz-arena_breakout-bulletproof_case_30d",
        nombre: "Bulletproof Case (30d)",
        emoji: "🛡️"
    },
    {
        id: "fz-arena_breakout-bulletproof_case_privileges",
        nombre: "Bulletproof Case Privileges",
        emoji: "🔒"
    },
    {
        id: "fz-arena_breakout-monthly_premium_battle_pass_activation_pass",
        nombre: "Monthly Premium Battle Pass Activation Pass",
        emoji: "👑"
    },
    {
        id: "fz-arena_breakout-335_bonds",
        nombre: "335 Bonds",
        emoji: "💎"
    },
    {
        id: "fz-arena_breakout-composition_case_30d",
        nombre: "Composition Case (30d)",
        emoji: "📦"
    },
    {
        id: "fz-arena_breakout-composite_case_privileges",
        nombre: "Composite Case Privileges",
        emoji: "🔐"
    },
    {
        id: "fz-arena_breakout-675_bonds",
        nombre: "675 Bonds",
        emoji: "💎"
    },
    {
        id: "fz-arena_breakout-quarterly_premium_battle_pass_bundle_activation_pass_bundle",
        nombre: "Quarterly Premium Battle Pass Bundle Activation Pass Bundle",
        emoji: "🎁"
    },
    {
        id: "fz-arena_breakout-1690_bonds",
        nombre: "1690 Bonds",
        emoji: "💠"
    },
    {
        id: "fz-arena_breakout-3400_bonds",
        nombre: "3400 Bonds",
        emoji: "💎"
    },
    {
        id: "fz-arena_breakout-6820_bonds",
        nombre: "6820 Bonds",
        emoji: "🔥"
    }
];

/* =========================================================
OBTENER OFERTAS CONFIGURADAS
========================================================= */

function obtenerProductosConfigurados() {
    switch (JUEGO_NORMALIZADO) {
        case "free fire":
            return PRODUCTOS_FREE_FIRE;

        case "mobile legends":
            return PRODUCTOS_MOBILE_LEGENDS;

        case "blood strike":
            return PRODUCTOS_BLOOD_STRIKE;

        case "pubg mobile":
            return PRODUCTOS_PUBG_MOBILE;

        case "honor of kings":
            return PRODUCTOS_HONOR_OF_KINGS;

        case "arena breakout":
            return PRODUCTOS_ARENA_BREAKOUT;

        default:
            return [];
    }
}

/* =========================================================
GESTIÓN DE INDICADORES DE CARGA
========================================================= */

function actualizarEstadoCarga(mensaje, mostrar = true) {
    const estadoProductos =
        document.getElementById("estadoProductos");

    const estadoCarga =
        document.getElementById("estadoCarga");

    if (estadoCarga) {
        estadoCarga.style.display = "none";
    }

    if (estadoProductos) {
        estadoProductos.textContent = mensaje;
        estadoProductos.style.display =
            mostrar ? "block" : "none";
    }
}

/* =========================================================
CONSULTAR CATÁLOGO NEXT LEVEL
========================================================= */

async function consultarCatalogoNextLevel() {
    if (!JUEGO_API) {
        throw new Error(
            "Juego no configurado: " + NOMBRE_JUEGO
        );
    }

    const controlador = new AbortController();

    const temporizador = setTimeout(function() {
        controlador.abort();
    }, TIEMPO_LIMITE_CATALOGO);

    try {
        const url =
            URL_CATALOGO +
            "?game=" +
            encodeURIComponent(JUEGO_API);

        const respuesta = await fetch(url, {
            method: "GET",
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": "Bearer " + SUPABASE_KEY,
                "Accept": "application/json"
            },
            signal: controlador.signal
        });

        const texto = await respuesta.text();

        let resultado;

        try {
            resultado = JSON.parse(texto);
        } catch {
            console.error(
                "Respuesta no JSON del catálogo:",
                texto.slice(0, 500)
            );

            throw new Error(
                "El catálogo devolvió una respuesta no válida."
            );
        }

        if (!respuesta.ok) {
            console.error(
                "Error HTTP del catálogo:",
                respuesta.status,
                resultado
            );

            throw new Error(
                resultado.error ||
                resultado.message ||
                "Error HTTP " + respuesta.status
            );
        }

        if (Array.isArray(resultado)) {
            return resultado;
        }

        const listasPosibles = [
            resultado.productos,
            resultado.products,
            resultado.data,
            resultado.items,
            resultado.results,
            resultado.data?.productos,
            resultado.data?.products,
            resultado.data?.items,
            resultado.data?.results
        ];

        for (const lista of listasPosibles) {
            if (Array.isArray(lista)) {
                return lista;
            }
        }

        console.error(
            "Formato inesperado del catálogo:",
            resultado
        );

        throw new Error(
            resultado.error ||
            "No se encontró la lista de productos."
        );

    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error(
                "El catálogo tardó más de 15 segundos en responder."
            );
        }

        console.error(
            "Error consultando Next Level:",
            error
        );

        throw error;

    } finally {
        clearTimeout(temporizador);
    }
}

/* =========================================================
OBTENER IDENTIFICADOR DEL PRODUCTO
========================================================= */

function obtenerIdProveedor(producto) {
    const posiblesIds = [
        producto?.productId,
        producto?.product_id,
        producto?.provider_product_id,
        producto?.providerProductId,
        producto?.id
    ];

    for (const valor of posiblesIds) {
        if (
            valor !== undefined &&
            valor !== null &&
            String(valor).trim() !== ""
        ) {
            return String(valor).trim();
        }
    }

    return null;
}

/* =========================================================
CARGAR OFERTAS ESPECIALES
========================================================= */

async function cargarOfertas() {
    const lista =
        document.getElementById("listaOfertas");

    const cajaPrecio =
        document.getElementById("precioSeleccionado");

    const botonContinuar =
        document.getElementById("continuarBtn");

    const estadoCarga =
        document.getElementById("estadoCarga");

    if (estadoCarga) {
        estadoCarga.style.display = "none";
    }

    actualizarEstadoCarga(
        "Conectando con el catálogo...",
        true
    );

    if (lista) {
        lista.style.display = "none";
        lista.innerHTML = "";
    }

    if (cajaPrecio) {
        cajaPrecio.style.display = "none";
    }

    if (botonContinuar) {
        botonContinuar.style.display = "none";
        botonContinuar.disabled = true;
    }

    ofertaSeleccionada = "";
    productoSeleccionado = null;
    precioSeleccionado = 0;

    window.productosOfertas = {};

    try {
        const productosProveedor =
            await consultarCatalogoNextLevel();

        const productosPorId = {};

        productosProveedor.forEach(function(producto) {
            const id = obtenerIdProveedor(producto);

            if (id) {
                productosPorId[id] = producto;
            }
        });

        const ofertasConfiguradas =
            obtenerProductosConfigurados();

        const ofertasDisponibles =
            ofertasConfiguradas
                .map(function(configuracion) {
                    const productoProveedor =
                        productosPorId[configuracion.id];

                    if (!productoProveedor) {
                        console.warn(
                            "Oferta no encontrada:",
                            configuracion.id
                        );

                        return null;
                    }

                    if (
                        productoProveedor.available === false ||
                        productoProveedor.available === "false"
                    ) {
                        return null;
                    }

                    return {
                        ...configuracion,
                        productoProveedor
                    };
                })
                .filter(Boolean);

        if (ofertasDisponibles.length === 0) {
            actualizarEstadoCarga(
                "No hay ofertas especiales disponibles en este momento.",
                true
            );

            console.warn(
                "Juego:",
                JUEGO_API,
                "Productos recibidos:",
                productosProveedor.length
            );

            console.log(
                "IDs recibidos:",
                productosProveedor.map(obtenerIdProveedor)
            );

            return;
        }

        ofertasDisponibles.forEach(function(oferta) {
            window.productosOfertas[oferta.id] = oferta;

            const boton =
                document.createElement("button");

            boton.type = "button";
            boton.className = "boton-oferta";

            const foto =
                document.createElement("div");

            foto.className = "foto-oferta";

            const emoji =
                document.createElement("span");

            emoji.className = "emoji-oferta";
            emoji.textContent = oferta.emoji;

            foto.appendChild(emoji);

            const nombre =
                document.createElement("div");

            nombre.className = "nombre-oferta";
            nombre.textContent = oferta.nombre;

            boton.appendChild(foto);
            boton.appendChild(nombre);

            boton.addEventListener("click", function() {
                seleccionarOferta(boton, oferta.id);
            });

            lista.appendChild(boton);
        });

        lista.style.display = "flex";

        actualizarEstadoCarga("", false);

        console.log(
            "Ofertas mostradas:",
            NOMBRE_JUEGO,
            ofertasDisponibles.map(function(oferta) {
                return oferta.nombre;
            })
        );

    } catch (error) {
        console.error(
            "Error cargando ofertas:",
            error
        );

        actualizarEstadoCarga(
            "No pudimos cargar las ofertas. " +
            (error.message || "Comprueba tu conexión."),
            true
        );
    }
}

/* =========================================================
SELECCIONAR OFERTA
COMPRAS DESACTIVADAS
========================================================= */

function seleccionarOferta(boton, idProducto) {
    const oferta =
        window.productosOfertas &&
        window.productosOfertas[idProducto];

    if (!oferta) {
        alert("Esta oferta no está disponible.");
        return;
    }

    document
        .querySelectorAll(".boton-oferta")
        .forEach(function(elemento) {
            elemento.classList.remove("seleccionado");
        });

    boton.classList.add("seleccionado");

    productoSeleccionado = oferta;
    ofertaSeleccionada = oferta.nombre;
    precioSeleccionado = 0;

    const precio =
        document.getElementById("precio");

    const cajaPrecio =
        document.getElementById("precioSeleccionado");

    const continuar =
        document.getElementById("continuarBtn");

    if (precio) {
        precio.textContent =
            "Precio pendiente de configurar";
    }

    if (cajaPrecio) {
        cajaPrecio.style.display = "block";
    }

    if (continuar) {
        continuar.style.display = "block";
        continuar.disabled = true;
        continuar.textContent =
            "Compra temporalmente deshabilitada";
    }
}

/* =========================================================
CONFIRMACIÓN DESACTIVADA
========================================================= */

function irAConfirmacion() {
    alert(
        "Las compras estarán disponibles cuando terminemos " +
        "de configurar los precios y conectar los pedidos con Next Level."
    );
}

/* =========================================================
VOLVER A OFERTAS
========================================================= */

function volverOfertas() {
    const pantallaConfirmacion =
        document.getElementById("pantallaConfirmacion");

    const pantallaOfertas =
        document.getElementById("pantallaOfertas");

    if (pantallaConfirmacion) {
        pantallaConfirmacion.classList.remove("activa");
    }

    if (pantallaOfertas) {
        pantallaOfertas.classList.add("activa");
    }

    window.scrollTo(0, 0);
}

/* =========================================================
PEDIDOS DESACTIVADOS
========================================================= */

async function realizarPedido() {
    alert(
        "Las compras todavía están deshabilitadas. " +
        "Estamos preparando la conexión de pedidos con Next Level."
    );
}

/* =========================================================
INICIALIZAR INTERFAZ
========================================================= */

function inicializarMotorOfertas() {
    const label =
        document.querySelector('label[for="idJugador"]');

    const input =
        document.getElementById("idJugador");

    const juegoConfirmacion =
        document.getElementById("juegoConfirmacion");

    const volverExito =
        document.getElementById("volverJuegoBtn");

    const descripcion =
        document.getElementById("descripcionOfertas");

    const nota =
        document.getElementById("notaOfertas");

    if (label) {
        label.textContent = TEXTO_ID;
    }

    if (input) {
        input.placeholder = PLACEHOLDER_ID;
    }

    if (juegoConfirmacion) {
        juegoConfirmacion.textContent = NOMBRE_JUEGO;
    }

    if (volverExito) {
        volverExito.textContent =
            "Volver a " + NOMBRE_JUEGO;

        volverExito.onclick = function() {
            window.location.href = PAGINA_VOLVER;
        };
    }

    if (descripcion) {
        descripcion.textContent =
            "Elige una oferta especial de " +
            NOMBRE_JUEGO + ".";
    }

    if (nota) {
        nota.textContent =
            "Precios y compras próximamente disponibles.";
    }

    if (!JUEGO_API) {
        actualizarEstadoCarga(
            "Este juego todavía no está configurado en el motor.",
            true
        );
        return;
    }

    cargarOfertas();
}

/* =========================================================
INICIO SEGURO
========================================================= */

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        inicializarMotorOfertas,
        { once: true }
    );
} else {
    inicializarMotorOfertas();
    }
