Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ ok: false, error: "Método no permitido." }), {
      status: 405, headers: corsHeaders,
    });
  }

  const apiKey = Deno.env.get("RECHARGEGAMES_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({
      ok: false,
      error: "Falta el secreto RECHARGEGAMES_API_KEY en Supabase Edge Functions.",
    }), { status: 500, headers: corsHeaders });
  }

  try {
    const response = await fetch("https://api.rechargegame.games/v1/ping", {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(20000),
    });

    const raw = await response.text();
    let providerData: unknown;
    try {
      providerData = JSON.parse(raw);
    } catch {
      providerData = { message: raw.slice(0, 500) };
    }

    return new Response(JSON.stringify({
      ok: response.ok,
      provider_status: response.status,
      provider: providerData,
    }), {
      status: response.ok ? 200 : 502,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("RechargeGames ping failed:", error);
    return new Response(JSON.stringify({
      ok: false,
      error: "No se pudo conectar con RechargeGames. Revisa los logs de esta función.",
    }), { status: 502, headers: corsHeaders });
  }
});