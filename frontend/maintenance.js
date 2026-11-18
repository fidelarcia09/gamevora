(() => {
  "use strict";
  // La página nunca debe ocultarse mientras se consulta el estado de mantenimiento.
  document.documentElement.classList.remove("gg-maintenance-pending");
  const SUPABASE_URL = "https://gsuhzcavghsiolmipnzi.supabase.co";
  const SUPABASE_KEY = "sb_publishable_VEu9lvcUF1mp0xS0fXHPdA_592bfknx";
  const MESSAGE_DEFAULT = "Estamos realizando mejoras para ofrecerte un mejor servicio. Volveremos pronto.";
  const CSS = `
:root{color-scheme:dark}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:#020611}
.gg-maintenance-root{position:relative;isolation:isolate;display:flex;justify-content:center;align-items:center;min-height:100vh;min-height:100svh;overflow:hidden;padding:18px 12px;background:radial-gradient(ellipse at 50% 30%,rgba(0,91,255,.25),transparent 52%),radial-gradient(ellipse at 50% 100%,rgba(0,190,255,.12),transparent 48%),#020611;color:#f4f8ff;font-family:Arial,Helvetica,sans-serif}
.gg-maintenance-root:before,.gg-maintenance-root:after{position:absolute;z-index:-1;content:"";pointer-events:none}
.gg-maintenance-root:before{inset:0;background:repeating-linear-gradient(130deg,transparent 0 58px,rgba(0,119,255,.035) 59px 61px,transparent 62px 112px)}
.gg-maintenance-root:after{width:min(92vw,680px);height:min(92vw,680px);border:1px solid rgba(0,153,255,.08);border-radius:50%;box-shadow:0 0 100px rgba(0,110,255,.12),inset 0 0 90px rgba(0,110,255,.08)}
.gg-maintenance-scene{position:relative;width:min(100%,660px);padding:clamp(18px,4vw,34px) clamp(14px,4vw,30px) 24px;overflow:hidden;border:1px solid rgba(0,157,255,.7);clip-path:polygon(0 2.5%,5% 0,95% 0,100% 2.5%,100% 97.5%,95% 100%,5% 100%,0 97.5%);background:linear-gradient(155deg,rgba(3,19,47,.98),rgba(2,8,23,.99) 58%,rgba(3,22,48,.98));box-shadow:0 0 18px rgba(0,132,255,.45),0 0 65px rgba(0,83,255,.2),inset 0 0 35px rgba(0,112,255,.16)}
.gg-maintenance-scene:before{position:absolute;inset:8px;content:"";pointer-events:none;border:1px solid rgba(0,190,255,.18);clip-path:polygon(0 2.5%,5% 0,95% 0,100% 2.5%,100% 97.5%,95% 100%,5% 100%,0 97.5%)}
.gg-maintenance-corner{position:absolute;width:92px;height:92px;border-color:#087cff;opacity:.9;pointer-events:none}
.gg-maintenance-corner.tl{top:0;left:0;border-top:5px solid;border-left:5px solid;clip-path:polygon(0 0,100% 0,0 100%)}
.gg-maintenance-corner.tr{top:0;right:0;border-top:5px solid;border-right:5px solid;clip-path:polygon(0 0,100% 0,100% 100%)}
.gg-maintenance-corner.bl{bottom:0;left:0;border-bottom:5px solid;border-left:5px solid;clip-path:polygon(0 0,0 100%,100% 100%)}
.gg-maintenance-corner.br{right:0;bottom:0;border-right:5px solid;border-bottom:5px solid;clip-path:polygon(100% 0,100% 100%,0 100%)}
.gg-maintenance-brandline{position:relative;display:flex;align-items:center;justify-content:center;gap:12px;margin:5px auto 22px;text-align:center}
.gg-maintenance-bolt{width:clamp(42px,10vw,66px);height:clamp(48px,11vw,72px);flex:0 0 auto;filter:drop-shadow(0 0 12px #008cff)}
.gg-maintenance-bolt svg{width:100%;height:100%}
.gg-maintenance-brandtext{font-size:clamp(19px,5.3vw,36px);font-style:italic;font-weight:1000;line-height:.95;letter-spacing:-1px;text-transform:uppercase;text-shadow:0 0 18px rgba(0,132,255,.35)}
.gg-maintenance-brandtext span{color:#20cfff}
.gg-maintenance-brandtext small{display:block;margin-top:8px;color:#eaf7ff;font-size:.46em;letter-spacing:.38em}
.gg-maintenance-hero{position:relative;display:grid;place-items:center;min-height:clamp(230px,54vw,350px);margin:0 auto 5px}
.gg-maintenance-gear{position:absolute;width:min(82%,330px);height:auto;filter:drop-shadow(0 0 15px rgba(0,135,255,.9))}
.gg-maintenance-gear svg,.gg-maintenance-wrench svg{display:block;width:100%;height:auto}
.gg-maintenance-orbit{position:absolute;width:min(88%,380px);height:78px;border:3px solid #08c9ff;border-radius:50%;transform:rotate(-3deg);box-shadow:0 0 12px #008dff,inset 0 0 12px rgba(0,162,255,.5)}
.gg-maintenance-wrench{position:relative;z-index:2;width:clamp(145px,43vw,245px);height:auto;transform:rotate(-3deg);filter:drop-shadow(0 0 9px rgba(0,130,255,.95))}
.gg-maintenance-hazard{position:relative;z-index:3;width:86%;height:clamp(30px,7vw,48px);margin:-20px auto 18px;border:2px solid #ffb000;border-radius:5px;background:repeating-linear-gradient(125deg,#111827 0 24px,#ffb000 25px 48px);box-shadow:0 0 18px rgba(0,124,255,.35),0 7px 14px rgba(0,0,0,.4)}
.gg-maintenance-cone{position:absolute;z-index:4;right:8%;bottom:0;width:clamp(64px,18vw,112px);height:auto;filter:drop-shadow(0 0 12px #008cff)}
.gg-maintenance-cone svg{display:block;width:100%;height:auto}
.gg-maintenance-messagebox{position:relative;margin:0 auto;padding:clamp(20px,4vw,30px) clamp(14px,4vw,28px) 24px;border:1px solid rgba(0,161,255,.72);clip-path:polygon(0 5%,5% 0,95% 0,100% 5%,100% 95%,95% 100%,5% 100%,0 95%);background:linear-gradient(145deg,rgba(3,19,43,.98),rgba(1,8,22,.99));box-shadow:0 0 22px rgba(0,119,255,.35),inset 0 0 25px rgba(0,119,255,.1);text-align:center}
.gg-maintenance-messagebox:before{position:absolute;inset:6px;content:"";border:1px solid rgba(0,188,255,.16);clip-path:inherit;pointer-events:none}
.gg-maintenance-heading{position:relative;display:flex;align-items:center;justify-content:center;gap:12px;margin:0 0 18px;font-size:clamp(25px,6.5vw,42px);font-style:italic;font-weight:1000;line-height:1.08;text-transform:uppercase;text-shadow:0 0 18px rgba(0,140,255,.4)}
.gg-maintenance-heading span{display:block;color:#17d4ff}
.gg-maintenance-alert{width:clamp(48px,12vw,78px);height:auto;flex:0 0 auto;filter:drop-shadow(0 0 9px #008cff)}
.gg-maintenance-alert svg{display:block;width:100%;height:auto}
.gg-maintenance-copy{position:relative;margin:0 auto;color:#f1f7ff;font-size:clamp(14px,3.8vw,20px);font-weight:600;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere}
.gg-maintenance-line{width:clamp(105px,25vw,180px);height:4px;margin:22px auto;border-radius:8px;background:linear-gradient(90deg,#087cff,#20e6ff);box-shadow:0 0 14px #00bfff}
.gg-maintenance-thanks{position:relative;margin:0;color:#19d5ff;font-size:clamp(16px,4.3vw,25px);font-style:italic;font-weight:900;text-shadow:0 0 13px rgba(0,180,255,.45)}
.gg-maintenance-footer{margin:28px auto 0;color:#eaf7ff;font-size:clamp(17px,4.5vw,25px);font-style:italic;font-weight:1000;text-align:center;text-shadow:0 0 13px rgba(0,137,255,.55)}
.gg-maintenance-footer span{color:#20d4ff}
.gg-maintenance-footer small{display:block;margin-top:5px;font-size:.55em;letter-spacing:.35em}
.gg-maintenance-admin{position:relative;display:block;margin:20px auto 0;padding:10px 18px;border:1px solid rgba(32,197,255,.48);border-radius:10px;background:rgba(0,124,255,.14);color:#8be1ff;font-size:12px;font-weight:900;cursor:pointer}
.gg-maintenance-navigation{position:relative;display:block;width:min(86%,320px);min-height:48px;margin:14px auto 0;padding:12px 20px;border:1px solid #52e7ff;border-radius:12px;background:linear-gradient(100deg,#087cff,#00c5ed);box-shadow:0 0 18px rgba(0,181,255,.42),inset 0 1px 0 rgba(255,255,255,.3);color:#fff;font-size:15px;font-weight:1000;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}
.gg-maintenance-navigation:active{transform:translateY(1px);filter:brightness(1.12)}
.gg-maintenance-panel{position:relative;margin:14px auto 0;padding:17px;border:1px solid rgba(32,197,255,.25);border-radius:14px;background:rgba(3,12,26,.95);text-align:left}
.gg-maintenance-panel[hidden]{display:none}
.gg-maintenance-label{display:block;margin:0 0 8px;color:#c5d8eb;font-size:12px;font-weight:800}
.gg-maintenance-textarea{display:block;width:100%;min-height:100px;padding:12px;border:1px solid rgba(105,158,215,.35);border-radius:10px;outline:none;resize:vertical;background:#071326;color:#f4f8ff;font:13px/1.5 Arial,Helvetica,sans-serif}
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
@media(max-width:420px){.gg-maintenance-root{align-items:flex-start;padding:12px 8px}.gg-maintenance-scene{padding:18px 11px 20px}.gg-maintenance-brandline{margin-bottom:12px}.gg-maintenance-hero{min-height:230px}.gg-maintenance-messagebox{padding:19px 12px 21px}.gg-maintenance-heading{gap:8px;margin-bottom:13px}.gg-maintenance-hazard{margin-top:-15px;margin-bottom:14px}.gg-maintenance-footer{margin-top:20px}}
@media(min-height:850px) and (min-width:421px){.gg-maintenance-root{padding-top:28px;padding-bottom:28px}}
/* Rediseño inspirado en el cartel futurista de Gamers Gold */
.gg-maintenance-root{position:fixed;inset:0;z-index:2147483647;width:100%;height:100%;min-height:100%;align-items:flex-start;padding:0;overflow-x:hidden;overflow-y:auto;background:radial-gradient(ellipse at 50% 38%,rgba(0,92,255,.25),transparent 43%),radial-gradient(ellipse at 0 50%,rgba(0,119,255,.18),transparent 35%),radial-gradient(ellipse at 100% 60%,rgba(0,119,255,.18),transparent 35%),#01040c}
.gg-maintenance-root:before{inset:0;opacity:.9;background:linear-gradient(132deg,transparent 0 10%,rgba(0,93,255,.14) 10.2%,transparent 10.8% 89%,rgba(0,93,255,.14) 89.2%,transparent 90%),repeating-linear-gradient(0deg,transparent 0 42px,rgba(0,143,255,.035) 43px,transparent 44px 86px)}
.gg-maintenance-root:after{display:none}
.gg-maintenance-scene{width:min(100%,720px);min-height:100svh;margin:0 auto;padding:clamp(26px,6vw,48px) clamp(14px,4vw,34px) 30px;overflow:hidden;clip-path:none;border:0;border-left:1px solid rgba(0,136,255,.4);border-right:1px solid rgba(0,136,255,.4);background:linear-gradient(180deg,rgba(0,5,17,.94),rgba(0,9,28,.88) 52%,rgba(0,5,18,.98)),radial-gradient(ellipse at 50% 38%,rgba(0,101,255,.25),transparent 55%);box-shadow:0 0 38px rgba(0,100,255,.25),inset 0 0 65px rgba(0,84,255,.12)}
.gg-maintenance-scene:before{content:"";position:absolute;inset:10px 8px;z-index:0;pointer-events:none;border:2px solid rgba(0,154,255,.72);clip-path:polygon(0 2%,4% 0,96% 0,100% 2%,100% 98%,96% 100%,4% 100%,0 98%);box-shadow:inset 0 0 22px rgba(0,128,255,.14),0 0 18px rgba(0,140,255,.3)}
.gg-maintenance-scene:after{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.65;background:linear-gradient(135deg,transparent 0 8%,rgba(0,125,255,.2) 8.2%,transparent 8.7%),linear-gradient(315deg,transparent 0 8%,rgba(0,125,255,.18) 8.2%,transparent 8.7%)}
.gg-maintenance-scene>*{z-index:1}
.gg-maintenance-corner{z-index:3;width:110px;height:110px;filter:drop-shadow(0 0 9px #087cff)}
.gg-maintenance-brandline{gap:14px;margin:clamp(26px,7vw,58px) auto 10px;min-height:95px}
.gg-maintenance-bolt{width:clamp(64px,16vw,108px);height:clamp(70px,18vw,120px);filter:drop-shadow(0 0 16px #008cff)}
.gg-maintenance-brandtext{font-size:clamp(28px,7.4vw,54px);letter-spacing:-1.8px;line-height:.88;text-shadow:0 0 20px rgba(0,132,255,.65)}
.gg-maintenance-brandtext span{color:#12dfff}
.gg-maintenance-brandtext small{margin-top:12px;font-size:.43em;letter-spacing:.48em;text-align:center}
.gg-maintenance-hero{min-height:clamp(265px,74vw,440px);margin:0 auto -8px}
.gg-maintenance-gear{width:min(78%,390px);filter:drop-shadow(0 0 20px rgba(0,111,255,.95))}
.gg-maintenance-gear svg{overflow:visible}
.gg-maintenance-orbit{width:min(88%,500px);height:clamp(55px,16vw,105px);border-width:4px;border-color:#05caff;box-shadow:0 0 10px #008dff,0 0 28px rgba(0,151,255,.8),inset 0 0 16px rgba(0,162,255,.7)}
.gg-maintenance-wrench{width:clamp(180px,56vw,300px);transform:rotate(-8deg);filter:drop-shadow(0 0 9px #007dff) drop-shadow(0 0 2px #fff)}
.gg-maintenance-hazard{z-index:4;width:82%;height:clamp(34px,8vw,56px);margin:-8px auto 22px;border:2px solid #ffc12c;border-radius:3px;background:repeating-linear-gradient(125deg,#101827 0 25px,#ffb000 26px 51px);box-shadow:0 0 20px rgba(0,136,255,.55),0 9px 18px rgba(0,0,0,.7);transform:skewX(-5deg)}
.gg-maintenance-cone{z-index:5;right:7%;bottom:auto;top:clamp(390px,110vw,610px);width:clamp(76px,21vw,130px);filter:drop-shadow(0 0 13px #008cff)}
.gg-maintenance-messagebox{z-index:2;margin:0 auto;padding:clamp(25px,6vw,46px) clamp(15px,5vw,40px) clamp(28px,6vw,48px);border:2px solid #087cff;border-radius:0;clip-path:polygon(0 3%,5% 0,95% 0,100% 3%,100% 97%,95% 100%,5% 100%,0 97%);background:linear-gradient(145deg,rgba(0,8,25,.98),rgba(0,5,17,.99));box-shadow:0 0 14px #006eff,0 0 34px rgba(0,106,255,.3),inset 0 0 35px rgba(0,101,255,.13)}
.gg-maintenance-messagebox:before{inset:7px;border:1px solid rgba(0,190,255,.25)}
.gg-maintenance-heading{justify-content:center;gap:clamp(9px,3vw,22px);margin:0 0 25px;font-size:clamp(24px,6.5vw,48px);font-style:italic;letter-spacing:-.8px;line-height:1.02;text-shadow:0 0 15px rgba(0,131,255,.55)}
.gg-maintenance-heading>div{text-align:left}
.gg-maintenance-heading span{color:#11d9ff}
.gg-maintenance-alert{width:clamp(55px,15vw,100px);filter:drop-shadow(0 0 12px #008cff)}
.gg-maintenance-copy{max-width:580px;font-size:clamp(16px,4.2vw,25px);font-weight:500;line-height:1.55;text-align:center}
.gg-maintenance-line{width:clamp(130px,38vw,230px);height:5px;margin:clamp(23px,6vw,40px) auto;background:linear-gradient(90deg,#087cff,#12eaff);box-shadow:0 0 12px #00bfff,0 0 25px rgba(0,191,255,.5)}
.gg-maintenance-thanks{font-size:clamp(19px,5vw,30px);font-style:italic;color:#10d9ff;text-shadow:0 0 15px rgba(0,180,255,.65)}
.gg-maintenance-footer{margin:clamp(36px,8vw,62px) auto 20px;font-size:clamp(23px,6vw,36px);letter-spacing:-1px;text-shadow:0 0 18px rgba(0,137,255,.75)}
.gg-maintenance-footer small{letter-spacing:.55em}
.gg-maintenance-navigation{z-index:5;width:min(82%,320px);margin:18px auto 0;box-shadow:0 0 22px rgba(0,181,255,.55)}
.gg-maintenance-admin{z-index:5}
@media(max-width:420px){.gg-maintenance-scene{padding:18px 12px 25px}.gg-maintenance-brandline{margin-top:35px;min-height:80px}.gg-maintenance-hero{min-height:clamp(255px,78vw,330px)}.gg-maintenance-cone{top:clamp(360px,112vw,470px)}.gg-maintenance-messagebox{padding:25px 12px 29px}.gg-maintenance-heading{margin-bottom:20px}.gg-maintenance-footer{margin-top:34px}}
@media(min-width:700px){.gg-maintenance-scene{padding-left:38px;padding-right:38px}}

/* Fondo global Gamers Gold: mismo degradado y cuadrícula de cuenta.html */
html{background:#050b18!important}
body{
  background-color:#050b18!important;
  background-image:
    linear-gradient(rgba(64,174,255,.055) 1px,transparent 1px),
    linear-gradient(90deg,rgba(64,174,255,.055) 1px,transparent 1px),
    radial-gradient(ellipse at 50% 12%,rgba(0,124,255,.22),transparent 37%),
    radial-gradient(ellipse at 90% 76%,rgba(0,200,245,.12),transparent 32%),
    linear-gradient(180deg,#050b18 0%,#081a35 54%,#050f20 100%)!important;
  background-size:34px 34px,34px 34px,auto,auto,auto!important;
  background-attachment:fixed!important;
}
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
  function startMaintenanceRealtime(client, isAdmin) {
    if (window.__ggMaintenanceRealtimeChannel) return;

    const applyStatus = (update) => {
      if (!update || typeof update.active !== "boolean") return;
      window.dispatchEvent(new CustomEvent("gg:maintenance-status", { detail: update }));
      const nextMessage = typeof update.message === "string" && update.message.trim()
        ? update.message
        : MESSAGE_DEFAULT;
      const maintenanceVisible = !!document.querySelector(".gg-maintenance-root");
      const adminNavigationKey = "gg_admin_maintenance_navigation";
      const adminChoseToNavigate = isAdmin && sessionStorage.getItem(adminNavigationKey) === "1";

      if (update.active) {
        if (maintenanceVisible) {
          const copy = document.querySelector(".gg-maintenance-copy");
          if (copy) copy.textContent = nextMessage;
          return;
        }
        if (!adminChoseToNavigate) renderMaintenance(client, isAdmin, nextMessage);
        return;
      }

      if (maintenanceVisible) removeMaintenanceScreen();
      document.documentElement.classList.remove("gg-maintenance-pending");
    };

    const syncCurrentStatus = async () => {
      try {
        const { data, error } = await client.rpc("get_site_maintenance_status");
        if (error || !data) {
          console.warn("No se pudo sincronizar el mantenimiento:", error || "Sin datos");
          return;
        }
        const status = typeof data === "string" ? JSON.parse(data) : data;
        applyStatus(status);
      } catch (error) {
        console.warn("Error sincronizando mantenimiento:", error);
      }
    };

    // El topic debe coincidir exactamente con el usado por realtime.send() en PostgreSQL.
    const channel = client
      .channel("site-maintenance")
      .on("broadcast", { event: "maintenance_status_changed" }, (payload) => {
        const update = payload?.payload && typeof payload.payload === "object"
          ? payload.payload
          : payload;
        applyStatus(update);
      })
      .subscribe((status, error) => {
        if (status === "SUBSCRIBED") {
          syncCurrentStatus();
        } else {
          console.warn("Realtime de mantenimiento:", status, error || "");
        }
      });

    window.__ggMaintenanceRealtimeChannel = channel;

    if (!window.__ggMaintenanceSyncListeners) {
      window.__ggMaintenanceSyncListeners = true;
      window.addEventListener("online", syncCurrentStatus);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") syncCurrentStatus();
      });
    }
  }

  async function init() {
    addStyles();
    const sdk = await loadSupabase();
    const client = window.__ggMaintenanceSupabaseClient || sdk.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    const { data: sessionData } = await client.auth.getSession();
    const session = sessionData?.session;
    const isAdmin = String(session?.user?.email || "").trim().toLowerCase() === "fidelarciatamayo99@gmail.com";
    startMaintenanceRealtime(client, isAdmin);
    const { data: statusData, error: statusError } = await client.rpc("get_site_maintenance_status");
    if (statusError || !statusData) {
      document.documentElement.classList.remove("gg-maintenance-pending");
      console.error("No se pudo comprobar el mantenimiento:", statusError);
      return;
    }
    const status = typeof statusData === "string" ? JSON.parse(statusData) : statusData;
    window.dispatchEvent(new CustomEvent("gg:maintenance-status", { detail: status }));
    const adminNavigationKey = "gg_admin_maintenance_navigation";
    const adminChoseToNavigate = isAdmin && sessionStorage.getItem(adminNavigationKey) === "1";
    if (status.active === true && !adminChoseToNavigate) {
      renderMaintenance(client, isAdmin, status.message || MESSAGE_DEFAULT);
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
        note.textContent = "Mantenimiento desactivado correctamente.";
        note.className = "gg-maintenance-status ok";
        removeMaintenanceScreen();
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
  function removeMaintenanceScreen() {
    document.querySelector(".gg-maintenance-root")?.remove();
    document.documentElement.classList.remove("gg-maintenance-pending");
  }

  function renderMaintenance(client, isAdmin, message) {
    if (document.querySelector(".gg-maintenance-root")) return;
    const root = el("main", "gg-maintenance-root");
    const scene = el("div", "gg-maintenance-scene");
    ["tl","tr","bl","br"].forEach(position => {
      const corner = el("span", "gg-maintenance-corner " + position);
      corner.setAttribute("aria-hidden", "true");
      scene.appendChild(corner);
    });
    const brand = el("div", "gg-maintenance-brandline");
    const bolt = el("span", "gg-maintenance-bolt");
    bolt.innerHTML = '<svg viewBox="0 0 64 76" aria-hidden="true"><path d="M37 2 5 42h22L19 74 60 29H36Z" fill="#16d8ff" stroke="#80edff" stroke-width="2" stroke-linejoin="round"/></svg>';
    const brandText = el("div", "gg-maintenance-brandtext");
    brandText.innerHTML = 'GAMERS <span>GOLD</span><small>TOP-UP</small>';
    brand.append(bolt, brandText);
    const hero = el("div", "gg-maintenance-hero");
    const gear = el("div", "gg-maintenance-gear");
    gear.innerHTML = '<svg viewBox="0 0 320 320" aria-hidden="true"><defs><linearGradient id="ggGearMetal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f4fbff"/><stop offset=".35" stop-color="#5c91c9"/><stop offset=".62" stop-color="#173f75"/><stop offset="1" stop-color="#c8eaff"/></linearGradient></defs><path d="M137 16h46l9 34a113 113 0 0 1 24 10l30-17 33 33-17 30a113 113 0 0 1 10 24l34 9v46l-34 9a113 113 0 0 1-10 24l17 30-33 33-30-17a113 113 0 0 1-24 10l-9 34h-46l-9-34a113 113 0 0 1-24-10l-30 17-33-33 17-30a113 113 0 0 1-10-24L14 183v-46l34-9a113 113 0 0 1 10-24L41 74l33-33 30 17a113 113 0 0 1 24-10Z" fill="url(#ggGearMetal)" stroke="#20cfff" stroke-width="5"/><circle cx="160" cy="160" r="91" fill="#03152d" stroke="#168eff" stroke-width="8"/><circle cx="160" cy="160" r="73" fill="#020a18" stroke="#456f9e" stroke-width="4"/></svg>';
    const orbit = el("div", "gg-maintenance-orbit");
    const wrench = el("div", "gg-maintenance-wrench");
    wrench.innerHTML = '<svg viewBox="0 0 240 240" aria-hidden="true"><defs><linearGradient id="ggWrenchMetal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff"/><stop offset=".35" stop-color="#8db9df"/><stop offset=".65" stop-color="#263e5d"/><stop offset="1" stop-color="#e8f8ff"/></linearGradient></defs><path d="M173 12a57 57 0 0 0-61 72L23 173a19 19 0 0 0 0 27l17 17a19 19 0 0 0 27 0l89-89a57 57 0 0 0 72-61l-34 34-34-8-8-34Z" fill="url(#ggWrenchMetal)" stroke="#d8f2ff" stroke-width="5" stroke-linejoin="round"/><path d="m39 184 17 17M54 169l17 17" stroke="#1b3657" stroke-width="8" stroke-linecap="round"/></svg>';
    hero.append(gear, orbit, wrench);
    const hazard = el("div", "gg-maintenance-hazard");
    hazard.setAttribute("aria-hidden", "true");
    const cone = el("div", "gg-maintenance-cone");
    cone.innerHTML = '<svg viewBox="0 0 100 130" aria-hidden="true"><path d="m42 8 16 0 31 94H11Z" fill="#087cff" stroke="#65ddff" stroke-width="4"/><path d="m30 44 40 0 7 20H23Z" fill="#e9f8ff"/><path d="m20 78 60 0 7 20H13Z" fill="#e9f8ff"/><path d="M6 105h88l-5 13H11Z" fill="#063c83" stroke="#28cfff" stroke-width="3"/></svg>';
    const messageBox = el("section", "gg-maintenance-messagebox");
    const heading = el("h1", "gg-maintenance-heading");
    const alert = el("span", "gg-maintenance-alert");
    alert.innerHTML = '<svg viewBox="0 0 80 80" aria-hidden="true"><path d="M40 7 74 68H6Z" fill="none" stroke="#24cfff" stroke-width="5" stroke-linejoin="round"/><path d="M40 27v20" stroke="#eafaff" stroke-width="6" stroke-linecap="round"/><circle cx="40" cy="58" r="3.5" fill="#eafaff"/></svg>';
    const headingText = el("div", "");
    headingText.innerHTML = 'MODO DE<span>MANTENIMIENTO</span>';
    heading.append(alert, headingText);
    const copy = el("p", "gg-maintenance-copy", message || MESSAGE_DEFAULT);
    const line = el("div", "gg-maintenance-line");
    const thanks = el("p", "gg-maintenance-thanks", "¡Gracias por tu paciencia!");
    messageBox.append(heading, copy, line, thanks);
    const footer = el("div", "gg-maintenance-footer");
    footer.innerHTML = 'GAMERS <span>GOLD</span><small>TOP-UP</small>';
    scene.append(brand, hero, hazard, cone, messageBox, footer);
    if (isAdmin) {
      const navigate = el("button", "gg-maintenance-navigation", "NAVEGAR");
      navigate.type = "button";
      navigate.addEventListener("click", () => {
        sessionStorage.setItem("gg_admin_maintenance_navigation", "1");
        removeMaintenanceScreen();
      });
      scene.append(navigate);
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
      scene.append(toggle);
      createAdminPanel(client, host, message);
      scene.append(host);
    }
    root.append(scene);
    document.body.append(root);
    document.documentElement.classList.remove("gg-maintenance-pending");
  }
  function addLiveAdminControls(client, currentStatus) {
    const adminCard = document.getElementById("adminCard");
    if (!adminCard || document.getElementById("ggMaintenanceLiveControls")) return;
    const section = el("section", "gg-maintenance-admin-controls");
    section.id = "ggMaintenanceLiveControls";
    section.append(el("h3", "", "Modo mantenimiento"));
    section.append(el("p", "", "Solo fidelarciatamayo99@gmail.com puede navegar durante el mantenimiento y controlar su activación. El mensaje que escribas aparecerá en el centro de la pantalla."));
    const label = el("label", "gg-maintenance-label", "Mensaje central que verán los usuarios");
    const area = el("textarea", "gg-maintenance-textarea");
    area.maxLength = 500;
    area.value = currentStatus?.message || MESSAGE_DEFAULT;
    label.appendChild(area);
    const actions = el("div", "gg-maintenance-actions");
    const save = el("button", "gg-maintenance-action secondary", "Guardar mensaje");
    save.type = "button";
    const toggle = el("button", "gg-maintenance-action", currentStatus?.active ? "Desactivar mantenimiento" : "Activar mantenimiento");
    toggle.type = "button";
    const note = el("p", "gg-maintenance-status");
    async function updateMaintenance(active, reloadAfter) {
      const message = area.value.trim();
      if (!message) {
        note.textContent = "Escribe un mensaje para los usuarios.";
        note.className = "gg-maintenance-status error";
        return;
      }
      save.disabled = true;
      toggle.disabled = true;
      note.className = "gg-maintenance-status";
      note.textContent = reloadAfter ? (active ? "Activando mantenimiento…" : "Desactivando mantenimiento…") : "Guardando mensaje…";
      const { data, error } = await client.rpc("set_site_maintenance", { p_active: active, p_message: message });
      if (error || data?.ok !== true) {
        note.textContent = error?.message || "No se pudo actualizar el mantenimiento.";
        note.className = "gg-maintenance-status error";
        save.disabled = false;
        toggle.disabled = false;
        return;
      }
      currentStatus = { ...currentStatus, active, message };
      toggle.textContent = active ? "Desactivar mantenimiento" : "Activar mantenimiento";
      note.textContent = reloadAfter
        ? (active ? "Mantenimiento activado correctamente." : "Mantenimiento desactivado correctamente.")
        : "Mensaje guardado correctamente.";
      note.className = "gg-maintenance-status ok";
      save.disabled = false;
      toggle.disabled = false;
    }
    save.addEventListener("click", () => updateMaintenance(currentStatus?.active === true, false));
    toggle.addEventListener("click", () => updateMaintenance(currentStatus?.active !== true, true));
    actions.append(save, toggle);
    section.append(label, actions, note);
    adminCard.append(section);
  }
  init().catch(error => {
    console.error("Error iniciando el modo mantenimiento:", error);
    // Si falla la comprobación, no destruir el contenido de la página ni dejarla negra.
    document.documentElement.classList.remove("gg-maintenance-pending");
  });
})();
