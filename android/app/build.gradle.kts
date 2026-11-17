import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val localProperties = Properties()
val localPropertiesFile = rootProject.file("local.properties")
if (localPropertiesFile.exists()) {
    localPropertiesFile.inputStream().use(localProperties::load)
}

fun buildConfigString(value: String): String =
    "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\""

val supabaseUrl = localProperties.getProperty("SUPABASE_URL")
    ?: System.getenv("SUPABASE_URL")
    ?: ""
val supabaseAnonKey = localProperties.getProperty("SUPABASE_ANON_KEY")
    ?: System.getenv("SUPABASE_ANON_KEY")
    ?: ""
val gvrSyncEnabled = (
    localProperties.getProperty("GVR_SYNC_ENABLED")
        ?: System.getenv("GVR_SYNC_ENABLED")
        ?: "false"
).toBooleanStrictOrNull() ?: false

// Firma estable para que las actualizaciones futuras conserven la identidad de la app.
// La clave privada nunca se guarda en Git. Se carga desde variables de entorno
// de GitHub Actions o desde android/local.properties en un entorno local.
val signingStoreFile = localProperties.getProperty("ANDROID_KEYSTORE_FILE")
    ?: System.getenv("ANDROID_KEYSTORE_FILE")
val signingStorePassword = localProperties.getProperty("ANDROID_KEYSTORE_PASSWORD")
    ?: System.getenv("ANDROID_KEYSTORE_PASSWORD")
val signingKeyAlias = localProperties.getProperty("ANDROID_KEY_ALIAS")
    ?: System.getenv("ANDROID_KEY_ALIAS")
val signingKeyPassword = localProperties.getProperty("ANDROID_KEY_PASSWORD")
    ?: System.getenv("ANDROID_KEY_PASSWORD")

val releaseSigningConfigured = listOf(
    signingStoreFile,
    signingStorePassword,
    signingKeyAlias,
    signingKeyPassword
).all { !it.isNullOrBlank() }

android {
    namespace = "com.gamersgold.paymentreader"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.gamersgold.paymentreader"
        minSdk = 26
        targetSdk = 35
        versionCode = 12
        versionName = "0.5.8"
        buildConfigField("String", "SUPABASE_URL", buildConfigString(supabaseUrl))
        buildConfigField("String", "SUPABASE_ANON_KEY", buildConfigString(supabaseAnonKey))
        buildConfigField("boolean", "GVR_SYNC_ENABLED", gvrSyncEnabled.toString())
    }

    signingConfigs {
        if (releaseSigningConfigured) {
            create("release") {
                storeFile = file(requireNotNull(signingStoreFile))
                storeType = "PKCS12"
                storePassword = requireNotNull(signingStorePassword)
                keyAlias = requireNotNull(signingKeyAlias)
                keyPassword = requireNotNull(signingKeyPassword)
            }
        }
    }

    buildTypes {
        getByName("release") {
            isMinifyEnabled = false
            if (releaseSigningConfigured) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    buildFeatures { buildConfig = true }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions { jvmTarget = "17" }

    testOptions {
        unitTests.isIncludeAndroidResources = true
    }
}

dependencies {
    implementation("androidx.work:work-runtime-ktx:2.10.1")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.14.1")
}