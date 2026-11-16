import {
  resolveGvrPaymentMatch,
  type GvrMatchEvent,
  type GvrMatchRequest,
} from "./gvr-payment-matching.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const saldoEvent: GvrMatchEvent = {
  method: "SALDO_MOVIL",
  amountMinorUnits: 26800,
  senderPhone: "50591030",
  receivedAt: "2026-11-16T12:05:00.000Z",
};

const saldoRequest = (overrides: Partial<GvrMatchRequest> = {}): GvrMatchRequest => ({
  id: "11111111-1111-4111-8111-111111111111",
  status: "pending",
  payment_method: "SALDO_MOVIL",
  payment_currency: "SALDO_MOVIL",
  payment_amount: "268.00",
  payment_sender_phone: "50591030",
  payment_txid: null,
  created_at: "2026-11-16T12:00:00.000Z",
  expires_at: "2026-11-16T12:10:00.000Z",
  ...overrides,
});

const cupEvent: GvrMatchEvent = {
  method: "CUP",
  amountMinorUnits: 350000,
  senderPhone: "5359350941",
  recipientAccount: "9224069992533592",
  transactionReference: "KW6023ZJ0Z999",
  receivedAt: "2026-11-16T12:05:00.000Z",
};

const cupRequest = (overrides: Partial<GvrMatchRequest> = {}): GvrMatchRequest => ({
  id: "22222222-2222-4222-8222-222222222222",
  status: "pending",
  payment_method: "CUP",
  payment_currency: "CUP",
  payment_amount: "3500.00",
  payment_sender_phone: "5359350941",
  payment_txid: "kw6023zj0z999",
  created_at: "2026-11-16T12:00:00.000Z",
  expires_at: "2026-11-16T12:10:00.000Z",
  ...overrides,
});

Deno.test("SALDO_MOVIL exige importe, teléfono y ventana temporal exactos", () => {
  const result = resolveGvrPaymentMatch(saldoEvent, [saldoRequest()], new Set(), null);
  assert(result.status === "MATCHED", "Debe encontrar el único pedido compatible");
  assert(result.requestId === saldoRequest().id, "Debe devolver el pedido exacto");

  assert(resolveGvrPaymentMatch(saldoEvent, [saldoRequest({ payment_amount: "267.99" })], new Set(), null).status === "NO_MATCH", "No debe aceptar otro importe");
  assert(resolveGvrPaymentMatch(saldoEvent, [saldoRequest({ payment_sender_phone: "50000000" })], new Set(), null).status === "NO_MATCH", "No debe aceptar otro teléfono");
  assert(resolveGvrPaymentMatch(saldoEvent, [saldoRequest({ expires_at: "2026-11-16T12:04:59.000Z" })], new Set(), null).status === "NO_MATCH", "No debe aceptar eventos fuera del plazo");
});

Deno.test("SALDO_MOVIL no elige entre dos pedidos indistinguibles", () => {
  const second = saldoRequest({ id: "33333333-3333-4333-8333-333333333333" });
  const result = resolveGvrPaymentMatch(saldoEvent, [saldoRequest(), second], new Set(), null);
  assert(result.status === "AMBIGUOUS", "Dos pedidos compatibles deben quedar ambiguos");
  assert(result.requestId === null, "No debe elegir arbitrariamente un pedido");
});

Deno.test("un pedido ya vinculado no puede reutilizarse", () => {
  const request = saldoRequest();
  const result = resolveGvrPaymentMatch(saldoEvent, [request], new Set([request.id]), null);
  assert(result.status === "NO_MATCH", "No debe reutilizar un pedido ya reclamado");
});

Deno.test("CUP exige importe, teléfono, referencia, cuenta y ventana temporal", () => {
  const result = resolveGvrPaymentMatch(cupEvent, [cupRequest()], new Set(), "9224069992533592");
  assert(result.status === "MATCHED", "Debe aceptar el conjunto exacto de datos");
  assert(result.requestId === cupRequest().id, "Debe devolver el pedido correcto");

  assert(resolveGvrPaymentMatch(cupEvent, [cupRequest({ payment_amount: "3499.99" })], new Set(), "9224069992533592").status === "NO_MATCH", "No debe aceptar otro importe");
  assert(resolveGvrPaymentMatch(cupEvent, [cupRequest({ payment_sender_phone: "5350000000" })], new Set(), "9224069992533592").status === "NO_MATCH", "No debe aceptar otro teléfono");
  assert(resolveGvrPaymentMatch(cupEvent, [cupRequest({ payment_txid: "KW0000ZJ0Z000" })], new Set(), "9224069992533592").status === "NO_MATCH", "No debe aceptar otra transacción");
  assert(resolveGvrPaymentMatch(cupEvent, [cupRequest()], new Set(), "9224000000000000").status === "RECIPIENT_MISMATCH", "No debe aceptar otra cuenta receptora");
  assert(resolveGvrPaymentMatch(cupEvent, [cupRequest()], new Set(), null).status === "RECIPIENT_MISMATCH", "Debe bloquear CUP si no hay cuenta configurada");
});

Deno.test("CUP normaliza mayúsculas de la referencia, pero exige coincidencia completa", () => {
  const result = resolveGvrPaymentMatch(cupEvent, [cupRequest()], new Set(), "9224069992533592");
  assert(result.status === "MATCHED", "La referencia debe compararse sin distinguir mayúsculas");
});

Deno.test("un pedido cancelado o aún no creado no coincide", () => {
  const cancelled = saldoRequest({ status: "cancelled" });
  const future = saldoRequest({ created_at: "2026-11-16T12:05:01.000Z" });
  assert(resolveGvrPaymentMatch(saldoEvent, [cancelled], new Set(), null).status === "NO_MATCH", "No debe aceptar pedidos cancelados");
  assert(resolveGvrPaymentMatch(saldoEvent, [future], new Set(), null).status === "NO_MATCH", "No debe aceptar pagos anteriores al pedido");
});
