/* =========================================================
   GAMERS GOLD TOP-UP
   MOTOR UNIVERSAL DE OFERTAS
   CATÁLOGO NEXT LEVEL
   ========================================================= */


/* =========================================================
   SUPABASE
   ========================================================= */

const SUPABASE_URL =
    "https://gsuhzcavghsiolmipnzi.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_VEu9lvcUF1mp0xS0fXHPdA_592bfknx";

const supabaseClient =
    window.supabase.createClient(
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


/* =========================================================
   CONEXIÓN CON NEXT LEVEL
   ========================================================= */

const URL_CATALOGO =
    SUPABASE_URL +
    "/functions/v1/nextlevel-catalogo";


/* =========================================================
   VARIABLES
   ========================================================= */

let ofertaSeleccionada = "";

let productoSeleccionado = null;

let precioSeleccionado = 0;

let procesandoCompra = false;


/* =========================================================
   OFERTAS ESPECIALES DE FREE FIRE
   SOLO ESTAS TRES SE MOSTRARÁN
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
   OBTENER OFERTAS CONFIGURADAS
   ========================================================= */

function obtenerProductosConfigurados() {

    if (
        NOMBRE_JUEGO.toLowerCase() === "free fire"
    ) {
        return PRODUCTOS_FREE_FIRE;
    }

    return [];
}


/* =========================================================
   CONSULTAR CATÁLOGO NEXT LEVEL
   ========================================================= */

async function consultarCatalogoNextLevel() {

    const respuesta = await fetch(
        URL_CATALOGO + "?game=free-fire",
        {
            method: "GET",
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": "Bearer " + SUPABASE_KEY,
                "Accept": "application/json"
            }
        }
    );

    let resultado;

    try {

        resultado = await respuesta.json();

    } catch {

        throw new Error(
            "El catálogo devolvió una respuesta no válida."
        );

    }

    if (!respuesta.ok) {

        throw new Error(
            resultado.error ||
            "No se pudo consultar el catálogo."
        );

    }

    if (Array.isArray(resultado)) {

        return resultado;

    }

    if (Array.isArray(resultado.productos)) {

        return resultado.productos;

    }

    if (Array.isArray(resultado.products)) {

        return resultado.products;

    }

    if (Array.isArray(resultado.data)) {

        return resultado.data;

    }

    throw new Error(
        "No se encontró la lista de productos del catálogo."
    );

}


/* =========================================================
   CARGAR OFERTAS ESPECIALES
   ========================================================= */

async function cargarOfertas() {

    const estado =
        document.getElementById(
            "estadoProductos"
        );

    const lista =
        document.getElementById(
            "listaOfertas"
        );

    const cajaPrecio =
        document.getElementById(
            "precioSeleccionado"
        );

    const botonContinuar =
        document.getElementById(
            "continuarBtn"
        );


    if (estado) {

        estado.style.display = "block";

        estado.textContent =
            "Conectando con el catálogo...";

    }

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


    try {

        if (
            NOMBRE_JUEGO.toLowerCase() !== "free fire"
        ) {

            throw new Error(
                "Este catálogo está configurado para Free Fire."
            );

        }


        /* CONSULTAR NEXT LEVEL */

        const productosProveedor =
            await consultarCatalogoNextLevel();


        console.log(
            "Productos recibidos de Next Level:",
            productosProveedor
        );


        /* INDEXAR POR IDENTIFICADOR */

        const productosPorId = {};

        productosProveedor.forEach(
            function(producto) {

                if (producto.productId) {

                    productosPorId[
                        producto.productId
                    ] = producto;

                }

            }
        );


        /* CONSERVAR SOLAMENTE LAS TRES OFERTAS */

        const ofertasDisponibles =
            obtenerProductosConfigurados()
                .map(function(configuracion) {

                    const productoProveedor =
                        productosPorId[
                            configuracion.id
                        ];

                    if (!productoProveedor) {

                        return null;

                    }

                    if (
                        productoProveedor.available === false
                    ) {

                        return null;

                    }

                    return {

                        ...configuracion,

                        productoProveedor:
                            productoProveedor

                    };

                })
                .filter(Boolean);


        window.productosOfertas = {};


        /* MOSTRAR MENSAJE SI NO HAY OFERTAS */

        if (
            ofertasDisponibles.length === 0
        ) {

            if (estado) {

                estado.style.display = "block";

                estado.textContent =
                    "No hay ofertas especiales disponibles en este momento.";

            }

            return;

        }


        /* CREAR TARJETAS */

        ofertasDisponibles.forEach(
            function(oferta) {

                window.productosOfertas[
                    oferta.id
                ] = oferta;


                const boton =
                    document.createElement("button");

                boton.type = "button";

                boton.className = "boton-oferta";


                /* ICONO */

                const foto =
                    document.createElement("div");

                foto.className = "foto-oferta";


                const emoji =
                    document.createElement("span");

                emoji.textContent =
                    oferta.emoji;

                emoji.style.fontSize = "38px";

                foto.appendChild(emoji);


                /* NOMBRE */

                const nombre =
                    document.createElement("div");

                nombre.className = "nombre-oferta";

                nombre.textContent =
                    oferta.nombre;


                /* ESTADO */

                const estadoOferta =
                    document.createElement("div");

                estadoOferta.textContent =
                    "Disponible";

                estadoOferta.style.fontSize =
                    "12px";

                estadoOferta.style.marginTop =
                    "8px";


                boton.appendChild(foto);

                boton.appendChild(nombre);

                boton.appendChild(estadoOferta);


                /* SELECCIÓN */

                boton.onclick = function() {

                    seleccionarOferta(
                        boton,
                        oferta.id
                    );

                };


                lista.appendChild(boton);

            }
        );


        lista.style.display = "flex";


        if (estado) {

            estado.style.display = "none";

        }


        console.log(
            "Ofertas especiales mostradas:",
            ofertasDisponibles.map(
                oferta => oferta.nombre
            )
        );


    } catch (error) {

        console.error(
            "Error cargando ofertas:",
            error
        );

        if (estado) {

            estado.style.display = "block";

            estado.textContent =
                "No pudimos cargar las ofertas. Inténtalo de nuevo más tarde.";

        }

    }

}


/* =========================================================
   SELECCIONAR OFERTA
   ========================================================= */

function seleccionarOferta(
    boton,
    idProducto
) {

    const oferta =
        window.productosOfertas &&
        window.productosOfertas[idProducto];


    if (!oferta) {

        alert(
            "Esta oferta no está disponible."
        );

        return;

    }


    document
        .querySelectorAll(".boton-oferta")
        .forEach(function(elemento) {

            elemento.classList.remove(
                "seleccionado"
            );

        });


    boton.classList.add("seleccionado");


    productoSeleccionado = oferta;

    ofertaSeleccionada = oferta.nombre;

    precioSeleccionado = 0;


    const precio =
        document.getElementById("precio");

    const cajaPrecio =
        document.getElementById(
            "precioSeleccionado"
        );

    const continuar =
        document.getElementById(
            "continuarBtn"
        );


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
   CONFIRMACIÓN
   ========================================================= */

function irAConfirmacion() {

    alert(
        "Las compras estarán disponibles cuando terminemos de configurar los precios y conectar los pedidos con Next Level."
    );

}


/* =========================================================
   VOLVER A OFERTAS
   ========================================================= */

function volverOfertas() {

    const pantallaConfirmacion =
        document.getElementById(
            "pantallaConfirmacion"
        );

    const pantallaOfertas =
        document.getElementById(
            "pantallaOfertas"
        );


    if (pantallaConfirmacion) {

        pantallaConfirmacion.classList.remove(
            "activa"
        );

    }

    if (pantallaOfertas) {

        pantallaOfertas.classList.add(
            "activa"
        );

    }

    window.scrollTo(0, 0);

}


/* =========================================================
   PEDIDOS DESHABILITADOS TEMPORALMENTE
   ========================================================= */

async function realizarPedido() {

    alert(
        "Las compras todavía están deshabilitadas. Estamos preparando la conexión de pedidos con Next Level."
    );

}


/* =========================================================
   CONFIGURAR INTERFAZ
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        const label =
            document.querySelector(
                'label[for="idJugador"]'
            );

        const input =
            document.getElementById(
                "idJugador"
            );

        const juegoConfirmacion =
            document.getElementById(
                "juegoConfirmacion"
            );

        const volverExito =
            document.getElementById(
                "volverJuegoBtn"
            );

        const descripcion =
            document.getElementById(
                "descripcionOfertas"
            );

        const nota =
            document.getElementById(
                "notaOfertas"
            );


        if (label) {

            label.textContent =
                TEXTO_ID;

        }

        if (input) {

            input.placeholder =
                PLACEHOLDER_ID;

        }

        if (juegoConfirmacion) {

            juegoConfirmacion.textContent =
                NOMBRE_JUEGO;

        }

        if (volverExito) {

            volverExito.textContent =
                "Volver a " + NOMBRE_JUEGO;

            volverExito.onclick = function() {

                window.location.href =
                    PAGINA_VOLVER;

            };

        }

        if (descripcion) {

            descripcion.textContent =
                "Elige una oferta especial de " +
                NOMBRE_JUEGO +
                ".";

        }

        if (nota) {

            nota.textContent =
                "Precios y compras próximamente disponibles.";

        }


        cargarOfertas();

    }
);
