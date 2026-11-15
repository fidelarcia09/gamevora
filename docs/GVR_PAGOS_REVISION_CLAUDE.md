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

Los archivos de la rama se renombraron para coincidir con esas versiones remotas (`20261115172521_gvr_usdt_txid_unique.sql` y `20261115172525_gvr_usdt_verifications.sql`). Esta corrección fue solo en GitHub; no se aplicó ninguna migración nueva en esta revisión.

## 3. Pruebas realizadas y no realizadas

Realizado:
- Consulta de columnas, constraints, índices, políticas RLS y triggers.
- Verificación de migraciones registradas en Supabase.
- Verificación de Edge Function activa y `verify_jwt=true`.
- Verificación de grants de las tres RPC de GVR.
- Conteo de solicitudes existentes: 1 SALDO_MOVIL aprobada con comprobante, 9 SALDO_MOVIL rechazadas y 3 USDT rechazadas; no se encontraron TXID en esas solicitudes.
- `gvr_usdt_verifications` tiene 0 filas.
- PR #3 está abierta y GitHub actualmente informa `mergeable=true`; no está fusionada. Incluye los archivos de auditoría y los nombres de migración alineados con el historial remoto.
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


## 7. Hoja de ruta paso a paso: completado y pendiente

### Fase 1 — Auditoría y protección del sistema actual

**Completado**
- [x] Localizar el flujo actual de solicitudes GVR en `confirmar-gvr.html`.
- [x] Identificar la tabla `gvr_purchase_requests`, los campos de pago y los estados.
- [x] Revisar RLS, políticas, triggers, constraints, índices y permisos de las RPC.
- [x] Confirmar las tasas vigentes: CUP 1.150, USDT 1 y SALDO_MOVIL 340 por cada GVR.
- [x] Identificar que la aprobación administrativa activa utiliza `admin_review_gvr_purchase_request`.
- [x] Mantener la acreditación automática desactivada.

**Pendiente**
- [ ] Revisar con Claude el código completo y las diferencias de las RPC antiguas.
- [ ] Decidir, con pruebas de compatibilidad, si se retira o actualiza la RPC obsoleta `create_gvr_purchase_request`; no hacerlo antes de comprobar clientes antiguos.
- [ ] Añadir pruebas automatizadas para solicitudes, permisos, vencimiento, duplicados y aprobación manual.

### Fase 2 — Verificador USDT BEP20

**Completado**
- [x] Crear y desplegar `gvr-usdt-verificar` en modo sombra.
- [x] Exigir JWT y comprobar que la solicitud pertenece al usuario autenticado.
- [x] Verificar red BSC, contrato USDT configurado, recibo exitoso, destinatario, importe y confirmaciones.
- [x] Añadir restricción única para impedir reclamar el mismo TXID más de una vez.
- [x] Crear tabla de auditoría `gvr_usdt_verifications` y política de lectura para soporte.
- [x] Corregir el bloque `catch` sobrante del frontend.
- [x] Corregir normalización de entradas y validación del formato TXID.
- [x] Alinear en la rama los nombres de los archivos de migración con las versiones que ya constan en Supabase.

**Pendiente**
- [ ] Confirmar que `SUPABASE_SERVICE_ROLE_KEY` está configurada en los secretos de Edge Functions, sin mostrar ni compartir su valor.
- [ ] Ejecutar prueba HTTP autenticada controlada con una solicitud propia de prueba y TXID válido, sin acreditar saldo.
- [ ] Probar casos negativos: sin sesión, solicitud ajena, TXID inexistente, red equivocada, contrato incorrecto, importe incorrecto, destinatario incorrecto, recibo fallido, pocas confirmaciones, TXID repetido y RPC caído.
- [ ] Confirmar que cada intento queda registrado en `gvr_usdt_verifications`.
- [ ] Incorporar redundancia de RPC, timeout/reintentos seguros y reconsulta de transacciones con pocas confirmaciones.
- [ ] Resolver el riesgo de atribución: un TXID público puede ser reclamado por otra persona si coincide el importe. Mantener revisión humana hasta tener un mecanismo fiable de vincular pagador y solicitud.
- [ ] Pedir a Claude revisión de seguridad y resultado de pruebas.
- [ ] Solo después, diseñar por separado cualquier posible acreditación automática; requiere autorización explícita y pruebas adicionales.

### Fase 3 — Automatización de saldo móvil (ETECSA)

**Completado**
- [x] Identificar el método `SALDO_MOVIL` y su tasa vigente de 340 por GVR.
- [x] Confirmar que la web actualmente solicita número emisor y comprobante.
- [x] Identificar el teléfono Android previsto para la integración: Samsung A05.
- [x] Definir que los SMS pueden recibirse sin datos y deben guardarse localmente hasta recuperar conexión.

**Pendiente**
- [ ] Recibir un SMS real de confirmación de ETECSA, anonimizado pero con formato literal intacto.
- [ ] Definir con ese ejemplo cómo identificar remitente, importe, número de origen/destino e identificador de operación, solo si aparecen en el mensaje.
- [ ] Diseñar y construir la app Android con permiso SMS explícito y filtrado del remitente autorizado.
- [ ] Implementar almacenamiento local persistente y cola offline.
- [ ] Implementar emparejamiento/revocación del dispositivo y autenticación segura del envío al backend.
- [ ] Crear endpoint/Edge Function de recepción que valide, deduplique y registre cada evento.
- [ ] Crear vista de conciliación administrativa entre SMS recibidos y solicitudes GVR.
- [ ] Probar SMS repetidos, eventos tardíos, falta de internet, reinicio del teléfono, duplicados, mensajes inválidos y reintentos.
- [ ] Ejecutar pruebas en modo sombra antes de considerar cualquier aprobación automática.

### Fase 4 — Automatización de CUP / Transfermóvil

**Completado**
- [x] Identificar la tasa CUP vigente de 1.150 por GVR.
- [x] Confirmar que el método CUP permanece deshabilitado en la página.
- [x] Identificar el remitente SMS esperado como `PAGO×MOVIL`, pendiente de confirmarlo con un mensaje real.

**Pendiente**
- [ ] Confirmar los datos oficiales de la tarjeta/cuenta receptora que deben mostrarse al cliente.
- [ ] Recibir un SMS real de confirmación PAGO×MOVIL, anonimizado y con formato literal intacto.
- [ ] Confirmar qué datos del SMS permiten identificar importe, referencia, cuenta receptora y operación.
- [ ] Verificar si existe una vía oficial y autorizada de consulta/conciliación; no asumir que existe una API.
- [ ] Implementar recepción, deduplicación, registro y conciliación administrativa de eventos.
- [ ] Probar pagos repetidos, importes incorrectos, mensajes tardíos, operaciones no conciliadas y falta de conexión.
- [ ] Mantener CUP deshabilitado hasta completar pruebas y validar los datos receptores.

### Fase 5 — Panel de soporte y conciliación conjunta

**Pendiente**
- [ ] Mostrar a soporte las solicitudes GVR y los eventos recibidos de USDT, ETECSA y PAGO×MOVIL.
- [ ] Mostrar coincidencias, discrepancias, duplicados y eventos sin solicitud asociada.
- [ ] Mantener trazabilidad de quién revisó y qué decisión tomó.
- [ ] Impedir que un evento ya conciliado pueda volver a acreditar la misma solicitud.
- [ ] Probar permisos: usuario normal, soporte y administrador.
- [ ] Mantener la aprobación manual existente como mecanismo de respaldo.

### Fase 6 — Pruebas finales, revisión de Claude y publicación

**Pendiente**
- [ ] Ejecutar pruebas unitarias, de integración, seguridad y regresión.
- [ ] Revisar que los tres métodos calculan exactamente la tasa vigente y que no se mezclan monedas.
- [ ] Confirmar que ninguna clave privilegiada se incluye en HTML, JavaScript público o APK.
- [ ] Entregar a Claude la PR y este documento para auditoría independiente.
- [ ] Corregir todos los hallazgos críticos y altos.
- [ ] Repetir las pruebas y obtener veredicto por separado para USDT, saldo móvil y CUP.
- [ ] Revisar y aprobar explícitamente la PR antes de fusionar.
- [ ] Publicar primero en modo manual/sombra; no habilitar acreditación automática sin autorización y controles aprobados.

### Orden recomendado de ejecución

1. Cerrar revisión técnica de USDT y sus pruebas en modo sombra.
2. Obtener los SMS reales anonimizados de ETECSA y PAGO×MOVIL.
3. Confirmar la cuenta receptora CUP.
4. Construir la app Android y la recepción segura de SMS.
5. Construir la conciliación administrativa conjunta.
6. Ejecutar pruebas integrales y revisión de Claude.
7. Publicar manteniendo aprobación manual hasta que cada método tenga un veredicto APTO PARA PRODUCCIÓN.

**Regla de seguridad:** no se acredita GVR por una captura, por un SMS reenviado manualmente ni por una respuesta aislada del verificador. La acreditación solo podrá considerarse cuando exista una operación auténtica, única, conciliada, autorizada y registrada.
