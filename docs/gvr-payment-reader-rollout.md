# Puesta en marcha de la automatización de pagos GVR

Este documento describe el orden de activación de la lectura de notificaciones Android para **ETECSA (SALDO_MOVIL)** y **PAGOxMOVIL (CUP)**.

## Estado y límites

- El código de Android mantiene los eventos en una cola local cuando no hay Internet.
- La sincronización usa la Edge Function `gvr-payment-reader-sync`.
- Los eventos se guardan como `PENDING_MANUAL_REVIEW`.
- Una coincidencia con una solicitud GVR es solo una sugerencia.
- Este flujo NO cambia `wallets`, `transactions` ni el estado de `gvr_purchase_requests`.
- No acredita GVR automáticamente.
- No se deben hacer transferencias reales para probar el sistema.
- El esquema `public.gvr_payment_notification_events` ya está aplicado en Supabase, con RLS activado y sin acceso directo para `anon` ni `authenticated`.
- `gvr-payment-reader-sync` está desplegada (versión 2, JWT obligatorio).
- `gvr-payment-reader-events` está desplegada (versión 1, JWT obligatorio).
- La cuenta administradora configurada sigue activa en `support_agents`.
- El panel `frontend/confirmaciones-gvr.html` puede consultar los últimos 100 eventos mediante la función administrativa.

## Datos CUP: dos configuraciones distintas

La tarjeta receptora es información pública porque el cliente necesita verla para transferir. Se configura en:

- Archivo público: `frontend/gvr-payment-config.js`
- Propiedad: `cupReceiverAccount`

El archivo está servido al navegador y **no debe contener secretos**. Actualmente la propiedad está vacía.

La misma tarjeta se configura de forma privada en Supabase:

- Secreto de Edge Functions: `GVR_CUP_RECEIVER_ACCOUNT`

Ambos valores deben coincidir exactamente. No guardar el secreto en Git, HTML, JavaScript público ni APK.

La propiedad `cupAutomationReady` debe permanecer en `false` hasta completar todos los pasos de despliegue y revisión. Aunque la tarjeta pública esté configurada, la pantalla seguirá bloqueando CUP mientras esta propiedad sea `false`.

## Orden obligatorio de activación

1. Revisar el SQL y convertirlo en una migración con el flujo oficial de Supabase.
2. Revisar RLS, grants y acceso administrativo a los eventos antes de aplicar el esquema.
3. Aplicar el esquema únicamente con autorización explícita y comprobar que existe la tabla `public.gvr_payment_notification_events`.
4. Desplegar `gvr-payment-reader-sync` con verificación JWT habilitada.
5. Configurar el secreto `GVR_CUP_RECEIVER_ACCOUNT` cuando la tarjeta definitiva exista.
6. Comprobar que la cuenta de administrador autorizada sigue activa en `support_agents`.
7. Confirmar en el Samsung los metadatos reales de las notificaciones de Google Messages. El título visible y el paquete publicador pueden diferir del remitente SMS original.
8. Ejecutar pruebas sintéticas de ETECSA y PAGOxMOVIL, incluyendo duplicados, referencia CUP repetida, cuenta receptora incorrecta, importes distintos, evento vencido, usuario no autorizado y lote inválido.
9. Comprobar que los eventos quedan pendientes de revisión manual y que no se producen cambios en saldos ni transacciones.
10. Construir e instalar un APK nuevo con la configuración pública Supabase correcta y `GVR_SYNC_ENABLED=true`, solo después de que la revisión de seguridad y las pruebas estén aprobadas.
11. Verificar desde `frontend/confirmaciones-gvr.html` que el panel administrativo puede consultar los eventos sincronizados.
12. Para habilitar CUP al cliente, introducir la tarjeta en `cupReceiverAccount`, confirmar que coincide con el secreto y cambiar `cupAutomationReady` a `true` únicamente cuando todos los pasos anteriores estén completos.

## Reglas de interpretación

### ETECSA / SALDO_MOVIL

- Comparar teléfono emisor, importe y ventana temporal de la solicitud.
- El saldo principal restante y las fechas de vigencia de la línea no son datos de la transferencia.
- ETECSA no proporciona una referencia de transacción única en el formato recibido.
- La deduplicación local del dispositivo no demuestra que el pago sea único.
- Siempre requiere revisión humana.

### PAGOxMOVIL / CUP

- Extraer teléfono emisor, cuenta receptora, importe, referencia de transacción y fecha textual.
- Conservar la fecha como texto hasta confirmar su convención regional.
- Comprobar que la cuenta receptora coincide con `GVR_CUP_RECEIVER_ACCOUNT`.
- Usar la referencia de transacción para detectar duplicados.
- Una referencia repetida con datos diferentes debe rechazarse como conflicto.
- Siempre requiere revisión humana.

## Estado de despliegue verificado (15 de noviembre de 2026)

- La tabla existe y está vacía; todavía no se han enviado eventos sintéticos ni notificaciones reales.
- Los permisos directos de `anon` y `authenticated` están revocados; solo el backend con `service_role` opera sobre la tabla.
- No se configuró `GVR_CUP_RECEIVER_ACCOUNT` porque aún no existe la tarjeta definitiva.
- `frontend/gvr-payment-config.js` mantiene `cupReceiverAccount` vacío y `cupAutomationReady` en `false`.
- La sincronización del APK permanece desactivada por defecto (`GVR_SYNC_ENABLED=false`).

## Limitaciones conocidas que bloquean la activación

- `capturePackage` identifica la app Android que publicó la notificación. Es un dato enviado por el cliente y no una prueba criptográfica del remitente ni de la autenticidad del pago.
- El parser Android actual depende del título visible de la notificación para clasificar ETECSA/PAGOxMOVIL. Hay que verificar los títulos reales en el Samsung antes de activar la sincronización.
- La cuenta CUP todavía no existe/configura; por tanto, no se puede verificar el destino real.
- La Edge Function y la tabla aún no están desplegadas/aplicadas en el proyecto.
- El panel administrativo de eventos está implementado, pero no podrá consultar datos hasta desplegar `gvr-payment-reader-events` y aplicar el SQL.

## Criterio de finalización

La automatización solo puede considerarse lista para operación cuando el esquema, la función, los secretos, el APK y la revisión administrativa estén verificados conjuntamente. La presencia de código o una compilación exitosa, por sí sola, no demuestra que los pagos se estén detectando correctamente.
