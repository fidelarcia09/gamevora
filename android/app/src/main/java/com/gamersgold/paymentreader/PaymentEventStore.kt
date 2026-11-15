package com.gamersgold.paymentreader

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import java.util.Locale

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
}
