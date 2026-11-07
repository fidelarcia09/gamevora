(function () {
    "use strict";

    const AVATARES_PREDEFINIDOS = [
        "gamer", "dragon", "rayo", "lobo", "corona", "cohete", "zorro", "escudo"
    ];

    let avatarSvgCounter = 0;

    function crearSvgAvatar(id) {
        const estilos = {
            gamer: { a: "#20d9ff", b: "#0755bd", c: "#baf7ff", cresta: '<path d="M35 23 42 8 51 22 61 7 68 24" fill="#20d9ff" stroke="#baf7ff" stroke-width="2"/>' },
            dragon: { a: "#ff765d", b: "#8c183b", c: "#ffd0a8", cresta: '<path d="M31 28 22 12 42 22 49 8 57 23 78 13 67 32" fill="#ff765d" stroke="#ffd0a8" stroke-width="2"/>' },
            rayo: { a: "#ffe05b", b: "#b56a08", c: "#fff3ae", cresta: '<path d="M58 7-20 29 13 0-8 25 27-36H56Z" fill="#ffe05b" stroke="#fff3ae" stroke-width="2" stroke-linejoin="round"/>' },
            lobo: { a: "#b5d8ff", b: "#355d9d", c: "#f2f8ff", cresta: '<path d="M29 34 20 8 43 23 56 8 79 10 69 37" fill="#b5d8ff" stroke="#f2f8ff" stroke-width="2"/>' },
            corona: { a: "#ffc95c", b: "#a65a14", c: "#fff0b0", cresta: '<path d="m27 28-7-20 19 13 11-17 12 17 19-13-7 23" fill="#ffc95c" stroke="#fff0b0" stroke-width="2"/><circle cx="20" cy="8" r="3" fill="#fff0b0"/><circle cx="50" cy="4" r="3" fill="#fff0b0"/><circle cx="80" cy="8" r="3" fill="#fff0b0"/>' },
            cohete: { a: "#8c9dff", b: "#4c36a8", c: "#dce2ff", cresta: '<path d="M50 5c15 11 19 25 18 38L50 57 32 43C31 30 36 15 50 5Z" fill="#8c9dff" stroke="#dce2ff" stroke-width="2"/><path d="m34 39-13 12 17 1M66 39l13 12-17 1" fill="#4c36a8" stroke="#dce2ff" stroke-width="2"/>' },
            zorro: { a: "#ff9b4a", b: "#a43d16", c: "#ffe0b8", cresta: '<path d="M29 39 17 7 45 25 55 25 83 7 71 39" fill="#ff9b4a" stroke="#ffe0b8" stroke-width="2"/>' },
            escudo: { a: "#69e0a5", b: "#146b61", c: "#c8ffe6", cresta: '<path d="M50 5 78 16 74 44 50 62 26 44 22 16Z" fill="#69e0a5" stroke="#c8ffe6" stroke-width="2"/><path d="m50 14 17 7-3 19-14 11-14-11-3-19Z" fill="#146b61"/>' }
        };

        const p = estilos[id];
        if (!p) return "";

        const uid = "ggav" + id + "-" + (++avatarSvgCounter);
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="Avatar gamer" focusable="false"><defs><linearGradient id="' + uid + 'bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="' + p.b + '"/><stop offset="1" stop-color="#050b18"/></linearGradient><linearGradient id="' + uid + 'metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="' + p.c + '"/><stop offset=".35" stop-color="' + p.a + '"/><stop offset="1" stop-color="' + p.b + '"/></linearGradient><filter id="' + uid + 'glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><circle cx="50" cy="50" r="48" fill="url(#' + uid + 'bg)"/><circle cx="50" cy="50" r="45" fill="none" stroke="' + p.a + '" stroke-opacity=".55" stroke-width="1.5"/><path d="M12 72 25 61M88 72 75 61" stroke="' + p.a + '" stroke-width="2" opacity=".7"/><path d="M20 91c2-17 13-25 30-25s28 8 30 25" fill="#071326" stroke="' + p.a + '" stroke-width="3"/><path d="M30 49c0-21 8-31 20-31s20 10 20 31l-5 17-15 10-15-10Z" fill="url(#' + uid + 'metal)" stroke="' + p.c + '" stroke-width="2"/>' + p.cresta + '<path d="M25 42c3-17 12-25 25-25s22 8 25 25l-8 7H33Z" fill="#07182d" stroke="' + p.a + '" stroke-width="3"/><path d="M31 43 43 39 50 41 57 39 69 43 65 54 56 59H44L35 54Z" fill="#06101f" stroke="' + p.c + '" stroke-width="1.8"/><path d="m36 47 10-2 4 3-4 4-10-1Zm28 0-10-2-4 3 4 4 10-1Z" fill="' + p.a + '" filter="url(#' + uid + 'glow)"/><path d="M42 64h16M46 69h8" stroke="' + p.c + '" stroke-width="2" stroke-linecap="round"/><path d="M18 82h12M70 82h12" stroke="' + p.a + '" stroke-width="2" stroke-linecap="round"/><circle cx="50" cy="88" r="2.5" fill="' + p.c + '"/></svg>';
    }

    function fallbackSvg() {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="16" r="9" fill="#7894b2"/><path d="M7 43c1-10 7-15 17-15s16 5 17 15" fill="#7894b2"/></svg>';
    }

    function crearElemento(datos) {
        const avatar = datos || {};
        const contenedor = document.createElement("span");
        contenedor.className = "gg-review-avatar";
        contenedor.setAttribute("aria-hidden", "true");

        const mostrarFallback = function () {
            const preset = AVATARES_PREDEFINIDOS.includes(avatar.avatar_preset)
                ? avatar.avatar_preset
                : null;
            contenedor.innerHTML = preset ? crearSvgAvatar(preset) : fallbackSvg();
        };

        if (typeof avatar.avatar_url === "string" && avatar.avatar_url) {
            const imagen = document.createElement("img");
            imagen.alt = "";
            imagen.loading = "lazy";
            imagen.decoding = "async";
            imagen.referrerPolicy = "no-referrer";
            imagen.src = avatar.avatar_url;
            imagen.onerror = mostrarFallback;
            contenedor.appendChild(imagen);
        } else {
            mostrarFallback();
        }

        return contenedor;
    }

    async function cargarPorUsuarioIds(supabaseClient, ids) {
        const resultado = new Map();
        if (!supabaseClient || !supabaseClient.functions || !Array.isArray(ids)) {
            return resultado;
        }

        const unicos = [...new Set(ids.filter((id) =>
            typeof id === "string" &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
        ))];

        for (let i = 0; i < unicos.length; i += 50) {
            try {
                const { data, error } = await supabaseClient.functions.invoke(
                    "reviews-profiles",
                    { body: { user_ids: unicos.slice(i, i + 50) } }
                );

                if (error) {
                    console.warn("No se pudieron cargar algunos avatares de reseñas:", error.message);
                    continue;
                }

                (data && Array.isArray(data.avatars) ? data.avatars : []).forEach((avatar) => {
                    if (avatar && typeof avatar.user_id === "string") {
                        resultado.set(avatar.user_id, avatar);
                    }
                });
            } catch (error) {
                console.warn("No se pudieron consultar los avatares de reseñas:", error);
            }
        }

        return resultado;
    }

    window.GGReviewAvatars = {
        crearElemento: crearElemento,
        cargarPorUsuarioIds: cargarPorUsuarioIds
    };
})();