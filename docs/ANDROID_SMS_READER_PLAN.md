# Gamers Gold — plan técnico del lector Android de SMS

Estado: diseño previo a implementación. No hay APK ni aplicación Android construida todavía.

## Objetivo

Aplicación privada para el Samsung Galaxy A05, instalada mediante APK fuera de Google Play. Su única función es recibir confirmaciones de pagos de Gamers Gold, extraer los campos mínimos necesarios y sincronizarlos con un backend cuando exista conexión.

## Alcance de la primera versión

- Detectar únicamente SMS que coincidan con los formatos esperados de ETECSA y PAGO×MOVIL.
- Validar el remitente con metadatos reales entregados por Android; no confiar en el nombre escrito dentro del cuerpo.
- Procesar localmente el SMS y conservar solo los campos necesarios para conciliación.
- Guardar eventos pendientes en almacenamiento local privado de la aplicación.
- Sincronizar mediante HTTPS cuando haya conexión, con reintentos y backoff.
- No enviar el SMS completo ni otros mensajes personales al servidor.
- No acreditar GVR ni aprobar solicitudes: toda coincidencia queda en revisión humana.
- No incluir claves service_role, secretos de proveedor ni credenciales administrativas en el APK.

## Diseño Android propuesto

1. BroadcastReceiver para el evento de SMS entrante, sujeto a que Android permita conceder RECEIVE_SMS a la app instalada.
2. Validación de remitente, formato, importe y campos de origen.
3. Persistencia local idempotente antes de terminar el receptor.
4. WorkManager con restricción de red para vaciar la cola local y reintentar fallos.
5. Pantalla de estado: permiso, último SMS reconocido, pendientes, último intento de sincronización y errores.
6. Configuración explícita para activar/desactivar lectura y sincronización.

## Bloqueo que debe resolverse antes de programar el receptor

La documentación oficial de Android clasifica RECEIVE_SMS como permiso peligroso y de acceso restringido: no puede concederse hasta que el instalador registrado incluya el permiso en su lista permitida. Por tanto, instalar un APK manualmente no garantiza que el permiso pueda concederse. Debe comprobarse en el Samsung A05 real antes de prometer recepción automática.

No se debe intentar eludir esta restricción. Si el instalador del dispositivo no permite conceder el permiso, habrá que evaluar una alternativa explícita y consentida, como captura de notificaciones con acceso especial del usuario, explicando que no garantiza recibir todos los SMS y depende de las notificaciones de la app de mensajes. Otra opción sería replantear la distribución/rol de la aplicación, con una revisión completa de requisitos.

## Datos de remitente

El operador del proyecto confirmó que en la aplicación de mensajes aparecen las etiquetas ETECSA y PAGO×MOVIL. Esto no demuestra que Android entregue esas mismas cadenas como originatingAddress: el valor real de metadatos debe comprobarse en el dispositivo. No se almacenarán números privados ni muestras financieras reales en este repositorio.

## Persistencia y conciliación

- ETECSA: teléfono de origen + importe + hora de recepción + ID local; sin referencia bancaria única, por lo que siempre requiere revisión humana y no se considera deduplicación global.
- PAGO×MOVIL: referencia de transacción del proveedor como clave idempotente; validar importe y cuenta receptora configurada en backend.
- El servidor debe autenticar el dispositivo y validar todo de nuevo. Nunca confiar en importes, remitentes o referencias solo porque los envió el APK.
- La cola debe conservar los eventos ante falta de Internet, cierre del proceso y reinicio del teléfono.
- No realizar cambios en wallet, transacciones ni estado de solicitudes durante esta fase.

## Criterios de aceptación

- Permiso de SMS comprobado en el Samsung A05 sin trucos ni bypass.
- Recibe SMS de prueba con la app cerrada y registra metadatos reales del remitente.
- No captura mensajes que no pertenezcan a los dos formatos autorizados.
- La cola sobrevive al cierre forzado razonable y al reinicio del teléfono.
- Sincroniza al volver la conexión y no duplica eventos.
- Ninguna clave administrativa ni SMS completo se incorpora al APK o a logs públicos.
- Conciliación y acreditación siguen desactivadas hasta completar pruebas y revisión independiente.

## Referencias oficiales

- Android Manifest.permission: https://developer.android.com/reference/android/Manifest.permission
- Android WorkManager: https://developer.android.com/develop/background-work/background-tasks/persistent
- Android offline-first: https://developer.android.com/topic/architecture/data-layer/offline-first