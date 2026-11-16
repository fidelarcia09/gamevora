# Gamers Gold — lector Android de confirmaciones

Estado: prototipo Android creado en la rama `feature/gvr-android-notification-reader`. Todavía no hay APK generado ni prueba física en el Samsung Galaxy A05.

## Objetivo

Aplicación privada para el Samsung Galaxy A05 con Android 15, distribuida mediante APK fuera de Google Play. La primera etapa comprueba si se pueden detectar notificaciones de la aplicación Mensajes y reconocer localmente los dos formatos de confirmación.

## Implementación inicial en el repositorio

La carpeta `android/` contiene un proyecto Android nativo Kotlin:

- Pantalla de diagnóstico para conceder acceso especial a notificaciones.
- Lista de paquetes que han publicado notificaciones, almacenando solo sus identificadores.
- Selección explícita del paquete correspondiente a la aplicación Mensajes.
- Servicio `NotificationListenerService` que procesa únicamente notificaciones del paquete seleccionado.
- Parser local para los formatos documentados ETECSA y PAGO×MOVIL.
- SQLite privado para guardar únicamente los campos extraídos y el estado `PENDING_MANUAL_REVIEW`.
- Sin permisos `READ_SMS` ni `RECEIVE_SMS`.
- Sin llamadas de red, integración Supabase, aprobación ni acreditación GVR.

## Limitaciones importantes

1. El acceso a notificaciones no equivale al acceso directo a SMS. Android o la aplicación Mensajes pueden entregar texto recortado, agrupar mensajes o no incluir el título/remitente esperado.
2. El paquete Android y el título de la notificación no prueban la identidad del remitente bancario ni sustituyen el originatingAddress del SMS. Esta vía es solo una señal de conciliación que requiere revisión humana.
3. El prototipo reconoce ETECSA si el título contiene la etiqueta ETECSA y el cuerpo comienza con el formato acordado. Para PAGO×MOVIL requiere la etiqueta en el título y el formato completo en el cuerpo.
4. Los eventos ETECSA no tienen referencia bancaria única. Su clave local solo reduce repeticiones dentro del dispositivo; no garantiza unicidad global.
5. No se debe añadir sincronización hasta definir autenticación del dispositivo, endpoint, idempotencia del servidor y validación independiente de todos los campos.

## Seguridad y privacidad

- El usuario concede el acceso especial de Android de forma explícita.
- No se solicita acceso a la bandeja completa de SMS.
- El servicio observa paquetes para que el usuario elija la aplicación fuente; solo conserva nombres de paquete, no el texto de otras notificaciones.
- El texto de una notificación seleccionada se procesa en memoria y se descarta. Solo los campos extraídos se guardan en la base local privada.
- No almacenar SMS completos, contraseñas, tokens, service_role, secretos ni datos reales de cuentas receptoras en el APK o en el repositorio.
- No cambiar wallets, transactions, solicitudes ni estados de pago.

## Pruebas pendientes

1. Abrir el proyecto en Android Studio con JDK 17 y Android SDK Platform 35.
2. Generar el APK de depuración.
3. Instalarlo en el Samsung Galaxy A05 y conceder Notification Listener access.
4. Identificar y seleccionar el paquete real de la aplicación Mensajes.
5. Comprobar si Android entrega el título ETECSA/PAGO×MOVIL y el cuerpo completo en los extras de la notificación.
6. Probar formatos válidos, texto recortado, remitente desconocido, notificaciones agrupadas y notificaciones ajenas.
7. Verificar que los eventos quedan en SQLite y que el texto original no se guarda.
8. Revisar el comportamiento con la aplicación cerrada y tras reiniciar el teléfono.

## Próxima etapa

Añadir pruebas automatizadas del parser Kotlin y una compilación Android en CI. Después de verificar el APK, probar únicamente notificaciones de muestra en el dispositivo. La sincronización a Supabase seguirá fuera de alcance hasta completar una revisión de seguridad.

## Referencias oficiales

- Android NotificationListenerService: https://developer.android.com/reference/android/service/notification/NotificationListenerService
- Android notification listener access: https://developer.android.com/reference/android/provider/Settings#ACTION_NOTIFICATION_LISTENER_SETTINGS
- Android WorkManager: https://developer.android.com/develop/background-work/background-tasks/persistent
- Android offline-first: https://developer.android.com/topic/architecture/data-layer/offline-first
- Android Manifest.permission: https://developer.android.com/reference/android/Manifest.permission
