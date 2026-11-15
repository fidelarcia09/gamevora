# Gamers Gold Payment Reader (Android)

Aplicación Android privada para el lector de notificaciones de Gamers Gold Top-Up.

## Acceso de administración

- La pantalla inicial inicia sesión con la cuenta autorizada `fidelarciatamayo99@gmail.com`.
- La contraseña se envía directamente a Supabase Auth por HTTPS y no se guarda en el dispositivo.
- El access token y refresh token se guardan cifrados con AES-GCM usando una clave protegida por Android Keystore.
- La app permite cerrar sesión; al hacerlo intenta cerrar la sesión remota y siempre borra la copia local.
- El APK solo contiene la URL del proyecto y la clave pública de cliente (publishable/anon). Nunca debe contener `service_role` ni una clave secreta.
- La Edge Function vuelve a validar el JWT, el correo autorizado y que `support_agents` mantenga `role='admin'` y `active=true`.

### Configuración local

Crea `android/local.properties` (ignorado por Git) con:

```properties
SUPABASE_URL=https://gsuhzcavghsiolmipnzi.supabase.co
SUPABASE_ANON_KEY=PEGA_AQUI_LA_CLAVE_PUBLICA_PUBLISHABLE_O_ANON
GVR_SYNC_ENABLED=false
```

Mantén `GVR_SYNC_ENABLED=false` hasta que el SQL haya sido revisado y aplicado, la Edge Function esté desplegada y el secreto de la cuenta CUP esté configurado. Solo entonces se podrá cambiar a `true` y reconstruir el APK.

La clave pública se obtiene desde la configuración API del proyecto Supabase. No pegues aquí una clave `service_role`, `secret` ni contraseña. Si las propiedades no están configuradas, la pantalla de acceso permanecerá deshabilitada.

## Preparación de CUP en la web

- La cuenta visible al cliente se configura en `frontend/gvr-payment-config.js`, propiedad `cupReceiverAccount`.
- Ese archivo es público y nunca debe contener secretos.
- El valor privado de comparación se configura por separado en Supabase como `GVR_CUP_RECEIVER_ACCOUNT`.
- Ambos valores deben coincidir.
- `cupAutomationReady` permanece en `false` hasta que la tabla, la Edge Function, los secretos y las pruebas estén completados.
- No se habilita CUP solo por introducir la tarjeta.

## Lector y cola sin conexión

- Utiliza el permiso concedido por el usuario de Notification Listener; no solicita `READ_SMS` ni `RECEIVE_SMS`.
- Solo procesa notificaciones procedentes del paquete de Mensajes configurado en el código.
- Reconoce los formatos documentados de ETECSA y PAGOxMOVIL cuando el título y el cuerpo contienen los datos esperados.
- Persiste los campos extraídos en una base SQLite privada del dispositivo; el texto completo de la notificación no se guarda ni se sincroniza.
- Los eventos nuevos empiezan como `LOCAL_PENDING`; WorkManager los envía por HTTPS cuando hay conexión y los marca `SYNCED` tras recibir confirmación de almacenamiento.
- El identificador del dispositivo se genera localmente y se usa para deduplicar eventos ETECSA dentro de ese dispositivo.

## Backend de sincronización

- Código de Edge Function: `supabase/functions/gvr-payment-reader-sync/index.ts`.
- SQL propuesto: `docs/gvr-payment-notification-events.sql`.
- La función comprueba JWT, correo y rol activo de administrador antes de aceptar el lote. También exige `capturePackage` igual al paquete configurado de Google Messages, únicamente como control de consistencia del cliente.
- PAGOxMOVIL se deduplica mediante su referencia de transacción única; ETECSA solo tiene deduplicación local por dispositivo.
- La coincidencia con una solicitud es una sugerencia: ETECSA compara teléfono emisor, importe y ventana temporal; CUP compara cuenta receptora configurada, importe y ventana temporal.
- Para comparar la cuenta receptora CUP se necesita configurar el secreto `GVR_CUP_RECEIVER_ACCOUNT` en Supabase. Su valor no debe entrar en Git ni en el APK.
- El SQL es solo una propuesta: **no se ha aplicado en Supabase**, y la Edge Function **no se ha desplegado** todavía.
- Hasta aplicar el esquema y desplegar la función, la cola permanece local y los intentos de sincronización no completarán.

## Límites de seguridad

- `capture_package` identifica la aplicación Android que publicó la notificación; no demuestra el remitente SMS original ni que el pago sea auténtico. El valor enviado por la APK es metadato de captura y no una prueba criptográfica.
- Los eventos se almacenan como `PENDING_MANUAL_REVIEW`; una coincidencia no aprueba una solicitud.
- No se modifica `wallets`, `transactions` ni el estado de `gvr_purchase_requests`.
- No se acredita GVR automáticamente.
- No se realizan transferencias reales para probar.
- No incluir credenciales, claves secretas, cuentas receptoras completas ni datos personales de pagos en el repositorio.

## Construcción

Abrir `android/` como proyecto Gradle en Android Studio, con JDK 17 y Android SDK Platform 35. El workflow de GitHub ejecuta pruebas unitarias y genera un APK debug. Para iniciar sesión desde el APK, configura las dos propiedades anteriores antes de compilar.
