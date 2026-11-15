package com.gamersgold.paymentreader

import android.app.Notification
import android.content.ComponentName
import android.content.Context
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import java.security.MessageDigest

class NotificationCaptureService : NotificationListenerService() {
    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (sbn.packageName != TARGET_PACKAGE) return

        val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val now = sbn.postTime.takeIf { it > 0L } ?: System.currentTimeMillis()
        val extras = sbn.notification.extras
        val title = extras?.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
        val bodyParts = mutableListOf<String>()
        extras?.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.let(bodyParts::add)
        extras?.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.let(bodyParts::add)
        extras?.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)?.forEach { bodyParts.add(it.toString()) }
        val body = bodyParts.distinct().joinToString("\n").trim()

        fun diagnostic(message: String) {
            prefs.edit()
                .putString(KEY_LAST_DIAGNOSTIC, message)
                .putString(KEY_LAST_NOTIFICATION_PACKAGE, sbn.packageName)
                .putLong(KEY_LAST_NOTIFICATION_AT, now)
                .apply()
        }

        // Android can repost the same notification when its card is updated.
        // Store only a SHA-256 fingerprint, never the raw notification text.
        if (!markNotificationAsNew(prefs, sbn.key, title, body)) {
            prefs.edit()
                .putInt(KEY_DUPLICATE_NOTIFICATIONS, prefs.getInt(KEY_DUPLICATE_NOTIFICATIONS, 0) + 1)
                .apply()
            diagnostic("Actualización repetida de la misma notificación; ignorada.")
            return
        }

        prefs.edit()
            .putInt(KEY_TOTAL_NOTIFICATIONS, prefs.getInt(KEY_TOTAL_NOTIFICATIONS, 0) + 1)
            .putString(KEY_LAST_NOTIFICATION_PACKAGE, sbn.packageName)
            .putLong(KEY_LAST_NOTIFICATION_AT, now)
            .apply()

        if ((sbn.notification.flags and Notification.FLAG_ONGOING_EVENT) != 0) {
            diagnostic("Notificación permanente de Google Messages; ignorada.")
            return
        }

        if (extras == null) {
            prefs.edit()
                .putInt(KEY_NO_CONTENT_NOTIFICATIONS, prefs.getInt(KEY_NO_CONTENT_NOTIFICATIONS, 0) + 1)
                .apply()
            diagnostic("Google Messages publicó una notificación sin contenido visible.")
            return
        }

        if (title.isBlank() || body.isBlank()) {
            prefs.edit()
                .putInt(KEY_NO_CONTENT_NOTIFICATIONS, prefs.getInt(KEY_NO_CONTENT_NOTIFICATIONS, 0) + 1)
                .apply()
            diagnostic("Notificación recibida, pero Google Messages no mostró título o mensaje completo.")
            return
        }

        val event = PaymentNotificationParser.parse(
            title = title,
            body = body,
            receivedAtMillis = now,
            notificationKey = sbn.key
        )
        if (event == null) {
            prefs.edit()
                .putInt(KEY_UNRECOGNIZED_NOTIFICATIONS, prefs.getInt(KEY_UNRECOGNIZED_NOTIFICATIONS, 0) + 1)
                .apply()
            diagnostic("Notificación recibida desde Google Messages; formato no reconocido.")
            return
        }

        try {
            val store = PaymentEventStore(applicationContext)
            val inserted = try {
                store.insertIfNew(event)
            } finally {
                store.close()
            }
            if (inserted) {
                prefs.edit()
                    .putInt(KEY_RECOGNIZED_PAYMENTS, prefs.getInt(KEY_RECOGNIZED_PAYMENTS, 0) + 1)
                    .putString(KEY_LAST_CAPTURE, event.method)
                    .putLong(KEY_LAST_CAPTURE_AT, event.receivedAtMillis)
                    .apply()
                diagnostic("Pago reconocido y guardado para revisión manual.")
            } else {
                prefs.edit()
                    .putInt(KEY_DUPLICATE_PAYMENTS, prefs.getInt(KEY_DUPLICATE_PAYMENTS, 0) + 1)
                    .apply()
                diagnostic("El pago ya estaba registrado; no se guardó por segunda vez.")
            }
        } catch (_: Exception) {
            diagnostic("Pago reconocido, pero ocurrió un error al guardarlo localmente.")
        }
    }

    private fun markNotificationAsNew(
        prefs: android.content.SharedPreferences,
        notificationKey: String,
        title: String,
        body: String
    ): Boolean = synchronized(DEDUP_LOCK) {
        val normalized = "$notificationKey\u0000${title.trim()}\u0000${body.trim().replace(Regex("\\s+"), " ")}"
        val fingerprint = MessageDigest.getInstance("SHA-256")
            .digest(normalized.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }

        val recent = prefs.getStringSet(KEY_RECENT_FINGERPRINTS, emptySet())
            ?.toMutableSet() ?: mutableSetOf()
        if (fingerprint in recent) return@synchronized false

        recent.add(fingerprint)
        while (recent.size > MAX_RECENT_FINGERPRINTS) recent.remove(recent.first())
        prefs.edit().putStringSet(KEY_RECENT_FINGERPRINTS, recent).apply()
        true
    }

    companion object {
        const val TARGET_PACKAGE = "com.google.android.apps.messaging"
        const val PREFS = "gvr_reader_settings"
        const val KEY_LAST_CAPTURE = "last_capture"
        const val KEY_LAST_CAPTURE_AT = "last_capture_at"
        const val KEY_TOTAL_NOTIFICATIONS = "diag_v3_total_notifications"
        const val KEY_DUPLICATE_NOTIFICATIONS = "diag_v3_duplicate_notifications"
        const val KEY_DUPLICATE_PAYMENTS = "diag_v3_duplicate_payments"
        const val KEY_NO_CONTENT_NOTIFICATIONS = "diag_v3_no_content_notifications"
        const val KEY_UNRECOGNIZED_NOTIFICATIONS = "diag_v3_unrecognized_notifications"
        const val KEY_RECOGNIZED_PAYMENTS = "diag_v3_recognized_payments"
        const val KEY_LAST_NOTIFICATION_PACKAGE = "diag_v3_last_notification_package"
        const val KEY_LAST_NOTIFICATION_AT = "diag_v3_last_notification_at"
        const val KEY_LAST_DIAGNOSTIC = "diag_v3_last_message"
        private const val KEY_RECENT_FINGERPRINTS = "diag_v3_recent_notification_fingerprints"
        private const val MAX_RECENT_FINGERPRINTS = 400
        private val DEDUP_LOCK = Any()

        fun isAccessGranted(context: Context): Boolean {
            val enabled = android.provider.Settings.Secure.getString(
                context.contentResolver,
                "enabled_notification_listeners"
            ) ?: return false
            val component = ComponentName(context, NotificationCaptureService::class.java)
            return enabled.split(':').any { ComponentName.unflattenFromString(it) == component }
        }
    }
}
