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

function safeMessage(data: any, fallback: string) {
  return String(data?.error?.message ?? data?.message ?? fallback).slice(0, 900);
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

    const body = await req.json().catch(() => null);
    const orderId = body?.game_order_id;
    if (!validUuid(orderId)) return json({ ok: false, error: "game_order_id inválido." }, 400);

    const { data: order, error: orderError } = await admin
      .from("game_orders").select("*").eq("id", orderId).eq("user_id", authData.user.id).maybeSingle();

    if (orderError) return json({ ok: false, error: "No se pudo consultar el pedido." }, 500);
    if (!order) return json({ ok: false, error: "Pedido no encontrado." }, 404);

    if (order.provider_order_id) {
      return json({
        ok: true, already_submitted: true, game_order_id: order.id,
        provider_order_id: order.provider_order_id, provider_status: order.provider_status,
      });
    }

    if (order.status !== "pending") {
      return json({ ok: false, error: "El pedido no está pendiente.", status: order.status }, 409);
    }

    const { data: manualPayment, error: manualPaymentError } = await admin
      .from("manual_game_payments").select("status, proof_path")
      .eq("game_order_id", order.id).maybeSingle();

    if (manualPaymentError) return json({ ok: false, error: "No se pudo verificar el pago manual." }, 500);
    if (manualPayment && (manualPayment.status !== "approved" || !manualPayment.proof_path)) {
      return json({
        ok: false, error: "El pago manual todavía no ha sido aprobado por administración.",
        payment_status: manualPayment.status, manual_payment_pending: true,
      }, 409);
    }

    const { data: product, error: productError } = await admin
      .from("game_products")
      .select("id, game, product_name, active, provider, provider_product_id, provider_region")
      .eq("id", order.product_id).maybeSingle();

    if (productError) return json({ ok: false, error: "No se pudo consultar el producto." }, 500);
    if (!product || product.active !== true || product.provider !== "rechargegames" ||
        !String(product.provider_product_id ?? "").trim() ||
        !String(product.provider_region ?? "").trim() ||
        !String(order.player_id ?? "").trim()) {
      return json({ ok: false, error: "Producto no preparado para RechargeGames o datos incompletos." }, 409);
    }

    const playerId = String(order.player_id).trim();
    const serverId = String(order.zone_id ?? "").trim();
    if (String(product.game ?? "").toLowerCase().replace(/[\\s_-]/g, "") === "mobilelegends" && !serverId) {
      return json({ ok: false, error: "Mobile Legends requiere el Server ID." }, 400);
    }

    const buyerRef = `ggtopup-${order.id}`;
    const savedRef = String(order.provider_client_reference ?? "").trim();

    if (savedRef && savedRef !== buyerRef) {
      return json({ ok: false, error: "La referencia guardada no coincide; requiere revisión.", reconciliation_required: true }, 409);
    }

    if (!savedRef) {
      const { data: reserved, error: reserveError } = await admin
        .from("game_orders")
        .update({
          provider_client_reference: buyerRef,
          provider_error: "Envío a RechargeGames pendiente de confirmar.",
          ...(serverId ? { zone_id: serverId } : {}),
        })
        .eq("id", order.id).eq("user_id", authData.user.id)
        .eq("status", "pending").is("provider_client_reference", null)
        .is("provider_order_id", null).select("id").maybeSingle();

      if (reserveError) return json({ ok: false, error: "No se pudo reservar el pedido.", retry_safe: false }, 500);
      if (!reserved) {
        const { data: current } = await admin
          .from("game_orders").select("provider_client_reference, provider_order_id")
          .eq("id", order.id).maybeSingle();
        if (current?.provider_order_id) {
          return json({ ok: true, already_submitted: true, provider_order_id: current.provider_order_id });
        }
        if (current?.provider_client_reference !== buyerRef) {
          return json({ ok: false, error: "No se pudo reservar el pedido de forma exclusiva.", retry_safe: false }, 409);
        }
      }
    }

    const payload: Record<string, unknown> = {
      product: `${product.game} ${product.product_name}`.slice(0, 500),
      product_key: String(product.provider_product_id).trim(),
      region: String(product.provider_region).trim(),
      quantity: 1,
      player_id: playerId,
      buyer_ref: buyerRef,
    };
    if (serverId) payload.server_id = serverId;

    let providerResponse: Response;
    try {
      providerResponse = await fetch(`${API}/v1/orders`, {
        method: "POST",
        headers: { "X-API-Key": apiKey, "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error de red";
      await admin.from("game_orders").update({
        provider_error: `RechargeGames: resultado de envío incierto; se puede reintentar con la misma buyer_ref. ${message}`.slice(0, 1000),
      }).eq("id", order.id).eq("provider_client_reference", buyerRef).is("provider_order_id", null);
      return json({
        ok: false, error: "No se pudo confirmar la respuesta del proveedor. Reintenta; se reutilizará la misma referencia para evitar duplicados.",
        game_order_id: order.id, buyer_ref: buyerRef, retry_safe: true,
      }, 503);
    }

    const raw = await providerResponse.text();
    let remote: any = null;
    try { remote = JSON.parse(raw); } catch { remote = { message: raw.slice(0, 900) }; }

    if (providerResponse.status !== 200 && providerResponse.status !== 201) {
      const code = String(remote?.error?.code ?? "provider_error");
      const message = safeMessage(remote, "RechargeGames rechazó el pedido.");
      const providerError = `RechargeGames HTTP ${providerResponse.status}: ${code} - ${message}`.slice(0, 1000);

      await admin.from("game_orders").update({
        provider_status: code.toUpperCase().slice(0, 100),
        provider_error: providerError,
      }).eq("id", order.id).eq("provider_client_reference", buyerRef).is("provider_order_id", null);

      let refunded = false;
      if ([402, 409, 422].includes(providerResponse.status)) {
        const { data: refundResult, error: refundError } = await admin.rpc(
          "refund_rechargegames_rejected_order", { p_game_order_id: order.id },
        );
        if (refundError) console.error("Error reembolsando rechazo confirmado:", refundError.message);
        refunded = refundResult === true;
      }

      return json({
        ok: false, error: message, provider_status: providerResponse.status,
        provider_code: code, game_order_id: order.id, refunded,
        retry_safe: [401, 403, 429].includes(providerResponse.status),
      }, 502);
    }

    const remoteOrderId = String(remote?.order_id ?? "").trim();
    const remoteBuyerRef = String(remote?.buyer_ref ?? "").trim();
    const remoteStatus = String(remote?.status ?? "").toLowerCase();

    if (!remoteOrderId || remoteBuyerRef !== buyerRef ||
        !["pending", "delivered", "failed"].includes(remoteStatus)) {
      await admin.from("game_orders").update({
        provider_error: "RechargeGames respondió, pero los datos de asociación no coinciden. Reconciliación necesaria.",
      }).eq("id", order.id).eq("provider_client_reference", buyerRef).is("provider_order_id", null);
      return json({ ok: false, error: "Respuesta del proveedor no verificable; no se repetirá con otra referencia.", reconciliation_required: true }, 502);
    }

    const { data: saved, error: saveError } = await admin
      .from("game_orders")
      .update({
        provider_order_id: remoteOrderId,
        provider_status: remoteStatus.toUpperCase(),
        provider_error: null,
        provider_submitted_at: new Date().toISOString(),
        ...(serverId ? { zone_id: serverId } : {}),
      })
      .eq("id", order.id).eq("user_id", authData.user.id)
      .eq("provider_client_reference", buyerRef)
      .is("provider_order_id", null).select("id").maybeSingle();

    if (saveError || !saved) {
      const { data: current } = await admin
        .from("game_orders").select("provider_order_id, provider_client_reference")
        .eq("id", order.id).maybeSingle();
      if (current?.provider_order_id !== remoteOrderId || current?.provider_client_reference !== buyerRef) {
        await admin.from("game_orders").update({
          provider_error: "El pedido remoto existe, pero no se pudo asociar con seguridad al pedido local.",
        }).eq("id", order.id).eq("provider_client_reference", buyerRef);
        return json({ ok: false, error: "El pedido remoto existe; requiere reconciliación.", reconciliation_required: true }, 502);
      }
    }

    await admin.from("ventas").update({
      proveedor: "rechargegames",
      id_orden_proveedor: remoteOrderId,
      updated_at: new Date().toISOString(),
    }).eq("game_order_id", order.id);

    if (remoteStatus !== "pending") {
      const { error: applyError } = await admin.rpc("apply_rechargegames_order_status", {
        p_game_order_id: order.id,
        p_provider_order_id: remoteOrderId,
        p_status: remoteStatus,
        p_failure_reason: remote?.failure_reason ?? null,
      });
      if (applyError) console.error("No se pudo aplicar el estado inicial RechargeGames:", applyError.message);
    }

    return json({
      ok: true, game_order_id: order.id, provider_order_id: remoteOrderId,
      buyer_ref: buyerRef, provider_status: remoteStatus,
    });
  } catch (error) {
    console.error("rechargegames-crear-pedido:", error);
    return json({ ok: false, error: "Error interno al procesar el pedido." }, 500);
  }
});
