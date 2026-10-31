import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, webhook-id, webhook-timestamp, webhook-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: cors });
}

function equalConstantTime(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifySignature(req: Request, rawBody: string, secret: string): Promise<boolean> {
  const id = req.headers.get("webhook-id") ?? "";
  const timestamp = req.headers.get("webhook-timestamp") ?? "";
  const signatureHeader = req.headers.get("webhook-signature") ?? "";

  if (!id || !/^\d+$/.test(timestamp) || !signatureHeader) return false;
  const seconds = Number(timestamp);
  if (!Number.isSafeInteger(seconds) || Math.abs(Math.floor(Date.now() / 1000) - seconds) > 300) return false;

  const secretPart = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let keyBytes: Uint8Array;
  try {
    const binary = atob(secretPart);
    keyBytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const signed = `${id}.${timestamp}.${rawBody}`;
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signed));
  const expected = btoa(String.fromCharCode(...new Uint8Array(digest)));

  const candidates = signatureHeader.split(/\s+/).flatMap((part) => {
    const comma = part.indexOf(",");
    if (comma < 0) return [];
    return part.slice(0, comma) === "v1" ? [part.slice(comma + 1)] : [];
  });

  return candidates.some((candidate) => equalConstantTime(candidate, expected));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "Método no permitido." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const webhookSecret = Deno.env.get("RECHARGEGAMES_WEBHOOK_SECRET");

  if (!supabaseUrl || !serviceKey || !webhookSecret) {
    console.error("Falta SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o RECHARGEGAMES_WEBHOOK_SECRET.");
    return json({ ok: false, error: "Webhook no configurado." }, 500);
  }

  const rawBody = await req.text();
  if (!(await verifySignature(req, rawBody, webhookSecret))) {
    return json({ ok: false, error: "Firma de webhook inválida o vencida." }, 401);
  }

  let event: any;
  try { event = JSON.parse(rawBody); } catch {
    return json({ ok: false, error: "JSON inválido." }, 400);
  }

  const eventId = req.headers.get("webhook-id") ?? "";
  const eventType = String(event?.type ?? "");
  if (!eventId || (event?.id && String(event.id) !== eventId)) {
    return json({ ok: false, error: "Identificador de evento no coincide." }, 400);
  }

  const data = event?.data ?? {};
  const remoteId = String(data?.order_id ?? "").trim() || null;
  const buyerRef = String(data?.buyer_ref ?? "").trim() || null;

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: claimRows, error: claimError } = await admin.rpc(
      "claim_rechargegames_webhook_event",
      {
        p_event_id: eventId,
        p_event_type: eventType,
        p_provider_order_id: remoteId,
        p_buyer_ref: buyerRef,
      },
    );
    if (claimError) throw new Error(`No se pudo reclamar el evento: ${claimError.message}`);

    const claim = Array.isArray(claimRows) ? claimRows[0] : claimRows;
    if (!claim?.claimed) {
      return json({ ok: true, duplicate: true, event_status: claim?.current_status ?? "unknown" });
    }

    if (eventType === "webhook.test") {
      await admin.from("rechargegames_webhook_events").update({
        processing_status: "processed", processed_at: new Date().toISOString(),
        locked_at: null, last_error: null, updated_at: new Date().toISOString(),
      }).eq("event_id", eventId);
      return json({ ok: true, test: true });
    }

    if (!["order.delivered", "order.failed"].includes(eventType) || !remoteId || !buyerRef) {
      throw new Error("Evento de pedido incompleto o tipo no reconocido.");
    }

    const remoteStatus = eventType === "order.delivered" ? "delivered" : "failed";
    const payloadStatus = String(data?.status ?? remoteStatus).toLowerCase();
    if (payloadStatus !== remoteStatus) throw new Error("El estado del cuerpo no coincide con el tipo de evento.");

    const { data: order, error: orderError } = await admin
      .from("game_orders")
      .select("id,product_id,provider_order_id,provider_client_reference,player_id,zone_id")
      .eq("provider_client_reference", buyerRef)
      .maybeSingle();

    if (orderError) throw new Error(`No se pudo buscar el pedido local: ${orderError.message}`);
    if (!order) throw new Error("No existe pedido local con esa buyer_ref.");

    if (order.provider_client_reference !== buyerRef) throw new Error("buyer_ref no coincide.");
    if (order.provider_order_id && order.provider_order_id !== remoteId) {
      throw new Error("El ID remoto del webhook no coincide con el pedido local.");
    }

    const { data: product, error: productError } = await admin
      .from("game_products").select("provider").eq("id", order.product_id).maybeSingle();
    if (productError || product?.provider !== "rechargegames") {
      throw new Error("El producto local no está vinculado a RechargeGames.");
    }

    if (!order.provider_order_id) {
      const { data: linked, error: linkError } = await admin
        .from("game_orders")
        .update({ provider_order_id: remoteId, provider_status: "PENDING", provider_submitted_at: new Date().toISOString() })
        .eq("id", order.id).eq("provider_client_reference", buyerRef)
        .is("provider_order_id", null).select("id").maybeSingle();

      if (linkError || !linked) {
        const { data: current } = await admin.from("game_orders")
          .select("provider_order_id").eq("id", order.id).maybeSingle();
        if (current?.provider_order_id !== remoteId) throw new Error("No se pudo asociar el ID remoto.");
      }
    }

    const { data: applied, error: applyError } = await admin.rpc("apply_rechargegames_order_status", {
      p_game_order_id: order.id,
      p_provider_order_id: remoteId,
      p_status: remoteStatus,
      p_failure_reason: data?.failure_reason ?? null,
    });
    if (applyError) throw new Error(`No se pudo aplicar el estado del pedido: ${applyError.message}`);

    await admin.from("rechargegames_webhook_events").update({
      processing_status: "processed", processed_at: new Date().toISOString(),
      locked_at: null, last_error: null, updated_at: new Date().toISOString(),
    }).eq("event_id", eventId);

    return json({ ok: true, game_order_id: order.id, provider_order_id: remoteId, status: applied });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error procesando webhook.";
    console.error("rechargegames-webhook:", message);
    await admin.from("rechargegames_webhook_events").update({
      processing_status: "failed", last_error: message.slice(0, 1000),
      locked_at: null, updated_at: new Date().toISOString(),
    }).eq("event_id", eventId);
    return json({ ok: false, error: "No se pudo procesar el webhook; RechargeGames puede reintentarlo." }, 500);
  }
});
