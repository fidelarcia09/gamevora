(() => {
  "use strict";
  const SUPABASE_URL = "https://gsuhzcavghsiolmipnzi.supabase.co";
  const SUPABASE_KEY = "sb_publishable_VEu9lvcUF1mp0xS0fXHPdA_592bfknx";
  const MESSAGE_DEFAULT = "Estamos realizando mejoras para ofrecerte un mejor servicio. Volveremos pronto.";
  const CSS = `
    :root{color-scheme:dark}
    .gg-maintenance-root{min-height:100vh;display:grid;place-items:center;padding:28px 18px;background:radial-gradient(ellipse at 50% 0%,rgba(0,124,255,.2),transparent 46%),radial-gradient(ellipse at 50% 100%,rgba(32,197,255,.08),transparent 42%),#050b18;color:#f4f8ff;font-family:Arial,Helvetica,sans-serif}
    .gg-maintenance-card{width:min(100%,520px);padding:34px 24px;border:1px solid rgba(32,197,255,.28);border-radius:26px 9px 26px 26px;background:linear-gradient(145deg,rgba(13,30,53,.98),rgba(6,15,30,.99));box-shadow:0 20px 70px rgba(0,0,0,.4),0 0 34px rgba(0,124,255,.12);text-align:center}
    .gg-maintenance-mark{display:grid;place-items:center;width:92px;height:92px;margin:0 auto 22px;border:1px solid rgba(32,197,255,.38);border-radius:26px;background:linear-gradient(145deg,rgba(0,124,255,.22),rgba(32,197,255,.06));color:#20c5ff;box-shadow:0 0 30px rgba(0,124,255,.18),inset 0 1px 0 rgba(255,255,255,.12)}
    .gg-maintenance-mark svg{width:52px;height:52px;fill:none;stroke:currentColor;stroke-width:1.55;stroke-linecap:round;stroke-linejoin:round}
    .gg-maintenance-brand{color:#20c5ff;font-size:11px;font-weight:900;letter-spacing:2.3px}
    .gg-maintenance-title{margin:12px 0 10px;font-size:clamp(23px,6vw,31px);font-weight:900;line-height:1.2}
    .gg-maintenance-copy{color:#aebfd3;font-size:14px;line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere}
    .gg-maintenance-line{width:76px;height:3px;margin:24px auto 0;border-radius:5px;background:linear-gradient(90deg,#087cff,#20c5ff);box-shadow:0 0 14px rgba(32,197,255,.55)}
    .gg-maintenance-admin{margin-top:22px;padding:10px 18px;border:1px solid rgba(32,197,255,.48);border-radius:10px;background:rgba(0,124,255,.14);color:#8be1ff;font-size:12px;font-weight:900;cursor:pointer}
    .gg-maintenance-panel{margin-top:18px;padding:17px;border:1px solid rgba(32,197,255,.25);border-radius:14px;background:rgba(3,12,26,.8);text-align:left}
    .gg-maintenance-panel[hidden]{display:none}
    .gg-maintenance-label{display:block;margin:0 0 8px;color:#c5d8eb;font-size:12px;font-weight:800}
    .gg-maintenance-textarea{width:100%;min-height:100px;padding:12px;border:1px solid rgba(105,158,215,.28);border-radius:10px;outline:none;resize:vertical;background:#071326;color:#f4f8ff;font:13px/1.5 Arial,Helvetica,sans-serif}
    .gg-maintenance-textarea:focus{border-color:#20c5ff;box-shadow:0 0 0 3px rgba(32,197,255,.1)}
    .gg-maintenance-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:12px}
    .gg-maintenance-action{min-height:40px;padding:0 14px;border:1px solid rgba(32,197,255,.35);border-radius:10px;background:linear-gradient(100deg,#087cff,#00aeea);color:white;font-size:12px;font-weight:900;cursor:pointer}
    .gg-maintenance-action.secondary{background:rgba(255,255,255,.05);border-color:rgba(155,181,211,.25);color:#cbd9e8}
    .gg-maintenance-action:disabled{opacity:.55;cursor:wait}
    .gg-maintenance-status{margin-top:10px;color:#91a8c1;font-size:11px;line-height:1.5}
    .gg-maintenance-status.error{color:#ff9ba8}.gg-maintenance-status.ok{color:#72e6b0}
    .gg-maintenance-admin-controls{margin-top:18px;padding:16px;border:1px solid rgba(32,197,255,.26);border-radius:14px;background:rgba(5,18,36,.78)}
    .gg-maintenance-admin-controls h3{color:#eaf7ff;font-size:14px}
    .gg-maintenance-admin-controls p{margin:5px 0 12px;color:#9aadc4;font-size:11px;line-height:1.5}
    html.gg-maintenance-pending body{visibility:hidden!important}
    @media(max-width:420px){.gg-maintenance-card{padding:28px 18px}.gg-maintenance-mark{width:82px;height:82px}}
  `;
  function loadSupabase() {
    if (window.supabase?.createClient) return Promise.resolve(window.supabase);
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.onload = () => window.supabase?.createClient ? resolve(window.supabase) : reject(new Error("Supabase no disponible"));
      script.onerror = () => reject(new Error("No se pudo cargar Supabase"));
      document.head.appendChild(script);
    });
  }
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function addStyles() {
    if (document.getElementById("gg-maintenance-styles")) return;
    const style = document.createElement("style");
    style.id = "gg-maintenance-styles";
    style.textContent = CSS;
    document.head.appendChild(style);
  }
  async function init() {
    addStyles();
    const sdk = await loadSupabase();
    const client = sdk.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    const [{ data: sessionData }, { data: statusData, error: statusError }] = await Promise.all([
      client.auth.getSession(),
      client.rpc("get_site_maintenance_status")
    ]);
    const session = sessionData?.session;
    const isAdmin = String(session?.user?.email || "").trim().toLowerCase() === "fidelarciatamayo99@gmail.com";
    if (statusError || !statusData) {
      document.documentElement.classList.remove("gg-maintenance-pending");
      console.error("No se pudo comprobar el mantenimiento:", statusError);
      return;
    }
    const status = typeof statusData === "string" ? JSON.parse(statusData) : statusData;
    if (status.active === true && !isAdmin) {
      renderMaintenance(client, false, status.message || MESSAGE_DEFAULT);
      return;
    }
    document.documentElement.classList.remove("gg-maintenance-pending");
    if (isAdmin && location.pathname.endsWith("/notificaciones.html")) {
      addLiveAdminControls(client, status);
    }
  }
  function createAdminPanel(client, host, initialMessage, onClose) {
    const panel = el("section", "gg-maintenance-panel");
    const label = el("label", "gg-maintenance-label", "Mensaje que verán los usuarios");
    const area = el("textarea", "gg-maintenance-textarea");
    area.maxLength = 500;
    area.value = initialMessage || MESSAGE_DEFAULT;
    label.appendChild(area);
    const actions = el("div", "gg-maintenance-actions");
    const save = el("button", "gg-maintenance-action secondary", "Guardar mensaje");
    save.type = "button";
    const off = el("button", "gg-maintenance-action", "Desactivar mantenimiento");
    off.type = "button";
    const note = el("p", "gg-maintenance-status");
    actions.append(save, off);
    panel.append(label, actions, note);
    async function change(active, button) {
      const message = area.value.trim();
      if (!message) {
        note.textContent = "Escribe un mensaje para los usuarios.";
        note.className = "gg-maintenance-status error";
        return;
      }
      button.disabled = true;
      save.disabled = true;
      off.disabled = true;
      note.className = "gg-maintenance-status";
      note.textContent = active ? "Guardando mensaje…" : "Desactivando mantenimiento…";
      const { data, error } = await client.rpc("set_site_maintenance", {
        p_active: active,
        p_message: message
      });
      if (error || data?.ok !== true) {
        note.textContent = error?.message || "No se pudo actualizar el mantenimiento.";
        note.className = "gg-maintenance-status error";
        button.disabled = false;
        save.disabled = false;
        off.disabled = false;
        return;
      }
      if (!active) {
        note.textContent = "Mantenimiento desactivado. Recargando…";
        location.reload();
        return;
      }
      note.textContent = "Mensaje actualizado correctamente.";
      note.className = "gg-maintenance-status ok";
      button.disabled = false;
      save.disabled = false;
      off.disabled = false;
    }
    save.addEventListener("click", () => change(true, save));
    off.addEventListener("click", () => change(false, off));
    host.appendChild(panel);
    return panel;
  }
  function renderMaintenance(client, isAdmin, message) {
    document.body.replaceChildren();
    document.body.style.margin = "0";
    const root = el("main", "gg-maintenance-root");
    const card = el("section", "gg-maintenance-card");
    const mark = el("div", "gg-maintenance-mark");
    mark.innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M28 7a13 13 0 0 0 13 17L24 41 7 24 24 7a13 13 0 0 0 4 0Z"/><path d="m18 30 12-12M13 13l5 5M30 30l5 5"/></svg>';
    card.append(mark, el("div", "gg-maintenance-brand", "GAMERS GOLD TOP-UP"));
    card.append(el("h1", "gg-maintenance-title", "Estamos en mantenimiento"));
    card.append(el("p", "gg-maintenance-copy", message));
    card.append(el("div", "gg-maintenance-line"));
    if (isAdmin) {
      const toggle = el("button", "gg-maintenance-admin", "Admin");
      toggle.type = "button";
      toggle.setAttribute("aria-expanded", "false");
      const host = el("div", "");
      host.hidden = true;
      toggle.addEventListener("click", () => {
        host.hidden = !host.hidden;
        toggle.setAttribute("aria-expanded", String(!host.hidden));
        toggle.textContent = host.hidden ? "Admin" : "Cerrar Admin";
      });
      card.append(toggle);
      createAdminPanel(client, host, message);
      card.append(host);
    }
    root.append(card);
    document.body.append(root);
    document.documentElement.classList.remove("gg-maintenance-pending");
  }
  function addLiveAdminControls(client, currentStatus) {
    const adminCard = document.getElementById("adminCard");
    if (!adminCard || document.getElementById("ggMaintenanceLiveControls")) return;
    const section = el("section", "gg-maintenance-admin-controls");
    section.id = "ggMaintenanceLiveControls";
    section.append(el("h3", "", "Modo mantenimiento"));
    section.append(el("p", "", "Solo fidelarciatamayo99@gmail.com puede navegar durante el mantenimiento y controlar su activación. Los demás usuarios verán únicamente la pantalla de mantenimiento."));
    const label = el("label", "gg-maintenance-label", "Mensaje que verán los usuarios");
    const area = el("textarea", "gg-maintenance-textarea");
    area.maxLength = 500;
    area.value = currentStatus?.message || MESSAGE_DEFAULT;
    label.appendChild(area);
    const actions = el("div", "gg-maintenance-actions");
    const toggle = el("button", "gg-maintenance-action", currentStatus?.active ? "Desactivar mantenimiento" : "Activar mantenimiento");
    toggle.type = "button";
    const note = el("p", "gg-maintenance-status");
    toggle.addEventListener("click", async () => {
      const message = area.value.trim();
      if (!message) {
        note.textContent = "Escribe un mensaje para los usuarios.";
        note.className = "gg-maintenance-status error";
        return;
      }
      const nextActive = currentStatus?.active !== true;
      toggle.disabled = true;
      note.className = "gg-maintenance-status";
      note.textContent = nextActive ? "Activando mantenimiento…" : "Desactivando mantenimiento…";
      const { data, error } = await client.rpc("set_site_maintenance", {
        p_active: nextActive,
        p_message: message
      });
      if (error || data?.ok !== true) {
        note.textContent = error?.message || "No se pudo actualizar el mantenimiento.";
        note.className = "gg-maintenance-status error";
        toggle.disabled = false;
        return;
      }
      location.reload();
    });
    actions.append(toggle);
    section.append(label, actions, note);
    adminCard.append(section);
  }
  init().catch(error => {
    console.error("Error iniciando el modo mantenimiento:", error);
    addStyles();
    document.body.replaceChildren();
    const root = el("main", "gg-maintenance-root");
    const card = el("section", "gg-maintenance-card");
    card.append(el("div", "gg-maintenance-brand", "GAMERS GOLD TOP-UP"));
    card.append(el("h1", "gg-maintenance-title", "No podemos verificar el servicio"));
    card.append(el("p", "gg-maintenance-copy", "No se pudo comprobar el estado de Gamers Gold. Por seguridad, vuelve a intentarlo antes de continuar."));
    const retry = el("button", "gg-maintenance-admin", "Reintentar");
    retry.type = "button";
    retry.addEventListener("click", () => location.reload());
    card.append(retry);
    root.append(card);
    document.body.append(root);
    document.documentElement.classList.remove("gg-maintenance-pending");
  });
})();
