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

    fun enqueue(context: Context): Boolean {
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

        // One persistent job per payment event. Android starts it as soon as the
        // CONNECTED constraint is met; no 15-minute polling interval is used.
        // WorkManager persists the request across app restarts and device reboots.
        val request = OneTimeWorkRequestBuilder<GvrPaymentSyncWorker>()
            .setConstraints(constraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()

        return try {
            WorkManager.getInstance(context.applicationContext).enqueueUniqueWork(
                UNIQUE_WORK_NAME,
                ExistingWorkPolicy.APPEND_OR_REPLACE,
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
                .putString("last_stage", stage)
                .putString("last_code", code)
                .putLong("last_at_millis", System.currentTimeMillis())
                .apply()
        } catch (_: Exception) {
            // El diagnóstico nunca debe impedir el registro local del pago.
        }
    }
}
