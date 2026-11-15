# GAMERS GOLD TOP-UP — AUDITORÍA DE PAGOS GVR (USDT, SALDO MÓVIL Y CUP)

Fecha de revisión: 15-11-2026  
Rama de trabajo: `audit/automatizacion-anadir-gvr`  
PR: https://github.com/fidelarcia09/gamevora/pull/3  
Proyecto Supabase: `gsuhzcavghsiolmipnzi`

## 1. Estado real verificado

### USDT BEP20
- Edge Function `gvr-usdt-verificar`: ACTIVE, versión 1, `verify_jwt=true`.
- Funciona en modo sombra: consulta la cadena y responde, pero no modifica solicitudes, `wallets`, `transactions` ni acredita GVR.
- La página `frontend/confirmar-gvr.html` la invoca después de vincular el comprobante, sin esperar su resultado; un fallo de RPC no debe impedir el flujo manual.
- La función comprueba chain ID BSC `0x38`, contrato configurado, destinatario, recibo exitoso, importe exacto con 18 decimales, 15 confirmaciones y fecha dentro de la ventana de la solicitud.
- El resultado se guarda en `public.gvr_usdt_verifications` con service role; soporte puede leerlo.
- Índice único en `lower(btrim(payment_txid))` para impedir reutilizar un TXID.
- En la revisión actual, `gvr_usdt_verifications` tiene 0 registros y los logs consultados no muestran invocaciones de esta función. No se ha confirmado una ejecución HTTP autenticada real ni que el guardado de auditoría funcione en runtime.
- El código usa un solo RPC público, timeout de 8 segundos y limitador en memoria por instancia. No tiene segundo RPC, reintento programado de confirmaciones ni limitación global.
- La coincidencia de importe/destino/fecha no demuestra quién envió el dinero. Existe riesgo de que una persona reclame un TXID ajeno que coincida con su importe. Por eso `verified: true` NO debe disparar una acreditación automática.

### Saldo móvil (SALDO_MOVIL)
- La web permite crear la solicitud, muestra el destino de pago, solicita el número emisor y una captura.
- El trigger SQL exige un teléfono emisor de 8 a 15 dígitos al vincular el comprobante.
- La tasa vigente está validada por el trigger: **340 unidades de saldo móvil por cada GVR**.
- No existe todavía una app Android ni un lector de SMS en este repositorio.
- El dispositivo previsto es Samsung A05. Los SMS se reciben aunque el teléfono no tenga datos móviles.
- Remitente identificado: `ETECSA`.
- No se dispone de un ejemplo literal del SMS, ni del formato exacto de importe, número remitente, identificador o comisión. No se debe inventar un parser.
- La solución prevista requiere cola local sin conexión, deduplicación y sincronización HTTPS al recuperar internet. El APK nunca debe contener una clave `service_role`.

### CUP / Transfermóvil
- `frontend/confirmar-gvr.html` muestra el panel CUP como no disponible y deshabilita el botón de continuar cuando el método es CUP.
- El texto de la propia página indica que falta configurar la tarjeta receptora. El número mostrado como “Número de confirmación” no debe tratarse como una tarjeta receptora confirmada.
- La tasa vigente está validada por el trigger: **1.150 CUP por cada GVR**.
- Remitente SMS identificado: `PAGO×MOVIL`.
- No se ha confirmado la tarjeta/cuenta receptora que debe recibir el CUP ni se dispone de un ejemplo literal del SMS de confirmación. No activar CUP ni inventar esos datos.
- No se ha confirmado una API oficial de Transfermóvil para conciliación automática.

## 2. Esquema y seguridad consultados en Supabase

### `public.gvr_purchase_requests`
Columnas relevantes confirmadas:
- `id uuid`, `user_id uuid`, `gvr_amount integer`
- `payment_method text`, `payment_amount numeric`, `payment_currency text`
- `proof_path text`, `status text`
- `payment_txid text`, `expires_at timestamptz`, `payment_sender_phone text`
- `created_at`, `reviewed_by`, `reviewed_at`, `review_note`

Restricciones confirmadas:
- Métodos y monedas: `CUP`, `USDT`, `SALDO_MOVIL`.
- Estados: `pending`, `approved`, `rejected`.
- `gvr_amount >= 1`, `payment_amount > 0`.
- Consistencia entre estado y campos de revisión.
- RLS habilitado. El usuario autenticado crea y ve sus solicitudes; solo puede adjuntar comprobante a su propia solicitud pendiente bajo la política existente.

### Tasas y funciones
- Trigger `validate_gvr_purchase_request()` valida CUP = 1.150 × GVR, USDT = 1 × GVR y SALDO_MOVIL = 340 × GVR. También normaliza el estado inicial y limpia campos de revisión/comprobante al insertar.
- Trigger `set_gvr_request_expiration()` fija vencimiento de 10 minutos.
- Trigger `validate_gvr_usdt_submission()` exige TXID en USDT y teléfono emisor en SALDO_MOVIL al adjuntar comprobante; bloquea solicitudes vencidas.
- La página actual crea solicitudes directamente con Supabase; no llama a `create_gvr_purchase_request`.
- La función antigua `create_gvr_purchase_request(integer,text,text)` sigue siendo SECURITY DEFINER y tiene EXECUTE para authenticated. Su definición conserva tasas antiguas: 1.050 CUP y 250 SALDO_MOVIL. El trigger actual debería rechazar importes no coincidentes, pero esta función obsoleta y ejecutable debe ser revisada por seguridad. No revocar ni modificar sin confirmar que ningún cliente antiguo la usa.
- `frontend/confirmaciones-gvr.html` usa `admin_review_gvr_purchase_request`. Esta RPC exige administrador, bloquea la solicitud con `FOR UPDATE`, exige comprobante, actualiza wallet/transactions y marca el resultado dentro de una operación. Es la ruta manual activa identificada.
- También existe `review_gvr_purchase_request`, con comportamiento distinto. No sustituir la RPC de administración por esta función sin una revisión específica.

### Migraciones
El historial remoto de Supabase registra:
- `20261115172521_gvr_usdt_txid_unique`
- `20261115172525_gvr_usdt_verifications`

Los archivos de la rama se renombraron para coincidir con esas versiones remotas. Esta corrección fue solo en GitHub; no se aplicó ninguna migración nueva en esta revisión.

## 3. Pruebas realizadas y no realizadas

Realizado:
- Consulta de columnas, constraints, índices, políticas RLS y triggers.
- Verificación de migraciones registradas en Supabase.
- Verificación de Edge Function activa y `verify_jwt=true`.
- Verificación de grants de las tres RPC de GVR.
- Conteo de solicitudes existentes: 1 SALDO_MOVIL aprobada con comprobante, 9 SALDO_MOVIL rechazadas y 3 USDT rechazadas; no se encontraron TXID en esas solicitudes.
- `gvr_usdt_verifications` tiene 0 filas.
- PR #3 está abierta y GitHub actualmente informa `mergeable=true`; no está fusionada.
- No hay GitHub Actions check-runs para el commit consultado.

No realizado:
- No se envió ningún pago real.
- No se probó una invocación HTTP autenticada de `gvr-usdt-verificar`.
- No se confirmó que el secreto `SUPABASE_SERVICE_ROLE_KEY` esté disponible en el entorno de la Edge Function; el valor no se puede inspeccionar desde esta revisión.
- No se verificó el TXID de ejemplo independientemente en BSC.
- No se hizo una prueba integral de acreditación porque la función es solo sombra.
- No se ha construido ni instalado la app Android.
- No se ha probado lectura de SMS, cola offline ni sincronización.
- CUP sigue deshabilitado y no se ha probado conciliación de Transfermóvil.

## 4. Bloqueos concretos para completar saldo móvil y CUP

Para construir el parser sin adivinar, hacen falta ejemplos reales anonimizados:
1. SMS completo recibido de `ETECSA` después de una transferencia de saldo.
2. SMS completo recibido de `PAGO×MOVIL` después de un pago CUP.
3. Ocultar números personales, saldos ajenos y cualquier dato que no sea necesario, pero conservar literalmente etiquetas, orden, separadores y formato de importe.
4. Confirmar los datos oficiales de la tarjeta/cuenta receptora CUP que debe mostrarse al cliente.

No se debe aceptar como prueba suficiente una captura aportada por el cliente ni un SMS reenviado manualmente. El diseño debe comprobar remitente del sistema, importe, identificador único de operación, destino cuando esté disponible, ventana temporal, duplicados y conciliación administrativa. La app debe capturar solo los remitentes autorizados y pedir permisos Android explícitos.

## 5. Arquitectura propuesta (todavía no implementada)

1. App Android local para Samsung A05, con permiso SMS explícito y lista permitida de remitentes.
2. Parser basado en ejemplos reales de ETECSA y PAGO×MOVIL; no usar expresiones aproximadas hasta conocer los formatos.
3. Cola local persistente y protegida; sincronizar al volver la conexión y borrar el evento local solo después de recibir confirmación del servidor.
4. Identidad de dispositivo emparejada y revocable. Guardar solo hash del token del dispositivo en servidor; nunca incluir service role en el APK.
5. Edge Function de recepción autenticada que valide el dispositivo y registre eventos deduplicados; mantenerlos en modo sombra.
6. Panel administrativo para cotejar eventos con solicitudes GVR.
7. Solo después de pruebas de falsos positivos, duplicados, mensajes tardíos, SMS repetidos, conexión perdida y conciliación real, diseñar una aprobación automática separada.

## 6. Instrucciones para Claude

Revisa los archivos completos de la PR y este documento. Distingue:
- lo que está implementado y comprobado;
- lo que está desplegado pero aún no probado en runtime;
- lo que está diseñado pero no implementado;
- lo que requiere datos del operador o del titular de la cuenta.

No cambies `main`, no hagas merge ni despliegues. No actives acreditación automática. No inventes formatos SMS, números de tarjeta, columnas, RPC, políticas ni secretos.

Devuelve:
A. Errores críticos.  
B. Riesgos de seguridad y privacidad.  
C. Compatibilidad con esquema/RLS/grants.  
D. Correcciones exactas por archivo.  
E. Pruebas automatizadas y manuales necesarias.  
F. Datos externos que faltan.  
G. Veredicto separado para USDT, SALDO_MOVIL y CUP: APTO PARA PRUEBAS / NO APTO PARA PRUEBAS / APTO PARA PRODUCCIÓN.

Veredicto inicial esperado: USDT solo APTO PARA PRUEBAS CONTROLADAS EN MODO SOMBRA, sujeto a prueba autenticada y auditoría; SALDO_MOVIL NO APTO PARA PRUEBAS de parser hasta recibir ejemplos SMS; CUP NO APTO hasta configurar la cuenta receptora y recibir un SMS real anonimizado. Ningún método está autorizado para acreditar GVR automáticamente.
