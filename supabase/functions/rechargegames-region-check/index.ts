const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
  if (req.method !== "POST") return json({ ok: false, error: "Método no permitido." }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: "JSON inválido." }, 400); }

  const game = String(body?.game ?? "").trim().toLowerCase();
  const uid = String(body?.uid ?? body?.player_id ?? "").trim();
  const region = String(body?.region ?? "").trim();

  if (!allowedGames.has(game)) return json({ ok: false, error: "Juego no permitido.", allowed_games: [...allowedGames] }, 400);
  if (!uid || uid.length > 200 || !region || region.length > 100) {
    return json({ ok: false, error: "Se requieren uid/player_id y region válidos." }, 400);
  }

  const url = new URL("https://api.rechargegame.games/v1/region-check");
  url.searchParams.set("game", game);
  url.searchParams.set("uid", uid);
  url.searchParams.set("region", region);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    const raw = await response.text();
    let result: unknown;
    try { result = JSON.parse(raw); } catch { result = { message: raw.slice(0, 800) }; }

    return json({
      ok: response.ok,
      provider_status: response.status,
      game,
      region,
      result,
    }, response.ok ? 200 : 502);
  } catch (error) {
    console.error("RechargeGames region check failed:", error);
    return json({ ok: false, error: "No se pudo comprobar la región en RechargeGames." }, 502);
  }
});
