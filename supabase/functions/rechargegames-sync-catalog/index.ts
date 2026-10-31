import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const API = "https://api.rechargegame.games";
const GAME_NAMES: Record<string, string> = { "free-fire": "Free Fire", "pubg-mobile": "PUBG Mobile", "blood-strike": "Blood Strike", "arena-breakout": "Arena Breakout", "genshin-impact": "Genshin Impact", "mobile-legends": "Mobile Legends", "honor-of-kings": "Honor of Kings" };

const GAMES = [
  "free-fire",
  "pubg-mobile",
  "blood-strike",
  "arena-breakout",
  "genshin-impact",
  "mobile-legends",
  "honor-of-kings",
] as const;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: cors });
}

function amountFrom(product: any): number {
  const candidates = [
    product?.game_currency_amount,
    product?.currency_amount,
    product?.amount,
    product?.quantity,
    product?.value,
  ];
  for (const candidate of candidates) {
    const n = Number(candidate);
    if (Number.isFinite(n) && n >= 0) return Math.min(Math.floor(n), 2147483647);
  }
  const match = String(product?.name ?? "").replace(/,/g, "").match(/\d+/);
  return match ? Math.min(Number(match[0]), 2147483647) : 0;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "Método no permitido." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const apiKey = Deno.env.get("RECHARGEGAMES_API_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey || !apiKey) {
    return json({ ok: false, error: "Falta configuración interna de Supabase o RechargeGames." }, 500);
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json({ ok: false, error: "Debes iniciar sesión con una cuenta administradora." }, 401);
  }
  const token = authorization.slice(7).trim();
  if (!token) return json({ ok: false, error: "Sesión vacía." }, 401);

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) return json({ ok: false, error: "La sesión no es válida o ha caducado." }, 401);

    const { data: supportAgent, error: supportError } = await admin
      .from("support_agents")
      .select("user_id")
      .eq("user_id", authData.user.id)
      .eq("active", true)
      .maybeSingle();

    if (supportError) return json({ ok: false, error: "No se pudo verificar el permiso administrativo." }, 500);
    if (!supportAgent) return json({ ok: false, error: "No tienes permiso para sincronizar catálogos." }, 403);

    const body = await req.json().catch(() => ({}));
    const apply = body?.apply === true;
    const margin = 0.25;

    const { data: existing, error: existingError } = await admin
      .from("game_products")
      .select("id, game, provider_product_id, provider_region")
      .eq("provider", "rechargegames");

    if (existingError) return json({ ok: false, error: "No se pudieron consultar los productos actuales." }, 500);

    const existingMap = new Map<string, string>();
    for (const row of (existing ?? [])) {
      const key = [row.game, row.provider_product_id, row.provider_region].join("::");
      if (!existingMap.has(key)) existingMap.set(key, row.id);
    }

    const summary: any[] = [];
    const errors: any[] = [];
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const gameSlug of GAMES) {
      let response: Response;
      try {
        response = await fetch(`${API}/v1/products?game=${encodeURIComponent(gameSlug)}`, {
          method: "GET",
          headers: { "X-API-Key": apiKey, "Accept": "application/json" },
          signal: AbortSignal.timeout(20000),
        });
      } catch (error) {
        errors.push({ game: gameSlug, error: error instanceof Error ? error.message : "Error de conexión" });
        continue;
      }

      const raw = await response.text();
      let catalog: any;
      try { catalog = JSON.parse(raw); } catch { catalog = null; }

      if (!response.ok || !catalog || !Array.isArray(catalog.categories)) {
        errors.push({ game: gameSlug, provider_status: response.status, error: "No se pudo leer el catálogo del proveedor." });
        continue;
      }

      let gameCount = 0;
      for (const category of catalog.categories) {
        if (String(category?.kind ?? "topup").toLowerCase() !== "topup") continue;
        const gameName = GAME_NAMES[gameSlug] ?? String(category?.name ?? gameSlug).trim();
        const groups = Array.isArray(category?.groups) ? category.groups : [];

        for (const group of groups) {
          const regionSlug = String(group?.slug ?? "").trim();
          const regionName = String(group?.name ?? group?.region ?? regionSlug).trim();
          if (!regionSlug) {
            errors.push({ game: gameSlug, region: regionName, error: "Grupo sin slug de región; se omitió para evitar enviar una región incorrecta." });
            continue;
          }

          const products = Array.isArray(group?.products) ? group.products : [];
          for (const product of products) {
            const delivery = String(product?.delivery ?? "").toLowerCase();
            const productKey = String(product?.product_key ?? "").trim();
            const name = String(product?.name ?? "").trim();
            const cost = Number(product?.price);

            // La tabla y el flujo de recargas aceptan identificadores de jugador, no códigos de regalo.
            if (delivery !== "player_id" || !productKey || !name || !Number.isFinite(cost) || cost <= 0) {
              skipped++;
              continue;
            }

            const key = [gameName, productKey, regionSlug].join("::");
            const currentId = existingMap.get(key);

            // Los productos se cargan desactivados hasta completar la adaptación del frontend y las pruebas.
            const row = {
              game: gameName,
              product_name: `${name} [${regionName}]`.slice(0, 250),
              game_currency_amount: amountFrom(product),
              price_gvr: round2(cost * (1 + margin)),
              active: false,
              provider: "rechargegames",
              provider_product_id: productKey,
              provider_region: regionSlug,
              provider_cost: cost,
            };

            if (product?.out_of_stock === true) {
              if (apply && currentId) {
                const { error } = await admin.from("game_products")
                  .update({ active: false, provider_cost: cost, price_gvr: row.price_gvr })
                  .eq("id", currentId);
                if (error) errors.push({ game: gameSlug, product: productKey, error: "No se pudo desactivar un producto agotado." });
              }
              skipped++;
              continue;
            }

            gameCount++;
            if (!apply) continue;

            if (currentId) {
              const { error } = await admin.from("game_products").update(row).eq("id", currentId);
              if (error) errors.push({ game: gameSlug, product: productKey, error: "No se pudo actualizar el producto." });
              else updated++;
            } else {
              const { data: created, error } = await admin.from("game_products")
                .insert(row).select("id").single();
              if (error) {
                errors.push({ game: gameSlug, product: productKey, error: "No se pudo insertar el producto." });
              } else {
                inserted++;
                existingMap.set(key, created.id);
              }
            }
          }
        }
      }
      summary.push({ game: gameSlug, available_player_id_products: gameCount });
    }

    return json({
      ok: errors.length === 0,
      mode: apply ? "applied_inactive" : "preview_only",
      margin_percent: 25,
      conversion: "1 USDT = 1 GVR",
      games_requested: GAMES.length,
      summary,
      totals: { inserted, updated, skipped, errors: errors.length },
      errors,
      note: apply
        ? "Productos sincronizados, todos permanecen desactivados. No se habilitaron compras."
        : "Vista previa: no se escribió ni modificó ningún producto. Envía {apply:true} para importar, siempre manteniendo todo desactivado.",
    });
  } catch (error) {
    console.error("rechargegames-sync-catalog:", error);
    return json({ ok: false, error: "Error interno al sincronizar catálogos." }, 500);
  }
});
