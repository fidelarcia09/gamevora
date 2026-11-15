package com.gamersgold.paymentreader

import android.content.Context
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

internal class SupabaseAuthClient(context: Context) {
    private val store = SecureSessionStore(context.applicationContext)
    private val baseUrl = BuildConfig.SUPABASE_URL.trim().trimEnd('/')
    private val anonKey = BuildConfig.SUPABASE_ANON_KEY.trim()

    fun isConfigured(): Boolean = baseUrl.startsWith("https://") && anonKey.isNotBlank()

    fun signIn(email: String, password: String, captchaToken: String): SupabaseSession {
        requireConfigured()
        require(email.equals(ADMIN_EMAIL, ignoreCase = true)) {
            "Esta aplicación solo admite la cuenta administradora configurada."
        }
        require(captchaToken.isNotBlank()) {
            "Completa la verificación de Cloudflare Turnstile."
        }
        val response = request(
            "POST",
            "/auth/v1/token?grant_type=password",
            JSONObject()
                .put("email", email.trim())
                .put("password", password)
                .put("captcha_token", captchaToken)
        )
        val user = response.optJSONObject("user") ?: JSONObject()
        val returnedEmail = user.optString("email")
        if (!returnedEmail.equals(ADMIN_EMAIL, ignoreCase = true)) {
            throw IllegalStateException("La cuenta autenticada no coincide con la cuenta administradora autorizada.")
        }
        return sessionFrom(response, returnedEmail).also(store::save)
    }

    fun restoreSession(): SupabaseSession? {
        var session = store.load() ?: return null
        return try {
            if (session.expiresAtMillis <= System.currentTimeMillis() + 60_000L) {
                session = refresh(session.refreshToken)
            }
            val user = request("GET", "/auth/v1/user", null, session.accessToken)
            val email = user.optString("email")
            if (!email.equals(ADMIN_EMAIL, ignoreCase = true)) {
                store.clear()
                null
            } else {
                session.copy(email = email).also(store::save)
            }
        } catch (_: Exception) {
            // La cola local debe seguir disponible aunque el teléfono esté sin Internet.
            // El servidor rechazará cualquier sincronización hasta validar una sesión vigente.
            session
        }
    }

    fun sessionForSync(): SupabaseSession? {
        val session = store.load() ?: return null
        if (session.expiresAtMillis > System.currentTimeMillis() + 60_000L) return session
        return try {
            refresh(session.refreshToken)
        } catch (_: Exception) {
            null
        }
    }

    fun signOut() {
        val session = store.load()
        try {
            if (session != null && isConfigured()) {
                request("POST", "/auth/v1/logout", JSONObject(), session.accessToken)
            }
        } catch (_: Exception) {
            // La sesión local se borra incluso si el teléfono está sin conexión.
        } finally {
            store.clear()
        }
    }

    private fun refresh(refreshToken: String): SupabaseSession {
        val response = request(
            "POST",
            "/auth/v1/token?grant_type=refresh_token",
            JSONObject().put("refresh_token", refreshToken)
        )
        val user = response.optJSONObject("user") ?: JSONObject()
        val email = user.optString("email", ADMIN_EMAIL)
        if (!email.equals(ADMIN_EMAIL, ignoreCase = true)) {
            store.clear()
            throw IllegalStateException("La sesión no pertenece a la cuenta administradora autorizada.")
        }
        return sessionFrom(response, email).also(store::save)
    }

    private fun sessionFrom(json: JSONObject, email: String): SupabaseSession {
        val expiresIn = json.optLong("expires_in", 3600L).coerceAtLeast(60L)
        return SupabaseSession(
            accessToken = json.getString("access_token"),
            refreshToken = json.getString("refresh_token"),
            expiresAtMillis = System.currentTimeMillis() + expiresIn * 1000L,
            email = email
        )
    }

    private fun request(
        method: String,
        path: String,
        body: JSONObject?,
        accessToken: String? = null
    ): JSONObject {
        requireConfigured()
        val connection = (URL("$baseUrl$path").openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 12_000
            readTimeout = 15_000
            setRequestProperty("apikey", anonKey)
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Content-Type", "application/json")
            accessToken?.let { setRequestProperty("Authorization", "Bearer $it") }
            if (body != null) doOutput = true
        }

        try {
            if (body != null) {
                connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            }
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val responseText = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            if (status !in 200..299) {
                val message = try {
                    val error = JSONObject(responseText)
                    error.optString("msg")
                        .ifBlank { error.optString("message") }
                        .ifBlank { error.optString("error_description") }
                } catch (_: Exception) {
                    ""
                }
                throw IllegalStateException(message.ifBlank { "Supabase respondió HTTP $status." })
            }
            return if (responseText.isBlank()) JSONObject() else JSONObject(responseText)
        } finally {
            connection.disconnect()
        }
    }

    private fun requireConfigured() {
        if (!isConfigured()) {
            throw IllegalStateException(
                "Falta configurar SUPABASE_URL y SUPABASE_ANON_KEY en android/local.properties."
            )
        }
    }

    companion object {
        const val ADMIN_EMAIL = "fidelarciatamayo99@gmail.com"
    }
}
