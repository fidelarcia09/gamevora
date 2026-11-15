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

        // Diagnostic counters contain metadata only: never persist notification text.
        prefs.edit()
            .putInt(KEY_TOTAL_NOTIFICATIONS, prefs.getInt(KEY_TOTAL_NOTIFICATIONS, 0) + 1)
            .apply()

        val observed = prefs.getStringSet(KEY_OBSERVED_PACKAGES, emptySet())
            ?.toMutableSet() ?: mutableSetOf()
        if (observed.add(packageName)) {
            prefs.edit().putStringSet(KEY_OBSERVED_PACKAGES, observed).apply()
        }

        val selectedPackage = prefs.getString(KEY_SELECTED_PACKAGE, null) ?: return
        if (packageName != selectedPackage) return

        val now = sbn.postTime.takeIf { it > 0L } ?: System.currentTimeMillis()
        prefs.edit()
            .putInt(KEY_SELECTED_NOTIFICATIONS, prefs.getInt(KEY_SELECTED_NOTIFICATIONS, 0) + 1)
            .putString(KEY_LAST_NOTIFICATION_PACKAGE, packageName)
            .putLong(KEY_LAST_NOTIFICATION_AT, now)
            .apply()

        fun diagnostic(message: String) {
            prefs.edit().putString(KEY_LAST_DIAGNOSTIC, message).apply()
        }

        if ((sbn.notification.flags and Notification.FLAG_ONGOING_EVENT) != 0) {
            diagnostic("Notificación recibida; ignorada por ser permanente.")
            return
        }

        val extras = sbn.notification.extras
        if (extras == null) {
            prefs.edit()
                .putInt(KEY_NO_CONTENT_NOTIFICATIONS, prefs.getInt(KEY_NO_CONTENT_NOTIFICATIONS, 0) + 1)
                .apply()
            diagnostic("Android entregó la notificación, pero no expuso su contenido.")
            return
        }

        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
        val bodyParts = mutableListOf<String>()
        extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.let(bodyParts::add)
        extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.let(bodyParts::add)
        extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)?.forEach {
            bodyParts.add(it.toString())
        }
        val body = bodyParts.distinct().joinToString("\n").trim()

        if (title.isBlank() || body.isBlank()) {
            prefs.edit()
                .putInt(KEY_NO_CONTENT_NOTIFICATIONS, prefs.getInt(KEY_NO_CONTENT_NOTIFICATIONS, 0) + 1)
                .apply()
            diagnostic("Notificación recibida, pero Google Messages no mostró título o mensaje completo.")
            return
        }

        // Raw title/body are transient only. No notification text is stored or logged.
        val event = PaymentNotificationParser.parse(
            title = title,
            body = body,
            receivedAtMillis = now
        )
        if (event == null) {
            prefs.edit()
                .putInt(KEY_UNRECOGNIZED_NOTIFICATIONS, prefs.getInt(KEY_UNRECOGNIZED_NOTIFICATIONS, 0) + 1)
                .apply()
            diagnostic("Notificación y contenido recibidos; no coincide con un formato de pago admitido.")
            return
        }

        prefs.edit()
            .putInt(KEY_RECOGNIZED_PAYMENTS, prefs.getInt(KEY_RECOGNIZED_PAYMENTS, 0) + 1)
            .putString(KEY_LAST_CAPTURE, event.method)
            .putLong(KEY_LAST_CAPTURE_AT, event.receivedAtMillis)
            .apply()

        try {
            val store = PaymentEventStore(applicationContext)
            val inserted = try {
                store.insertIfNew(event)
            } finally {
                store.close()
            }
            diagnostic(
                if (inserted) "Pago reconocido y guardado para revisión manual."
                else "Pago reconocido, pero ya estaba registrado (duplicado)."
            )
        } catch (_: Exception) {
            diagnostic("Pago reconocido, pero ocurrió un error al guardarlo localmente.")
        }
    }

    companion object {
        const val PREFS = "gvr_reader_settings"
        const val KEY_OBSERVED_PACKAGES = "observed_packages"
        const val KEY_SELECTED_PACKAGE = "selected_package"
        const val KEY_LAST_CAPTURE = "last_capture"
        const val KEY_LAST_CAPTURE_AT = "last_capture_at"

        const val KEY_TOTAL_NOTIFICATIONS = "diag_total_notifications"
        const val KEY_SELECTED_NOTIFICATIONS = "diag_selected_notifications"
        const val KEY_NO_CONTENT_NOTIFICATIONS = "diag_no_content_notifications"
        const val KEY_UNRECOGNIZED_NOTIFICATIONS = "diag_unrecognized_notifications"
        const val KEY_RECOGNIZED_PAYMENTS = "diag_recognized_payments"
        const val KEY_LAST_NOTIFICATION_PACKAGE = "diag_last_notification_package"
        const val KEY_LAST_NOTIFICATION_AT = "diag_last_notification_at"
        const val KEY_LAST_DIAGNOSTIC = "diag_last_message"

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
