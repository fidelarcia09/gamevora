import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reply({ ok: false, error: "Método no permitido." }, 405);

  const authorization = req.headers.get("Authorization") ?? "";
  const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
  const token = tokenMatch?.[1]?.trim();
  if (!token) return reply({ ok: false, error: "Debes iniciar sesión." }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) {
    return reply({ ok: false, error: "Servicio no configurado." }, 500);
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply({ ok: false, error: "JSON inválido." }, 400); }
  if (!isUuid(body.request_id)) return reply({ ok: false, error: "Solicitud inválida." }, 400);

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser(token);
  if (authError || !authData.user) return reply({ ok: false, error: "Sesión no válida." }, 401);

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: request, error: requestError } = await admin
    .from("gvr_purchase_requests")
    .select("id,user_id,status,payment_method,payment_amount,payment_currency,payment_sender_phone,payment_txid,created_at,expires_at,proof_path")
    .eq("id", body.request_id)
    .maybeSingle();

  if (requestError) return reply({ ok: false, error: "No se pudo consultar la solicitud." }, 503);
  if (!request || request.user_id !== authData.user.id) {
    return reply({ ok: false, error: "Solicitud no encontrada." }, 404);
  }
  if (request.status !== "pending" || !request.proof_path || !request.expires_at) {
    return reply({ ok: false, error: "La solicitud todavía no está lista para comparar." }, 409);
  }

  const method = request.payment_method;
  if (method !== "SALDO_MOVIL" && method !== "CUP") {
    return reply({ ok: true, matchStatus: "NOT_APPLICABLE" });
  }
  const expectedCurrency = method === "CUP" ? "CUP" : "SALDO_MOVIL";
  if (request.payment_currency !== expectedCurrency) {
    return reply({ ok: false, error: "La moneda no corresponde al método de pago." }, 409);
  }

  const phone = String(request.payment_sender_phone ?? "").replace(/\D/g, "");
  if (!/^\d{8,15}$/.test(phone)) {
    return reply({ ok: true, matchStatus: "MISSING_SENDER_PHONE" });
  }

  const amount = Number(request.payment_amount);
  const amountMinorUnits = Math.round(amount * 100);
  if (!Number.isFinite(amount) || amount <= 0 ||
      !Number.isSafeInteger(amountMinorUnits) ||
      Math.abs(amount * 100 - amountMinorUnits) > 0.000001) {
    return reply({ ok: false, error: "Importe de solicitud inválido." }, 409);
  }

  const createdAt = new Date(request.created_at).getTime();
  const expiresAt = new Date(request.expires_at).getTime();
  if (!Number.isFinite(createdAt) || !Number.isFinite(expiresAt) || expiresAt < createdAt) {
    return reply({ ok: false, error: "Ventana temporal de solicitud inválida." }, 409);
  }

  let transactionReference: string | null = null;
  let receiverAccount: string | null = null;
  if (method === "CUP") {
    transactionReference = String(request.payment_txid ?? "").trim().toUpperCase();
    receiverAccount = Deno.env.get("GVR_CUP_RECEIVER_ACCOUNT")?.trim() ?? "";
    if (!/^[A-Z0-9]{6,32}$/.test(transactionReference)) {
      return reply({ ok: true, matchStatus: "MISSING_TRANSACTION_REFERENCE" });
    }
    if (!/^\d{10,24}$/.test(receiverAccount)) {
      return reply({ ok: true, matchStatus: "RECEIVER_NOT_CONFIGURED" });
    }
  }

  // Idempotency: if the event was already matched to this exact request, return it.
  const { data: alreadyMatched, error: alreadyError } = await admin
    .from("gvr_payment_notification_events")
    .select("id")
    .eq("matched_request_id", request.id)
    .eq("method", method)
    .limit(2);
  if (alreadyError) return reply({ ok: false, error: "No se pudo consultar coincidencias previas." }, 503);
  if ((alreadyMatched ?? []).length === 1) {
    return reply({ ok: true, matchStatus: "MATCHED", eventId: alreadyMatched[0].id, idempotent: true });
  }
  if ((alreadyMatched ?? []).length > 1) {
    return reply({ ok: true, matchStatus: "AMBIGUOUS", reason: "MULTIPLE_EVENTS_ALREADY_LINKED" });
  }

  let eventQuery = admin
    .from("gvr_payment_notification_events")
    .select("id,method,amount_minor_units,sender_phone,recipient_account,transaction_reference,received_at,matched_request_id")
    .eq("method", method)
    .eq("amount_minor_units", amountMinorUnits)
    .eq("sender_phone", phone)
    .gte("received_at", new Date(createdAt).toISOString())
    .lte("received_at", new Date(expiresAt).toISOString())
    .is("matched_request_id", null)
    .limit(3);

  if (method === "CUP") {
    eventQuery = eventQuery
      .eq("transaction_reference", transactionReference)
      .eq("recipient_account", receiverAccount);
  }

  const { data: events, error: eventsError } = await eventQuery;
  if (eventsError) return reply({ ok: false, error: "No se pudieron consultar notificaciones compatibles." }, 503);

  if (!events?.length) return reply({ ok: true, matchStatus: "NO_MATCH" });
  if (events.length > 1) {
    await admin.from("gvr_payment_notification_events")
      .update({ match_status: "AMBIGUOUS" })
      .in("id", events.map((event) => event.id))
      .is("matched_request_id", null);
    return reply({ ok: true, matchStatus: "AMBIGUOUS", candidateEvents: events.length });
  }

  const event = events[0];
  let requestQuery = admin
    .from("gvr_purchase_requests")
    .select("id")
    .eq("status", "pending")
    .eq("payment_method", method)
    .eq("payment_currency", method === "CUP" ? "CUP" : "SALDO_MOVIL")
    .eq("payment_amount", amount)
    .eq("payment_sender_phone", phone)
    .lte("created_at", event.received_at)
    .gte("expires_at", event.received_at)
    .limit(2);

  if (method === "CUP") {
    requestQuery = requestQuery.eq("payment_txid", transactionReference);
  }

  const { data: matchingRequests, error: matchingRequestsError } = await requestQuery;
  if (matchingRequestsError) return reply({ ok: false, error: "No se pudo verificar la unicidad del pedido." }, 503);

  if (!matchingRequests || matchingRequests.length === 0) {
    return reply({ ok: true, matchStatus: "NO_MATCH" });
  }
  if (matchingRequests.length > 1) {
    await admin.from("gvr_payment_notification_events")
      .update({ match_status: "AMBIGUOUS" })
      .eq("id", event.id)
      .is("matched_request_id", null);
    return reply({ ok: true, matchStatus: "AMBIGUOUS", candidateRequests: matchingRequests.length });
  }
  if (matchingRequests[0].id !== request.id) {
    return reply({ ok: true, matchStatus: "NO_MATCH" });
  }

  // Conditional update makes concurrent attempts one-to-one: only one request can claim an event.
  const { data: linked, error: linkError } = await admin
    .from("gvr_payment_notification_events")
    .update({ matched_request_id: request.id, match_status: "MATCHED" })
    .eq("id", event.id)
    .is("matched_request_id", null)
    .select("id")
    .maybeSingle();

  if (linkError) {
    if (linkError.code === "23505") {
      await admin.from("gvr_payment_notification_events")
        .update({ match_status: "AMBIGUOUS" })
        .eq("id", event.id)
        .is("matched_request_id", null);
      return reply({ ok: true, matchStatus: "ALREADY_CLAIMED" });
    }
    return reply({ ok: false, error: "No se pudo vincular la notificación." }, 503);
  }
  if (!linked) return reply({ ok: true, matchStatus: "ALREADY_CLAIMED" });

  return reply({
    ok: true,
    matchStatus: "MATCHED",
    eventId: linked.id,
    reviewStatus: "PENDING_MANUAL_REVIEW",
    note: "Coincidencia técnica encontrada. La aprobación y acreditación siguen siendo manuales.",
  });
});
