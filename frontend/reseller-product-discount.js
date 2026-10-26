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

  function parsePrice(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
    let text = String(value ?? "").trim().replace(/\\s*GVR\\s*$/i, "").replace(/\\s/g, "");
    if (!text) return NaN;
    if (text.includes(",")) {
      text = text.replace(/\\./g, "").replace(",", ".");
    } else if ((text.match(/\\./g) || []).length > 1) {
      text = text.replace(/\\./g, "");
    } else if (text.includes(".")) {
      const decimals = text.split(".").pop().length;
      if (decimals === 3 && /^-?\\d{1,3}(?:\\.\\d{3})+$/.test(text)) text = text.replace(/\\./g, "");
    }
    const number = Number(text);
    return Number.isFinite(number) ? number : NaN;
  }

  function formatPrice(price) {
    const value = parsePrice(price);
    if (!Number.isFinite(value) || value <= 0) return "Precio pendiente";
    return value.toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
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
      .producto .producto-precio { display: block; }
      .producto .gg-reseller-original-price + .producto-precio { margin-top: 2px; }
    `;
    document.head.appendChild(style);
  }

  function showDiscount() {
    if (!initialized || discountPercent <= 0) return;
    addStyles();
    document.querySelectorAll(".producto").forEach(card => {
      if (card.matches(":disabled") || card.classList.contains("producto-no-disponible")) return;
      const price = card.querySelector(".producto-precio");
      if (!price || price.parentNode !== card) return;

      if (!price.dataset.ggOriginalPrice) {
        const match = price.textContent.trim().match(/^([\d.,]+)\s*GVR$/i);
        if (!match) return;
        const normalized = match[1].replace(/\./g, "").replace(",", ".");
        const original = Number(normalized);
        if (!Number.isFinite(original) || original <= 0) return;
        price.dataset.ggOriginalPrice = String(original);
      }

      const original = parsePrice(price.dataset.ggOriginalPrice);
      if (!Number.isFinite(original) || original <= 0) {
        delete price.dataset.ggOriginalPrice;
        return;
      }
      price.dataset.ggOriginalPrice = String(original);
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
      showDiscount();

      const observer = new MutationObserver(showDiscount);
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
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