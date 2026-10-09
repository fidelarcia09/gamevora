// ======================================================
// GAMERS GOLD TOP-UP
// Motor universal de ofertas especiales
// Juegos compatibles:
// Free Fire, Mobile Legends, Blood Strike,
// PUBG Mobile y Honor of Kings
// ======================================================

const SUPABASE_URL =
    "https://gsuhzcavghsiolmipnzi.supabase.co";

const SUPABASE_ANON_KEY =
    "PEGA_AQUI_TU_CLAVE_PUBLICABLE_DE_SUPABASE";

// ======================================================
// CONFIGURACIÓN DE LOS JUEGOS
// ======================================================

const JUEGOS_API = {
    "free fire": "free-fire",
    "mobile legends": "mobile-legends",
    "blood strike": "blood-strike",
    "pubg mobile": "pubg-mobile",
    "honor of kings": "honor-of-kings"
};

// ======================================================
// OFERTAS CONFIGURADAS POR JUEGO
// Los identificadores deben coincidir con el catálogo.
// ======================================================

const PRODUCTOS_FREE_FIRE = [
    // Conserva aquí los identificadores que ya usabas
    // para las ofertas especiales de Free Fire.
];

const PRODUCTOS_MOBILE_LEGENDS = [
    // Conserva aquí los identificadores que ya usabas
    // para las ofertas especiales de Mobile Legends.
];

const PRODUCTOS_BLOOD_STRIKE = [
    // Conserva aquí los identificadores que ya usabas
    // para las ofertas especiales de Blood Strike.
];

const PRODUCTOS_PUBG_MOBILE = [
    // Conserva aquí los identificadores que ya usabas
    // para las ofertas especiales de PUBG Mobile.
];

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

// ======================================================
// ESTADO
// ======================================================

let configuracionOfertas = null;
let productoSeleccionado = null;
let catalogoProductos = [];

// Permite que la página de Honor de Kings
// pueda leer la oferta seleccionada.
window.ofertaActualSeleccionada = null;

// ======================================================
// UTILIDADES
// ======================================================

function normalizarTexto(texto) {
    return String(texto || "")
        .trim()
        .toLowerCase();
}

function escaparHTML(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, caracter => {
        const entidades = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entidades[caracter];
    });
}

function obtenerProductosConfigurados(juego) {
    switch (normalizarTexto(juego)) {
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

        default:
            return [];
    }
}

function mostrarEstado(mensaje, tipo = "info") {
    const elemento = document.getElementById("estadoProductos");

    if (!elemento) return;

    elemento.textContent = mensaje;
    elemento.className = `estado-productos ${tipo}`;
    elemento.style.display = "block";
}

function ocultarEstado() {
    const elemento = document.getElementById("estadoProductos");

    if (elemento) {
        elemento.style.display = "none";
    }
}

// ======================================================
// CONSULTAR CATÁLOGO DEL PROVEEDOR
// ======================================================

async function cargarCatalogoProveedor() {
    const juego = normalizarTexto(configuracionOfertas?.juego);
    const juegoAPI = JUEGOS_API[juego];

    if (!juegoAPI) {
        throw new Error(
            `Todavía no está configurado el catálogo para ${configuracionOfertas?.juego || "este juego"}.`
        );
    }

    const respuesta = await fetch(
        `${SUPABASE_URL}/functions/v1/nextlevel-catalogo?game=${encodeURIComponent(juegoAPI)}`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
            }
        }
    );

    if (!respuesta.ok) {
        throw new Error(
            `No se pudo consultar el catálogo. Código: ${respuesta.status}`
        );
    }

    const datos = await respuesta.json();

    if (Array.isArray(datos)) {
        return datos;
    }

    if (Array.isArray(datos.productos)) {
        return datos.productos;
    }

    if (Array.isArray(datos.products)) {
        return datos.products;
    }

    if (Array.isArray(datos.data)) {
        return datos.data;
    }

    return [];
}

// ======================================================
// COMPROBAR DISPONIBILIDAD
// ======================================================

function productoDisponible(producto) {
    if (!producto) return false;

    if (
        producto.available === false ||
        producto.active === false ||
        producto.is_available === false ||
        producto.disponible === false
    ) {
        return false;
    }

    const estado = normalizarTexto(
        producto.status || producto.estado || ""
    );

    if (
        estado === "unavailable" ||
        estado === "inactive" ||
        estado === "disabled" ||
        estado === "no disponible"
    ) {
        return false;
    }

    return true;
}

function obtenerIdProveedor(producto) {
    return String(
        producto?.provider_product_id ||
        producto?.product_id ||
        producto?.productId ||
        producto?.id ||
        ""
    );
}

// ======================================================
// DIBUJAR OFERTAS
// ======================================================

function renderizarOfertas(productosConfigurados, catalogo) {
    const contenedor = document.getElementById("listaOfertas");

    if (!contenedor) return;

    contenedor.innerHTML = "";

    if (!productosConfigurados.length) {
        mostrarEstado(
            "No hay ofertas configuradas para este juego todavía.",
            "info"
        );
        return;
    }

    let ofertasEncontradas = 0;

    productosConfigurados.forEach(oferta => {
        const productoProveedor = catalogo.find(producto =>
            obtenerIdProveedor(producto) === oferta.id
        );

        if (!productoProveedor) {
            return;
        }

        ofertasEncontradas++;

        const disponible = productoDisponible(productoProveedor);

        const tarjeta = document.createElement("button");
        tarjeta.type = "button";
        tarjeta.className = "boton-oferta";
        tarjeta.setAttribute("aria-label", oferta.nombre);

        tarjeta.innerHTML = `
            <div class="foto-oferta">
                <span>${escaparHTML(oferta.emoji || "🎁")}</span>
            </div>

            <div class="informacion-oferta">
                <div class="nombre-oferta">
                    ${escaparHTML(oferta.nombre)}
                </div>

                <div class="descripcion-oferta">
                    ${disponible ? "Precio en preparación" : "No disponible"}
                </div>

                <div class="precio-oferta">
                    <span class="precio-gvr">0 GVR</span>
                    <span class="estado-precio">Pendiente</span>
                </div>
            </div>
        `;

        // No permitimos seleccionar ofertas no disponibles.
        // Incluso si están disponibles en el proveedor,
        // las compras siguen bloqueadas hasta definir precios.
        tarjeta.disabled = true;
        tarjeta.classList.add("oferta-no-disponible");
        tarjeta.title = "Compra temporalmente desactivada";

        contenedor.appendChild(tarjeta);
    });

    if (ofertasEncontradas === 0) {
        mostrarEstado(
            "No se encontraron las ofertas configuradas en el catálogo del proveedor.",
            "info"
        );
        return;
    }

    ocultarEstado();

    const nota = document.getElementById("notaOfertas");

    if (nota) {
        nota.textContent =
            "Las ofertas están en preparación. Los precios se mostrarán cuando estén configurados y verificados.";
    }
}

// ======================================================
// CARGAR OFERTAS
// ======================================================

async function cargarOfertas() {
    const contenedor = document.getElementById("listaOfertas");

    if (contenedor) {
        contenedor.innerHTML = "";
    }

    mostrarEstado("Cargando ofertas especiales...", "info");

    try {
        const productosConfigurados =
            obtenerProductosConfigurados(configuracionOfertas.juego);

        catalogoProductos = await cargarCatalogoProveedor();

        renderizarOfertas(productosConfigurados, catalogoProductos);

    } catch (error) {
        console.error("Error cargando ofertas:", error);

        mostrarEstado(
            "No se pudieron cargar las ofertas. Inténtalo de nuevo más tarde.",
            "error"
        );
    }
}

// ======================================================
// SELECCIÓN
// Las ofertas no se pueden comprar mientras el precio
// siga pendiente.
// ======================================================

function seleccionarOferta(oferta) {
    // Arreglo importante: guardar la oferta seleccionada
    // para que la página pueda consultarla correctamente.
    productoSeleccionado = oferta;
    window.ofertaActualSeleccionada = oferta;

    const precio = document.getElementById("precio");
    const precioSeleccionado = document.getElementById("precioSeleccionado");
    const continuar = document.getElementById("continuarBtn");

    if (precio) {
        precio.textContent = "Pendiente";
    }

    if (precioSeleccionado) {
        precioSeleccionado.textContent = "0 GVR";
    }

    if (continuar) {
        continuar.disabled = true;
        continuar.textContent = "Compras próximamente";
    }
}

// ======================================================
// CONFIRMACIÓN INFORMATIVA
// No crea pedidos ni llama a RPC de compra.
// ======================================================

function irAConfirmacion() {
    alert(
        "Las compras de ofertas especiales todavía están en preparación. No se ha creado ningún pedido ni se ha descontado saldo."
    );
}

function volverOfertas() {
    const pantallaConfirmacion =
        document.getElementById("pantallaConfirmacion");

    const pantallaOfertas =
        document.getElementById("pantallaOfertas");

    if (pantallaConfirmacion) {
        pantallaConfirmacion.style.display = "none";
    }

    if (pantallaOfertas) {
        pantallaOfertas.style.display = "block";
    }
}

function realizarPedido() {
    alert(
        "Las compras todavía están desactivadas porque los precios están pendientes. No se ha creado ningún pedido ni se ha descontado saldo."
    );
}

// ======================================================
// INICIALIZACIÓN
// ======================================================

document.addEventListener("DOMContentLoaded", () => {
    configuracionOfertas = window.CONFIG_OFERTAS || {};

    const titulo = document.getElementById("tituloOfertas");
    const descripcion = document.getElementById("descripcionOfertas");

    if (titulo && configuracionOfertas.juego) {
        titulo.textContent = `Ofertas Especiales | ${configuracionOfertas.juego}`;
    }

    if (descripcion && configuracionOfertas.juego) {
        descripcion.textContent =
            `Consulta las ofertas especiales de ${configuracionOfertas.juego}. Las compras estarán disponibles cuando se configuren los precios.`;
    }

    const volverJuegoBtn = document.getElementById("volverJuegoBtn");

    if (volverJuegoBtn && configuracionOfertas.paginaVolver) {
        volverJuegoBtn.onclick = () => {
            window.location.href = configuracionOfertas.paginaVolver;
        };
    }

    cargarOfertas();
});

// ======================================================
// FUNCIONES GLOBALES PARA EL HTML
// ======================================================

window.cargarOfertas = cargarOfertas;
window.seleccionarOferta = seleccionarOferta;
window.irAConfirmacion = irAConfirmacion;
window.volverOfertas = volverOfertas;
window.realizarPedido = realizarPedido;
