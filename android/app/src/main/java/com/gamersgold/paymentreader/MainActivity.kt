package com.gamersgold.paymentreader

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : Activity() {
    private lateinit var content: LinearLayout

    private val navy = Color.rgb(5, 11, 24)
    private val cardNavy = Color.rgb(8, 26, 53)
    private val cyan = Color.rgb(85, 223, 255)
    private val blue = Color.rgb(35, 123, 255)
    private val white = Color.WHITE
    private val muted = Color.rgb(183, 199, 217)
    private val green = Color.rgb(116, 230, 162)
    private val amber = Color.rgb(255, 209, 102)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = navy
        window.navigationBarColor = navy
        if (android.os.Build.VERSION.SDK_INT >= 29) {
            window.isNavigationBarContrastEnforced = false
            window.isStatusBarContrastEnforced = false
        }
        render()
    }

    override fun onResume() {
        super.onResume()
        if (::content.isInitialized) render()
    }

    private fun render() {
        val prefs = getSharedPreferences(NotificationCaptureService.PREFS, MODE_PRIVATE)
        val scroll = ScrollView(this).apply {
            isFillViewport = true
            isVerticalScrollBarEnabled = true
            clipToPadding = false
            setBackgroundColor(navy)
            setPadding(dp(16), dp(14), dp(16), dp(28))
        }
        content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }
        scroll.addView(
            content,
            ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        )

        val header = card(
            GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(Color.rgb(8, 36, 72), Color.rgb(5, 11, 24))
            )
        )
        addText(header, "⚡  GAMERS GOLD", 25f, cyan, true)
        addText(header, "PAYMENT READER", 12f, white, true)
        addText(header, "Lector privado de confirmaciones", 15f, muted)
        addText(header, "DIAGNÓSTICO  ·  VERSIÓN 0.3.0", 11f, cyan, true)
        content.addView(header)

        val accessGranted = NotificationCaptureService.isAccessGranted(this)
        val source = card()
        addText(source, "FUENTE DE NOTIFICACIONES", 12f, cyan, true)
        addText(source, "Solo Google Messages", 20f, white, true)
        addText(source, NotificationCaptureService.TARGET_PACKAGE, 12f, muted)
        addText(
            source,
            if (accessGranted) "●  Acceso a notificaciones activado" else "●  Falta activar el acceso",
            14f,
            if (accessGranted) green else amber,
            true
        )
        addButton(source, "Abrir ajustes de notificaciones") {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        }
        addText(
            source,
            "El lector ignora cualquier otra aplicación. No tienes que seleccionar la fuente manualmente.",
            12f,
            muted
        )
        content.addView(source)

        val diagnostics = card()
        addText(diagnostics, "DIAGNÓSTICO", 12f, cyan, true)
        addMetric(diagnostics, "Notificaciones únicas de Mensajes", count(prefs, NotificationCaptureService.KEY_TOTAL_NOTIFICATIONS))
        addMetric(diagnostics, "Actualizaciones repetidas ignoradas", count(prefs, NotificationCaptureService.KEY_DUPLICATE_NOTIFICATIONS))
        addMetric(diagnostics, "Sin título o contenido visible", count(prefs, NotificationCaptureService.KEY_NO_CONTENT_NOTIFICATIONS))
        addMetric(diagnostics, "Formato no reconocido", count(prefs, NotificationCaptureService.KEY_UNRECOGNIZED_NOTIFICATIONS))
        content.addView(diagnostics)

        val payments = card()
        addText(payments, "CONFIRMACIONES DE PAGO", 12f, cyan, true)
        addMetric(payments, "Pagos guardados para revisión manual", count(prefs, NotificationCaptureService.KEY_RECOGNIZED_PAYMENTS))
        addMetric(payments, "Pagos repetidos evitados", count(prefs, NotificationCaptureService.KEY_DUPLICATE_PAYMENTS))
        val store = PaymentEventStore(this)
        try {
            addMetric(payments, "Eventos locales pendientes", store.count())
            addText(payments, "Último evento: ${store.latestSummary() ?: "ninguno"}", 13f, muted)
        } finally {
            store.close()
        }
        content.addView(payments)

        val activity = card()
        addText(activity, "ÚLTIMA ACTIVIDAD", 12f, cyan, true)
        addText(
            activity,
            "Paquete: ${prefs.getString(NotificationCaptureService.KEY_LAST_NOTIFICATION_PACKAGE, "ninguno")}",
            12f,
            muted
        )
        addText(
            activity,
            "Hora: ${formatTime(prefs.getLong(NotificationCaptureService.KEY_LAST_NOTIFICATION_AT, 0L))}",
            13f,
            white
        )
        addText(
            activity,
            prefs.getString(
                NotificationCaptureService.KEY_LAST_DIAGNOSTIC,
                "Aún no se ha recibido ninguna notificación de Google Messages."
            ) ?: "Sin diagnóstico",
            14f,
            amber
        )
        content.addView(activity)

        val privacy = card()
        addText(privacy, "PRIVACIDAD Y SEGURIDAD", 12f, cyan, true)
        addText(privacy, "• No lee notificaciones de otras aplicaciones.", 13f, white)
        addText(privacy, "• No guarda el texto completo de los SMS en el diagnóstico.", 13f, white)
        addText(privacy, "• Los pagos reconocidos quedan pendientes de revisión manual.", 13f, white)
        addText(privacy, "• No envía datos a Internet ni acredita GVR automáticamente.", 13f, amber, true)
        content.addView(privacy)

        addText(content, "GAMERS GOLD TOP-UP  ·  UNIVERSO GAMING", 11f, muted, true, Gravity.CENTER)
        setContentView(scroll)
    }

    private fun card(background: GradientDrawable? = null): LinearLayout {
        val drawable = background ?: GradientDrawable().apply {
            setColor(cardNavy)
        }
        drawable.cornerRadius = dp(22).toFloat()
        drawable.setStroke(dp(1), 0x3355DFFF)
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(17), dp(18), dp(18))
            setBackground(drawable)
            elevation = dp(3).toFloat()
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(14) }
        }
    }

    private fun addText(
        parent: LinearLayout,
        value: String,
        size: Float,
        color: Int,
        bold: Boolean = false,
        gravity: Int = Gravity.START
    ) {
        parent.addView(TextView(this).apply {
            text = value
            textSize = size
            setTextColor(color)
            if (bold) setTypeface(typeface, Typeface.BOLD)
            this.gravity = gravity
            setPadding(0, dp(5), 0, dp(5))
            if (value == NotificationCaptureService.TARGET_PACKAGE) {
                setTextIsSelectable(true)
            }
        })
    }

    private fun addMetric(parent: LinearLayout, label: String, value: Int) {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, dp(7), 0, dp(7))
        }
        row.addView(TextView(this).apply {
            text = label
            textSize = 13f
            setTextColor(muted)
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        })
        row.addView(TextView(this).apply {
            text = value.toString()
            textSize = 19f
            setTextColor(white)
            setTypeface(typeface, Typeface.BOLD)
            gravity = Gravity.END or Gravity.CENTER_VERTICAL
            setPadding(dp(10), 0, 0, 0)
        })
        parent.addView(row)
        parent.addView(View(this).apply {
            setBackgroundColor(0x3355DFFF)
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(1))
        })
    }

    private fun addButton(parent: LinearLayout, label: String, action: () -> Unit) {
        val button = TextView(this).apply {
            text = label
            textSize = 14f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(navy)
            gravity = Gravity.CENTER
            setPadding(dp(16), dp(13), dp(16), dp(13))
            background = GradientDrawable(
                GradientDrawable.Orientation.LEFT_RIGHT,
                intArrayOf(cyan, blue)
            ).apply { cornerRadius = dp(16).toFloat() }
            isClickable = true
            isFocusable = true
            setOnClickListener { action() }
        }
        parent.addView(button, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ).apply {
            topMargin = dp(12)
            bottomMargin = dp(10)
        })
    }

    private fun count(prefs: android.content.SharedPreferences, key: String): Int =
        prefs.getInt(key, 0)

    private fun formatTime(millis: Long): String =
        if (millis <= 0L) "ninguna" else
            SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale.getDefault()).format(Date(millis))

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
}
