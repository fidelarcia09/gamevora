import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const ADMIN_EMAIL = "fidelarciatamayo99@gmail.com";
const MAX_EVENTS = 100;

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reply({ ok: false, error: "Método no permitido." }, 405);

  const authorization = req.headers.get("Authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  if (!token) return reply({ ok: false, error: "Debes iniciar sesión." }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) {
    console.error("GVR payment reader events: faltan secretos requeridos.");
    return reply({ ok: false, error: "Servicio no configurado." }, 500);
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
    console.error("GVR payment reader events: fallo al comprobar rol administrativo.");
    return reply({ ok: false, error: "No se pudo validar el permiso administrativo." }, 500);
  }
  if (!agent || agent.active !== true || agent.role !== "admin") {
    return reply({ ok: false, error: "Se requiere una cuenta administradora activa." }, 403);
  }

  const { data, error } = await admin
    .from("gvr_payment_notification_events")
    .select([
      "id",
      "method",
      "source_label",
      "amount_minor_units",
      "currency",
      "sender_phone",
      "recipient_account",
      "transaction_reference",
      "raw_date",
      "received_at",
      "matched_request_id",
      "match_status",
      "review_status",
      "server_received_at",
    ].join(","))
    .order("received_at", { ascending: false })
    .limit(MAX_EVENTS);

  if (error) {
    console.error("GVR payment reader events: no se pudieron consultar eventos:", error.code);
    return reply({
      ok: false,
      error: "No se pudieron consultar los eventos. Comprueba que el esquema SQL esté aplicado.",
      code: "EVENTS_QUERY_FAILED",
    }, 503);
  }

  return reply({
    ok: true,
    events: data ?? [],
    limit: MAX_EVENTS,
    note: "Son notificaciones detectadas, no comprobantes bancarios ni pagos verificados. La revisión y acreditación siguen siendo manuales.",
  });
});
