/*
 * Configuración PÚBLICA de métodos de pago de Gamers Gold.
 *
 * La tarjeta CUP se mostrará a los clientes cuando se configure aquí.
 * Este archivo es público: NUNCA guardar secretos, contraseñas ni service_role.
 *
 * Cuando exista la tarjeta:
 * 1. Escribirla en cupReceiverAccount.
 * 2. Configurar el mismo valor como secreto GVR_CUP_RECEIVER_ACCOUNT en Supabase.
 * 3. Cambiar cupAutomationReady a true SOLO después de aplicar el SQL,
 *    desplegar la Edge Function y completar las pruebas de seguridad.
 */
window.GVR_PAYMENT_CONFIG = Object.freeze({
    cupReceiverAccount: "",
    cupAutomationReady: false
});
