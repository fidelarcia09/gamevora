export type GvrMatchEvent = {
  method: "SALDO_MOVIL" | "CUP";
  amountMinorUnits: number;
  senderPhone: string;
  recipientAccount?: string | null;
  transactionReference?: string | null;
  receivedAt: string | number;
};

export type GvrMatchRequest = {
  id: string;
  status: string;
  payment_method: string;
  payment_currency: string;
  payment_amount: number | string;
  payment_sender_phone: string | null;
  payment_txid: string | null;
  created_at: string;
  expires_at: string | null;
};

export type GvrMatchResult = {
  status: "MATCHED" | "AMBIGUOUS" | "NO_MATCH" | "RECIPIENT_MISMATCH";
  requestId: string | null;
};

/**
 * Reglas comunes de conciliación técnica. No aprueba pagos ni acredita saldo.
 * Un pedido ya reclamado por otra notificación no puede volver a seleccionarse.
 */
export function resolveGvrPaymentMatch(
  event: GvrMatchEvent,
  requests: GvrMatchRequest[],
  linkedRequestIds: ReadonlySet<string>,
  configuredReceiverAccount: string | null,
): GvrMatchResult {
  if (event.method === "CUP") {
    const receiver = configuredReceiverAccount?.trim() ?? "";
    if (!/^\d{10,24}$/.test(receiver) || event.recipientAccount !== receiver) {
      return { status: "RECIPIENT_MISMATCH", requestId: null };
    }
  }

  const receivedAt = typeof event.receivedAt === "number"
    ? event.receivedAt
    : Date.parse(event.receivedAt);
  if (!Number.isFinite(receivedAt) ||
      !Number.isSafeInteger(event.amountMinorUnits) ||
      event.amountMinorUnits <= 0 ||
      !/^\d{8,15}$/.test(event.senderPhone)) {
    return { status: "NO_MATCH", requestId: null };
  }

  const expectedCurrency = event.method === "CUP" ? "CUP" : "SALDO_MOVIL";
  const eventReference = event.transactionReference?.trim().toUpperCase() ?? "";

  const matches = requests.filter((request) => {
    if (linkedRequestIds.has(request.id) || request.status !== "pending") return false;
    if (request.payment_method !== event.method ||
        request.payment_currency !== expectedCurrency) return false;

    const amount = Number(request.payment_amount);
    const amountMinor = Math.round(amount * 100);
    if (!Number.isFinite(amount) || !Number.isSafeInteger(amountMinor) ||
        Math.abs(amount * 100 - amountMinor) > 0.000001 ||
        amountMinor !== event.amountMinorUnits) return false;

    const phone = String(request.payment_sender_phone ?? "").replace(/\D/g, "");
    if (phone !== event.senderPhone) return false;

    const createdAt = Date.parse(request.created_at);
    const expiresAt = request.expires_at ? Date.parse(request.expires_at) : NaN;
    if (!Number.isFinite(createdAt) || !Number.isFinite(expiresAt) ||
        createdAt > receivedAt || receivedAt > expiresAt) return false;

    if (event.method === "CUP") {
      const requestReference = String(request.payment_txid ?? "").trim().toUpperCase();
      if (!eventReference || requestReference !== eventReference) return false;
    }
    return true;
  });

  if (matches.length === 1) return { status: "MATCHED", requestId: matches[0].id };
  if (matches.length > 1) return { status: "AMBIGUOUS", requestId: null };
  return { status: "NO_MATCH", requestId: null };
}
