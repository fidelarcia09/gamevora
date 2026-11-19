package com.gamersgold.paymentreader

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

internal object GvrPaymentSyncScheduler {
    internal const val UNIQUE_WORK_NAME = "gvr-payment-notification-sync"

    fun enqueue(context: Context, replaceExisting: Boolean = true): Boolean {
        if (!BuildConfig.GVR_SYNC_ENABLED) {
            recordDiagnostic(context, "scheduler", "sync_disabled_in_build")
            return false
        }
        if (!SupabaseAuthClient(context).isConfigured()) {
            recordDiagnostic(context, "scheduler", "supabase_not_configured")
            return false
        }

        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        // Keep retries predictable: retry every 15 seconds instead of exponential growth.
        // Android may still defer execution due to OS scheduling or unavailable network.
        // REPLACE avoids a serial chain; the local SQLite queue is never deleted.
        val request = OneTimeWorkRequestBuilder<GvrPaymentSyncWorker>()
            .setConstraints(constraints)
            .setBackoffCriteria(BackoffPolicy.LINEAR, 15, TimeUnit.SECONDS)
            .build()

        return try {
            val policy = if (replaceExisting) ExistingWorkPolicy.REPLACE else ExistingWorkPolicy.KEEP
            WorkManager.getInstance(context.applicationContext).enqueueUniqueWork(
                UNIQUE_WORK_NAME,
                policy,
                request
            )
            recordDiagnostic(context, "scheduler", "work_enqueued")
            true
        } catch (error: Exception) {
            recordDiagnostic(context, "scheduler", "enqueue_failed_${error.javaClass.simpleName}")
            false
        }
    }

    private fun recordDiagnostic(context: Context, stage: String, code: String) {
        try {
            val prefs = context.applicationContext.getSharedPreferences("gvr_sync_diagnostics", Context.MODE_PRIVATE)
            prefs.edit()
                .putString("scheduler_last_stage", stage)
                .putString("scheduler_last_code", code)
                .putLong("scheduler_last_at_millis", System.currentTimeMillis())
                .apply()
        } catch (_: Exception) {
            // El diagnóstico nunca debe impedir el registro local del pago.
        }
    }
}
