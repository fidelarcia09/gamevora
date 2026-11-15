package com.gamersgold.paymentreader

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.view.ViewGroup
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.util.concurrent.Executors

class LoginActivity : Activity() {
    private val executor = Executors.newSingleThreadExecutor()
    private val navy = Color.rgb(5, 11, 24)
    private val cardNavy = Color.rgb(8, 26, 53)
    private val cyan = Color.rgb(85, 223, 255)
    private val white = Color.WHITE
    private val muted = Color.rgb(183, 199, 217)
    private lateinit var passwordInput: EditText
    private lateinit var status: TextView
    private lateinit var loginButton: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = navy
        window.navigationBarColor = navy
        render()
        if (!SupabaseAuthClient(this).isConfigured()) {
            showStatus("Falta configurar la conexión segura con Supabase en android/local.properties.")
            loginButton.isEnabled = false
            loginButton.alpha = 0.45f
        } else {
            restoreExistingSession()
        }
    }

    private fun render() {
        val scroll = ScrollView(this).apply {
            setBackgroundColor(navy)
            isFillViewport = true
        }
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(dp(24), dp(30), dp(24), dp(30))
        }
        val panel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(22), dp(24), dp(22), dp(24))
            background = GradientDrawable().apply {
                setColor(cardNavy)
                cornerRadius = dp(22).toFloat()
                setStroke(dp(1), 0x6655DFFF)
            }
        }
        panel.addView(text("⚡  GAMERS GOLD", 25f, cyan, true))
        panel.addView(text("PAYMENT READER", 13f, white, true))
        panel.addView(text("Acceso privado de administración", 15f, muted))
        panel.addView(text("CUENTA AUTORIZADA", 11f, cyan, true).apply {
            setPadding(0, dp(24), 0, dp(7))
        })
        panel.addView(text(SupabaseAuthClient.ADMIN_EMAIL, 14f, white, true).apply {
            setPadding(dp(12), dp(12), dp(12), dp(12))
            background = fieldBackground()
        }, matchWrap().apply { bottomMargin = dp(12) })

        passwordInput = EditText(this).apply {
            hint = "Contraseña de Supabase"
            setSingleLine(true)
            setTextColor(white)
            setHintTextColor(muted)
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            setPadding(dp(12), dp(12), dp(12), dp(12))
            background = fieldBackground()
        }
        panel.addView(passwordInput, matchWrap())

        loginButton = TextView(this).apply {
            text = "Iniciar sesión"
            textSize = 15f
            setTextColor(navy)
            setTypeface(typeface, Typeface.BOLD)
            gravity = Gravity.CENTER
            setPadding(dp(14), dp(14), dp(14), dp(14))
            background = GradientDrawable(
                GradientDrawable.Orientation.LEFT_RIGHT,
                intArrayOf(cyan, Color.rgb(35, 123, 255))
            ).apply { cornerRadius = dp(15).toFloat() }
            isClickable = true
            isFocusable = true
            setOnClickListener { signIn() }
        }
        panel.addView(loginButton, matchWrap().apply {
            topMargin = dp(16)
            bottomMargin = dp(8)
        })

        status = text(
            "La contraseña se usa solo para iniciar sesión y no se guarda en el dispositivo.",
            12f,
            muted
        )
        panel.addView(status)
        panel.addView(text(
            "El servidor comprobará que la cuenta siga siendo administradora activa antes de aceptar cada sincronización.",
            12f,
            muted
        ).apply { setPadding(0, dp(14), 0, 0) })

        root.addView(panel, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ))
        root.addView(text("GAMERS GOLD TOP-UP", 11f, muted, true).apply {
            gravity = Gravity.CENTER
            setPadding(0, dp(18), 0, 0)
        })
        scroll.addView(root)
        setContentView(scroll)
    }

    private fun restoreExistingSession() {
        loginButton.isEnabled = false
        showStatus("Comprobando sesión segura…")
        executor.execute {
            val session = SupabaseAuthClient(this).restoreSession()
            runOnUiThread {
                if (session != null) openReader()
                else {
                    loginButton.isEnabled = true
                    showStatus("Inicia sesión con la cuenta administradora.")
                }
            }
        }
    }

    private fun signIn() {
        val password = passwordInput.text?.toString().orEmpty()
        if (password.isBlank()) {
            showStatus("Escribe la contraseña de tu cuenta Supabase.")
            return
        }
        loginButton.isEnabled = false
        showStatus("Conectando con Supabase…")
        executor.execute {
            try {
                SupabaseAuthClient(this).signIn(SupabaseAuthClient.ADMIN_EMAIL, password)
                runOnUiThread { openReader() }
            } catch (error: Exception) {
                runOnUiThread {
                    loginButton.isEnabled = true
                    showStatus(error.message ?: "No se pudo iniciar sesión.")
                }
            }
        }
        passwordInput.setText("")
    }

    private fun openReader() {
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }

    private fun showStatus(message: String) {
        if (::status.isInitialized) status.text = message
    }

    private fun text(value: String, size: Float, color: Int, bold: Boolean = false) =
        TextView(this).apply {
            text = value
            textSize = size
            setTextColor(color)
            if (bold) setTypeface(typeface, Typeface.BOLD)
            setPadding(0, dp(6), 0, dp(6))
        }

    private fun fieldBackground() = GradientDrawable().apply {
        setColor(0xFF061326.toInt())
        cornerRadius = dp(12).toFloat()
        setStroke(dp(1), 0x6655DFFF)
    }

    private fun matchWrap() = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT
    )

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()

    override fun onDestroy() {
        executor.shutdownNow()
        super.onDestroy()
    }
}
