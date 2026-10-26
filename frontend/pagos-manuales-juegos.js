(() => {
"use strict";
const style = document.createElement("style");
style.textContent = `
.gg-metodos{margin:12px 0;padding:14px 16px;border:1px solid #164b75;border-radius:22px;background:linear-gradient(145deg,#091a35,#07152b);color:#fff;box-shadow:0 8px 22px rgba(0,0,0,.18)}
.gg-metodos .gg-titulo{display:flex;align-items:center;gap:9px;margin-bottom:12px;font-size:16px;font-weight:800;color:#fff}
.gg-metodos .gg-titulo:before{content:"▣";color:#00baff;font-size:20px}
.gg-metodos .gg-opciones{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
.gg-metodos .gg-opcion{min-width:0;min-height:48px;padding:10px 4px;border:1px solid #164b75;border-radius:13px;background:linear-gradient(145deg,#0b3157,#09203b);color:#fff;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 3px 9px rgba(0,0,0,.16)}
.gg-metodos .gg-opcion.activo{border-color:#45c8ff;background:linear-gradient(120deg,#087cff,#00baff);color:#fff;box-shadow:0 4px 10px rgba(0,91,255,.2)}
.gg-metodos .gg-opcion:disabled{opacity:.4;cursor:not-allowed;background:#07152b;color:#8fa5bd}
.gg-player-card{margin:12px 0;padding:14px 16px;border:1px solid #164b75;border-radius:22px;background:#fff;box-shadow:0 2px 5px rgba(16,24,40,.05)}
.gg-player-card label[for="idjugador"],.gg-player-card label[for="idJugador"]{display:flex;align-items:center;gap:9px;margin:0 0 10px;color:#fff;font-size:16px;font-weight:800}
.gg-player-card label[for="idjugador"]::before,.gg-player-card label[for="idJugador"]::before{content:"♙";display:inline-grid;place-items:center;width:30px;height:30px;color:#fff;font-size:21px}
.gg-player-card input#idjugador,.gg-player-card input#idJugador{box-sizing:border-box;width:100%;min-height:48px;padding:12px 14px;border:1px solid #00baff;border-radius:13px;background:#050b18;color:#fff;outline:none;font-size:15px}
.gg-player-card input#idjugador::placeholder,.gg-player-card input#idJugador::placeholder{color:#8fa5bd}
.gg-player-card input#idjugador:focus,.gg-player-card input#idJugador:focus{border-color:#00baff;box-shadow:0 0 0 3px rgba(0,186,255,.12)}
.gg-metodos input{width:100%;margin-top:7px;padding:11px;border-radius:9px;border:1px solid #204c78;background:#050b18;color:#fff}
@media(max-width:390px){.gg-metodos .gg-opciones{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;
document.head.appendChild(style);
function iniciar(){
 const boton=document.getElementById("botonContinuar");
 if(!boton || document.getElementById("ggMetodoPago")) return;
 const panel=document.createElement("section");
 panel.className="gg-metodos";
 panel.innerHTML='<div class="gg-titulo">Método de pago</div><div class="gg-opciones" role="group" aria-label="Método de pago"><button type="button" class="gg-opcion" data-metodo="CUP" disabled>CUP</button><button type="button" class="gg-opcion" data-metodo="USDT">₮ USDT</button><button type="button" class="gg-opcion" data-metodo="GVR">◆ GVR</button><button type="button" class="gg-opcion" data-metodo="SALDO_MOVIL">▣ Saldo móvil</button></div><input id="ggMetodoPago" type="hidden" value="GVR">';
 const playerField=document.getElementById("idjugador")||document.getElementById("idJugador");
 const playerLabel=playerField?document.querySelector('label[for="'+playerField.id+'"]'):null;
 const playerCard=playerField?.closest(".player-id-card, .player-card, .campo, .form-group, .formulario-campo")||playerField?.parentElement;
 if(playerCard && playerField){
  playerCard.classList.add("gg-player-card");
  playerCard.insertAdjacentElement("afterend",panel);
 }else{
  const region=document.querySelector(".selector-region, #region, .region-selector");
  const nextSection=document.querySelector(".selector-categorias, #catalogo, #catalogoProductos");
  if(region) region.insertAdjacentElement("afterend",panel);
  else if(nextSection) nextSection.insertAdjacentElement("beforebegin",panel);
  else (playerField?.parentNode||boton.parentNode).insertBefore(panel,playerField?.nextSibling||boton);
 }
 const select=panel.querySelector("#ggMetodoPago");
 panel.querySelectorAll("[data-metodo]").forEach(btn=>btn.addEventListener("click",()=>{select.value=btn.dataset.metodo;panel.querySelectorAll("[data-metodo]").forEach(b=>b.classList.toggle("activo",b===btn));pintar();actualizarImporte();}));
 panel.querySelector('[data-metodo="GVR"]').classList.add("activo");
 function pintar(){ /* Los detalles de pago solo se muestran en la página del comprobante. */ }
 async function actualizarImporte(){ /* El importe definitivo se calcula en el servidor y se muestra en el comprobante. */ }
select.addEventListener("change",()=>{panel.querySelectorAll("[data-metodo]").forEach(b=>b.classList.toggle("activo",b.dataset.metodo===select.value));pintar();actualizarImporte();}); pintar();
document.addEventListener("click",event=>{if(event.target.closest(".producto"))setTimeout(actualizarImporte,0);});
 boton.addEventListener("click",async function(event){
  if(select.value==="GVR") return;
  const savedManualId=localStorage.getItem("gg_manual_game_payment_pending");
  if((typeof pedidoPendienteId==="undefined"||!pedidoPendienteId)&&savedManualId){pedidoPendienteId=savedManualId;accionPendiente="enviar";}
  if(typeof pedidoPendienteId!=="undefined" && pedidoPendienteId){
   const manualPendingId=localStorage.getItem("gg_manual_game_payment_pending");
   if(manualPendingId===pedidoPendienteId){
    event.preventDefault(); event.stopImmediatePropagation();
    const {data:payment,error:paymentError}=await supabase.from("manual_game_payments").select("status,proof_path").eq("game_order_id",pedidoPendienteId).maybeSingle();
    if(paymentError){mostrarEstado("No se pudo consultar la revisión del pago. Inténtalo más tarde.","error");return;}
    if(payment?.status==="approved"){
     localStorage.removeItem("gg_manual_game_payment_pending");
     accionPendiente="enviar"; if(typeof guardarPedidoPendiente==="function") guardarPedidoPendiente(); else if(typeof guardarPendiente==="function") guardarPendiente(); if(typeof actualizarBoton==="function") actualizarBoton();
     mostrarEstado("Pago aprobado. Continuando con el envío de tu pedido…","correcto");
     boton.click(); return;
    }
    if(payment?.status==="rejected"){localStorage.removeItem("gg_manual_game_payment_pending"); if(typeof borrarPedidoPendiente==="function") borrarPedidoPendiente(); pedidoPendienteId=null; accionPendiente="crear"; actualizarBoton(); mostrarEstado("El pago fue rechazado. Contacta con soporte si necesitas aclarar la revisión.","error");alert("El pago fue rechazado. Puedes contactar con soporte si necesitas aclararlo.");return;}
    if(!payment?.proof_path){mostrarEstado("El pedido está registrado, pero falta asociar el comprobante. No crees otro pedido; contacta con soporte para resolverlo.","error");return;}
    mostrarEstado("Tu comprobante sigue pendiente de revisión administrativa. No se enviará al proveedor todavía.","aviso");
    return;
   }
   return;
  }
  event.preventDefault(); event.stopImmediatePropagation();
  if(typeof procesando!=="undefined" && procesando) return;
  if(select.value==="CUP"){alert("CUP todavía no está disponible. Falta configurar la tarjeta.");return;}
  const selectedProduct=productoSeleccionado&&(productoSeleccionado.local||productoSeleccionado);
  if(!selectedProduct || !selectedProduct.id){alert("Selecciona primero un producto disponible.");return;}
  if(typeof validarFormulario==="function" && !validarFormulario()) return;
  if(document.title.toLowerCase().includes("arena breakout") && typeof vistaActual!=="undefined" && vistaActual!=="bonds"){alert("Selecciona primero una oferta disponible.");return;}
  const playerField=document.getElementById("idjugador")||document.getElementById("idJugador");
  const zoneField=document.getElementById("zonaJugador");
  const regionField=document.getElementById("regionJugador");
  if(!playerField){alert("No se encontró el campo de ID del jugador.");return;}
  const playerId=playerField.value.trim();
  const zoneId=zoneField ? zoneField.value.trim() : null;
  if(zoneField && !zoneId){alert("Selecciona o introduce el servidor/Zone ID.");return;}
  if(regionField && typeof productoDeRegion==="function" && productoSeleccionado && productoSeleccionado.local && !productoDeRegion(selectedProduct,regionField.value) && !productoDeRegion(productoSeleccionado.proveedor,regionField.value)){alert("Este paquete no corresponde a la región seleccionada.");return;}
  if(!playerId){alert("Introduce tu ID de jugador.");return;}
  if(playerField.maxLength>0 && playerId.length>playerField.maxLength){alert("El ID del jugador supera la longitud permitida.");return;}
  if(typeof validacionJugador!=="undefined" && validacionJugador.status==="INVALID" && validacionJugador.playerId===playerId){alert("El ID del jugador no es válido. Compruébalo antes de pagar.");return;}
  const {data:{session},error:sessionError}=await supabase.auth.getSession();
  if(sessionError || !session?.access_token){alert("Debes iniciar sesión para continuar.");return;}
  if(typeof usuarioActualId!=="undefined") usuarioActualId=session.user.id;
  boton.disabled=true;
  try{
   if(typeof procesando!=="undefined") procesando=true;
   if(typeof procesandoPedido!=="undefined") procesandoPedido=true;
   if(typeof datosPendientes!=="undefined") datosPendientes={jugador:playerId,zona:zoneId};
   mostrarEstado("Registrando el pago manual… No cierres esta página.");
   const {data:orderId,error:createError}=await supabase.rpc("create_manual_game_order",{p_product_id:selectedProduct.id,p_player_id:playerId,p_payment_method:select.value,p_zone_id:zoneId});
   if(createError) throw new Error(createError.message||"No se pudo crear la solicitud de pago.");
   if(typeof orderId!=="string" || !/^[0-9a-f-]{36}$/i.test(orderId)) throw new Error("El servidor no devolvió un pedido válido.");
   pedidoPendienteId=orderId; accionPendiente="enviar"; localStorage.setItem("gg_manual_game_payment_pending",orderId);
   if(typeof guardarPedidoPendiente==="function") guardarPedidoPendiente(); else if(typeof guardarPendiente==="function") guardarPendiente();
   localStorage.setItem("gg_manual_game_payment_method",select.value);
   location.href="./comprobante-pago-juego.html?pedido="+encodeURIComponent(orderId);
  }catch(error){console.error("Pago manual:",error);mostrarEstado(error.message||"No se pudo enviar el comprobante.","error");alert(error.message||"No se pudo enviar el comprobante.");}
  finally{if(typeof procesando!=="undefined") procesando=false; if(typeof procesandoPedido!=="undefined") procesandoPedido=false; if(typeof actualizarBoton==="function") actualizarBoton();}
 },true);
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",iniciar); else iniciar();
})();