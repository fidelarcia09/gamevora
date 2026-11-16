package com.gamersgold.paymentreader

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

internal object GvrPaymentSyncScheduler {
    private const val UNIQUE_WORK_NAME = "gvr-payment-notification-sync"
    private const val UNIQUE_PERIODIC_WORK_NAME = "gvr-payment-notification-periodic-sync"
    private const val PERIODIC_INTERVAL_MINUTES = 15L

    fun enqueue(context: Context): Boolean {
        if (!BuildConfig.GVR_SYNC_ENABLED || !SupabaseAuthClient(context).isConfigured()) return false

        val appContext = context.applicationContext
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        val workManager = WorkManager.getInstance(appContext)

        // Persistent fallback: WorkManager keeps this schedule across app restarts and reboots.
        // Android applies a minimum 15-minute interval; execution time is OS-managed.
        val periodicRequest = PeriodicWorkRequestBuilder<GvrPaymentSyncWorker>(
            PERIODIC_INTERVAL_MINUTES,
            TimeUnit.MINUTES
        )
            .setConstraints(constraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()

        workManager.enqueueUniquePeriodicWork(
            UNIQUE_PERIODIC_WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            periodicRequest
        )

        // Fast path: try immediately after a new payment notification or app launch.
        val request = OneTimeWorkRequestBuilder<GvrPaymentSyncWorker>()
            .setConstraints(constraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()

        workManager.enqueueUniqueWork(
            UNIQUE_WORK_NAME,
            ExistingWorkPolicy.APPEND_OR_REPLACE,
            request
        )
        return true
    }
}
