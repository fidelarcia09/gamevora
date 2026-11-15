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
import android.webkit.CookieManager
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import org.json.JSONTokener
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
    private lateinit var turnstileWebView: WebView
    private var captchaPageLoaded = false
    private var loginInProgress = false

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

        panel.addView(text("VERIFICACIÓN DE SEGURIDAD", 11f, cyan, true).apply {
            setPadding(0, dp(18), 0, dp(4))
        })
        turnstileWebView = WebView(this).apply {
            setBackgroundColor(Color.TRANSPARENT)
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.javaScriptCanOpenWindowsAutomatically = false
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
            CookieManager.getInstance().setAcceptCookie(true)
            CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView, url: String) {
                    captchaPageLoaded = true
                }

                override fun shouldOverrideUrlLoading(
                    view: WebView,
                    request: WebResourceRequest
                ): Boolean {
                    // El documento principal solo debe permanecer en el hostname autorizado.
                    return request.url.host != TURNSTILE_HOSTNAME
                }

                override fun onReceivedError(
                    view: WebView,
                    request: WebResourceRequest,
                    error: android.webkit.WebResourceError
                ) {
                    if (request.isForMainFrame) {
                        captchaPageLoaded = false
                        showStatus("No se pudo cargar la verificación. Comprueba tu conexión e inténtalo de nuevo.")
                    }
                }
            }
            loadDataWithBaseURL(
                "https://$TURNSTILE_HOSTNAME/",
                turnstileHtml(),
                "text/html",
                "UTF-8",
                null
            )
        }
        panel.addView(turnstileWebView, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            dp(105)
        ))

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
            topMargin = dp(10)
            bottomMargin = dp(8)
        })

        status = text(
            "Completa la verificación de seguridad y después inicia sesión.",
            12f,
            muted
        )
        panel.addView(status)
        panel.addView(text(
            "La contraseña y el token CAPTCHA solo se envían para autenticar esta sesión. El token no se guarda.",
            12f,
            muted
        ).apply { setPadding(0, dp(14), 0, 0) })
        panel.addView(text(
            "El servidor comprobará que la cuenta siga siendo administradora activa antes de aceptar cada sincronización.",
            12f,
            muted
        ).apply { setPadding(0, dp(8), 0, 0) })

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

    private fun turnstileHtml(): String = """
        <!doctype html>
        <html lang="es">
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
          <meta charset="utf-8">
          <style>
            html, body {
              margin: 0; padding: 0; width: 100%; height: 100%;
              background: transparent; overflow: hidden;
              display: flex; align-items: center; justify-content: center;
            }
            #captcha { min-height: 65px; }
          </style>
          <script>
            window.turnstileReady = false;
            function onCaptchaSuccess(token) {
              document.getElementById('captcha-token').value = token || '';
            }
            function onCaptchaExpired() {
              document.getElementById('captcha-token').value = '';
            }
            function onCaptchaError() {
              document.getElementById('captcha-token').value = '';
            }
            function onTurnstileLoaded() {
              window.turnstileReady = true;
            }
          </script>
          <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoaded&render=explicit" async defer></script>
        </head>
        <body>
          <input id="captcha-token" type="hidden" value="">
          <div id="captcha"></div>
          <script>
            function renderCaptchaWhenReady() {
              if (window.turnstile && window.turnstileReady) {
                window.turnstile.render('#captcha', {
                  sitekey: '$TURNSTILE_SITE_KEY',
                  theme: 'dark',
                  language: 'es',
                  callback: onCaptchaSuccess,
                  'expired-callback': onCaptchaExpired,
                  'error-callback': onCaptchaError
                });
              } else {
                window.setTimeout(renderCaptchaWhenReady, 150);
              }
            }
            renderCaptchaWhenReady();
          </script>
        </body>
        </html>
    """.trimIndent()

    private fun restoreExistingSession() {
        loginButton.isEnabled = false
        showStatus("Comprobando sesión segura…")
        executor.execute {
            val session = SupabaseAuthClient(this).restoreSession()
            runOnUiThread {
                if (session != null) openReader()
                else {
                    loginButton.isEnabled = true
                    showStatus("Completa Turnstile e inicia sesión con la cuenta administradora.")
                }
            }
        }
    }

    private fun signIn() {
        if (loginInProgress) return
        val password = passwordInput.text?.toString().orEmpty()
        if (password.isBlank()) {
            showStatus("Escribe la contraseña de tu cuenta Supabase.")
            return
        }
        if (!captchaPageLoaded) {
            showStatus("La verificación todavía está cargando. Espera un momento.")
            return
        }

        loginInProgress = true
        loginButton.isEnabled = false
        showStatus("Comprobando verificación de seguridad…")
        turnstileWebView.evaluateJavascript(
            "document.getElementById('captcha-token')?.value || ''"
        ) { result ->
            val captchaToken = try {
                JSONTokener(result ?: "\"\"").nextValue() as? String
            } catch (_: Exception) {
                null
            }.orEmpty()

            if (captchaToken.isBlank()) {
                loginInProgress = false
                loginButton.isEnabled = true
                showStatus("Completa el desafío de Cloudflare Turnstile antes de continuar.")
                return@evaluateJavascript
            }

            showStatus("Conectando con Supabase…")
            executor.execute {
                try {
                    SupabaseAuthClient(this).signIn(
                        SupabaseAuthClient.ADMIN_EMAIL,
                        password,
                        captchaToken
                    )
                    runOnUiThread { openReader() }
                } catch (error: Exception) {
                    runOnUiThread {
                        loginInProgress = false
                        loginButton.isEnabled = true
                        resetTurnstile()
                        showStatus(error.message ?: "No se pudo iniciar sesión.")
                    }
                }
            }
        }
        passwordInput.setText("")
    }

    private fun resetTurnstile() {
        if (!captchaPageLoaded) return
        turnstileWebView.evaluateJavascript(
            "if (window.turnstile) { window.turnstile.reset(); }" +
                "document.getElementById('captcha-token').value = '';",
            null
        )
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
        if (::turnstileWebView.isInitialized) {
            turnstileWebView.stopLoading()
            turnstileWebView.destroy()
        }
        executor.shutdownNow()
        super.onDestroy()
    }

    companion object {
        // Sitekey pública: no es el secreto de validación de Cloudflare.
        private const val TURNSTILE_SITE_KEY = "0x4AAAAAAFkQPUoJGVxIGYNB"
        private const val TURNSTILE_HOSTNAME = "fidelarcia09.github.io"
    }
}
