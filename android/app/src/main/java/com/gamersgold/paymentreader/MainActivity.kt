package com.gamersgold.paymentreader

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : Activity() {
    private lateinit var root: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        render()
    }

    override fun onResume() {
        super.onResume()
        if (::root.isInitialized) render()
    }

    private fun render() {
        val prefs = getSharedPreferences(NotificationCaptureService.PREFS, MODE_PRIVATE)
        val selected = prefs.getString(NotificationCaptureService.KEY_SELECTED_PACKAGE, null)

        root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 48, 40, 32)
            setBackgroundColor(0xFF081A35.toInt())
        }

        fun addText(value: String, size: Float = 16f, color: Int = 0xFFFFFFFF.toInt()) {
            root.addView(TextView(this).apply {
                text = value
                textSize = size
                setTextColor(color)
                setPadding(0, 8, 0, 8)
            })
        }

        fun count(key: String): Int = prefs.getInt(key, 0)
        fun time(key: String): String {
            val millis = prefs.getLong(key, 0L)
            return if (millis <= 0L) "ninguna" else
                SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale.getDefault()).format(Date(millis))
        }

        addText("GAMERS GOLD", 24f)
        addText("Lector privado de confirmaciones", 17f, 0xFF55DFFF.toInt())
        addText("Android 15 · diagnóstico 0.2.0", 13f, 0xFFB7C7D9.toInt())

        val granted = NotificationCaptureService.isAccessGranted(this)
        addText(
            if (granted) "Acceso a notificaciones: ACTIVADO"
            else "Acceso a notificaciones: PENDIENTE",
            15f,
            if (granted) 0xFF74E6A2.toInt() else 0xFFFFD166.toInt()
        )
        root.addView(Button(this).apply {
            text = "Abrir ajustes de acceso a notificaciones"
            setOnClickListener {
                startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
            }
        })

        addText("Aplicaciones que han mostrado notificaciones", 16f)
        addText(
            "Solo se guardan nombres de paquetes y contadores. El texto de SMS no se guarda en el diagnóstico.",
            12f,
            0xFFB7C7D9.toInt()
        )

        val observed = prefs.getStringSet(
            NotificationCaptureService.KEY_OBSERVED_PACKAGES,
            emptySet()
        )?.toList()?.sorted().orEmpty()

        if (observed.isEmpty()) {
            addText("Aún no hay fuentes detectadas. Activa el acceso y espera una notificación.")
        } else {
            observed.forEach { packageName ->
                root.addView(Button(this).apply {
                    text = if (selected == packageName) "✓ $packageName (seleccionada)" else packageName
                    setOnClickListener {
                        prefs.edit()
                            .putString(NotificationCaptureService.KEY_SELECTED_PACKAGE, packageName)
                            .apply()
                        render()
                    }
                })
            }
        }

        addText("Diagnóstico de notificaciones", 18f, 0xFF55DFFF.toInt())
        addText("Notificaciones recibidas por Android: ${count(NotificationCaptureService.KEY_TOTAL_NOTIFICATIONS)}")
        addText("Recibidas desde la app seleccionada: ${count(NotificationCaptureService.KEY_SELECTED_NOTIFICATIONS)}")
        addText("Sin título o contenido visible: ${count(NotificationCaptureService.KEY_NO_CONTENT_NOTIFICATIONS)}")
        addText("Contenido recibido, formato no reconocido: ${count(NotificationCaptureService.KEY_UNRECOGNIZED_NOTIFICATIONS)}")
        addText("Pagos reconocidos por el lector: ${count(NotificationCaptureService.KEY_RECOGNIZED_PAYMENTS)}")
        addText("Último paquete recibido: ${prefs.getString(NotificationCaptureService.KEY_LAST_NOTIFICATION_PACKAGE, "ninguno")}")
        addText("Hora de última notificación: ${time(NotificationCaptureService.KEY_LAST_NOTIFICATION_AT)}")
        addText(
            "Último diagnóstico: ${prefs.getString(NotificationCaptureService.KEY_LAST_DIAGNOSTIC, "Aún no se ha recibido una notificación de la app seleccionada.")}",
            14f,
            0xFFFFD166.toInt()
        )

        addText("Eventos locales reconocidos", 16f)
        val store = PaymentEventStore(this)
        try {
            addText("Pendientes de revisión manual: ${store.count()}")
            addText("Último evento: ${store.latestSummary() ?: "ninguno"}")
        } finally {
            store.close()
        }

        addText(
            "Esta versión no envía datos a Internet, no aprueba pagos y no acredita GVR.",
            13f,
            0xFFFFD166.toInt()
        )
        addText(
            "Selecciona Google Messages (com.google.android.apps.messaging) como fuente y vuelve aquí después de recibir una notificación.",
            13f,
            0xFFB7C7D9.toInt()
        )

        setContentView(root)
    }
}
