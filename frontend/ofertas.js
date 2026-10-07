/* =========================================================
   GAMERS GOLD TOP-UP
   MOTOR UNIVERSAL DE OFERTAS
   ========================================================= */


/* =========================================================
   SUPABASE
   ========================================================= */

const supabaseClient = window.supabase.createClient(
    "https://gsuhzcavghsiolmipnzi.supabase.co",
    "sb_publishable_VEu9lvcUF1mp0xS0fXHPdA_592bfknx"
);


/* =========================================================
   CONFIGURACIÓN DEL JUEGO
   ========================================================= */

const CONFIG_OFERTAS = window.CONFIG_OFERTAS || {};

const NOMBRE_JUEGO =
    CONFIG_OFERTAS.juego || "";

const OFERTAS_CONFIG =
    CONFIG_OFERTAS.ofertas || [];

const PAGINA_VOLVER =
    CONFIG_OFERTAS.paginaVolver || "";

const TEXTO_ID =
    CONFIG_OFERTAS.textoId ||
    "ID del jugador";

const PLACEHOLDER_ID =
    CONFIG_OFERTAS.placeholderId ||
    "Escribe tu ID";


/* =========================================================
   VARIABLES
   ========================================================= */

let ofertaSeleccionada = "";

let productoSeleccionado = null;

let precioSeleccionado = 0;

let procesandoCompra = false;


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


    if (estado) {

        estado.style.display =
            "block";

        estado.textContent =
            "Cargando ofertas...";

    }


    if (lista) {

        lista.style.display =
            "none";

    }


    /* =====================================
       OBTENER NOMBRES DE LAS OFERTAS
       ===================================== */

    const nombresOfertas =
        OFERTAS_CONFIG.map(
            oferta => oferta.nombre
        );


    if (
        nombresOfertas.length === 0
    ) {

        if (estado) {

            estado.textContent =
                "No hay ofertas configuradas.";

        }

        return;
    }


    /* =====================================
       BUSCAR PRODUCTOS
       ===================================== */

    const {
        data: productos,
        error
    } =
        await supabaseClient
            .from("game_products")
            .select(
                "id, game, product_name, price_gvr, active"
            )
            .eq(
                "game",
                NOMBRE_JUEGO
            )
            .in(
                "product_name",
                nombresOfertas
            )
            .eq(
                "active",
                true
            );


    if (error) {

        console.error(
            "Error cargando productos:",
            error
        );


        if (estado) {

            estado.textContent =
                "No se pudieron cargar las ofertas.";

        }

        return;
    }


    if (
        !productos ||
        productos.length === 0
    ) {

        if (estado) {

            estado.textContent =
                "No hay ofertas disponibles.";

        }

        return;
    }


    /* =====================================
       GUARDAR PRODUCTOS
       ===================================== */

    window.productosOfertas = {};


    productos.forEach(
        function(producto) {

            window.productosOfertas[
                producto.product_name
            ] = producto;

        }
    );


    /* =====================================
       CONSTRUIR BOTONES
       ===================================== */

    if (lista) {

        lista.innerHTML = "";


        OFERTAS_CONFIG.forEach(
            function(oferta) {

                const producto =
                    window.productosOfertas[
                        oferta.nombre
                    ];


                /*
                 * Si el producto no está activo
                 * o todavía no existe en Supabase,
                 * no mostramos esa oferta.
                 */

                if (!producto) {
                    return;
                }


                const boton =
                    document.createElement(
                        "button"
                    );


                boton.type =
                    "button";

                boton.className =
                    "boton-oferta";


                boton.onclick =
                    function() {

                        seleccionarOferta(
                            boton,
                            oferta.nombre
                        );

                    };


                const foto =
                    document.createElement(
                        "div"
                    );

                foto.className =
                    "foto-oferta";


                if (oferta.imagen) {

                    const img =
                        document.createElement(
                            "img"
                        );

                    img.src =
                        oferta.imagen;

                    img.alt =
                        oferta.nombre;

                    img.style.width =
                        "100%";

                    img.style.height =
                        "100%";

                    img.style.objectFit =
                        "cover";

                    foto.appendChild(
                        img
                    );

                } else {

                    const texto =
                        document.createElement(
                            "span"
                        );

                    texto.textContent =
                        "Foto de la oferta";

                    foto.appendChild(
                        texto
                    );

                }


                const nombre =
                    document.createElement(
                        "div"
                    );

                nombre.className =
                    "nombre-oferta";

                nombre.textContent =
                    (
                        oferta.emoji ||
                        "🎁"
                    ) +
                    " " +
                    oferta.nombre;


                boton.appendChild(
                    foto
                );

                boton.appendChild(
                    nombre
                );


                lista.appendChild(
                    boton
                );

            }
        );


        if (
            lista.children.length > 0
        ) {

            lista.style.display =
                "flex";

        }

    }


    if (estado) {

        estado.style.display =
            "none";

    }

}


/* =========================================================
   SELECCIONAR OFERTA
   ========================================================= */

function seleccionarOferta(
    boton,
    nombre
) {

    const producto =
        window.productosOfertas &&
        window.productosOfertas[
            nombre
        ];


    if (!producto) {

        alert(
            "Esta oferta no está disponible."
        );

        return;
    }


    document
        .querySelectorAll(
            ".boton-oferta"
        )
        .forEach(
            function(elemento) {

                elemento.classList.remove(
                    "seleccionado"
                );

            }
        );


    boton.classList.add(
        "seleccionado"
    );


    ofertaSeleccionada =
        producto.product_name;


    productoSeleccionado =
        producto;


    precioSeleccionado =
        Number(
            producto.price_gvr
        );


    const precio =
        document.getElementById(
            "precio"
        );


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
            precioSeleccionado +
            " GVR";

    }


    if (cajaPrecio) {

        cajaPrecio.style.display =
            "block";

    }


    if (continuar) {

        continuar.style.display =
            "block";

    }

}


/* =========================================================
   IR A CONFIRMACIÓN
   ========================================================= */

function irAConfirmacion() {

    if (
        !productoSeleccionado ||
        ofertaSeleccionada === ""
    ) {

        alert(
            "Selecciona una oferta primero."
        );

        return;
    }


    document.getElementById(
        "confirmarOferta"
    ).textContent =
        ofertaSeleccionada;


    document.getElementById(
        "confirmarPrecio"
    ).textContent =
        precioSeleccionado +
        " GVR";


    document.getElementById(
        "pantallaOfertas"
    ).classList.remove(
        "activa"
    );


    document.getElementById(
        "pantallaConfirmacion"
    ).classList.add(
        "activa"
    );


    window.scrollTo(
        0,
        0
    );

}


/* =========================================================
   VOLVER A OFERTAS
   ========================================================= */

function volverOfertas() {

    document.getElementById(
        "pantallaConfirmacion"
    ).classList.remove(
        "activa"
    );


    document.getElementById(
        "pantallaOfertas"
    ).classList.add(
        "activa"
    );


    window.scrollTo(
        0,
        0
    );

}


/* =========================================================
   REALIZAR PEDIDO
   ========================================================= */

async function realizarPedido() {

    /*
     * PROTECCIÓN CONTRA DOBLE CLIC
     */

    if (
        procesandoCompra
    ) {

        return;
    }


    const campoId =
        document.getElementById(
            "idJugador"
        );


    const idJugador =
        campoId.value.trim();


    if (
        idJugador === ""
    ) {

        alert(
            `Escribe tu ${TEXTO_ID.toLowerCase()}.`
        );

        campoId.focus();

        return;
    }


    if (
        !productoSeleccionado
    ) {

        alert(
            "No hay ninguna oferta seleccionada."
        );

        return;
    }


    /* =====================================
       ACTIVAR BLOQUEO INMEDIATAMENTE
       ===================================== */

    procesandoCompra =
        true;


    const boton =
        document.getElementById(
            "confirmarBtn"
        );


    boton.disabled =
        true;

    boton.textContent =
        "Procesando compra...";


    /* =====================================
       COMPROBAR SESIÓN
       ===================================== */

    const {
        data: { session },
        error: sessionError
    } =
        await supabaseClient.auth.getSession();


    if (
        sessionError ||
        !session
    ) {

        procesandoCompra =
            false;


        boton.disabled =
            false;

        boton.textContent =
            "Confirmar compra ⚡";


        alert(
            "Debes iniciar sesión primero."
        );


        window.location.href =
            "login.html";


        return;
    }


    /* =====================================
       COMPRA REAL
       ===================================== */

    const {
        data,
        error
    } =
        await supabaseClient.rpc(
            "purchase_game_product",
            {
                p_product_id:
                    productoSeleccionado.id,

                p_player_id:
                    idJugador
            }
        );


    if (error) {

        console.error(
            "Error realizando compra:",
            error
        );


        procesandoCompra =
            false;


        boton.disabled =
            false;

        boton.textContent =
            "Confirmar compra ⚡";


        alert(
            error.message ||
            "No se pudo realizar la compra."
        );


        return;
    }


    /* =====================================
       PEDIDO REALIZADO
       ===================================== */

    console.log(
        "Compra realizada:",
        data
    );


    document.getElementById(
        "pedidoId"
    ).textContent =
        data;


    document.getElementById(
        "pantallaConfirmacion"
    ).classList.remove(
        "activa"
    );


    document.getElementById(
        "pantallaExito"
    ).classList.add(
        "activa"
    );


    window.scrollTo(
        0,
        0
    );

}


/* =========================================================
   CONFIGURAR TEXTOS DEL JUEGO
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
                "Volver a " +
                NOMBRE_JUEGO;

            volverExito.onclick =
                function() {

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
                "Ofertas especiales de " +
                NOMBRE_JUEGO +
                ".";

        }


        cargarOfertas();

    }
);
