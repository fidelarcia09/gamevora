package com.gamersgold.paymentreader

import android.content.Context
import android.util.Log
import androidx.work.Worker
import androidx.work.WorkerParameters
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class GvrPaymentSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : Worker(appContext, workerParams) {

    override fun doWork(): Result {
        if (!BuildConfig.GVR_SYNC_ENABLED) return Result.failure()
        val auth = SupabaseAuthClient(applicationContext)
        if (!auth.isConfigured()) return Result.failure()
        val session = auth.sessionForSync() ?: return if (
            SecureSessionStore(applicationContext).load() != null
        ) Result.retry() else Result.failure()
        if (session.expiresAtMillis <= System.currentTimeMillis() + 15_000L) return Result.retry()

        val store = PaymentEventStore(applicationContext)
        try {
            var batchesProcessed = 0
            while (batchesProcessed < MAX_BATCHES_PER_RUN) {
                val events = store.pendingSyncEvents(MAX_BATCH_SIZE)
                if (events.isEmpty()) return Result.success()

                val payload = JSONObject()
                    .put("deviceId", DeviceIdentity.get(applicationContext))
                    .put("events", JSONArray().apply {
                        events.forEach { event ->
                            put(
                                JSONObject()
                                    .put("localEventKey", event.localDedupeKey)
                                    .put("capturePackage", NotificationCaptureService.TARGET_PACKAGE)
                                    .put("method", event.method)
                                    .put("amountMinorUnits", event.amountMinorUnits)
                                    .put("senderPhone", event.senderPhone)
                                    .put("recipientAccount", event.recipientAccount ?: JSONObject.NULL)
                                    .put("transactionReference", event.transactionReference ?: JSONObject.NULL)
                                    .put("rawDate", event.rawDate ?: JSONObject.NULL)
                                    .put("receivedAtMillis", event.receivedAtMillis)
                                    .put("capturedAtMillis", event.capturedAtMillis)
                            )
                        }
                    })

                val response = postSync(payload, session.accessToken)
                val results = response.optJSONArray("results") ?: run {
                    recordDiagnostic("response", "response_missing_results")
                    return Result.retry()
                }
                var accepted = 0
                for (index in 0 until results.length()) {
                    val item = results.optJSONObject(index) ?: continue
                    val localKey = item.optString("localEventKey")
                    if (localKey.isNotBlank() && item.optBoolean("stored", false)) {
                        store.markSynced(
                            localKey,
                            item.optString("eventId").ifBlank { null },
                            item.optString("reviewStatus", "PENDING_MANUAL_REVIEW")
                        )
                        accepted++
                    }
                }
                if (accepted != events.size) {
                    recordDiagnostic("response", "accepted_count_mismatch_${accepted}_of_${events.size}")
                    return Result.retry()
                }
                batchesProcessed++
            }
            return if (store.pendingSyncCount() == 0) Result.success() else Result.retry()
        } catch (_: AuthRejectedException) {
            recordDiagnostic("auth", "auth_rejected")
            return Result.failure()
        } catch (e: Exception) {
            recordDiagnostic("exception", e.javaClass.simpleName)
            return Result.retry()
        } finally {
            store.close()
        }
    }

    private fun postSync(payload: JSONObject, accessToken: String): JSONObject {
        val baseUrl = BuildConfig.SUPABASE_URL.trim().trimEnd('/')
        val anonKey = BuildConfig.SUPABASE_ANON_KEY.trim()
        val connection = (URL("$baseUrl/functions/v1/gvr-payment-reader-sync")
            .openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 15_000
            readTimeout = 20_000
            doOutput = true
            setRequestProperty("apikey", anonKey)
            setRequestProperty("Authorization", "Bearer $accessToken")
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "application/json")
        }
        try {
            connection.outputStream.use {
                it.write(payload.toString().toByteArray(Charsets.UTF_8))
            }
            val status = connection.responseCode
            if (status == 401 || status == 403) throw AuthRejectedException()
            if (status !in 200..299) {
                recordDiagnostic("http", "http_$status")
                throw IllegalStateException("HTTP_$status")
            }
            val responseText = connection.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
            val json = JSONObject(responseText)
            if (!json.optBoolean("ok", false)) throw IllegalStateException("SYNC_REJECTED")
            return json
        } finally {
            connection.disconnect()
        }
    }

    private fun recordDiagnostic(stage: String, code: String) {
        // Solo códigos/metadatos técnicos; nunca cuerpos HTTP ni datos del evento.
        Log.w(TAG, "[$stage] $code")
        try {
            val prefs = applicationContext.getSharedPreferences(DIAGNOSTICS_PREFS, Context.MODE_PRIVATE)
            prefs.edit()
                .putString("last_stage", stage)
                .putString("last_code", code)
                .putLong("last_at_millis", System.currentTimeMillis())
                .putInt("failure_count", prefs.getInt("failure_count", 0) + 1)
                .apply()
        } catch (_: Exception) {
            // El diagnóstico no puede afectar a la sincronización.
        }
    }

    private class AuthRejectedException : Exception()

    companion object {
        private const val MAX_BATCH_SIZE = 50
        private const val MAX_BATCHES_PER_RUN = 5
        private const val TAG = "GvrSync"
        private const val DIAGNOSTICS_PREFS = "gvr_sync_diagnostics"
    }
}
