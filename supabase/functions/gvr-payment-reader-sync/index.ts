import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

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
  method: "SALDO_MOVIL" | "CUP";
  amountMinorUnits: number;
  senderPhone: string;
  recipientAccount?: string | null;
  transactionReference?: string | null;
  rawDate?: string | null;
  receivedAtMillis: number;
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validateEvent(value: unknown): IncomingEvent | null {
  if (!value || typeof value !== "object") return null;
  const event = value as Record<string, unknown>;
  if (typeof event.localEventKey !== "string" ||
      event.localEventKey.trim().length < 1 ||
      event.localEventKey.length > 256) return null;
  if (event.method !== "SALDO_MOVIL" && event.method !== "CUP") return null;
  if (typeof event.amountMinorUnits !== "number" ||
      !Number.isSafeInteger(event.amountMinorUnits) ||
      event.amountMinorUnits <= 0 ||
      event.amountMinorUnits > 100_000_000_000) return null;
  if (typeof event.senderPhone !== "string" ||
      !/^\d{8,15}$/.test(event.senderPhone)) return null;
  if (typeof event.receivedAtMillis !== "number" ||
      !Number.isSafeInteger(event.receivedAtMillis) ||
      event.receivedAtMillis <= 0 ||
      !Number.isFinite(new Date(event.receivedAtMillis).getTime()) ||
      event.receivedAtMillis > Date.now() + 5 * 60 * 1000) return null;

  if (event.method === "SALDO_MOVIL") {
    return {
      localEventKey: event.localEventKey,
      method: "SALDO_MOVIL",
      amountMinorUnits: Number(event.amountMinorUnits),
      senderPhone: event.senderPhone,
      recipientAccount: null,
      transactionReference: null,
      rawDate: null,
      receivedAtMillis: Number(event.receivedAtMillis),
    };
  }

  if (typeof event.recipientAccount !== "string" ||
      !/^\d{10,24}$/.test(event.recipientAccount) ||
      typeof event.transactionReference !== "string" ||
      !/^[A-Z0-9]{6,32}$/.test(event.transactionReference) ||
      typeof event.rawDate !== "string" ||
      event.rawDate.trim().length < 1 ||
      event.rawDate.length > 40) return null;

  return {
    localEventKey: event.localEventKey,
    method: "CUP",
    amountMinorUnits: Number(event.amountMinorUnits),
    senderPhone: event.senderPhone,
    recipientAccount: event.recipientAccount,
    transactionReference: event.transactionReference,
    rawDate: event.rawDate.trim(),
    receivedAtMillis: Number(event.receivedAtMillis),
  };
}

async function findRequestMatch(
  admin: ReturnType<typeof createClient>,
  event: IncomingEvent,
): Promise<{ status: string; requestId: string | null }> {
  if (event.method === "CUP") {
    const configuredAccount = Deno.env.get("GVR_CUP_RECEIVER_ACCOUNT")?.trim();
    if (!configuredAccount || event.recipientAccount !== configuredAccount) {
      return { status: "RECIPIENT_MISMATCH", requestId: null };
    }
  }

  const amount = event.amountMinorUnits / 100;
  let query = admin
    .from("gvr_purchase_requests")
    .select("id")
    .eq("status", "pending")
    .eq("payment_method", event.method === "CUP" ? "CUP" : "SALDO_MOVIL")
    .eq("payment_currency", event.method === "CUP" ? "CUP" : "SALDO_MOVIL")
    .eq("payment_amount", amount)
    .lte("created_at", new Date(event.receivedAtMillis).toISOString())
    .gte("expires_at", new Date(event.receivedAtMillis).toISOString())
    .limit(2);

  if (event.method === "SALDO_MOVIL") {
    query = query.eq("payment_sender_phone", event.senderPhone);
  }

  const { data, error } = await query;
  if (error) throw new Error("REQUEST_MATCH_LOOKUP_FAILED");
  const matches = data ?? [];
  if (matches.length === 1) {
    return { status: "MATCHED", requestId: matches[0].id as string };
  }
  if (matches.length > 1) return { status: "AMBIGUOUS", requestId: null };
  return { status: "NO_MATCH", requestId: null };
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
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) {
    console.error("GVR payment reader sync: faltan secretos Supabase requeridos.");
    return reply({ ok: false, error: "Servicio no configurado." }, 500);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return reply({ ok: false, error: "JSON inválido." }, 400);
  }

  if (!isUuid(body.deviceId) || !Array.isArray(body.events) ||
      body.events.length < 1 || body.events.length > MAX_BATCH_SIZE) {
    return reply({ ok: false, error: "Lote o identificador de dispositivo inválido." }, 400);
  }

  const events = body.events.map(validateEvent);
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
    if (!Number.isFinite(receivedAt.getTime())) {
      results.push({ localEventKey: event.localEventKey, stored: false, error: "INVALID_RECEIVED_AT" });
      continue;
    }

    let match: { status: string; requestId: string | null };
    try {
      match = await findRequestMatch(admin, event);
    } catch {
      results.push({ localEventKey: event.localEventKey, stored: false, error: "MATCH_LOOKUP_FAILED" });
      continue;
    }

    const row = {
      device_id: body.deviceId,
      local_event_key: event.localEventKey,
      method: event.method,
      source_label: event.method === "SALDO_MOVIL" ? "ETECSA" : "PAGOxMOVIL",
      source_package: SOURCE_PACKAGE,
      amount_minor_units: event.amountMinorUnits,
      currency: "CUP",
      sender_phone: event.senderPhone,
      recipient_account: event.recipientAccount,
      transaction_reference: event.transactionReference,
      raw_date: event.rawDate,
      received_at: receivedAt.toISOString(),
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
        results.push({
          localEventKey: event.localEventKey,
          stored: true,
          duplicate: true,
          reviewStatus: "PENDING_MANUAL_REVIEW",
        });
      } else {
        console.error("GVR payment reader sync: no se pudo guardar un evento:", insertError.code);
        results.push({ localEventKey: event.localEventKey, stored: false, error: "EVENT_INSERT_FAILED" });
      }
      continue;
    }

    results.push({
      localEventKey: event.localEventKey,
      stored: true,
      duplicate: false,
      eventId: inserted.id,
      matchStatus: inserted.match_status,
      matchedRequestId: inserted.matched_request_id,
      reviewStatus: "PENDING_MANUAL_REVIEW",
    });
  }

  return reply({
    ok: true,
    storedCount: results.filter((item) => item.stored === true).length,
    results,
    note: "Los eventos son notificaciones detectadas, no pagos verificados. No se aprueba ni acredita GVR.",
  });
});
