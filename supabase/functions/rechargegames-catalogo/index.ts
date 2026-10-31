const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const allowedGames = new Set([
  "arena-breakout",
  "blood-strike",
  "free-fire",
  "genshin-impact",
  "honor-of-kings",
  "mobile-legends",
  "pubg-mobile",
]);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json({ ok: false, error: "Método no permitido." }, 405);

  const apiKey = Deno.env.get("RECHARGEGAMES_API_KEY");
  if (!apiKey) return json({ ok: false, error: "Falta RECHARGEGAMES_API_KEY en Supabase." }, 500);

  const url = new URL(req.url);
  const game = (url.searchParams.get("game") || "").trim().toLowerCase();
  if (!allowedGames.has(game)) {
    return json({ ok: false, error: "Juego no permitido o slug incorrecto.", allowed_games: [...allowedGames] }, 400);
  }

  try {
    const response = await fetch(
      `https://api.rechargegame.games/v1/products?game=${encodeURIComponent(game)}`,
      {
        method: "GET",
        headers: { "X-API-Key": apiKey, "Accept": "application/json" },
        signal: AbortSignal.timeout(20000),
      },
    );

    const raw = await response.text();
    let catalog: any;
    try { catalog = JSON.parse(raw); } catch { catalog = { message: raw.slice(0, 1000) }; }

    if (!response.ok) {
      return json({
        ok: false, provider_status: response.status, game,
        error: catalog?.error?.message ?? "RechargeGames rechazó la consulta del catálogo.",
        catalog,
      }, 502);
    }

    const flatProducts: any[] = [];
    const categories = Array.isArray(catalog?.categories) ? catalog.categories : [];

    for (const category of categories) {
      if (String(category?.kind ?? "topup").toLowerCase() !== "topup") continue;
      const groups = Array.isArray(category?.groups) ? category.groups : [];

      for (const group of groups) {
        const products = Array.isArray(group?.products) ? group.products : [];
        for (const product of products) {
          const productKey = String(product?.product_key ?? "").trim();
          if (!productKey || String(product?.delivery ?? "player_id").toLowerCase() === "code") continue;

          const region = String(group?.name ?? group?.region ?? group?.slug ?? "").trim();
          flatProducts.push({
            productId: productKey,
            product_key: productKey,
            productName: String(product?.name ?? ""),
            name: String(product?.name ?? ""),
            price: product?.price ?? null,
            price_usdt: product?.price ?? null,
            delivery: product?.delivery ?? "player_id",
            available: product?.out_of_stock !== true,
            out_of_stock: product?.out_of_stock === true,
            region,
            region_slug: String(group?.slug ?? ""),
            provider_region: region,
            game: String(category?.slug ?? game),
            kind: "topup",
          });
        }
      }
    }

    return json({
      ok: true,
      provider_status: response.status,
      game,
      products: flatProducts,
      catalog,
    });
  } catch (error) {
    console.error("RechargeGames catalog request failed:", error);
    return json({ ok: false, error: "No se pudo consultar el catálogo de RechargeGames.", game }, 502);
  }
});
