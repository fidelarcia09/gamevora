package com.gamersgold.paymentreader

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class PaymentNotificationParserTest {
    @Test
    fun parsesEtecsaAndIgnoresRemainingBalance() {
        val event = PaymentNotificationParser.parse(
            title = "ETECSA",
            body = "Usted ha recibido 268.0 CUP del numero 50591030.Saldo principal 3087.28 CUP, linea activa hasta 2027-09-27",
            receivedAtMillis = 1_800_000_000_000L
        )
        assertNotNull(event)
        assertEquals("SALDO_MOVIL", event?.method)
        assertEquals(26800L, event?.amountMinorUnits)
        assertEquals("50591030", event?.senderPhone)
        assertNull(event?.transactionReference)
    }

    @Test
    fun parsesPagoMovilTransactionReferenceAndRawDate() {
        val event = PaymentNotificationParser.parse(
            title = "PAGO×MOVIL",
            body = "El titular del telefono 5359350941 le ha realizado una transferencia a la cuenta 9224069992533592 de 3500.00 CUP. Nro. Transaccion KW6023ZJ0Z999. Fecha: 9/11/2026.",
            receivedAtMillis = 1_800_000_000_000L
        )
        assertNotNull(event)
        assertEquals("CUP", event?.method)
        assertEquals(350000L, event?.amountMinorUnits)
        assertEquals("KW6023ZJ0Z999", event?.transactionReference)
        assertEquals("9/11/2026.", event?.rawDate)
    }

    @Test
    fun rejectsUnknownNotificationTitle() {
        val event = PaymentNotificationParser.parse(
            title = "Mensajes",
            body = "Usted ha recibido 268.0 CUP del numero 50591030.",
            receivedAtMillis = 1_800_000_000_000L
        )
        assertNull(event)
    }

    @Test
    fun rejectsTruncatedPagoMovilMessage() {
        val event = PaymentNotificationParser.parse(
            title = "PAGO×MOVIL",
            body = "El titular del telefono 5359350941 le ha realizado una transferencia",
            receivedAtMillis = 1_800_000_000_000L
        )
        assertNull(event)
    }
}
