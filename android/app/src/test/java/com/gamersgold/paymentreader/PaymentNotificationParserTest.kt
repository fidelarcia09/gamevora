package com.gamersgold.paymentreader

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class PaymentNotificationParserTest {
    private val receivedAt = 1_800_000_000_000L

    @Test
    fun parsesEtecsaAndIgnoresRemainingBalance() {
        val event = PaymentNotificationParser.parse(
            title = "ETECSA",
            body = "Usted ha recibido 268.0 CUP del numero 50591030.Saldo principal 3087.28 CUP, linea activa hasta 2027-09-27",
            receivedAtMillis = receivedAt
        )
        assertNotNull(event)
        assertEquals("SALDO_MOVIL", event?.method)
        assertEquals(26800L, event?.amountMinorUnits)
        assertEquals("50591030", event?.senderPhone)
        assertNull(event?.recipientAccount)
        assertNull(event?.transactionReference)
        assertNull(event?.rawDate)
        assertEquals("ET-$receivedAt-50591030-26800", event?.localDedupeKey)
    }

    @Test
    fun parsesEtecsaWithCommaDecimal() {
        val event = PaymentNotificationParser.parse(
            title = "ETECSA",
            body = "Usted ha recibido 125,50 CUP del numero 5351234567. Saldo principal 900,00 CUP",
            receivedAtMillis = receivedAt
        )
        assertNotNull(event)
        assertEquals(12550L, event?.amountMinorUnits)
        assertEquals("5351234567", event?.senderPhone)
    }

    @Test
    fun rejectsEtecsaAmountWithMoreThanTwoDecimalPlaces() {
        val event = PaymentNotificationParser.parse(
            title = "ETECSA",
            body = "Usted ha recibido 125.555 CUP del numero 5351234567.",
            receivedAtMillis = receivedAt
        )
        assertNull(event)
    }

    @Test
    fun parsesPagoMovilTransactionReferenceAndRawDate() {
        val event = PaymentNotificationParser.parse(
            title = "PAGOxMOVIL",
            body = "El titular del telefono 5359350941 le ha realizado una transferencia a la cuenta 9224069992533592 de 3500.00 CUP. Nro. Transaccion KW6023ZJ0Z999. Fecha: 9/11/2026.",
            receivedAtMillis = receivedAt
        )
        assertNotNull(event)
        assertEquals("CUP", event?.method)
        assertEquals(350000L, event?.amountMinorUnits)
        assertEquals("5359350941", event?.senderPhone)
        assertEquals("9224069992533592", event?.recipientAccount)
        assertEquals("KW6023ZJ0Z999", event?.transactionReference)
        assertEquals("9/11/2026.", event?.rawDate)
        assertEquals("PM-KW6023ZJ0Z999", event?.localDedupeKey)
    }

    @Test
    fun acceptsPagoMovilTitleWithoutSpecialCharacter() {
        val event = PaymentNotificationParser.parse(
            title = "PAGOxMOVIL",
            body = "El titular del telefono 5359350941 le ha realizado una transferencia a la cuenta 9224069992533592 de 3500.00 CUP. Nro. Transaccion KW6023ZJ0Z999. Fecha: 9/11/2026",
            receivedAtMillis = receivedAt
        )
        assertNotNull(event)
        assertEquals("CUP", event?.method)
        assertEquals("9/11/2026", event?.rawDate)
    }

    @Test
    fun rejectsUnknownNotificationTitle() {
        val event = PaymentNotificationParser.parse(
            title = "Mensajes",
            body = "Usted ha recibido 268.0 CUP del numero 50591030.",
            receivedAtMillis = receivedAt
        )
        assertNull(event)
    }

    @Test
    fun rejectsTruncatedPagoMovilMessage() {
        val event = PaymentNotificationParser.parse(
            title = "PAGOxMOVIL",
            body = "El titular del telefono 5359350941 le ha realizado una transferencia",
            receivedAtMillis = receivedAt
        )
        assertNull(event)
    }

    @Test
    fun rejectsMissingOrInvalidTimestamp() {
        assertNull(
            PaymentNotificationParser.parse(
                title = "ETECSA",
                body = "Usted ha recibido 268.0 CUP del numero 50591030.",
                receivedAtMillis = 0L
            )
        )
    }
}
