import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const BSC_RPC = "https://bsc-dataseed.binance.org/";
const EXPECTED_CHAIN_ID = "0x38";
const TOKEN = "0x55d398326f99059ff775485246999027b3197955";
const RECEIVER = "0xd2364c69d339bbd96915bc80b4dbac23c9209f9c";
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const TOKEN_DECIMALS = 18;
const MIN_CONFIRMATIONS = 15;
const CLOCK_SKEW_SECONDS = 5;
const WINDOW_GRACE_SECONDS = 120;
const THROTTLE_MS = 5000;
const RPC_TIMEOUT_MS = 8000;

// Este límite es por instancia de Edge Function, no global ni distribuido.
const lastCall = new Map<string, number>();

type Check = { verified: boolean; code: string; [key: string]: unknown };

type PaymentRequest = {
  id: string;
  user_id: string;
  payment_method: string;
  payment_amount: number | string;
  payment_currency: string;
  payment_txid: string | null;
  status: string;
  created_at: string;
  expires_at: string | null;
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

function parseUnits(value: string, decimals: number): bigint | null {
  const normalized = String(value).trim();
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  if (fraction.length > decimals) return null;
  return BigInt(whole) * (10n ** BigInt(decimals)) +
    BigInt((fraction + "0".repeat(decimals)).slice(0, decimals) || "0");
}

async function rpc(method: string, params: unknown[] = []) {
  const response = await fetch(BSC_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("BSC_RPC_HTTP_ERROR");
  const payload = await response.json();
  if (payload?.error || !("result" in payload)) throw new Error("BSC_RPC_RESPONSE_ERROR");
  return payload.result;
}

function validHash(value: unknown): value is string {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value);
}

function validAddressTopic(value: unknown): value is string {
  return typeof value === "string" && /^0x0{24}[a-fA-F0-9]{40}$/.test(value);
}

/**
 * Solo lectura. Devuelve verified:true únicamente si TODAS las condiciones se cumplen.
 * La coincidencia nunca aprueba ni acredita la solicitud.
 */
async function verify(request: PaymentRequest): Promise<Check> {
  if (request.status !== "pending") return { verified: false, code: "REQUEST_NOT_PENDING" };
  if (request.payment_method !== "USDT" || request.payment_currency !== "USDT") {
    return { verified: false, code: "NOT_USDT_REQUEST" };
  }

  const txid = request.payment_txid;
  if (!validHash(txid)) return { verified: false, code: "INVALID_OR_MISSING_TXID" };

  const expectedAmount = parseUnits(String(request.payment_amount), TOKEN_DECIMALS);
  if (expectedAmount === null || expectedAmount <= 0n) {
    return { verified: false, code: "INVALID_REQUEST_AMOUNT" };
  }

  const chainId = await rpc("eth_chainId");
  if (String(chainId).toLowerCase() !== EXPECTED_CHAIN_ID) throw new Error("WRONG_CHAIN");

  const [receipt, latestBlockHex] = await Promise.all([
    rpc("eth_getTransactionReceipt", [txid]),
    rpc("eth_blockNumber"),
  ]);

  if (!receipt) return { verified: false, code: "TRANSACTION_NOT_FOUND_OR_PENDING" };
  if (String(receipt.transactionHash).toLowerCase() !== txid.toLowerCase()) {
    return { verified: false, code: "TXID_MISMATCH" };
  }
  if (String(receipt.status).toLowerCase() !== "0x1") {
    return { verified: false, code: "TRANSACTION_FAILED" };
  }

  const blockNumber = BigInt(receipt.blockNumber);
  const latestBlock = BigInt(latestBlockHex);
  const confirmations = latestBlock >= blockNumber ? Number(latestBlock - blockNumber + 1n) : 0;
  if (confirmations < MIN_CONFIRMATIONS) {
    return {
      verified: false,
      code: "INSUFFICIENT_CONFIRMATIONS",
      confirmations,
      required_confirmations: MIN_CONFIRMATIONS,
    };
  }

  // Exige un único evento ERC-20 Transfer del contrato oficial hacia la dirección receptora.
  const matches: { from: string; value: bigint }[] = [];
  for (const log of receipt.logs ?? []) {
    if (String(log.address).toLowerCase() !== TOKEN) continue;
    const topics: unknown[] = log.topics ?? [];
    if (topics.length !== 3) continue;
    if (String(topics[0] ?? "").toLowerCase() !== TRANSFER_TOPIC) continue;
    if (!validAddressTopic(topics[1]) || !validAddressTopic(topics[2])) continue;
    if (String(topics[2]).slice(-40).toLowerCase() !== RECEIVER.slice(2)) continue;
    if (!/^0x[0-9a-fA-F]{64}$/.test(String(log.data ?? ""))) continue;

    matches.push({
      from: "0x" + String(topics[1]).slice(-40).toLowerCase(),
      value: BigInt(log.data),
    });
  }

  if (matches.length === 0) return { verified: false, code: "NO_MATCHING_TOKEN_TRANSFER" };
  if (matches.length > 1) return { verified: false, code: "MULTIPLE_MATCHING_TRANSFERS" };

  const received = matches[0].value;
  if (received !== expectedAmount) {
    return {
      verified: false,
      code: "AMOUNT_MISMATCH",
      expected_amount: String(request.payment_amount),
      received_base_units: received.toString(),
    };
  }

  // La fecha del bloque debe quedar dentro del plazo de la solicitud.
  // Esto reduce la reutilización de TXID, pero NO demuestra quién hizo el pago.
  const block = await rpc("eth_getBlockByNumber", [receipt.blockNumber, false]);
  const txTime = block?.timestamp ? Number(BigInt(block.timestamp)) : NaN;
  const createdSec = Date.parse(request.created_at) / 1000;
  const expiresSec = request.expires_at ? Date.parse(request.expires_at) / 1000 : NaN;
  if (![txTime, createdSec, expiresSec].every(Number.isFinite)) {
    return { verified: false, code: "TIME_CHECK_UNAVAILABLE" };
  }
  if (txTime < createdSec - CLOCK_SKEW_SECONDS) {
    return { verified: false, code: "TX_BEFORE_REQUEST", block_timestamp: txTime };
  }
  if (txTime > expiresSec + WINDOW_GRACE_SECONDS) {
    return { verified: false, code: "TX_AFTER_WINDOW", block_timestamp: txTime };
  }

  return {
    verified: true,
    code: "MATCH",
    chain: "BSC",
    token_contract: TOKEN,
    recipient: RECEIVER,
    payer: matches[0].from,
    confirmations,
    required_confirmations: MIN_CONFIRMATIONS,
    block_timestamp: txTime,
    amount: String(request.payment_amount),
    txid,
  };
}

/** Guarda el resultado para auditoría. Nunca cambia saldo ni estado de la solicitud. */
async function logResult(
  userId: string,
  requestId: string,
  txid: string | null,
  result: Check,
) {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    console.error("GVR USDT verifier: faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY; no se guardó la auditoría.");
    return;
  }

  try {
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await admin.from("gvr_usdt_verifications").insert({
      request_id: requestId,
      user_id: userId,
      txid,
      verified: result.verified,
      code: result.code,
      details: result,
    });
    if (error) console.error("GVR USDT verifier: fallo al guardar auditoría:", error.message);
  } catch (error) {
    console.error("GVR USDT verifier: excepción guardando auditoría:", error);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reply({ ok: false, error: "Método no permitido." }, 405);

  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token || token === authorization) {
    return reply({ ok: false, error: "Debes iniciar sesión." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    console.error("GVR USDT verifier: faltan SUPABASE_URL o SUPABASE_ANON_KEY.");
    return reply({ ok: false, error: "Verificador no configurado." }, 500);
  }

  let body: { request_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return reply({ ok: false, error: "Solicitud JSON inválida." }, 400);
  }

  if (typeof body.request_id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.request_id)) {
    return reply({ ok: false, error: "Identificador de solicitud inválido." }, 400);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser(token);
  if (authError || !authData.user) {
    return reply({ ok: false, error: "Sesión no válida." }, 401);
  }

  // Limitador por instancia: no sustituye un límite global en base de datos o Redis.
  const key = authData.user.id + ":" + body.request_id;
  const now = Date.now();
  if (now - (lastCall.get(key) ?? 0) < THROTTLE_MS) {
    return reply({ ok: false, error: "Demasiadas consultas. Espera unos segundos." }, 429);
  }
  lastCall.set(key, now);
  if (lastCall.size > 500) {
    for (const [k, t] of lastCall) if (now - t > 60000) lastCall.delete(k);
  }

  const { data: request, error: requestError } = await userClient
    .from("gvr_purchase_requests")
    .select("id,user_id,payment_method,payment_amount,payment_currency,payment_txid,status,created_at,expires_at")
    .eq("id", body.request_id)
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (requestError) {
    console.error("GVR USDT verifier request lookup failed:", requestError.message);
    return reply({ ok: false, error: "No se pudo consultar la solicitud." }, 500);
  }
  if (!request) return reply({ ok: false, error: "Solicitud no encontrada." }, 404);

  let result: Check;
  try {
    result = await verify(request as PaymentRequest);
  } catch (error) {
    const errorCode = error instanceof Error ? error.message : "UNKNOWN_RPC_ERROR";
    console.error("GVR USDT verifier RPC failure:", errorCode);
    await logResult(authData.user.id, request.id, request.payment_txid, {
      verified: false,
      code: "RPC_ERROR",
      error_code: errorCode,
    });
    return reply({ ok: false, error: "No se pudo consultar BNB Smart Chain. Inténtalo más tarde." }, 502);
  }

  await logResult(authData.user.id, request.id, request.payment_txid, result);

  return reply({
    ok: true,
    mode: "shadow",
    ...result,
    note: "Modo sombra: solo lectura. No acredita GVR ni cambia el estado de la solicitud.",
  });
});
