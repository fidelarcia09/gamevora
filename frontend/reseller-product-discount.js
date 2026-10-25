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

  function addStyles() {
    if (document.getElementById("gg-reseller-discount-styles")) return;
    const style = document.createElement("style");
    style.id = "gg-reseller-discount-styles";
    style.textContent = `
      .gg-reseller-discount {
        display: block;
        width: 100%;
        margin-top: 2px;
        padding: 5px 7px;
        border: 1px solid rgba(78, 224, 161, .32);
        border-radius: 5px;
        background: rgba(25, 151, 99, .12);
        color: #70f0b6;
        font-size: 10px;
        font-weight: 800;
        line-height: 1.35;
        text-align: center;
        overflow-wrap: anywhere;
      }
      .producto .gg-reseller-discount { flex-shrink: 0; }
    `;
    document.head.appendChild(style);
  }

  function showDiscount(discount) {
    addStyles();
    document.querySelectorAll(".producto").forEach(card => {
      if (card.matches(":disabled") || card.classList.contains("producto-no-disponible")) return;
      let badge = card.querySelector(".gg-reseller-discount");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "gg-reseller-discount";
        badge.setAttribute("aria-label", "Descuento de revendedor de " + discount + " por ciento");
        const price = card.querySelector(".producto-precio");
        if (price && price.parentNode === card) {
          price.insertAdjacentElement("afterend", badge);
        } else {
          card.appendChild(badge);
        }
      }
      badge.textContent = "Tu descuento de revendedor: " + discount + "%";
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

      showDiscount(current.discount);
      const observer = new MutationObserver(() => showDiscount(current.discount));
      observer.observe(document.body, { childList: true, subtree: true });
    } catch (error) {
      console.warn("No se pudo mostrar el descuento de revendedor.", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
