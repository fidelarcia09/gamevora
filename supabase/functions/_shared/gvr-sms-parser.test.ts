import { parseGvrSms, type GvrSmsInput } from "./gvr-sms-parser.ts";

const allowlist = {
  // Etiquetas que el operador confirmó que aparecen como remitente.
  // La app aún debe verificar qué valor entrega Android en originatingAddress.
  etecsa: ["ETECSA"],
  pagoMovil: ["PAGO×MOVIL"],
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function input(overrides: Partial<GvrSmsInput> = {}): GvrSmsInput {
  return {
    systemSender: "ETECSA",
    body: "Usted ha recibido 268.0 CUP del numero 50000000.Saldo principal 3087.28 CUP, linea activa hasta 2027-09-27, vence 2028-03-25",
    localMessageId: "android-sms-test-001",
    receivedAt: "2026-11-15T12:00:00.000Z",
    ...overrides,
  };
}

Deno.test("ETECSA: extrae importe transferido y teléfono de origen", () => {
  const result = parseGvrSms(input(), allowlist);
  assert(result.ok, "El SMS ETECSA de prueba debe reconocerse");
  assert(result.method === "SALDO_MOVIL", "Debe identificar SALDO_MOVIL");
  assert(result.amount === "268.00", "Debe usar 268.0 como importe transferido");
  assert(result.amountMinorUnits === 26800, "Debe convertir a centésimas exactas");
  assert(result.senderPhone === "50000000", "Debe extraer el teléfono de origen");
  assert(result.uniqueProviderReference === null, "ETECSA no aporta referencia única");
  assert(result.requiresManualReview, "ETECSA siempre requiere revisión humana");
});

Deno.test("ETECSA: no confunde saldo principal con importe recibido", () => {
  const result = parseGvrSms(input(), allowlist);
  assert(result.ok, "El SMS ETECSA debe reconocerse");
  assert(result.amount === "268.00", "El saldo principal no debe alterar el importe");
});

Deno.test("PAGO×MOVIL: extrae referencia y conserva la fecha textual", () => {
  const result = parseGvrSms(input({
    systemSender: "PAGO×MOVIL",
    body: "El titular del telefono 5350000000 le ha realizado una transferencia a la cuenta 9224000000000000 de 3500.00 CUP. Nro. Transaccion KW0000ZJ0Z000. Fecha: 9/11/2026.",
  }), allowlist);

  assert(result.ok, "El SMS PAGO×MOVIL de prueba debe reconocerse");
  assert(result.method === "CUP", "Debe identificar CUP");
  assert(result.amount === "3500.00", "Debe extraer el importe exacto");
  assert(result.senderPhone === "5350000000", "Debe extraer el teléfono de origen");
  assert(result.recipientAccount === "9224000000000000", "Debe extraer la cuenta destino");
  assert(result.transactionReference === "KW0000ZJ0Z000", "Debe extraer la referencia");
  assert(result.uniqueProviderReference === "KW0000ZJ0Z000", "La referencia debe ser la clave de deduplicación");
  assert(result.rawDate === "9/11/2026.", "Debe conservar la fecha sin interpretarla");
  assert(result.requiresManualReview, "PAGO×MOVIL permanece en revisión humana");
});

Deno.test("rechaza remitentes que no estén en la lista permitida", () => {
  const result = parseGvrSms(input({ systemSender: "SMS_DESCONOCIDO" }), allowlist);
  assert(!result.ok && result.code === "UNKNOWN_SYSTEM_SENDER", "Debe rechazar remitente desconocido");
});

Deno.test("no acepta un SMS ETECSA si solo aparece un saldo sin frase de transferencia", () => {
  const result = parseGvrSms(input({
    body: "Saldo principal 3087.28 CUP",
  }), allowlist);
  assert(!result.ok && result.code === "UNRECOGNIZED_MESSAGE", "Debe rechazar un formato que no sea confirmación");
});

Deno.test("no interpreta la fecha ambigua de PAGO×MOVIL", () => {
  const result = parseGvrSms(input({
    systemSender: "PAGO×MOVIL",
    body: "El titular del telefono 5350000000 le ha realizado una transferencia a la cuenta 9224000000000000 de 3500.00 CUP. Nro. Transaccion KW0000ZJ0Z000. Fecha: 9/11/2026.",
  }), allowlist);
  assert(result.ok && result.rawDate === "9/11/2026.", "La fecha debe permanecer como texto original");
});
