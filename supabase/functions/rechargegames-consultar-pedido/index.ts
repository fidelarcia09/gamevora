import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const API = "https://api.rechargegame.games";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: cors });
}

function validUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "Método no permitido." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const apiKey = Deno.env.get("RECHARGEGAMES_API_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey || !apiKey) {
    return json({ ok: false, error: "Falta configuración de Supabase o RECHARGEGAMES_API_KEY." }, 500);
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ ok: false, error: "Debes iniciar sesión." }, 401);

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: authData, error: authError } = await authClient.auth.getUser(authorization.slice(7).trim());
    if (authError || !authData.user) return json({ ok: false, error: "Sesión inválida o expirada." }, 401);

    const body = await req.json().catch(() => null);
    const orderId = body?.game_order_id;
    if (!validUuid(orderId)) return json({ ok: false, error: "game_order_id inválido." }, 400);

    const { data: order, error: orderError } = await admin
      .from("game_orders")
      .select("id,user_id,status,provider_order_id,provider_client_reference,provider_status,provider_error,product_id")
      .eq("id", orderId).eq("user_id", authData.user.id).maybeSingle();

    if (orderError) return json({ ok: false, error: "No se pudo consultar el pedido local." }, 500);
    if (!order) return json({ ok: false, error: "Pedido no encontrado." }, 404);
    if (order.status === "completed" || order.status === "refunded") {
      return json({ ok: true, game_order_id: order.id, status: order.status, provider_status: order.provider_status });
    }
    if (!order.provider_order_id) {
      return json({
        ok: true, game_order_id: order.id, status: order.status,
        provider_status: order.provider_status,
        message: "El pedido todavía no tiene ID remoto. Si el envío quedó pendiente, reintenta con rechargegames-crear-pedido; utiliza la misma buyer_ref.",
        retry_create: Boolean(order.provider_client_reference),
      });
    }

    const { data: product, error: productError } = await admin
      .from("game_products").select("provider").eq("id", order.product_id).maybeSingle();
    if (productError || product?.provider !== "rechargegames") {
      return json({ ok: false, error: "El producto no está vinculado a RechargeGames." }, 409);
    }

    const response = await fetch(
      `${API}/v1/orders/${encodeURIComponent(String(order.provider_order_id))}`,
      {
        method: "GET",
        headers: { "X-API-Key": apiKey, "Accept": "application/json" },
        signal: AbortSignal.timeout(20000),
      },
    );

    const raw = await response.text();
    let payload: any = null;
    try { payload = JSON.parse(raw); } catch { payload = { message: raw.slice(0, 800) }; }

    if (!response.ok) {
      return json({
        ok: false, error: payload?.error?.message ?? "RechargeGames no permitió consultar el pedido.",
        provider_status: response.status, game_order_id: order.id,
      }, 502);
    }

    const remote = payload?.data ?? payload;
    const remoteId = String(remote?.order_id ?? "").trim();
    const remoteRef = String(remote?.buyer_ref ?? "").trim();
    const status = String(remote?.status ?? "").toLowerCase();

    if (remoteId !== String(order.provider_order_id) ||
        (order.provider_client_reference && remoteRef !== order.provider_client_reference) ||
        !["pending", "delivered", "failed"].includes(status)) {
      return json({ ok: false, error: "La respuesta remota no coincide con el pedido local.", reconciliation_required: true }, 409);
    }

    const { data: applied, error: applyError } = await admin.rpc("apply_rechargegames_order_status", {
      p_game_order_id: order.id,
      p_provider_order_id: remoteId,
      p_status: status,
      p_failure_reason: remote?.failure_reason ?? null,
    });

    if (applyError) {
      console.error("Error aplicando estado RechargeGames:", applyError.message);
      return json({ ok: false, error: "No se pudo sincronizar el estado; requiere revisión.", provider_status: status }, 500);
    }

    return json({
      ok: true, game_order_id: order.id, provider_order_id: remoteId,
      provider_status: status, status: applied,
      delivery_note: remote?.delivery_note ?? null,
      failure_reason: remote?.failure_reason ?? null,
    });
  } catch (error) {
    console.error("rechargegames-consultar-pedido:", error);
    return json({ ok: false, error: "No se pudo conectar con RechargeGames. Inténtalo más tarde." }, 503);
  }
});
