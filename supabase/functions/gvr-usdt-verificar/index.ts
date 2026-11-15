import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("BSC_RPC_HTTP_ERROR");
  const payload = await response.json();
  if (payload?.error || !("result" in payload)) throw new Error("BSC_RPC_RESPONSE_ERROR");
  return payload.result;
}

function validHash(value: unknown): value is string {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value);
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

  const { data: request, error: requestError } = await userClient
    .from("gvr_purchase_requests")
    .select("id,user_id,payment_method,payment_amount,payment_currency,payment_txid,status")
    .eq("id", body.request_id)
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (requestError) {
    console.error("GVR USDT verifier request lookup failed:", requestError.message);
    return reply({ ok: false, error: "No se pudo consultar la solicitud." }, 500);
  }
  if (!request) return reply({ ok: false, error: "Solicitud no encontrada." }, 404);
  if (request.status !== "pending") {
    return reply({ ok: true, verified: false, code: "REQUEST_NOT_PENDING", mode: "shadow" });
  }
  if (request.payment_method !== "USDT" || request.payment_currency !== "USDT") {
    return reply({ ok: true, verified: false, code: "NOT_USDT_REQUEST", mode: "shadow" });
  }
  if (!validHash(request.payment_txid)) {
    return reply({ ok: true, verified: false, code: "INVALID_OR_MISSING_TXID", mode: "shadow" });
  }

  const expectedAmount = parseUnits(String(request.payment_amount), TOKEN_DECIMALS);
  if (expectedAmount === null || expectedAmount <= 0n) {
    return reply({ ok: false, error: "Importe de la solicitud no válido." }, 422);
  }

  try {
    const chainId = await rpc("eth_chainId");
    if (String(chainId).toLowerCase() !== EXPECTED_CHAIN_ID) {
      return reply({ ok: false, error: "El nodo RPC no corresponde a BNB Smart Chain." }, 502);
    }

    const [transaction, receipt, latestBlockHex] = await Promise.all([
      rpc("eth_getTransactionByHash", [request.payment_txid]),
      rpc("eth_getTransactionReceipt", [request.payment_txid]),
      rpc("eth_blockNumber"),
    ]);

    if (!transaction || !receipt) {
      return reply({ ok: true, verified: false, code: "TRANSACTION_NOT_FOUND_OR_PENDING", mode: "shadow" });
    }
    if (String(receipt.transactionHash).toLowerCase() !== request.payment_txid.toLowerCase()) {
      return reply({ ok: true, verified: false, code: "TXID_MISMATCH", mode: "shadow" });
    }
    if (String(receipt.status).toLowerCase() !== "0x1") {
      return reply({ ok: true, verified: false, code: "TRANSACTION_FAILED", mode: "shadow" });
    }

    const blockNumber = BigInt(receipt.blockNumber);
    const latestBlock = BigInt(latestBlockHex);
    const confirmations = latestBlock >= blockNumber ? Number(latestBlock - blockNumber + 1n) : 0;
    if (confirmations < MIN_CONFIRMATIONS) {
      return reply({
        ok: true, verified: false, code: "INSUFFICIENT_CONFIRMATIONS",
        confirmations, required_confirmations: MIN_CONFIRMATIONS, mode: "shadow",
      });
    }

    let received = 0n;
    for (const log of receipt.logs ?? []) {
      if (String(log.address).toLowerCase() !== TOKEN) continue;
      const topics = log.topics ?? [];
      if (String(topics[0] ?? "").toLowerCase() !== TRANSFER_TOPIC) continue;
      if (String(topics[2] ?? "").slice(-40).toLowerCase() !== RECEIVER.slice(2)) continue;
      if (!/^0x[0-9a-fA-F]+$/.test(String(log.data ?? ""))) continue;
      received += BigInt(log.data);
    }

    if (received === 0n) {
      return reply({ ok: true, verified: false, code: "NO_MATCHING_TOKEN_TRANSFER", mode: "shadow" });
    }
    if (received !== expectedAmount) {
      return reply({
        ok: true, verified: false, code: "AMOUNT_MISMATCH",
        mode: "shadow", expected_amount: String(request.payment_amount),
        received_base_units: received.toString(),
      });
    }

    return reply({
      ok: true,
      verified: true,
      mode: "shadow",
      code: "MATCH",
      chain: "BSC",
      token_contract: TOKEN,
      recipient: RECEIVER,
      confirmations,
      required_confirmations: MIN_CONFIRMATIONS,
      amount: String(request.payment_amount),
      txid: request.payment_txid,
      note: "Solo verificación de lectura. No acredita GVR ni cambia el estado de la solicitud.",
    });
  } catch (error) {
    console.error("GVR USDT verifier RPC failure:", error);
    return reply({ ok: false, error: "No se pudo consultar BNB Smart Chain. Inténtalo más tarde." }, 502);
  }
});
