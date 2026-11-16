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

internal data class PaymentEventForSync(
    val localDedupeKey: String,
    val method: String,
    val amountMinorUnits: Long,
    val senderPhone: String,
    val recipientAccount: String?,
    val transactionReference: String?,
    val rawDate: String?,
    val receivedAtMillis: Long
)

internal class PaymentEventStore(context: Context) :
    SQLiteOpenHelper(context, "gvr_payment_events.db", null, 2) {

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
                review_status TEXT NOT NULL DEFAULT 'PENDING_MANUAL_REVIEW',
                sync_status TEXT NOT NULL DEFAULT 'LOCAL_PENDING',
                server_event_id TEXT
            )
            """.trimIndent()
        )
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        if (oldVersion < 2) {
            db.execSQL(
                "ALTER TABLE payment_events ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'LOCAL_PENDING'"
            )
            db.execSQL("ALTER TABLE payment_events ADD COLUMN server_event_id TEXT")
        }
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
            put("sync_status", "LOCAL_PENDING")
        }
        return writableDatabase.insertWithOnConflict(
            "payment_events", null, values, SQLiteDatabase.CONFLICT_IGNORE
        ) != -1L
    }

    fun count(): Int = scalarCount("SELECT COUNT(*) FROM payment_events")

    fun pendingSyncCount(): Int =
        scalarCount("SELECT COUNT(*) FROM payment_events WHERE sync_status = 'LOCAL_PENDING'")

    fun syncedCount(): Int =
        scalarCount("SELECT COUNT(*) FROM payment_events WHERE sync_status = 'SYNCED'")

    fun pendingSyncEvents(limit: Int): List<PaymentEventForSync> {
        val safeLimit = limit.coerceIn(1, 100)
        val events = mutableListOf<PaymentEventForSync>()
        readableDatabase.rawQuery(
            """
            SELECT dedupe_key, method, amount_minor_units, sender_phone,
                   recipient_account, transaction_reference, raw_date, received_at_millis
            FROM payment_events
            WHERE sync_status = 'LOCAL_PENDING'
            ORDER BY id ASC
            LIMIT $safeLimit
            """.trimIndent(),
            null
        ).use { cursor ->
            while (cursor.moveToNext()) {
                events += PaymentEventForSync(
                    localDedupeKey = cursor.getString(0),
                    method = cursor.getString(1),
                    amountMinorUnits = cursor.getLong(2),
                    senderPhone = cursor.getString(3),
                    recipientAccount = cursor.getString(4),
                    transactionReference = cursor.getString(5),
                    rawDate = cursor.getString(6),
                    receivedAtMillis = cursor.getLong(7)
                )
            }
        }
        return events
    }

    fun markSynced(localDedupeKey: String, serverEventId: String?) {
        val values = ContentValues().apply {
            put("sync_status", "SYNCED")
            if (serverEventId.isNullOrBlank()) putNull("server_event_id")
            else put("server_event_id", serverEventId)
        }
        writableDatabase.update(
            "payment_events",
            values,
            "dedupe_key = ? AND sync_status = 'LOCAL_PENDING'",
            arrayOf(localDedupeKey)
        )
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

    private fun scalarCount(sql: String): Int {
        readableDatabase.rawQuery(sql, null).use { cursor ->
            return if (cursor.moveToFirst()) cursor.getInt(0) else 0
        }
    }
}
