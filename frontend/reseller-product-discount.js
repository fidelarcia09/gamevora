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

  function formatPrice(price) {
    return Number(price).toLocaleString("es-ES", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }) + " GVR";
  }

  function discountedPrice(price) {
    const value = Number(price);
    if (!Number.isFinite(value) || value <= 0 || discountPercent <= 0) return value;
    return Math.max(0.01, Math.round((value * (100 - discountPercent) / 100 + Number.EPSILON) * 100) / 100);
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

      const original = Number(price.dataset.ggOriginalPrice);
      const finalPrice = discountedPrice(original);
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
        .select("user_id, role, active")
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

      discountPercent = current.discount;
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