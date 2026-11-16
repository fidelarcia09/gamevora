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
    private const val UNIQUE_WORK_NAME = "gvr-payment-notification-sync"

    fun enqueue(context: Context): Boolean {
        if (!BuildConfig.GVR_SYNC_ENABLED || !SupabaseAuthClient(context).isConfigured()) return false

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

        WorkManager.getInstance(context.applicationContext).enqueueUniqueWork(
            UNIQUE_WORK_NAME,
            ExistingWorkPolicy.APPEND_OR_REPLACE,
            request
        )
        return true
    }
}
