import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

(() => {
  "use strict";
  const SUPABASE_URL = "https://gsuhzcavghsiolmipnzi.supabase.co";
  const SUPABASE_KEY = "sb_publishable_VEu9lvcUF1mp0xS0fXHPdA_592bfknx";
  const LEVELS = [
    { min: 0, discount: 1 },
    { min: 25, discount: 2 },
    { min: 75, discount: 3 },
    { min: 150, discount: 4 },
    { min: 300, discount: 5 }
  ];

  let discountPercent = 0;
  let initialized = false;
  let initPromise;
  let catalogPrices = [];

  function normalizeName(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function originalPriceForCard(card, price) {
    const productId = String(card.dataset.ggProductId || "").trim();
    if (productId) {
      const byId = catalogPrices.find(product => String(product.id) === productId);
      const amount = Number(byId?.price_gvr);
      if (Number.isFinite(amount) && amount > 0) return amount;
    }

    const name = normalizeName(card.querySelector(".producto-nombre, .nombre-oferta")?.textContent);
    if (name && catalogPrices.length) {
      const exact = catalogPrices.filter(product => normalizeName(product.product_name) === name);
      const matches = exact.length === 1 ? exact : catalogPrices.filter(product => {
        const productName = normalizeName(product.product_name);
        return productName && (name.includes(productName) || productName.includes(name));
      });
      if (matches.length === 1) {
        const amount = Number(matches[0].price_gvr);
        if (Number.isFinite(amount) && amount > 0) return amount;
      }
    }

    const saved = parsePrice(price.dataset.ggResellerBasePrice || price.dataset.ggOriginalPrice);
    if (Number.isFinite(saved) && saved > 0) return saved;
    const visible = parsePrice(price.textContent);
    return Number.isFinite(visible) && visible > 0 ? visible : NaN;
  }

  async function loadCatalogPrices(db) {
    const { data, error } = await db.from("game_products")
      .select("id,game,product_name,price_gvr,active,provider")
      .eq("active", true)
      .eq("provider", "nextlevel");
    if (error) throw error;
    catalogPrices = data || [];
  }

  function parsePrice(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
    let text = String(value ?? "").trim().replace(/\s*GVR\s*$/i, "").replace(/\s/g, "");
    if (!text) return NaN;
    if (text.includes(",")) {
      text = text.replace(/\./g, "").replace(",", ".");
    } else if ((text.match(/\./g) || []).length > 1) {
      text = text.replace(/\./g, "");
    } else if (text.includes(".")) {
      const decimals = text.split(".").pop().length;
      if (decimals === 3 && /^-?\d{1,3}(?:\.\d{3})+$/.test(text)) text = text.replace(/\./g, "");
    }
    const number = Number(text);
    return Number.isFinite(number) ? number : NaN;
  }

  function formatPrice(price) {
    const value = parsePrice(price);
    if (!Number.isFinite(value) || value <= 0) return "Precio pendiente";
    return value.toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3
    }) + " GVR";
  }

  function discountedPrice(price) {
    const value = parsePrice(price);
    if (!Number.isFinite(value) || value <= 0 || discountPercent <= 0) return value;
    return Math.round((value * (100 - discountPercent) / 100 + Number.EPSILON) * 10000) / 10000;
  }

  window.ggGetResellerDiscountedPrice = async function(price) {
    if (initPromise) await initPromise;
    return discountedPrice(price);
  };

  function addStyles() {
    if (document.getElementById("gg-reseller-discount-styles")) return;
    const style = document.createElement("style");
    style.id = "gg-reseller-discount-styles";
    style.textContent = `
      .gg-reseller-original-price {
        display: block;
        margin-top: 4px;
        color: #91a6c0;
        font-size: 11px;
        font-weight: 600;
        line-height: 1.3;
        text-decoration: line-through;
        text-decoration-thickness: 1.5px;
        opacity: .9;
      }
      .producto .producto-precio, .boton-oferta .precio-oferta { display: block; }
      .producto .gg-reseller-original-price + .producto-precio, .boton-oferta .gg-reseller-original-price + .precio-oferta { margin-top: 2px; }
    `;
    document.head.appendChild(style);
  }

  function showDiscount() {
    if (!initialized || discountPercent <= 0) return;

    // El descuento de revendedor solo corresponde a GVR; no sobrescribir tarifas manuales de Supabase.
    const selectedMethod = String(document.getElementById("ggMetodoPago")?.value || "").toUpperCase();
    if (selectedMethod && selectedMethod !== "GVR") {
      document.querySelectorAll(".gg-reseller-original-price").forEach(element => element.remove());
      return;
    }

    addStyles();
    document.querySelectorAll(".producto, .boton-oferta").forEach(card => {
      if (card.matches(":disabled") || card.classList.contains("producto-no-disponible")) return;
      const price = card.querySelector(".producto-precio, .precio-oferta");
      if (!price) return;

      /* Use the unmodified Supabase price first: the payment selector can rewrite
         ggOriginalPrice when switching between GVR and manual payment methods. */
      const original = originalPriceForCard(card, price);
      if (!Number.isFinite(original) || original <= 0) {
        delete price.dataset.ggOriginalPrice;
        delete price.dataset.ggResellerBasePrice;
        return;
      }
      price.dataset.ggOriginalPrice = String(original);
      price.dataset.ggResellerBasePrice = String(original);
      const finalPrice = discountedPrice(original);
      if (!Number.isFinite(finalPrice) || finalPrice <= 0) return;
      let oldPrice = card.querySelector(".gg-reseller-original-price");
      if (!oldPrice) {
        oldPrice = document.createElement("div");
        oldPrice.className = "gg-reseller-original-price";
        oldPrice.setAttribute("aria-label", "Precio original sin descuento");
        price.insertAdjacentElement("beforebegin", oldPrice);
      }
      const oldLabel = formatPrice(original);
      const finalLabel = formatPrice(finalPrice);
      if (oldPrice.textContent !== oldLabel) oldPrice.textContent = oldLabel;
      if (price.textContent !== finalLabel) price.textContent = finalLabel;
      price.setAttribute("aria-label", "Precio final con descuento de revendedor");
    });
  }

  // Permite que el selector de pago vuelva a aplicar el descuento GVR después de restaurar precios base.
  window.ggRefreshResellerDiscount = showDiscount;
  document.addEventListener("change", event => {
    if (event.target?.id === "ggMetodoPago" && String(event.target.value || "").toUpperCase() === "GVR") {
      showDiscount();
    }
  });

  async function init() {
    try {
      const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      const { data: { user }, error: authError } = await db.auth.getUser();
      if (authError || !user) return;

      const { data: profile, error: profileError } = await db
        .from("reseller_profiles")
        .select("user_id, role, active, rank_override")
        .eq("user_id", user.id)
        .eq("active", true)
        .maybeSingle();

      if (profileError || !profile || profile.role !== "Revendedor") return;

      const { data, error } = await db.rpc("get_reseller_dashboard_stats");
      if (error) {
        console.warn("No se pudo consultar el nivel del revendedor.", error);
        return;
      }

      const stats = Array.isArray(data) ? data[0] : data;
      await loadCatalogPrices(db);
      const completed = Number(stats?.completed_count || 0);
      let current = LEVELS[0];
      for (const level of LEVELS) if (completed >= level.min) current = level;

      // El rango manual asignado a la cuenta prevalece sobre el cálculo automático.
      const overrideDiscount = {
        Bronce: 1,
        Plata: 2,
        Oro: 3,
        Diamante: 4,
        Leyenda: 5
      };
      const manualRank = String(profile.rank_override || "").trim();
      discountPercent = Object.prototype.hasOwnProperty.call(overrideDiscount, manualRank)
        ? overrideDiscount[manualRank]
        : current.discount;
      initialized = true;
      window.ggResellerDiscountPercent = discountPercent;
      window.dispatchEvent(new Event("gg-reseller-discount-updated"));
      showDiscount();

      /* Solo recalcula cuando el juego agrega o reemplaza tarjetas.
         Ignora cambios de precio/texto realizados por este script para evitar bucles. */
      const observer = new MutationObserver(records => {
        const catalogChanged = records.some(record =>
          record.type === "childList" &&
          [...record.addedNodes, ...record.removedNodes].some(node =>
            node.nodeType === 1 &&
            (node.matches?.(".producto, .boton-oferta") ||
             node.querySelector?.(".producto, .boton-oferta"))
          )
        );
        if (catalogChanged) showDiscount();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    } catch (error) {
      console.warn("No se pudo aplicar el descuento de revendedor en el catálogo.", error);
    }
  }

  initPromise = new Promise(resolve => {
    const run = () => init().finally(resolve);
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", run, { once: true });
    } else {
      run();
    }
  });
})();