# Gamers Gold Payment Reader (Android)

Aplicación Android privada para el lector de notificaciones de Gamers Gold Top-Up.

## Acceso de administración

- La pantalla inicial inicia sesión con la cuenta autorizada `fidelarciatamayo99@gmail.com`.
- La contraseña se envía directamente a Supabase Auth por HTTPS y no se guarda en el dispositivo.
- El access token y refresh token se guardan cifrados con AES-GCM usando una clave protegida por Android Keystore.
- La app permite cerrar sesión; al hacerlo intenta cerrar la sesión remota y siempre borra la copia local.
- El APK solo contiene la URL del proyecto y la clave pública de cliente (publishable/anon). Nunca debe contener `service_role` ni una clave secreta.
- La cuenta y el rol deben volver a comprobarse en el backend para cada operación privilegiada. El inicio de sesión por sí solo no concede permisos administrativos.

### Configuración local

Crea `android/local.properties` (este archivo no debe subirse a Git) con:

```properties
SUPABASE_URL=https://gsuhzcavghsiolmipnzi.supabase.co
SUPABASE_ANON_KEY=PEGA_AQUI_LA_CLAVE_PUBLICA_PUBLISHABLE_O_ANON
```

La clave pública se obtiene desde la configuración API del proyecto Supabase. No pegues aquí una clave `service_role`, `secret` ni contraseña. Si las propiedades no están configuradas, la pantalla de acceso permanecerá deshabilitada.

## Lector de notificaciones

- Utiliza el permiso concedido por el usuario de Notification Listener; no solicita `READ_SMS` ni `RECEIVE_SMS`.
- Solo procesa notificaciones procedentes del paquete de Mensajes configurado en el código.
- Reconoce los formatos documentados de ETECSA y PAGOxMOVIL cuando el título y el cuerpo contienen los datos esperados.
- Persiste los campos extraídos en una base SQLite privada del dispositivo.
- No guarda el texto completo de la notificación ni lo escribe en logs.
- Cada evento queda en `PENDING_MANUAL_REVIEW`.

## Estado de sincronización

La autenticación de Supabase y la sesión local cifrada están preparadas en esta rama. La sincronización de eventos, su tabla de auditoría y la validación de administrador en una Edge Function todavía no están conectadas. Hasta que esa parte se implemente y pruebe, los eventos permanecen únicamente en el teléfono.

## Restricciones de seguridad

- No se acredita GVR automáticamente.
- No se aprueban pagos por el solo hecho de detectar una notificación.
- No se realizan transferencias reales para probar.
- Los metadatos de una notificación no prueban por sí solos que el proveedor haya enviado el SMS original.
- No incluir credenciales, claves secretas, cuentas receptoras completas ni datos personales de pagos en el repositorio.

## Construcción

Abrir `android/` como proyecto Gradle en Android Studio, con JDK 17 y Android SDK Platform 35. El workflow de GitHub ejecuta las pruebas unitarias y genera un APK debug. Para iniciar sesión desde el APK, configura las dos propiedades anteriores antes de compilar.
