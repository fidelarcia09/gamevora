package com.gamersgold.paymentreader

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import java.util.Locale

internal data class CompletedPaymentMonthStats(
    val count: Int,
    val totalMinorUnits: Long,
    val etecsaCount: Int,
    val cupCount: Int
)

internal class PaymentEventStore(context: Context) :
    SQLiteOpenHelper(context, "gvr_payment_events.db", null, 1) {

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE payment_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dedupe_key TEXT NOT NULL UNIQUE,
                method TEXT NOT NULL,
                amount_minor_units INTEGER NOT NULL,
                sender_phone TEXT NOT NULL,
                recipient_account TEXT,
                transaction_reference TEXT,
                raw_date TEXT,
                received_at_millis INTEGER NOT NULL,
                review_status TEXT NOT NULL DEFAULT 'PENDING_MANUAL_REVIEW'
            )
            """.trimIndent()
        )
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // No destructive migration is performed automatically.
    }

    fun insertIfNew(event: ParsedPaymentEvent): Boolean {
        val values = ContentValues().apply {
            put("dedupe_key", event.localDedupeKey)
            put("method", event.method)
            put("amount_minor_units", event.amountMinorUnits)
            put("sender_phone", event.senderPhone)
            put("recipient_account", event.recipientAccount)
            put("transaction_reference", event.transactionReference)
            put("raw_date", event.rawDate)
            put("received_at_millis", event.receivedAtMillis)
            put("review_status", "PENDING_MANUAL_REVIEW")
        }
        return writableDatabase.insertWithOnConflict(
            "payment_events", null, values, SQLiteDatabase.CONFLICT_IGNORE
        ) != -1L
    }

    fun count(): Int {
        readableDatabase.rawQuery("SELECT COUNT(*) FROM payment_events", null).use { cursor ->
            return if (cursor.moveToFirst()) cursor.getInt(0) else 0
        }
    }

    fun latestSummary(): String? {
        readableDatabase.rawQuery(
            "SELECT method, amount_minor_units FROM payment_events ORDER BY id DESC LIMIT 1",
            null
        ).use { cursor ->
            if (!cursor.moveToFirst()) return null
            val amount = cursor.getLong(1) / 100.0
            return "${cursor.getString(0)} · ${String.format(Locale.US, "%.2f", amount)} CUP"
        }
    }

    fun completedStats(startInclusiveMillis: Long, endExclusiveMillis: Long): CompletedPaymentMonthStats {
        readableDatabase.rawQuery(
            """
            SELECT
                COUNT(*) AS total_count,
                COALESCE(SUM(amount_minor_units), 0) AS total_amount,
                COALESCE(SUM(CASE WHEN method = 'SALDO_MOVIL' THEN 1 ELSE 0 END), 0) AS etecsa_count,
                COALESCE(SUM(CASE WHEN method = 'CUP' THEN 1 ELSE 0 END), 0) AS cup_count
            FROM payment_events
            WHERE review_status = 'COMPLETED'
              AND received_at_millis >= ?
              AND received_at_millis < ?
            """.trimIndent(),
            arrayOf(startInclusiveMillis.toString(), endExclusiveMillis.toString())
        ).use { cursor ->
            if (!cursor.moveToFirst()) return CompletedPaymentMonthStats(0, 0L, 0, 0)
            return CompletedPaymentMonthStats(
                count = cursor.getInt(0),
                totalMinorUnits = cursor.getLong(1),
                etecsaCount = cursor.getInt(2),
                cupCount = cursor.getInt(3)
            )
        }
    }
}
