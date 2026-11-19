import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { resolveGvrPaymentMatch } from "./gvr-payment-matching.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const ADMIN_EMAIL = "fidelarciatamayo99@gmail.com";
const SOURCE_PACKAGE = "com.google.android.apps.messaging";
const MAX_BATCH_SIZE = 50;

type IncomingEvent = {
  localEventKey: string;
  capturePackage: string;
  method: "SALDO_MOVIL" | "CUP";
  amountMinorUnits: number;
  senderPhone: string;
  recipientAccount?: string | null;
  transactionReference?: string | null;
  rawDate?: string | null;
  receivedAtMillis: number;
  capturedAtMillis: number | null;
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function logValidationFailure(
  validationId: string,
  scope: "body" | "device" | "batch" | "event",
  field: string,
  rule: string,
  value?: unknown,
  eventIndex?: number,
  batchSize?: number,
): void {
  try {
    const entry: Record<string, unknown> = {
      event: "GVR_SYNC_VALIDATION_FAILED",
      validationId, scope, field, rule,
      type: value === undefined ? "undefined" : value === null ? "null" :
        Array.isArray(value) ? "array" : typeof value,
    };
    if (typeof value === "string") entry.length = value.length;
    if (typeof eventIndex === "number") entry.eventIndex = eventIndex;
    if (typeof batchSize === "number") entry.batchSize = batchSize;
    if (field === "receivedAtMillis" && typeof value === "number" && Number.isFinite(value)) {
      entry.deltaSeconds = Math.round((value - Date.now()) / 1000);
    }
    console.warn("GVR_SYNC_VALIDATION_FAILED", JSON.stringify(entry));
  } catch { /* Diagnostic logging must never affect the HTTP response. */ }
}

function validateEvent(value: unknown, eventIndex: number): IncomingEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    logValidationFailure("EVENT_NOT_OBJECT", "event", "event", "object", value, eventIndex);
    return null;
  }
  const event = value as Record<string, unknown>;
  if (typeof event.localEventKey !== "string") {
    logValidationFailure("EVENT_LOCAL_KEY_TYPE", "event", "localEventKey", "type_string", event.localEventKey, eventIndex); return null;
  }
  if (event.localEventKey.trim().length < 1) {
    logValidationFailure("EVENT_LOCAL_KEY_EMPTY", "event", "localEventKey", "min_length_1", event.localEventKey, eventIndex); return null;
  }
  if (event.localEventKey.length > 256) {
    logValidationFailure("EVENT_LOCAL_KEY_TOO_LONG", "event", "localEventKey", "max_length_256", event.localEventKey, eventIndex); return null;
  }
  if (event.capturePackage !== SOURCE_PACKAGE) {
    logValidationFailure("EVENT_CAPTURE_PACKAGE_MISMATCH", "event", "capturePackage", "exact_value", event.capturePackage, eventIndex); return null;
  }
  if (event.method !== "SALDO_MOVIL" && event.method !== "CUP") {
    logValidationFailure("EVENT_METHOD_INVALID", "event", "method", "allowed_values", event.method, eventIndex); return null;
  }
  if (typeof event.amountMinorUnits !== "number" || !Number.isSafeInteger(event.amountMinorUnits) ||
      event.amountMinorUnits <= 0 || event.amountMinorUnits > 100_000_000_000) {
    logValidationFailure("EVENT_AMOUNT_INVALID", "event", "amountMinorUnits", "positive_safe_integer_max_100000000000", event.amountMinorUnits, eventIndex); return null;
  }
  if (typeof event.senderPhone !== "string" || !/^\d{8,15}$/.test(event.senderPhone)) {
    logValidationFailure("EVENT_SENDER_PHONE_INVALID", "event", "senderPhone", "digits_8_15", event.senderPhone, eventIndex); return null;
  }
  if (typeof event.receivedAtMillis !== "number" || !Number.isSafeInteger(event.receivedAtMillis) ||
      event.receivedAtMillis <= 0 || !Number.isFinite(new Date(event.receivedAtMillis).getTime())) {
    logValidationFailure("EVENT_RECEIVED_AT_INVALID", "event", "receivedAtMillis", "positive_safe_integer_valid_date", event.receivedAtMillis, eventIndex); return null;
  }

  // Los timestamps del dispositivo se conservan como metadatos de origen, pero no
  // se usan para decidir si el servidor acepta el evento: el reloj local puede estar
  // adelantado o atrasado. La conciliación usa la hora de recepción del servidor.
  let capturedAtMillis: number | null = null;
  if (event.capturedAtMillis !== undefined && event.capturedAtMillis !== null && event.capturedAtMillis !== 0) {
    if (typeof event.capturedAtMillis !== "number" ||
        !Number.isSafeInteger(event.capturedAtMillis) ||
        event.capturedAtMillis <= 0 ||
        !Number.isFinite(new Date(event.capturedAtMillis).getTime())) {
      logValidationFailure("EVENT_CAPTURED_AT_INVALID", "event", "capturedAtMillis", "positive_safe_integer_valid_date_or_legacy_zero", event.capturedAtMillis, eventIndex);
      return null;
    }
    capturedAtMillis = Number(event.capturedAtMillis);
  }

  if (event.method === "SALDO_MOVIL") {
    return {
      localEventKey: event.localEventKey, capturePackage: SOURCE_PACKAGE, method: "SALDO_MOVIL",
      amountMinorUnits: Number(event.amountMinorUnits), senderPhone: event.senderPhone,
      recipientAccount: null, transactionReference: null, rawDate: null,
      receivedAtMillis: Number(event.receivedAtMillis), capturedAtMillis,
    };
  }

  if (typeof event.recipientAccount !== "string" || !/^\d{10,24}$/.test(event.recipientAccount)) {
    logValidationFailure("EVENT_CUP_RECIPIENT_INVALID", "event", "recipientAccount", "digits_10_24", event.recipientAccount, eventIndex); return null;
  }
  if (typeof event.transactionReference !== "string" || !/^[A-Z0-9]{6,32}$/.test(event.transactionReference)) {
    logValidationFailure("EVENT_CUP_REFERENCE_INVALID", "event", "transactionReference", "uppercase_alphanumeric_6_32", event.transactionReference, eventIndex); return null;
  }
  if (typeof event.rawDate !== "string") {
    logValidationFailure("EVENT_CUP_RAW_DATE_TYPE", "event", "rawDate", "type_string", event.rawDate, eventIndex); return null;
  }
  if (event.rawDate.trim().length < 1 || event.rawDate.length > 40) {
    logValidationFailure("EVENT_CUP_RAW_DATE_LENGTH", "event", "rawDate", "length_1_40", event.rawDate, eventIndex); return null;
  }
  return {
    localEventKey: event.localEventKey, capturePackage: SOURCE_PACKAGE, method: "CUP",
    amountMinorUnits: Number(event.amountMinorUnits), senderPhone: event.senderPhone,
    recipientAccount: event.recipientAccount, transactionReference: event.transactionReference,
    rawDate: event.rawDate.trim(), receivedAtMillis: Number(event.receivedAtMillis), capturedAtMillis,
  };
}

async function findRequestMatch(
  admin: ReturnType<typeof createClient<any>>,
  event: IncomingEvent,
  serverReceivedAtMillis: number,
): Promise<{ status: string; requestId: string | null }> {
  const configuredAccount = Deno.env.get("GVR_CUP_RECEIVER_ACCOUNT")?.trim() ?? "";
  if (event.method === "CUP" &&
      (!configuredAccount || event.recipientAccount !== configuredAccount)) {
    return { status: "RECIPIENT_MISMATCH", requestId: null };
  }

  const amount = event.amountMinorUnits / 100;
  let query = admin
    .from("gvr_purchase_requests")
    .select("id,status,payment_method,payment_currency,payment_amount,payment_sender_phone,payment_txid,created_at,expires_at")
    .eq("status", "pending")
    .eq("payment_method", event.method)
    .eq("payment_currency", event.method === "CUP" ? "CUP" : "SALDO_MOVIL")
    .eq("payment_amount", amount)
    .eq("payment_sender_phone", event.senderPhone)
    .lte("created_at", new Date(serverReceivedAtMillis).toISOString())
    .limit(1000);

  if (event.method === "CUP") {
    if (!event.transactionReference) return { status: "NO_MATCH", requestId: null };
    query = query.eq("payment_txid", event.transactionReference);
  }

  const { data: requests, error: requestError } = await query;
  if (requestError) throw new Error("REQUEST_MATCH_LOOKUP_FAILED");
  if (!requests?.length) return { status: "NO_MATCH", requestId: null };
  // At the query cap, fail closed: there may be more compatible requests.
  if (requests.length >= 1000) return { status: "AMBIGUOUS", requestId: null };

  const requestIds = requests.map((request: { id: string }) => request.id);
  const { data: linkedEvents, error: linkedError } = await admin
    .from("gvr_payment_notification_events")
    .select("matched_request_id")
    .in("matched_request_id", requestIds);
  if (linkedError) throw new Error("REQUEST_MATCH_CLAIM_LOOKUP_FAILED");

  const linkedRequestIds = new Set(
    (linkedEvents ?? [])
      .map((item: { matched_request_id: string | null }) => item.matched_request_id)
      .filter((id: string | null): id is string => Boolean(id)),
  );

  const result = resolveGvrPaymentMatch(
    {
      method: event.method,
      amountMinorUnits: event.amountMinorUnits,
      senderPhone: event.senderPhone,
      recipientAccount: event.recipientAccount,
      transactionReference: event.transactionReference,
      receivedAt: serverReceivedAtMillis,
    },
    requests,
    linkedRequestIds,
    configuredAccount || null,
  );
  return { status: result.status, requestId: result.requestId };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reply({ ok: false, error: "Método no permitido." }, 405);

  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token || token === authorization) {
    return reply({ ok: false, error: "Debes iniciar sesión." }, 401);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("GVR_SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) {
    console.error("GVR payment reader sync: faltan secretos Supabase requeridos.");
    return reply({ ok: false, error: "Servicio no configurado." }, 500);
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      logValidationFailure("BODY_SHAPE_INVALID", "body", "body", "object", parsed);
      return reply({ ok: false, error: "Lote o identificador de dispositivo inválido." }, 400);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    logValidationFailure("BODY_NOT_JSON", "body", "body", "valid_json");
    return reply({ ok: false, error: "JSON inválido." }, 400);
  }

  if (!isUuid(body.deviceId)) {
    logValidationFailure("DEVICE_ID_INVALID", "device", "deviceId", "uuid_format", body.deviceId);
    return reply({ ok: false, error: "Lote o identificador de dispositivo inválido." }, 400);
  }
  if (!Array.isArray(body.events)) {
    logValidationFailure("BATCH_NOT_ARRAY", "batch", "events", "array", body.events);
    return reply({ ok: false, error: "Lote o identificador de dispositivo inválido." }, 400);
  }
  if (body.events.length < 1) {
    logValidationFailure("BATCH_EMPTY", "batch", "events", "min_items_1", body.events, undefined, body.events.length);
    return reply({ ok: false, error: "Lote o identificador de dispositivo inválido." }, 400);
  }
  if (body.events.length > MAX_BATCH_SIZE) {
    logValidationFailure("BATCH_TOO_LARGE", "batch", "events", "max_items_50", body.events, undefined, body.events.length);
    return reply({ ok: false, error: "Lote o identificador de dispositivo inválido." }, 400);
  }

  const events = body.events.map((event, index) => validateEvent(event, index));
  if (events.some((event) => event === null)) {
    return reply({ ok: false, error: "Uno o más eventos tienen datos inválidos." }, 400);
  }

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser(token);
  if (authError || !authData.user) {
    return reply({ ok: false, error: "Sesión no válida." }, 401);
  }
  if ((authData.user.email ?? "").toLowerCase() !== ADMIN_EMAIL) {
    return reply({ ok: false, error: "Cuenta no autorizada." }, 403);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: agent, error: agentError } = await admin
    .from("support_agents")
    .select("role,active")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (agentError) {
    console.error("GVR payment reader sync: fallo al comprobar rol de administrador.");
    return reply({ ok: false, error: "No se pudo validar el permiso administrativo." }, 500);
  }
  if (!agent || agent.active !== true || agent.role !== "admin") {
    return reply({ ok: false, error: "Se requiere una cuenta administradora activa." }, 403);
  }

  const results: Array<Record<string, unknown>> = [];
  for (const event of events as IncomingEvent[]) {
    const receivedAt = new Date(event.receivedAtMillis);
    const serverReceivedAtMillis = Date.now();
    if (!Number.isFinite(receivedAt.getTime())) {
      results.push({ localEventKey: event.localEventKey, stored: false, error: "INVALID_RECEIVED_AT" });
      continue;
    }

    const captureDelayMs = event.capturedAtMillis === null
      ? null
      : event.capturedAtMillis - event.receivedAtMillis;
    const captureQuality = captureDelayMs === null
      ? "LEGACY_UNVERIFIED"
      : captureDelayMs < -30_000 || captureDelayMs > 120_000
      ? "STALE_NOTIFICATION"
      : "TRUSTED";

    let match: { status: string; requestId: string | null };
    if (captureQuality !== "TRUSTED") {
      match = { status: "NO_MATCH", requestId: null };
    } else {
      try {
        match = await findRequestMatch(admin, event, serverReceivedAtMillis);
      } catch {
        results.push({ localEventKey: event.localEventKey, stored: false, error: "MATCH_LOOKUP_FAILED" });
        continue;
      }
    }

    const row = {
      device_id: body.deviceId,
      local_event_key: event.localEventKey,
      method: event.method,
      source_label: event.method === "SALDO_MOVIL" ? "ETECSA" : "PAGOxMOVIL",
      capture_package: event.capturePackage,
      amount_minor_units: event.amountMinorUnits,
      currency: "CUP",
      sender_phone: event.senderPhone,
      recipient_account: event.recipientAccount,
      transaction_reference: event.transactionReference,
      raw_date: event.rawDate,
      received_at: receivedAt.toISOString(),
      captured_at: event.capturedAtMillis === null ? null : new Date(event.capturedAtMillis).toISOString(),
      capture_delay_ms: captureDelayMs,
      capture_quality: captureQuality,
      synced_by: authData.user.id,
      matched_request_id: match.requestId,
      match_status: match.status,
      review_status: "PENDING_MANUAL_REVIEW",
    };

    const { data: inserted, error: insertError } = await admin
      .from("gvr_payment_notification_events")
      .insert(row)
      .select("id,match_status,matched_request_id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        // A unique conflict is acknowledged only after confirming that the existing
        // row represents the same notification/payment. Never silently swallow a
        // conflicting transaction reference or a reused local key.
        const { data: localDuplicate } = await admin
          .from("gvr_payment_notification_events")
          .select("id,method,amount_minor_units,sender_phone,recipient_account,transaction_reference,received_at,captured_at,capture_quality,review_status")
          .eq("device_id", body.deviceId)
          .eq("local_event_key", event.localEventKey)
          .maybeSingle();

        if (localDuplicate) {
          const sameLocalEvent =
            localDuplicate.method === event.method &&
            Number(localDuplicate.amount_minor_units) === event.amountMinorUnits &&
            localDuplicate.sender_phone === event.senderPhone &&
            (localDuplicate.recipient_account ?? null) === (event.recipientAccount ?? null) &&
            (localDuplicate.transaction_reference ?? null) === (event.transactionReference ?? null) &&
            new Date(localDuplicate.received_at).getTime() === event.receivedAtMillis &&
            (localDuplicate.captured_at ? new Date(localDuplicate.captured_at).getTime() : null) === event.capturedAtMillis;
          results.push(sameLocalEvent
            ? { localEventKey: event.localEventKey, stored: true, duplicate: true, eventId: localDuplicate.id, reviewStatus: localDuplicate.review_status }
            : { localEventKey: event.localEventKey, stored: false, error: "DUPLICATE_LOCAL_KEY_CONFLICT" });
          continue;
        }

        if (event.method === "CUP" && event.transactionReference) {
          const { data: referenceDuplicate } = await admin
            .from("gvr_payment_notification_events")
            .select("id,method,amount_minor_units,sender_phone,recipient_account,review_status")
            .eq("transaction_reference", event.transactionReference)
            .maybeSingle();
          if (referenceDuplicate) {
            const samePayment =
              referenceDuplicate.method === "CUP" &&
              Number(referenceDuplicate.amount_minor_units) === event.amountMinorUnits &&
              referenceDuplicate.sender_phone === event.senderPhone &&
              referenceDuplicate.recipient_account === event.recipientAccount;
            results.push(samePayment
              ? { localEventKey: event.localEventKey, stored: true, duplicate: true, eventId: referenceDuplicate.id, reviewStatus: referenceDuplicate.review_status }
              : { localEventKey: event.localEventKey, stored: false, error: "DUPLICATE_CUP_REFERENCE_CONFLICT" });
            continue;
          }
        }
      }

      // A request may be claimed by only one notification. If another distinct
      // notification races for the same request, preserve it as ambiguous instead
      // of dropping it or associating two payments with one order.
      if (match.requestId) {
        const { data: alreadyClaimed } = await admin
          .from("gvr_payment_notification_events")
          .select("id")
          .eq("matched_request_id", match.requestId)
          .maybeSingle();

        if (alreadyClaimed) {
          const { data: ambiguousEvent, error: ambiguousInsertError } = await admin
            .from("gvr_payment_notification_events")
            .insert({
              ...row,
              matched_request_id: null,
              match_status: "AMBIGUOUS",
            })
            .select("id")
            .single();

          if (!ambiguousInsertError && ambiguousEvent) {
            results.push({
              localEventKey: event.localEventKey,
              stored: true,
              duplicate: false,
              eventId: ambiguousEvent.id,
              matchStatus: "AMBIGUOUS",
              matchedRequestId: null,
              reviewStatus: "PENDING_MANUAL_REVIEW",
            });
            continue;
          }
        }
      }

      console.error("GVR payment reader sync: no se pudo guardar un evento:", insertError.code);
      results.push({ localEventKey: event.localEventKey, stored: false, error: "EVENT_INSERT_FAILED" });
      continue;
    }

    let autoApproval: Record<string, unknown> | null = null;
    if (inserted.match_status === "MATCHED" && inserted.matched_request_id) {
      const { data: approval, error: approvalError } = await admin.rpc(
        "auto_approve_gvr_payment_event",
        {
          p_event_id: inserted.id,
          p_expected_receiver_account: Deno.env.get("GVR_CUP_RECEIVER_ACCOUNT")?.trim() || null,
        },
      );
      if (approvalError) {
        console.error("GVR payment reader sync: auto-aprobación no completada:", approvalError.code);
        autoApproval = { ok: false, status: "AUTO_APPROVAL_FAILED" };
      } else {
        autoApproval = approval as Record<string, unknown>;
      }
    }

    const finalReviewStatus = autoApproval?.status === "AUTO_APPROVED"
      ? "AUTO_APPROVED"
      : "PENDING_MANUAL_REVIEW";

    results.push({
      localEventKey: event.localEventKey,
      stored: true,
      duplicate: false,
      eventId: inserted.id,
      matchStatus: inserted.match_status,
      matchedRequestId: inserted.matched_request_id,
      reviewStatus: finalReviewStatus,
      captureQuality,
      autoApproval,
    });
  }

  return reply({
    ok: true,
    storedCount: results.filter((item) => item.stored === true).length,
    results,
    note: "Las notificaciones se concilian con solicitudes activas. Solo las coincidencias únicas que superan todas las validaciones se acreditan una vez; los casos incompletos o ambiguos quedan pendientes.",
  });
});
