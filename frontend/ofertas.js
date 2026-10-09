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
   CONFIGURACIÓN
   ========================================================= */

const CONFIG_OFERTAS =
    window.CONFIG_OFERTAS || {};

const NOMBRE_JUEGO =
    CONFIG_OFERTAS.juego || "Free Fire";

const PAGINA_VOLVER =
    CONFIG_OFERTAS.paginaVolver || "juegos.html";

const TEXTO_ID =
    CONFIG_OFERTAS.textoId || "ID del jugador";

const PLACEHOLDER_ID =
    CONFIG_OFERTAS.placeholderId || "Escribe tu ID";

const OFERTAS_CONFIG =
    CONFIG_OFERTAS.ofertas || [];


/* =========================================================
   EDGE FUNCTION
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
   IDENTIFICADORES DE NEXT LEVEL
   ========================================================= */

const PRODUCTOS_FREE_FIRE = [

    {
        id: "fz-free_fire_latam-110_diamonds",
        nombre: "110 Diamantes",
        cantidad: 110,
        emoji: "💎"
    },

    {
        id: "fz-free_fire_latam-341_diamonds",
        nombre: "341 Diamantes",
        cantidad: 341,
        emoji: "💎"
    },

    {
        id: "fz-free_fire_latam-572_diamonds",
        nombre: "572 Diamantes",
        cantidad: 572,
        emoji: "💎"
    },

    {
        id: "fz-free_fire_latam-1166_diamonds",
        nombre: "1166 Diamantes",
        cantidad: 1166,
        emoji: "💎"
    },

    {
        id: "fz-free_fire_latam-2398_diamonds",
        nombre: "2398 Diamantes",
        cantidad: 2398,
        emoji: "💎"
    },

    {
        id: "fz-free_fire_latam-6160_diamonds",
        nombre: "6160 Diamantes",
        cantidad: 6160,
        emoji: "💎"
    },

    {
        id: "fz-free_fire_latam-booyah_pass",
        nombre: "Booyah Pass",
        cantidad: 0,
        emoji: "🎟️"
    },

    {
        id: "fz-free_fire_latam-weekly_membership",
        nombre: "Membresía Semanal",
        cantidad: 0,
        emoji: "📅"
    },

    {
        id: "fz-free_fire_latam-monthly_membership",
        nombre: "Membresía Mensual",
        cantidad: 0,
        emoji: "👑"
    }

];


/* =========================================================
   OBTENER CONFIGURACIÓN DE PRODUCTOS
   ========================================================= */

function obtenerProductosConfigurados() {

    if (
        NOMBRE_JUEGO.toLowerCase() === "free fire"
    ) {
        return PRODUCTOS_FREE_FIRE;
    }

    /*
       Para otros juegos añadiremos su mapeo
       cuando comprobemos sus identificadores
       reales en Next Level.
    */

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

    const resultado = await respuesta.json();

    if (!respuesta.ok) {

        throw new Error(
            resultado.error ||
            "No se pudo consultar el catálogo."
        );

    }

    let productos = [];

    if (Array.isArray(resultado)) {

        productos = resultado;

    } else if (
        Array.isArray(resultado.productos)
    ) {

        productos = resultado.productos;

    } else if (
        Array.isArray(resultado.products)
    ) {

        productos = resultado.products;

    } else if (
        Array.isArray(resultado.data)
    ) {

        productos = resultado.data;

    }

    return productos;
}


/* =========================================================
   CARGAR OFERTAS
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
                "La conexión del catálogo todavía está configurada para Free Fire."
            );

        }


        const productosProveedor =
            await consultarCatalogoNextLevel();


        console.log(
            "Catálogo recibido de Next Level:",
            productosProveedor
        );


        const productosConfigurados =
            obtenerProductosConfigurados();


        /*
           Indexar los productos recibidos por productId.
        */

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


        /*
           Conservar únicamente productos que:
           - Estén configurados.
           - Existan en el catálogo.
           - Estén disponibles.
        */

        const ofertasDisponibles =
            productosConfigurados
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


        if (estado) {

            estado.style.display = "none";

        }


        if (
            ofertasDisponibles.length === 0
        ) {

            if (estado) {

                estado.style.display = "block";

                estado.textContent =
                    "No encontramos ofertas disponibles.";

            }

            return;

        }


        window.productosOfertas = {};


        ofertasDisponibles.forEach(
            function(oferta) {

                window.productosOfertas[
                    oferta.id
                ] = oferta;

            }
        );


        /*
           Construir las tarjetas.
        */

        ofertasDisponibles.forEach(
            function(oferta) {

                const boton =
                    document.createElement("button");

                boton.type = "button";

                boton.className = "boton-oferta";


                const foto =
                    document.createElement("div");

                foto.className = "foto-oferta";


                const emoji =
                    document.createElement("span");

                emoji.textContent = oferta.emoji;

                emoji.style.fontSize = "38px";

                foto.appendChild(emoji);


                const nombre =
                    document.createElement("div");

                nombre.className = "nombre-oferta";

                nombre.textContent = oferta.nombre;


                const estadoOferta =
                    document.createElement("div");

                estadoOferta.textContent =
                    "Disponible en el catálogo";

                estadoOferta.style.fontSize = "12px";

                estadoOferta.style.marginTop = "8px";


                boton.appendChild(foto);

                boton.appendChild(nombre);

                boton.appendChild(estadoOferta);


                boton.onclick = function() {

                    seleccionarOferta(
                        boton,
                        oferta.id
                    );

                };


                lista.appendChild(boton);

            }
        );


        if (lista) {

            lista.style.display = "flex";

        }


        if (estado) {

            estado.style.display = "block";

            estado.textContent =
                "Catálogo conectado correctamente.";

        }


        console.log(
            "Ofertas disponibles:",
            ofertasDisponibles.length
        );

    } catch (error) {

        console.error(
            "Error cargando el catálogo:",
            error
        );

        if (estado) {

            estado.style.display = "block";

            estado.textContent =
                "No pudimos cargar las ofertas. " +
                "Comprueba la conexión e inténtalo de nuevo.";

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

    /*
       Los precios se configurarán posteriormente.
       No utilizamos el coste del proveedor como
       precio de venta.
    */

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
   IR A CONFIRMACIÓN
   ========================================================= */

function irAConfirmacion() {

    alert(
        "Las compras todavía están deshabilitadas mientras configuramos los precios y la conexión de pedidos."
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
   COMPRAS DESHABILITADAS TEMPORALMENTE
   ========================================================= */

async function realizarPedido() {

    alert(
        "Las compras estarán disponibles cuando terminemos de conectar y verificar los pedidos con Next Level."
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

            label.textContent = TEXTO_ID;

        }

        if (input) {

            input.placeholder = PLACEHOLDER_ID;

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
                "Ofertas de " +
                NOMBRE_JUEGO +
                " disponibles en nuestro catálogo.";

        }

        if (nota) {

            nota.textContent =
                "Los precios y las compras se habilitarán después de verificar la integración.";

        }


        cargarOfertas();

    }
);
