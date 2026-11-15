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
- **Regla de conciliación confirmada por el operador del proyecto:** identificar el pago por el **número telefónico desde el que se envía la transferencia de saldo**. Ese número debe coincidir exactamente, tras normalización internacional/nacional segura, con el número emisor asociado a la solicitud. El importe también debe coincidir con la solicitud. No usar el número de destino como identidad del pagador.
- **SMS real recibido y formato confirmado por el operador:** `Usted ha recibido 268.0 CUP del numero 50591030.Saldo principal 3087.28 CUP, linea activa hasta 2027-09-27, vence 2028-03-25`.
- Campos identificados en este formato: importe transferido `268.0 CUP`; teléfono de origen `50591030`. `Saldo principal` es el saldo restante de la línea y NO debe confundirse con el importe recibido. Las fechas de vigencia tampoco son fechas de la transferencia.
- El ejemplo no contiene un identificador único del movimiento. La app debe guardar el ID local del SMS y su fecha/hora de recepción, generar una huella determinista para deduplicación y marcar posibles colisiones como ambiguas; esa huella no demuestra por sí sola unicidad bancaria.
- La solución prevista requiere cola local sin conexión, deduplicación y sincronización HTTPS al recuperar internet. El APK nunca debe contener una clave `service_role`.

### CUP / Transfermóvil
- `frontend/confirmar-gvr.html` muestra el panel CUP como no disponible y deshabilita el botón de continuar cuando el método es CUP.
- El texto de la propia página indica que falta configurar la tarjeta receptora. El número mostrado como “Número de confirmación” no debe tratarse como una tarjeta receptora confirmada.
- La tasa vigente está validada por el trigger: **1.150 CUP por cada GVR**.
- Remitente SMS identificado: `PAGO×MOVIL`.
- **Regla de conciliación confirmada por el operador del proyecto:** identificar cada pago CUP mediante el **número de transacción único que aparece en el SMS de confirmación de PAGO×MOVIL**. Debe guardarse y tratarse como referencia única, además de comprobar el importe y los datos de la cuenta receptora que aparezcan en el mensaje. No reutilizar el TXID de USDT para este identificador CUP.
- **Cuenta receptora CUP confirmada por el operador:** el número de cuenta que aparece en el SMS real suministrado es la cuenta receptora de Gamers Gold. El valor completo se mantiene fuera de esta documentación de auditoría para no publicar un dato financiero; deberá configurarse como secreto/configuración protegida del backend y compararse exactamente.
- **SMS real recibido y formato confirmado por el operador:** `El titular del telefono 5359350941 le ha realizado una transferencia a la cuenta 9224069992533592 de 3500.00 CUP. Nro. Transaccion KW6023ZJ0Z999. Fecha: 9/11/2026.`
- Campos identificados: teléfono de origen `5359350941`; cuenta receptora; importe `3500.00 CUP`; referencia `KW6023ZJ0Z999`; fecha textual `9/11/2026`.
- La referencia CUP debe almacenarse separadamente de `payment_txid`, con unicidad. La fecha se conserva inicialmente como texto original porque `9/11/2026` es ambigua sin confirmar si el formato es D/M/YYYY o M/D/YYYY.
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
Los ejemplos reales de ETECSA y PAGO×MOVIL ya fueron recibidos. La cuenta receptora CUP también fue confirmada por el operador. Queda pendiente verificar la política de privacidad para almacenar el identificador receptor y configurar su valor protegido fuera del repositorio.

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
- [x] Definir el identificador de conciliación: número telefónico desde el que se envía la transferencia de saldo, cotejado con el número emisor declarado en la solicitud.

**Pendiente**
- [x] Recibir un SMS real de confirmación ETECSA y documentar su estructura.
- [x] Identificar el teléfono de origen después de `del numero` y el importe después de `Usted ha recibido`.
- [ ] Implementar y probar parser estricto contra el formato recibido; no usar `Saldo principal` como importe transferido.
- [ ] Definir deduplicación y manejo de colisiones, ya que este SMS no incluye una referencia única de operación.
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
- [x] Definir el identificador de conciliación: número de transacción único que aparece en el SMS de PAGO×MOVIL.

**Pendiente**
- [x] Confirmar con el operador la cuenta receptora CUP; mantener su valor fuera del repositorio y configurarlo de forma protegida.
- [x] Recibir un SMS real de confirmación PAGO×MOVIL y documentar su estructura.
- [x] Identificar teléfono de origen, cuenta receptora, importe, referencia de transacción y fecha textual.
- [ ] Implementar y probar parser estricto contra el formato recibido.
- [ ] Confirmar si la fecha `9/11/2026` usa D/M/YYYY o M/D/YYYY; hasta entonces conservar el texto original.
- [ ] Diseñar un campo/registro separado para la referencia CUP; no reutilizar `payment_txid`, reservado al TXID USDT, ni asumir una columna inexistente.
- [ ] Aplicar unicidad de la referencia CUP una vez confirmado su formato y alcance.
- [ ] Verificar si existe una vía oficial y autorizada de consulta/conciliación; no asumir que existe una API.
- [ ] Implementar recepción, deduplicación, registro y conciliación administrativa de eventos.
- [ ] Probar pagos repetidos, importes incorrectos, mensajes tardíos, operaciones no conciliadas y falta de conexión.
- [ ] Mantener CUP deshabilitado hasta completar pruebas y validar los datos receptores.

### Fase 5 — Panel de soporte y conciliación conjunta

**Pendiente**
- [ ] Mostrar a soporte las solicitudes GVR y los eventos recibidos de USDT, ETECSA y PAGO×MOVIL.
- [ ] Para SALDO_MOVIL, comparar el número de origen de la transferencia con el número declarado por el usuario y el importe.
- [ ] Para CUP, comparar el número de transacción único con el importe y los datos receptores.
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

## 8. Revalidación directa del entorno (15-11-2026)

Comprobaciones adicionales realizadas después de redactar esta hoja de ruta:

- La Edge Function remota `gvr-usdt-verificar` está ACTIVE, versión 1 y con `verify_jwt=true`.
- El código remoto de la Edge Function coincide exactamente con `supabase/functions/gvr-usdt-verificar/index.ts` de esta rama.
- Las migraciones `20261115172521_gvr_usdt_txid_unique` y `20261115172525_gvr_usdt_verifications` aparecen en el historial remoto.
- La tabla `gvr_usdt_verifications` existe.
- El índice único `gvr_purchase_requests_payment_txid_unique` existe y normaliza el TXID con `lower(btrim(...))`.
- La tabla de auditoría tiene RLS habilitado; `authenticated` tiene SELECT y `service_role` tiene INSERT. La política de SELECT llama a `is_support_admin()`.
- En esta consulta: 0 filas en `gvr_usdt_verifications` y 0 solicitudes USDT con TXID. Por tanto, todavía no hay una verificación real registrada.
- La PR #3 sigue abierta, no fusionada y GitHub informa `mergeable=true` en la última consulta. No tiene revisiones ni comentarios de revisión.
- No se encontraron ejecuciones de GitHub Actions asociadas al commit consultado.

**Límites de esta revalidación:** no se pudo inspeccionar el valor ni confirmar la presencia efectiva de `SUPABASE_SERVICE_ROLE_KEY` en los secretos; tampoco se ejecutó una petición HTTP autenticada. La coincidencia del código desplegado con el de GitHub no sustituye una prueba de runtime.

## 9. Aclaración funcional recibida del operador del proyecto (15-11-2026)

El operador confirmó explícitamente las claves de conciliación para la automatización por SMS:

- **SALDO_MOVIL / ETECSA:** la clave de identidad del pago es el número telefónico desde el que se envía la transferencia de saldo. La conciliación debe cotejar ese número de origen con el teléfono emisor registrado en la solicitud y verificar también el importe. No confundirlo con el número destinatario.
- **CUP / PAGO×MOVIL:** la clave de identidad del pago es el número de transacción que aparece en el SMS de confirmación. Debe ser una referencia independiente, única y no reutilizable, cotejada junto con el importe y, cuando el SMS lo incluya, la cuenta receptora. No reutilizar `payment_txid`, que corresponde al hash TXID de USDT.
- Esta aclaración define la lógica funcional, pero **no sustituye los SMS reales anonimizados**. Todavía no permite escribir un parser fiable porque se desconoce el formato exacto del texto y dónde aparecen esos campos.
- Antes de implementar el almacenamiento CUP hay que inspeccionar el esquema completo y los consumidores existentes, luego proponer una columna/referencia propia y un índice único mediante migración revisable. No asumir que esa columna ya existe.
- No se ha implementado la app Android, la cola offline, el endpoint de SMS, la conciliación de CUP ni una acreditación automática.
- Claude debe auditar estas reglas además de los controles técnicos y emitir un veredicto separado por método.

## 10. Ejemplos SMS reales recibidos y especificación inicial de parser (15-11-2026)

Los siguientes vectores están anonimizados para no publicar teléfonos personales ni el número completo de la cuenta receptora. Se conserva el orden y la estructura del texto original.

### ETECSA — vector positivo

```text
Usted ha recibido 268.0 CUP del numero 50000000.Saldo principal 3087.28 CUP, linea activa hasta 2027-09-27, vence 2028-03-25
```

Extracción esperada:
- `amount`: decimal `268.00` CUP (la fuente puede mostrar una cifra decimal).
- `origin_phone`: `50000000`.
- `remaining_balance`: `3087.28` CUP, solo informativo; nunca usar como importe pagado.
- `line_active_until`: `2027-09-27`, informativo.
- `line_expiry_date`: `2028-03-25`, informativo.
- El teléfono de origen se coteja con `gvr_purchase_requests.payment_sender_phone` después de normalización conservadora. El importe debe coincidir exactamente con `payment_amount` y moneda CUP.

Validaciones negativas:
- Rechazar si no aparece la frase de recepción, falta el número de origen o el importe.
- Rechazar importes negativos, cero, formatos numéricos ambiguos o más de un candidato.
- No interpretar `Saldo principal` como pago.
- No confiar en el cuerpo del mensaje si el remitente real del SMS no coincide con el remitente permitido ETECSA.
- Si llegan mensajes duplicados o dos operaciones indistinguibles (mismo origen/importe y sin referencia del proveedor), marcar para revisión manual; no acreditar.

### PAGO×MOVIL — vector positivo

```text
El titular del telefono 5350000000 le ha realizado una transferencia a la cuenta 9224000000000000 de 3500.00 CUP. Nro. Transaccion KW0000ZJ0Z000. Fecha: 9/11/2026.
```

Extracción esperada:
- `origin_phone`: `5350000000`.
- `recipient_account`: valor anonimizado del vector; comparar con la cuenta receptora protegida configurada para Gamers Gold.
- `amount`: decimal `3500.00` CUP.
- `transaction_reference`: `KW0000ZJ0Z000`, preservar mayúsculas y letras/números; aplicar unicidad en almacenamiento CUP independiente.
- `date_raw`: `9/11/2026`; no convertir a fecha normalizada hasta confirmar convención día/mes.
- Aceptar solo cuando el remitente real del SMS sea el identificador permitido PAGO×MOVIL, el destino coincida con la cuenta configurada, la referencia no exista y el importe coincida con la solicitud pendiente.

Validaciones negativas:
- Rechazar remitente real distinto de PAGO×MOVIL.
- Rechazar cuenta destinataria distinta de la configurada.
- Rechazar referencia ausente, mal formada, duplicada o ya conciliada.
- Rechazar importe ausente, cero, negativo o distinto de la solicitud.
- Rechazar textos truncados, múltiples coincidencias o estructura desconocida; mandar a revisión manual, no intentar adivinar.
- No reutilizar `payment_txid`; ese campo permanece reservado al hash TXID de USDT.

### Reglas comunes de captura y seguridad

- La app Android debe leer el remitente real y el timestamp del SMS desde el sistema, no deducirlos del texto.
- Guardar el evento localmente antes de sincronizar; mantener cola durable offline, reintentos idempotentes y acuse del servidor antes de marcarlo sincronizado.
- No confiar en SMS reenviados, capturas, texto pegado ni mensajes cuyo remitente de sistema no esté permitido.
- El SMS ETECSA de ejemplo no incluye referencia de transacción: una huella local sirve para deduplicar reenvíos/relecturas, pero no prueba unicidad del movimiento.
- Para CUP, la referencia de transacción es el identificador de deduplicación global y debe tener restricción única en el backend.
- Los eventos se mantienen en modo sombra y conciliación administrativa. No cambiar estado de solicitudes, `wallets` ni `transactions`, y no acreditar GVR automáticamente.
- Los importes se procesan como decimal exacto (no `float` binario); normalizar el separador decimal solo cuando el formato sea inequívoco.
- El número completo de la cuenta receptora CUP no se incluye en GitHub. Configurarlo en secreto/variable protegida del backend; nunca en el APK ni en JavaScript público.

### Estado actualizado tras recibir los SMS y confirmar la cuenta

- SALDO_MOVIL: formato real recibido; listo para diseñar parser estricto y pruebas unitarias, pero aún no implementado ni probado en Android.
- CUP: formato real recibido y cuenta receptora confirmada; listo para diseñar parser y esquema de referencia independiente, pero aún no implementado ni habilitado en la web.
- USDT: sin cambios; continúa en modo sombra y requiere pruebas autenticadas de runtime.
- Los tres métodos continúan sin acreditación automática.