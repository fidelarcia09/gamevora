package com.gamersgold.paymentreader

import android.app.Notification
import android.content.ComponentName
import android.content.Context
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class NotificationCaptureService : NotificationListenerService() {
    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val packageName = sbn.packageName

        // Store package identifiers only, never text from unrelated notifications.
        val observed = prefs.getStringSet(KEY_OBSERVED_PACKAGES, emptySet())
            ?.toMutableSet() ?: mutableSetOf()
        if (observed.add(packageName)) {
            prefs.edit().putStringSet(KEY_OBSERVED_PACKAGES, observed).apply()
        }

        val selectedPackage = prefs.getString(KEY_SELECTED_PACKAGE, null) ?: return
        if (packageName != selectedPackage) return
        if ((sbn.notification.flags and Notification.FLAG_ONGOING_EVENT) != 0) return

        val extras = sbn.notification.extras ?: return
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
        val bodyParts = mutableListOf<String>()
        extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.let(bodyParts::add)
        extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.let(bodyParts::add)
        extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)?.forEach {
            bodyParts.add(it.toString())
        }
        val body = bodyParts.distinct().joinToString("\n").trim()
        if (title.isBlank() || body.isBlank()) return

        // The raw notification text is used transiently and is never persisted or logged.
        val event = PaymentNotificationParser.parse(
            title = title,
            body = body,
            receivedAtMillis = sbn.postTime
        ) ?: return

        val store = PaymentEventStore(applicationContext)
        try {
            store.insertIfNew(event)
        } finally {
            store.close()
        }
        prefs.edit()
            .putString(KEY_LAST_CAPTURE, event.method)
            .putLong(KEY_LAST_CAPTURE_AT, event.receivedAtMillis)
            .apply()
    }

    companion object {
        const val PREFS = "gvr_reader_settings"
        const val KEY_OBSERVED_PACKAGES = "observed_packages"
        const val KEY_SELECTED_PACKAGE = "selected_package"
        const val KEY_LAST_CAPTURE = "last_capture"
        const val KEY_LAST_CAPTURE_AT = "last_capture_at"

        fun isAccessGranted(context: Context): Boolean {
            val enabled = android.provider.Settings.Secure.getString(
                context.contentResolver,
                "enabled_notification_listeners"
            ) ?: return false
            val component = ComponentName(context, NotificationCaptureService::class.java)
            return enabled.split(':').any {
                ComponentName.unflattenFromString(it) == component
            }
        }
    }
}
