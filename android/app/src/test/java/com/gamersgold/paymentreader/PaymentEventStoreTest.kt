package com.gamersgold.paymentreader

import android.database.sqlite.SQLiteDatabase
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class PaymentEventStoreTest {
    private val context = RuntimeEnvironment.getApplication<android.app.Application>()

    @Before
    fun cleanDatabaseBeforeTest() {
        context.deleteDatabase("gvr_payment_events.db")
    }

    @After
    fun cleanDatabaseAfterTest() {
        context.deleteDatabase("gvr_payment_events.db")
    }

    @Test
    fun insertsNewEtecsaEventAndKeepsItPendingManualReview() {
        val store = PaymentEventStore(context)
        try {
            assertTrue(store.insertIfNew(etecsaEvent()))
            assertEquals(1, store.count())
            assertEquals("SALDO_MOVIL · 268.00 CUP", store.latestSummary())

            store.readableDatabase.rawQuery(
                "SELECT review_status FROM payment_events LIMIT 1",
                null
            ).use { cursor ->
                assertTrue(cursor.moveToFirst())
                assertEquals("PENDING_MANUAL_REVIEW", cursor.getString(0))
            }
        } finally {
            store.close()
        }
    }

    @Test
    fun doesNotInsertTheSamePagoMovilTransactionTwice() {
        val store = PaymentEventStore(context)
        try {
            assertTrue(store.insertIfNew(pagoMovilEvent()))
            assertFalse(store.insertIfNew(pagoMovilEvent().copy(receivedAtMillis = 1_800_000_060_000L)))
            assertEquals(1, store.count())
        } finally {
            store.close()
        }
    }

    @Test
    fun keepsDifferentPaymentReferencesAsSeparateEvents() {
        val store = PaymentEventStore(context)
        try {
            assertTrue(store.insertIfNew(pagoMovilEvent()))
            assertTrue(
                store.insertIfNew(
                    pagoMovilEvent().copy(
                        transactionReference = "OTHERREF12345",
                        localDedupeKey = "PM-OTHERREF12345"
                    )
                )
            )
            assertEquals(2, store.count())
        } finally {
            store.close()
        }
    }

    @Test
    fun eventRemainsStoredAfterDatabaseHelperIsReopened() {
        val firstStore = PaymentEventStore(context)
        assertTrue(firstStore.insertIfNew(etecsaEvent()))
        firstStore.close()

        val reopenedStore = PaymentEventStore(context)
        try {
            assertEquals(1, reopenedStore.count())
            assertNotNull(reopenedStore.latestSummary())
        } finally {
            reopenedStore.close()
        }
    }

    private fun etecsaEvent() = ParsedPaymentEvent(
        method = "SALDO_MOVIL",
        amountMinorUnits = 26800L,
        senderPhone = "50591030",
        recipientAccount = null,
        transactionReference = null,
        rawDate = null,
        receivedAtMillis = 1_800_000_000_000L,
        localDedupeKey = "ET-notification-42-50591030-26800"
    )

    private fun pagoMovilEvent() = ParsedPaymentEvent(
        method = "CUP",
        amountMinorUnits = 350000L,
        senderPhone = "5359350941",
        recipientAccount = "9224069992533592",
        transactionReference = "KW6023ZJ0Z999",
        rawDate = "9/11/2026",
        receivedAtMillis = 1_800_000_000_000L,
        localDedupeKey = "PM-KW6023ZJ0Z999"
    )
}
