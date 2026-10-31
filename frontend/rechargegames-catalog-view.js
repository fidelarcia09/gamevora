(() => {
  "use strict";
  const script = document.currentScript;
  const game = new URL(script.src).searchParams.get("game");
  const SUPABASE_URL = "https://gsuhzcavghsiolmipnzi.supabase.co";
  const SUPABASE_KEY = "sb_publishable_VEu9lvcUF1mp0xS0fXHPdA_592bfknx";
  const columns = "id,game,product_name,game_currency_amount,price_gvr,provider_product_id,provider_region,product_type";

  const styles = document.createElement("style");
  styles.textContent = ".gg-rg-panel{background:#091a35;border:1px solid #164b75;border-radius:13px;padding:17px 13px;box-shadow:0 0 22px rgba(0,140,255,.08);margin:0 auto 14px;width:100%;max-width:520px;color:#fff}.gg-rg-panel h1{font-size:21px;margin:0 0 6px}.gg-rg-sub{font-size:12px;color:#8fa5bd;line-height:1.5;margin-bottom:15px}.gg-rg-notice{padding:10px 11px;border:1px solid #8a672f;border-radius:7px;background:#211b10;color:#ffcf8a;font-size:11px;line-height:1.5;margin:12px 0}.gg-rg-controls{display:grid;grid-template-columns:1fr;gap:10px;margin:12px 0}.gg-rg-label{display:block;color:#b8c9dc;font-size:12px;font-weight:bold;margin-bottom:6px}.gg-rg-select{width:100%;min-height:40px;padding:8px 10px;background:#061226;color:#fff;border:1px solid #204c78;border-radius:7px;font-size:13px}.gg-rg-tabs{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:12px 0}.gg-rg-tab{min-height:38px;padding:8px 5px;background:#07152b;color:#8fa5bd;border:1px solid #204568;border-radius:5px;font-size:11px;font-weight:bold}.gg-rg-tab[aria-pressed=true]{color:#fff;background:#0b3157;border-color:#00baff;box-shadow:inset 0 -2px 0 #00baff}.gg-rg-status{padding:9px 10px;margin:10px 0;border:1px solid #204c78;border-radius:7px;background:#061226;color:#a9c4df;font-size:11px;line-height:1.45;overflow-wrap:anywhere}.gg-rg-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:9px}.gg-rg-product{display:flex;flex-direction:column;justify-content:space-between;gap:7px;min-width:0;min-height:95px;padding:11px;background:#061226;border:1px solid #164b75;border-radius:7px}.gg-rg-name{font-size:12px;font-weight:bold;line-height:1.4;overflow-wrap:anywhere}.gg-rg-amount{font-size:10px;color:#8fa5bd}.gg-rg-price{font-size:14px;font-weight:bold;color:#fff}.gg-rg-tag{font-size:10px;font-weight:bold;color:#ffcf8a}.gg-rg-back{display:inline-block;color:#45c8ff;text-decoration:none;font-size:12px;font-weight:bold;margin-bottom:13px}.gg-rg-empty{grid-column:1/-1;padding:16px 12px;background:#061226;border:1px solid #164b75;border-radius:7px;text-align:center;color:#8fa5bd;font-size:12px;line-height:1.5}@media(max-width:360px){.gg-rg-grid{grid-template-columns:1fr}}";
  document.head.appendChild(styles);

  const container = document.querySelector(".contenedor") || document.body;
  const oldMain = container.querySelector(":scope > main.card");
  if (oldMain) oldMain.style.display = "none";

  const panel = document.createElement("section");
  panel.className = "gg-rg-panel";
  panel.innerHTML = `
    <a class="gg-rg-back" href="juegos.html">← Volver a juegos</a>
    <h1></h1>
    <p class="gg-rg-sub">Catálogo de RechargeGames · precios mostrados en GVR.</p>
    <div class="gg-rg-notice">Catálogo en revisión. Los productos se muestran para comprobar nombres, regiones y precios. Las compras permanecen desactivadas durante las pruebas.</div>
    <div class="gg-rg-controls">
      <div><label class="gg-rg-label" for="ggRgRegion">Región</label><select class="gg-rg-select" id="ggRgRegion"></select></div>
    </div>
    <div class="gg-rg-tabs" role="group" aria-label="Tipo de producto">
      <button type="button" class="gg-rg-tab" data-type="topup" aria-pressed="true">Recargas</button>
      <button type="button" class="gg-rg-tab" data-type="special_offer" aria-pressed="false">Ofertas especiales</button>
    </div>
    <div class="gg-rg-status" id="ggRgStatus" role="status" aria-live="polite">Consultando catálogo de RechargeGames...</div>
    <div class="gg-rg-grid" id="ggRgGrid"></div>
  `;
  if (oldMain) container.insertBefore(panel, oldMain);
  else container.appendChild(panel);

  panel.querySelector("h1").textContent = game || "Catálogo";
  const regionSelect = panel.querySelector("#ggRgRegion");
  const status = panel.querySelector("#ggRgStatus");
  const grid = panel.querySelector("#ggRgGrid");
  const tabs = Array.from(panel.querySelectorAll(".gg-rg-tab"));
  let rows = [];
  let selectedType = "topup";

  const regionNames = {
    global:"Global", latam:"Latinoamérica", brazil:"Brasil", indonesia:"Indonesia",
    thailand:"Tailandia", vietnam:"Vietnam", philippines:"Filipinas",
    "singapore-malaysia":"Singapur / Malasia", singapore:"Singapur", malaysia:"Malasia",
    "united-states":"Estados Unidos", mena:"MENA", cis:"CIS", eu:"Europa",
    asia:"Asia", na:"Norteamérica", "tw-hk-mo":"Taiwán / Hong Kong / Macao",
    bangladesh:"Bangladesh", russia:"Rusia", turkey:"Turquía", taiwan:"Taiwán"
  };
  const defaults = {
    "Free Fire":"latam", "Mobile Legends":"global", "Blood Strike":"global",
    "Genshin Impact":"global", "PUBG Mobile":"global", "Arena Breakout":"global",
    "Honor of Kings":"global"
  };

  function render() {
    const region = regionSelect.value;
    const filtered = rows.filter(row =>
      String(row.provider_region || "").toLowerCase() === region &&
      row.product_type === selectedType
    );
    grid.replaceChildren();
    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "gg-rg-empty";
      empty.textContent = "No hay productos de esta categoría para la región seleccionada.";
      grid.appendChild(empty);
    } else {
      filtered.forEach(row => {
        const card = document.createElement("article");
        card.className = "gg-rg-product";
        const name = document.createElement("div");
        name.className = "gg-rg-name";
        name.textContent = row.product_name || "Producto RechargeGames";
        const amount = document.createElement("div");
        amount.className = "gg-rg-amount";
        amount.textContent = Number(row.game_currency_amount) > 0
          ? Number(row.game_currency_amount).toLocaleString("es-ES") + " unidades"
          : "Oferta especial";
        const price = document.createElement("div");
        price.className = "gg-rg-price";
        const priceValue = Number(row.price_gvr);
        price.textContent = Number.isFinite(priceValue) && priceValue > 0
          ? priceValue.toLocaleString("es-ES", {maximumFractionDigits: 2}) + " GVR"
          : "Precio por revisar";
        const tag = document.createElement("div");
        tag.className = "gg-rg-tag";
        tag.textContent = "En pruebas · compra desactivada";
        card.append(name, amount, price, tag);
        grid.appendChild(card);
      });
    }
    status.textContent = filtered.length
      ? filtered.length + (selectedType === "topup" ? " paquetes de recarga" : " ofertas especiales") + " encontrados. Ninguno está habilitado para comprar."
      : "No hay productos en esta región y categoría.";
  }

  tabs.forEach(tab => tab.addEventListener("click", () => {
    selectedType = tab.dataset.type;
    tabs.forEach(item => item.setAttribute("aria-pressed", String(item === tab)));
    render();
  }));
  regionSelect.addEventListener("change", render);

  async function load() {
    if (!game) throw new Error("Falta identificar el juego en la página.");
    const url = SUPABASE_URL + "/rest/v1/rechargegames_public_catalog?select=" +
      encodeURIComponent(columns) + "&game=eq." + encodeURIComponent(game) +
      "&order=price_gvr.asc,product_name.asc";
    const response = await fetch(url, {
      method: "GET",
      headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY, Accept: "application/json" },
      cache: "no-store"
    });
    let data = [];
    try { data = await response.json(); } catch {}
    if (!response.ok) throw new Error(data.message || data.error || "No se pudo consultar el catálogo (HTTP " + response.status + ").");
    rows = Array.isArray(data) ? data : [];
    const regions = Array.from(new Set(rows.map(row => String(row.provider_region || "").toLowerCase()).filter(Boolean)));
    regionSelect.replaceChildren();
    regions.sort().forEach(region => {
      const option = document.createElement("option");
      option.value = region;
      option.textContent = regionNames[region] || region;
      regionSelect.appendChild(option);
    });
    if (!regions.length) {
      status.textContent = "No hay productos importados para este juego.";
      grid.replaceChildren();
      return;
    }
    regionSelect.value = regions.includes(defaults[game]) ? defaults[game] : regions[0];
    render();
  }

  load().catch(error => {
    console.error("RechargeGames catalog:", error);
    status.textContent = error.message || "No se pudo cargar el catálogo de RechargeGames.";
    grid.replaceChildren();
  });
})();