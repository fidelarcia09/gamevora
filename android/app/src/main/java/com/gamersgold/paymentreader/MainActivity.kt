package com.gamersgold.paymentreader

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.provider.Settings
import java.text.SimpleDateFormat
import java.time.YearMonth
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Date
import java.util.Locale

class MainActivity : Activity() {
    private lateinit var content: LinearLayout
    private var selectedMonth: YearMonth = YearMonth.now()
    private var selectedTab: Int = 0

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
        if (SecureSessionStore(this).load() == null) {
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
            return
        }
        window.statusBarColor = navy
        window.navigationBarColor = navy
        if (android.os.Build.VERSION.SDK_INT >= 29) {
            window.isNavigationBarContrastEnforced = false
            window.isStatusBarContrastEnforced = false
        }
        GvrPaymentSyncScheduler.enqueue(this, replaceExisting = true)
        render()
    }

    override fun onResume() {
        super.onResume()
        if (SecureSessionStore(this).load() == null) {
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
            return
        }
        if (::content.isInitialized) {
            render()
        }
    }

    private fun render() {
        val prefs = getSharedPreferences(NotificationCaptureService.PREFS, MODE_PRIVATE)
        val horizontalMargin = if (resources.configuration.screenWidthDp <= 600) 14 else 22

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(navy)
        }
        val scroll = ScrollView(this).apply {
            isFillViewport = true
            isVerticalScrollBarEnabled = true
            clipToPadding = false
            setBackgroundColor(navy)
            setPadding(dp(horizontalMargin), dp(24), dp(horizontalMargin), dp(24))
        }
        content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }
        scroll.addView(
            content,
            ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        )
        root.addView(
            scroll,
            LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f)
        )

        when (selectedTab) {
            0 -> {
                val header = card(
                    GradientDrawable(
                        GradientDrawable.Orientation.TL_BR,
                        intArrayOf(Color.rgb(8, 36, 72), Color.rgb(5, 11, 24))
                    )
                )
                addText(header, "⚡  GAMERS GOLD", 25f, cyan, true)
                addText(header, "PAYMENT READER", 12f, white, true)
                addText(header, "Lector privado de confirmaciones", 15f, muted)
                addText(header, "DIAGNÓSTICO  ·  VERSIÓN 0.5.8", 11f, cyan, true)
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
                addMetric(diagnostics, "Actualizaciones de notificación detectadas", count(prefs, NotificationCaptureService.KEY_DUPLICATE_NOTIFICATIONS))
                addMetric(diagnostics, "Sin título o contenido visible", count(prefs, NotificationCaptureService.KEY_NO_CONTENT_NOTIFICATIONS))
                addMetric(diagnostics, "Formato no reconocido", count(prefs, NotificationCaptureService.KEY_UNRECOGNIZED_NOTIFICATIONS))
                content.addView(diagnostics)

                val payments = card()
                addText(payments, "CONFIRMACIONES DE PAGO", 12f, cyan, true)
                addMetric(payments, "Pagos detectados y guardados", count(prefs, NotificationCaptureService.KEY_RECOGNIZED_PAYMENTS))
                addMetric(payments, "Pagos repetidos evitados", count(prefs, NotificationCaptureService.KEY_DUPLICATE_PAYMENTS))
                val store = PaymentEventStore(this)
                try {
                    addMetric(payments, "Eventos locales pendientes", store.count())
                    addText(payments, "Último evento: ${store.latestSummary() ?: "ninguno"}", 13f, muted)
                } finally {
                    store.close()
                }
                content.addView(payments)

                addSyncSection()

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

                addText(content, "GAMERS GOLD TOP-UP  ·  UNIVERSO GAMING", 11f, muted, true, Gravity.CENTER)
            }
            1 -> addCompletedPaymentsSection()
            2 -> {
                val privacy = card()
                addText(privacy, "PRIVACIDAD Y SEGURIDAD", 12f, cyan, true)
                addText(privacy, "• No lee notificaciones de otras aplicaciones.", 13f, white)
                addText(privacy, "• No guarda el texto completo de los SMS en el diagnóstico.", 13f, white)
                addText(privacy, "• El servidor compara importe, teléfono, método y plazo de cada solicitud.", 13f, white)
                addText(privacy, "• Una coincidencia única y completa acredita GVR una sola vez; las ambiguas quedan pendientes.", 13f, amber, true)
                addButton(privacy, "Cerrar sesión") { logout() }
                content.addView(privacy)
            }
        }

        root.addView(buildBottomNavigation(), LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ))
        setContentView(root)
    }

    private fun buildBottomNavigation(): LinearLayout {
        val navigation = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            setPadding(dp(8), dp(7), dp(8), dp(7))
            setBackgroundColor(cardNavy)
            elevation = dp(10).toFloat()
        }
        val labels = listOf("Inicio", "Pagos\nCompletados", "Seguridad")
        val symbols = listOf("⌂", "✓", "◇")
        labels.forEachIndexed { index, label ->
            val selected = selectedTab == index
            val item = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER
                setPadding(dp(4), dp(7), dp(4), dp(7))
                background = GradientDrawable().apply {
                    cornerRadius = dp(13).toFloat()
                    if (selected) {
                        setColor(0x2235AFFF)
                        setStroke(dp(1), 0x6655DFFF)
                    } else {
                        setColor(Color.TRANSPARENT)
                    }
                }
                isClickable = true
                isFocusable = true
                setOnClickListener {
                    if (selectedTab != index) {
                        selectedTab = index
                        render()
                    }
                }
                layoutParams = LinearLayout.LayoutParams(0, dp(58), 1f).apply {
                    marginStart = dp(3)
                    marginEnd = dp(3)
                }
            }
            item.addView(TextView(this).apply {
                text = symbols[index]
                textSize = 20f
                setTextColor(if (selected) cyan else muted)
                gravity = Gravity.CENTER
            })
            item.addView(TextView(this).apply {
                text = label
                textSize = 10f
                setTypeface(typeface, if (selected) Typeface.BOLD else Typeface.NORMAL)
                setTextColor(if (selected) cyan else muted)
                gravity = Gravity.CENTER
                maxLines = 2
            })
            navigation.addView(item)
        }
        return navigation
    }

    private fun addSyncSection() {
        val panel = card()
        addText(panel, "SINCRONIZACIÓN SEGURA", 12f, cyan, true)
        val store = PaymentEventStore(this)
        val pending: Int
        val synced: Int
        try {
            pending = store.pendingSyncCount()
            synced = store.syncedCount()
        } finally {
            store.close()
        }
        addMetric(panel, "Eventos pendientes de enviar", pending)
        addMetric(panel, "Eventos recibidos por el servidor", synced)
        if (BuildConfig.GVR_SYNC_ENABLED) {
            addText(panel, "●  Sincronización automática activada", 14f, green, true)
        } else {
            addText(
                panel,
                "Sincronización desactivada por seguridad. Se habilitará cuando el esquema y la Edge Function estén desplegados y revisados.",
                12f,
                amber,
                true
            )
        }
        content.addView(panel)
    }

    private fun addCompletedPaymentsSection() {
        val panel = card()
        addText(panel, "PAGOS COMPLETADOS", 12f, cyan, true)
        addText(panel, "Historial mensual de pagos confirmados", 14f, muted)

        val monthRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, dp(8), 0, dp(12))
        }
        addMonthButton(monthRow, "‹") {
            selectedMonth = selectedMonth.minusMonths(1)
            render()
        }
        val monthLabel = TextView(this).apply {
            text = selectedMonth.format(DateTimeFormatter.ofPattern("MMMM yyyy", Locale("es", "ES")))
                .replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale("es", "ES")) else it.toString() }
            textSize = 15f
            setTextColor(white)
            setTypeface(typeface, Typeface.BOLD)
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        }
        monthRow.addView(monthLabel)
        addMonthButton(monthRow, "›") {
            if (selectedMonth.isBefore(YearMonth.now())) {
                selectedMonth = selectedMonth.plusMonths(1)
                render()
            }
        }.apply {
            isEnabled = selectedMonth.isBefore(YearMonth.now())
            alpha = if (isEnabled) 1f else 0.4f
        }
        panel.addView(monthRow)

        val start = selectedMonth.atDay(1).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()
        val end = selectedMonth.plusMonths(1).atDay(1).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()
        val store = PaymentEventStore(this)
        val stats = try {
            store.completedStats(start, end)
        } finally {
            store.close()
        }

        addText(panel, "${formatCup(stats.totalMinorUnits)} CUP", 27f, green, true)
        addText(panel, "${stats.count} pagos completados", 13f, muted)
        addMetric(panel, "ETECSA", stats.etecsaCount)
        addMetric(panel, "PAGOxMOVIL", stats.cupCount)

        if (stats.count == 0) {
            addText(
                panel,
                "Todavía no hay pagos completados registrados en este mes.",
                13f,
                muted
            )
        }
        addText(
            panel,
            "Solo se mostrarán aquí pagos cuya confirmación final esté registrada. Las notificaciones detectadas o pendientes no cuentan como completadas.",
            11f,
            amber
        )
        addText(
            panel,
            "Este resumen local no sustituye el historial administrativo del servidor.",
            11f,
            muted
        )
        content.addView(panel)
    }

    private fun addMonthButton(parent: LinearLayout, label: String, action: () -> Unit): TextView {
        val button = TextView(this).apply {
            text = label
            textSize = 24f
            setTextColor(cyan)
            gravity = Gravity.CENTER
            background = GradientDrawable().apply {
                setColor(0x2235AFFF)
                cornerRadius = dp(10).toFloat()
                setStroke(dp(1), 0x6655DFFF)
            }
            isClickable = true
            isFocusable = true
            setOnClickListener { action() }
            layoutParams = LinearLayout.LayoutParams(dp(42), dp(40))
        }
        parent.addView(button)
        return button
    }

    private fun formatCup(minorUnits: Long): String =
        String.format(Locale("es", "ES"), "%,.2f", minorUnits / 100.0)

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

    private fun logout() {
        Thread {
            SupabaseAuthClient(this).signOut()
            runOnUiThread {
                startActivity(Intent(this, LoginActivity::class.java))
                finish()
            }
        }.start()
    }

    private fun count(prefs: android.content.SharedPreferences, key: String): Int =
        prefs.getInt(key, 0)

    private fun formatTime(millis: Long): String =
        if (millis <= 0L) "ninguna" else
            SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale.getDefault()).format(Date(millis))

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
}
