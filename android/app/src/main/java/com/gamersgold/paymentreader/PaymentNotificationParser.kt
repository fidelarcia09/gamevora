package com.gamersgold.paymentreader

import java.math.BigDecimal
import java.math.RoundingMode
import java.text.Normalizer
import java.util.Locale

internal data class ParsedPaymentEvent(
    val method: String,
    val amountMinorUnits: Long,
    val senderPhone: String,
    val recipientAccount: String?,
    val transactionReference: String?,
    val rawDate: String?,
    val receivedAtMillis: Long,
    val localDedupeKey: String
)

internal object PaymentNotificationParser {
    fun parse(
        title: String,
        body: String,
        receivedAtMillis: Long,
        notificationKey: String = receivedAtMillis.toString()
    ): ParsedPaymentEvent? {
        if (title.isBlank() || body.isBlank() || receivedAtMillis <= 0L) return null

        val normalizedTitle = normalize(title)
        val etecsa = normalizedTitle.contains("ETECSA")
        val pagoMovil = normalizedTitle.contains("PAGOXMOVIL")

        if (etecsa) {
            val match = Regex(
                """^Usted ha recibido\s+(\d+(?:[.,]\d{1,2})?)\s+CUP\s+del n[uú]mero\s+(\d{8,15})""",
                RegexOption.IGNORE_CASE
            ).find(body.trim()) ?: return null
            val amount = toMinorUnits(match.groupValues[1]) ?: return null
            val phone = match.groupValues[2]
            return ParsedPaymentEvent(
                "SALDO_MOVIL", amount, phone, null, null, null,
                receivedAtMillis, "ET-$notificationKey-$phone-$amount"
            )
        }

        if (pagoMovil) {
            val match = Regex(
                """^El titular del tel[eé]fono\s+(\d{8,15})\s+le ha realizado una transferencia a la cuenta\s+(\d{10,24})\s+de\s+(\d+(?:[.,]\d{1,2})?)\s+CUP\.\s*Nro\.\s*Transacci[oó]n\s+([A-Z0-9]{6,32})\.\s*Fecha:\s*(\S(?:.*\S)?)\s*$""",
                RegexOption.IGNORE_CASE
            ).find(body.trim()) ?: return null
            val amount = toMinorUnits(match.groupValues[3]) ?: return null
            val reference = match.groupValues[4].uppercase(Locale.ROOT)
            return ParsedPaymentEvent(
                "CUP", amount, match.groupValues[1], match.groupValues[2],
                reference, match.groupValues[5].trim().trimEnd('.', ',', ';'), receivedAtMillis,
                "PM-$reference"
            )
        }
        return null
    }

    private fun toMinorUnits(raw: String): Long? = try {
        BigDecimal(raw.replace(',', '.'))
            .setScale(2, RoundingMode.UNNECESSARY)
            .movePointRight(2)
            .longValueExact()
            .takeIf { it > 0L }
    } catch (_: ArithmeticException) {
        null
    } catch (_: NumberFormatException) {
        null
    }

    private fun normalize(value: String): String =
        Normalizer.normalize(value, Normalizer.Form.NFKC)
            .trim()
            .uppercase(Locale.ROOT)
}
