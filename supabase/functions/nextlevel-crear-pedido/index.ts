
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const API = "https://oficialnextlevel.com/api/v1";

const cors = {
"Access-Control-Allow-Origin": "*",
"Access-Control-Allow-Headers":
"authorization, x-client-info, apikey, content-type",
"Access-Control-Allow-Methods": "POST, OPTIONS",
"Content-Type": "application/json",
};

function reply(data: unknown, status = 200) {
return new Response(JSON.stringify(data), {
status,
headers: cors,
});
}

function validUuid(value: unknown): value is string {
return (
typeof value === "string" &&
/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
value,
)
);
}

function unwrap(data: any): any {
return data?.data ?? data;
}

function normalizeStatus(value: unknown): string {
return String(value ?? "").toUpperCase();
}

function extractProviderMessage(data: any, fallback: string): string {
const root = data?.data ?? data;
const error = root?.error;

return String(
(typeof error?.message === "string" && error.message) ||
(typeof root?.message === "string" && root.message) ||
(typeof error === "string" && error) ||
(typeof root?.error === "string" && root.error) ||
fallback,
).slice(0, 1000);
}

async function providerRequest(
path: string,
method = "GET",
body?: unknown,
): Promise<Response> {
const key = Deno.env.get("NEXTLEVEL_API_KEY");

if (!key || !key.startsWith("nl_live_")) {
throw new Error("NEXTLEVEL_API_KEY falta o no tiene el prefijo esperado.");
}

return await fetch(`${API}${path}`, {
method,
headers: {
Authorization: `Bearer ${key}`,
"Content-Type": "application/json",
Accept: "application/json",
},
...(body !== undefined ? { body: JSON.stringify(body) } : {}),
signal: AbortSignal.timeout(30000),
});
}

function exactRemoteMatch(
remote: any,
clientReference: string,
productId: string,
playerId: string,
zoneId: string,
): boolean {
if (
!remote ||
!remote.id ||
remote.clientReference !== clientReference ||
String(remote.productId ?? "") !== productId ||
String(remote.playerId ?? "") !== playerId
) {
return false;
}

if (
zoneId &&
String(remote.zoneId ?? "") !== zoneId
) {
return false;
}

return true;
}

async function saveRemoteOrder(
admin: any,
order: any,
remoteOrder: any,
clientReference: string,
zoneId: string,
) {
if (
!remoteOrder?.id ||
remoteOrder.clientReference !== clientReference
) {
return {
ok: false,
message: "La respuesta remota no coincide con la referencia reservada.",
};
}

const remoteStatus = normalizeStatus(remoteOrder.status);

const allowedStatuses = [
"PENDING",
"PROCESSING",
"COMPLETED",
"REFUNDED",
"FAILED",
];

if (!allowedStatuses.includes(remoteStatus)) {
return {
ok: false,
message: "Next Level devolvió un estado desconocido.",
};
}

const update: Record<string, unknown> = {
provider_order_id: String(remoteOrder.id),
provider_status: remoteStatus,
provider_client_reference: clientReference,
provider_error: null,
};

if (zoneId) {
update.zone_id = zoneId;
}

if (!order.provider_submitted_at) {
update.provider_submitted_at = new Date().toISOString();
}

const { data, error } = await admin
.from("game_orders")
.update(update)
.eq("id", order.id)
.eq("user_id", order.user_id)
.eq("provider_client_reference", clientReference)
.is("provider_order_id", null)
.select("id")
.maybeSingle();

if (error || !data) {
// Puede existir una carrera con el webhook u otro intento.
const { data: current, error: currentError } = await admin
.from("game_orders")
.select(
"id, provider_order_id, provider_status, provider_client_reference",
)
.eq("id", order.id)
.eq("user_id", order.user_id)
.maybeSingle();

if (
!currentError &&
current?.provider_order_id === String(remoteOrder.id) &&
current?.provider_client_reference === clientReference
) {
return {
ok: true,
id: String(remoteOrder.id),
status: current.provider_status ?? remoteStatus,
};
}

console.error(
"No se pudo guardar el pedido remoto:",
error?.message ?? currentError?.message ?? "Sin coincidencia local.",
);

return {
ok: false,
message:
"El pedido remoto existe, pero no se pudo confirmar su asociación local.",
provider_order_id: String(remoteOrder.id),
};
}

return {
ok: true,
id: String(remoteOrder.id),
status: remoteStatus,
};
}

async function markReconciliationRequired(
admin: any,
orderId: string,
clientReference: string,
message: string,
) {
const { error } = await admin
.from("game_orders")
.update({
provider_error: `Reconciliación pendiente: ${message}`.slice(0, 1000),
})
.eq("id", orderId)
.eq("provider_client_reference", clientReference)
.is("provider_order_id", null);

if (error) {
console.error("No se pudo guardar la incidencia:", error.message);
}
}

Deno.serve(async (req) => {
if (req.method === "OPTIONS") {
return new Response("ok", { headers: cors });
}

if (req.method !== "POST") {
return reply({ error: "Método no permitido." }, 405);
}

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !anonKey || !serviceKey) {
return reply({ error: "Configuración de Supabase incompleta." }, 500);
}

const authorization = req.headers.get("Authorization");

if (!authorization?.startsWith("Bearer ")) {
return reply({ error: "Falta el token de sesión." }, 401);
}

const token = authorization.slice(7).trim();

if (!token) {
return reply({ error: "El token de sesión está vacío." }, 401);
}

let etapa = "inicializar_clientes";
try {
const authClient = createClient(supabaseUrl, anonKey, {
auth: { persistSession: false, autoRefreshToken: false },
});
const admin = createClient(supabaseUrl, serviceKey, {
auth: { persistSession: false, autoRefreshToken: false },
});

etapa = "validar_sesion";
const { data: authData, error: authError } =
await authClient.auth.getUser(token);

const user = authData?.user;

if (authError || !user) {
return reply({ error: "La sesión no es válida o ha caducado." }, 401);
}

const body = await req.json().catch(() => null);
const orderId = body?.game_order_id;
const requestedZone = body?.zone_id;

if (!validUuid(orderId)) {
return reply({ error: "game_order_id inválido." }, 400);
}

if (
requestedZone != null &&
(typeof requestedZone !== "string" ||
requestedZone.trim().length > 100)
) {
return reply({ error: "zone_id inválido." }, 400);
}

etapa = "consultar_pedido";
const { data: order, error: orderError } = await admin
.from("game_orders")
.select("*")
.eq("id", orderId)
.eq("user_id", user.id)
.maybeSingle();

if (orderError) {
return reply({ error: "No se pudo consultar el pedido." }, 500);
}

if (!order) {
return reply({ error: "Pedido no encontrado." }, 404);
}

const { data: manualPayment, error: manualPaymentError } = await admin
.from("manual_game_payments")
.select("status, proof_path")
.eq("game_order_id", order.id)
.maybeSingle();

if (manualPaymentError) {
return reply({ error: "No se pudo verificar la aprobación del pago manual." }, 500);
}

if (manualPayment && (manualPayment.status !== "approved" || !manualPayment.proof_path)) {
return reply({
error: "El pago manual todavía no ha sido aprobado por administración.",
game_order_id: order.id,
payment_status: manualPayment.status,
manual_payment_pending: true,
}, 409);
}

if (order.provider_order_id) {
return reply({
success: true,
game_order_id: order.id,
provider_order_id: order.provider_order_id,
provider_status: order.provider_status,
message: "El pedido ya está asociado con Next Level.",
});
}

if (order.status !== "pending") {
return reply(
{
error: "El pedido no está pendiente.",
status: order.status,
},
409,
);
}

const clientReference = `ggtopup-${order.id}`;
const savedReference = order.provider_client_reference;

if (
savedReference &&
savedReference !== clientReference
) {
return reply(
{
error: "La referencia guardada no coincide.",
game_order_id: order.id,
reconciliation_required: true,
retry_safe: false,
},
409,
);
}

const zoneId = String(
order.zone_id ?? requestedZone ?? "",
).trim();

const playerId = String(order.player_id ?? "").trim();

etapa = "consultar_producto";
const { data: product, error: productError } = await admin
.from("game_products")
.select(
"id, game, product_name, active, provider, provider_product_id",
)
.eq("id", order.product_id)
.maybeSingle();

if (productError) {
return reply({ error: "No se pudo consultar el producto." }, 500);
}

if (
!product ||
!product.active ||
product.provider !== "nextlevel" ||
!product.provider_product_id ||
!Number.isFinite(Number(order.price_gvr)) ||
Number(order.price_gvr) <= 0 ||
!playerId
) {
return reply(
{
error: "Producto o datos del pedido inválidos.",
game_order_id: order.id,
},
400,
);
}

const productId = String(product.provider_product_id);

/*
* Si la referencia ya se reservó, recuperar primero el pedido.
* Una consulta fallida o sin coincidencia nunca permite un POST
* automático desde este bloque.
*/
if (savedReference) {
// No se usa GET /orders con filtros porque no está confirmado en la documentación.
// No repetir POST ni asumir que el pedido remoto no existe.
await markReconciliationRequired(
admin,
order.id,
clientReference,
"La referencia ya fue reservada; GET /orders/{id} requiere conocer el ID remoto. Reconciliación manual necesaria.",
);
return reply(
{
error: "Este pedido ya inició el proceso de envío y no se repetirá para evitar una compra duplicada.",
game_order_id: order.id,
reconciliation_required: true,
retry_safe: false,
},
409,
);
}

// A partir de aquí solo se procesa una orden sin referencia reservada.
let catalogResponse: Response;

try {
etapa = "consultar_catalogo_nextlevel";
catalogResponse = await providerRequest("/products");
} catch {
return reply(
{
error: "No se pudo consultar el catálogo de Next Level.",
game_order_id: order.id,
retry_safe: true,
},
503,
);
}

if (!catalogResponse.ok) {
const text = await catalogResponse.text();

return reply(
{
error: "Next Level no permitió consultar el catálogo.",
provider_error: text.slice(0, 500),
provider_http_status: catalogResponse.status,
game_order_id: order.id,
},
502,
);
}

let catalogJson: any;

try {
catalogJson = await catalogResponse.json();
} catch {
return reply(
{
error: "La respuesta del catálogo no es válida.",
game_order_id: order.id,
},
502,
);
}

const catalogData = unwrap(catalogJson);
const products = Array.isArray(catalogData?.products)
? catalogData.products
: Array.isArray(catalogData?.items)
? catalogData.items
: Array.isArray(catalogData)
? catalogData
: [];

const providerProduct = products.find(
(item: any) =>
String(item?.productId ?? item?.id ?? "") === productId,
);

if (
!providerProduct ||
providerProduct.available === false ||
providerProduct.active === false
) {
return reply(
{
error: "El producto no está disponible en Next Level.",
game_order_id: order.id,
},
400,
);
}

const requiresZoneId =
providerProduct.capabilities?.requiresZoneId === true ||
providerProduct.requiresZoneId === true;

if (requiresZoneId && !zoneId) {
return reply(
{
error: "Este producto requiere Zone ID.",
requires_zone_id: true,
game_order_id: order.id,
},
400,
);
}

const payload = {
productId,
playerId,
clientReference,
...(zoneId ? { zoneId } : {}),
};

/*
* Reservar la referencia antes de contactar con el proveedor.
*/
const reservation: Record<string, unknown> = {
provider_client_reference: clientReference,
provider_error: "Envío pendiente de confirmar.",
};

if (zoneId) {
reservation.zone_id = zoneId;
}

etapa = "reservar_referencia";
const { data: reserved, error: reserveError } = await admin
.from("game_orders")
.update(reservation)
.eq("id", order.id)
.eq("user_id", user.id)
.eq("status", "pending")
.is("provider_client_reference", null)
.is("provider_order_id", null)
.select("id")
.maybeSingle();

if (reserveError || !reserved) {
return reply(
{
error: "El pedido no se pudo reservar de forma exclusiva.",
game_order_id: order.id,
retry_safe: false,
},
409,
);
}

/*
* Primera solicitud de creación para esta referencia.
* Si el resultado es incierto, el siguiente intento debe reconciliar.
*/
let createResponse: Response;

try {
etapa = "crear_pedido_nextlevel";
createResponse = await providerRequest(
"/orders",
"POST",
payload,
);
} catch (error) {
const message = error instanceof Error
? error.message
: "Error de conexión";

await markReconciliationRequired(
admin,
order.id,
clientReference,
`Resultado incierto del POST /orders: ${message}`,
);

return reply(
{
error: "Resultado incierto. No crees otra orden.",
game_order_id: order.id,
reconciliation_required: true,
retry_safe: false,
},
503,
);
}

const responseText = await createResponse.text();
let responseJson: any;

try {
responseJson = responseText ? JSON.parse(responseText) : {};
} catch {
await markReconciliationRequired(
admin,
order.id,
clientReference,
"POST /orders devolvió una respuesta no JSON.",
);

return reply(
{
error: "Respuesta del proveedor no válida. Se requiere reconciliación.",
game_order_id: order.id,
reconciliation_required: true,
retry_safe: false,
},
502,
);
}

if (!createResponse.ok) {
const providerError = extractProviderMessage(
responseJson,
`HTTP ${createResponse.status}`,
);
const providerRoot = unwrap(responseJson);
const providerErrorCode = String(
providerRoot?.error?.code ?? providerRoot?.code ?? "",
).toUpperCase();
const definitiveInsufficientBalance =
createResponse.status === 402 ||
providerErrorCode === "INSUFFICIENT_BALANCE" ||
providerError.toUpperCase().includes("INSUFFICIENT_BALANCE") ||
providerError.toLowerCase().includes("saldo nxc insuficiente");

if (definitiveInsufficientBalance) {
await markReconciliationRequired(
admin,
order.id,
clientReference,
`POST /orders HTTP ${createResponse.status}: INSUFFICIENT_BALANCE - ${providerError}`,
);

const { data: refunded, error: refundError } = await admin.rpc(
"refund_nextlevel_insufficient_balance",
{ p_game_order_id: order.id },
);

if (refundError || refunded !== true) {
console.error("No se pudo completar el reembolso por rechazo de Next Level:", refundError?.message ?? "RPC no confirmó el reembolso");
return reply(
{
error: "No se pudo confirmar la creación del pedido. El reembolso necesita revisión.",
game_order_id: order.id,
provider_http_status: createResponse.status,
provider_error: providerError,
reconciliation_required: true,
retry_safe: false,
},
502,
);
}

return reply(
{
error: "No se pudo confirmar la creación del pedido. Se reembolsó el saldo GVR.",
game_order_id: order.id,
provider_http_status: createResponse.status,
provider_error: providerError,
refunded: true,
retry_safe: false,
},
402,
);
}

await markReconciliationRequired(
admin,
order.id,
clientReference,
`POST /orders HTTP ${createResponse.status}: ${providerError}`,
);

return reply(
{
error: "No se pudo confirmar la creación del pedido",
provider_http_status: createResponse.status,
provider_error: providerError,
game_order_id: order.id,
reconciliation_required: true,
retry_safe: false,
},
502,
);
}

const remoteData = unwrap(responseJson);
const remoteOrder = remoteData?.order;

if (
!exactRemoteMatch(
remoteOrder,
clientReference,
productId,
playerId,
zoneId,
)
) {
await markReconciliationRequired(
admin,
order.id,
clientReference,
"La respuesta de creación no coincide exactamente con el pedido reservado.",
);

return reply(
{
error: "No se pudo validar el pedido remoto. No repitas la compra.",
game_order_id: order.id,
reconciliation_required: true,
retry_safe: false,
},
502,
);
}

etapa = "guardar_pedido_remoto";
const saved = await saveRemoteOrder(
admin,
order,
remoteOrder,
clientReference,
zoneId,
);

if (!saved.ok) {
await markReconciliationRequired(
admin,
order.id,
clientReference,
saved.message,
);

return reply(
{
error: saved.message,
game_order_id: order.id,
provider_order_id: saved.provider_order_id,
reconciliation_required: true,
retry_safe: false,
},
500,
);
}

return reply(
{
success: true,
message: "Pedido aceptado por Next Level.",
game_order_id: order.id,
provider_order_id: saved.id,
provider_status: saved.status,
},
201,
);
} catch (error) {
console.error("Error interno en nextlevel-crear-pedido", {
etapa,
message: error instanceof Error ? error.message : String(error),
stack: error instanceof Error ? error.stack : undefined,
});

return reply(
{ error: "Error interno procesando el pedido.", etapa },
500,
);
}
});