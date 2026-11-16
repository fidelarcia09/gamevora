/**
 * Parsers estrictos de SMS de pagos GVR.
 *
 * Este módulo NO concilia pagos ni acredita GVR. Solo extrae datos estructurados
 * después de validar el remitente de sistema contra una lista permitida inyectada
 * por el backend. La lista real de remitentes aún debe confirmarse en Android.
 *
 * Importante:
 * - ETECSA no incluye referencia única; el ID local del SMS solo ayuda a deduplicar
 *   dentro del dispositivo y no demuestra unicidad del pago.
 * - PAGOxMOVIL conserva la fecha textual sin interpretarla.
 * - Ambos resultados requieren revisión humana.
 */

export type GvrSmsMethod = "SALDO_MOVIL" | "CUP";

export type GvrSmsInput = {
  /** Remitente proporcionado por Android, no extraído del cuerpo del SMS. */
  systemSender: string;
  body: string;
  /** ID local del SMS en el dispositivo Android. */
  localMessageId: string;
  /** Fecha/hora de recepción proporcionada por Android, en ISO-8601. */
  receivedAt: string;
};

export type GvrSmsSenderAllowlist = {
  etecsa: string[];
  pagoMovil: string[];
};

export type GvrSmsParseErrorCode =
  | "INVALID_INPUT"
  | "INVALID_RECEIVED_AT"
  | "UNKNOWN_SYSTEM_SENDER"
  | "UNRECOGNIZED_MESSAGE"
  | "INVALID_AMOUNT";

export type GvrSmsParseResult =
  | {
      ok: true;
      method: "SALDO_MOVIL";
      currency: "CUP";
      amountMinorUnits: number;
      amount: string;
      senderPhone: string;
      localMessageId: string;
      receivedAt: string;
      requiresManualReview: true;
      uniqueProviderReference: null;
      dedupeScope: "DEVICE_LOCAL_ONLY";
    }
  | {
      ok: true;
      method: "CUP";
      currency: "CUP";
      amountMinorUnits: number;
      amount: string;
      senderPhone: string;
      recipientAccount: string;
      transactionReference: string;
      rawDate: string;
      localMessageId: string;
      receivedAt: string;
      requiresManualReview: true;
      uniqueProviderReference: string;
      dedupeScope: "PROVIDER_TRANSACTION_REFERENCE";
    }
  | {
      ok: false;
      code: GvrSmsParseErrorCode;
    };

function normalizeSender(value: string): string {
  return value.normalize("NFKC").trim().toLocaleUpperCase("en-US");
}

function isAllowedSender(sender: string, allowed: string[]): boolean {
  const normalized = normalizeSender(sender);
  return normalized.length > 0 &&
    allowed.some((candidate) => normalizeSender(candidate) === normalized);
}

/**
 * Convierte una cantidad decimal a centésimas sin usar Number/parseFloat
 * para realizar la conversión monetaria.
 */
function parseAmountMinorUnits(value: string): number | null {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value)) return null;

  const normalized = value.replace(",", ".");
  const [whole, fraction = ""] = normalized.split(".");
  const wholeNumber = Number(whole);

  if (!Number.isSafeInteger(wholeNumber) || wholeNumber < 0) return null;

  const minor = wholeNumber * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(minor) || minor <= 0) return null;

  return minor;
}

function formatMinorUnits(value: number): string {
  const whole = Math.floor(value / 100);
  const fraction = String(value % 100).padStart(2, "0");
  return `${whole}.${fraction}`;
}

function validCommonInput(input: GvrSmsInput): boolean {
  return typeof input.systemSender === "string" &&
    input.systemSender.trim().length > 0 &&
    typeof input.body === "string" &&
    input.body.trim().length > 0 &&
    typeof input.localMessageId === "string" &&
    input.localMessageId.trim().length > 0 &&
    typeof input.receivedAt === "string" &&
    input.receivedAt.trim().length > 0;
}

export function parseGvrSms(
  input: GvrSmsInput,
  allowlist: GvrSmsSenderAllowlist,
): GvrSmsParseResult {
  if (!validCommonInput(input) ||
    !allowlist ||
    !Array.isArray(allowlist.etecsa) ||
    !Array.isArray(allowlist.pagoMovil)) {
    return { ok: false, code: "INVALID_INPUT" };
  }

  const receivedAtMs = Date.parse(input.receivedAt);
  if (!Number.isFinite(receivedAtMs)) {
    return { ok: false, code: "INVALID_RECEIVED_AT" };
  }

  const body = input.body.trim();

  // El remitente se valida con metadatos de Android, nunca con texto del cuerpo.
  if (isAllowedSender(input.systemSender, allowlist.etecsa)) {
    const match = body.match(
      /^Usted ha recibido\s+(\d+(?:[.,]\d{1,2})?)\s+CUP\s+del n[uú]mero\s+(\d{8,15})\s*\.?\s*(?:Saldo principal\b[\s\S]*)?$/i,
    );

    if (!match) return { ok: false, code: "UNRECOGNIZED_MESSAGE" };

    const amountMinorUnits = parseAmountMinorUnits(match[1]);
    if (amountMinorUnits === null) {
      return { ok: false, code: "INVALID_AMOUNT" };
    }

    return {
      ok: true,
      method: "SALDO_MOVIL",
      currency: "CUP",
      amountMinorUnits,
      amount: formatMinorUnits(amountMinorUnits),
      senderPhone: match[2],
      localMessageId: input.localMessageId.trim(),
      receivedAt: new Date(receivedAtMs).toISOString(),
      requiresManualReview: true,
      uniqueProviderReference: null,
      dedupeScope: "DEVICE_LOCAL_ONLY",
    };
  }

  if (isAllowedSender(input.systemSender, allowlist.pagoMovil)) {
    const match = body.match(
      /^El titular del tel[eé]fono\s+(\d{8,15})\s+le ha realizado una transferencia a la cuenta\s+(\d{10,24})\s+de\s+(\d+(?:[.,]\d{1,2})?)\s+CUP\.\s*Nro\.\s*Transacci[oó]n\s+([A-Z0-9]{6,32})\.\s*Fecha:\s*(\S(?:.*\S)?)\s*$/i,
    );

    if (!match) return { ok: false, code: "UNRECOGNIZED_MESSAGE" };

    const amountMinorUnits = parseAmountMinorUnits(match[3]);
    if (amountMinorUnits === null) {
      return { ok: false, code: "INVALID_AMOUNT" };
    }

    return {
      ok: true,
      method: "CUP",
      currency: "CUP",
      amountMinorUnits,
      amount: formatMinorUnits(amountMinorUnits),
      senderPhone: match[1],
      recipientAccount: match[2],
      transactionReference: match[4].toUpperCase(),
      rawDate: match[5].trim(),
      localMessageId: input.localMessageId.trim(),
      receivedAt: new Date(receivedAtMs).toISOString(),
      requiresManualReview: true,
      uniqueProviderReference: match[4].toUpperCase(),
      dedupeScope: "PROVIDER_TRANSACTION_REFERENCE",
    };
  }

  return { ok: false, code: "UNKNOWN_SYSTEM_SENDER" };
}
