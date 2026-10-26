(() => {
"use strict";
const style = document.createElement("style");
style.textContent = `
.gg-metodos{margin:18px 0;padding:16px;border:1px solid rgba(0,183,255,.28);border-radius:14px;background:rgba(4,17,35,.88);color:#eef7ff}
.gg-metodos label{display:block;margin:8px 0;color:#dbeeff;font-size:14px}
.gg-metodos select,.gg-metodos input{width:100%;margin-top:7px;padding:11px;border-radius:9px;border:1px solid rgba(0,183,255,.4);background:#07152a;color:#fff}
.gg-metodos .gg-instrucciones{margin-top:12px;padding:12px;border-radius:10px;background:rgba(0,110,220,.10);line-height:1.55;font-size:13px;overflow-wrap:anywhere}
.gg-metodos .gg-importe{color:#00d0ff;font-weight:800;font-size:18px}
.gg-metodos .gg-aviso{color:#ffd66b}
`;
document.head.appendChild(style);
function iniciar(){
 const boton=document.getElementById("botonContinuar");
 if(!boton || document.getElementById("ggMetodoPago")) return;
 const panel=document.createElement("section");
 panel.className="gg-metodos";
 panel.innerHTML='<label for="ggMetodoPago"><strong>Método de pago</strong></label><select id="ggMetodoPago"><option value="GVR">Saldo GVR (pago automático)</option><option value="USDT">USDT — BNB Smart Chain (BEP20)</option><option value="SALDO_MOVIL">Saldo móvil cubano</option><option value="CUP" disabled>CUP — próximamente (falta configurar la tarjeta)</option></select><div id="ggPagoInfo" class="gg-instrucciones" hidden></div><label id="ggPruebaLabel" for="ggComprobante" hidden>Comprobante de pago (imagen o PDF, máximo 6 MB)<input id="ggComprobante" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"></label>';
 boton.parentNode.insertBefore(panel,boton);
 const select=panel.querySelector("#ggMetodoPago"), info=panel.querySelector("#ggPagoInfo"), proof=panel.querySelector("#ggPruebaLabel");
 function pintar(){
  const method=select.value;
  info.hidden=method==="GVR"; proof.hidden=method==="GVR";
  if(method==="USDT") info.innerHTML='Envía el importe indicado a esta dirección exclusivamente por la red <b>BNB Smart Chain (BEP20)</b>. <div style="margin-top:8px"><b>Dirección:</b><br><span>0xd2364c69d339bbd96915BC80b4dbAc23c9209f9C</span></div><div id="ggImporte" class="gg-importe">El importe se confirma al crear el pedido.</div><p>Adjunta el comprobante. La recarga queda pendiente hasta que administración lo apruebe.</p>';
  else if(method==="SALDO_MOVIL") info.innerHTML='Envía el importe indicado al número de saldo móvil cubano <b>63638032</b> y guarda la captura del pago. <div id="ggImporte" class="gg-importe">El importe se confirma al crear el pedido.</div><p>La recarga queda pendiente hasta que administración lo apruebe.</p>';
  else if(method==="CUP") info.innerHTML='<span class="gg-aviso">No disponible todavía. Se habilitará cuando configures la tarjeta.</span>';
 }
 async function actualizarImporte(){
 const node=info.querySelector("#ggImporte"); if(!node)return;
 const selected=productoSeleccionado&&(productoSeleccionado.local||productoSeleccionado); if(!selected||!selected.id){node.textContent="Selecciona primero un paquete para ver el importe.";return;}
 let price=Number(selected.price_gvr);
 if(typeof window.ggGetResellerDiscountedPrice==="function") price=await window.ggGetResellerDiscountedPrice(price);
 if(!Number.isFinite(price)||price<=0){node.textContent="No se pudo calcular el importe.";return;}
 node.textContent=select.value==="USDT" ? "Importe a enviar: "+price.toLocaleString("es-ES",{minimumFractionDigits:2,maximumFractionDigits:2})+" USDT" : "Importe a enviar: "+Math.round(price*250).toLocaleString("es-ES")+" CUP de saldo móvil";
}
select.addEventListener("change",()=>{pintar();actualizarImporte();}); pintar();
document.addEventListener("click",event=>{if(event.target.closest(".producto"))setTimeout(actualizarImporte,0);});
 boton.addEventListener("click",async function(event){
  if(select.value==="GVR") return;
  if(typeof pedidoPendienteId!=="undefined" && pedidoPendienteId){
   const manualPendingId=localStorage.getItem("gg_manual_game_payment_pending");
   if(manualPendingId===pedidoPendienteId){
    event.preventDefault(); event.stopImmediatePropagation();
    const {data:payment,error:paymentError}=await supabase.from("manual_game_payments").select("status,proof_path").eq("game_order_id",pedidoPendienteId).maybeSingle();
    if(paymentError){mostrarEstado("No se pudo consultar la revisión del pago. Inténtalo más tarde.","error");return;}
    if(payment?.status==="approved"){
     localStorage.removeItem("gg_manual_game_payment_pending");
     accionPendiente="enviar"; guardarPedidoPendiente(); actualizarBoton();
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
  const file=panel.querySelector("#ggComprobante").files[0];
  if(!file){alert("Adjunta el comprobante del pago antes de continuar.");return;}
  if(file.size>6*1024*1024){alert("El comprobante no puede superar 6 MB.");return;}
  if(!["image/jpeg","image/png","image/webp","application/pdf"].includes(file.type)){alert("Formato no admitido. Usa JPG, PNG, WEBP o PDF.");return;}
  const selectedProduct=productoSeleccionado&&(productoSeleccionado.local||productoSeleccionado);
  if(!selectedProduct || !selectedProduct.id){alert("Selecciona primero un producto disponible.");return;}
  const playerField=document.getElementById("idjugador")||document.getElementById("idJugador");
  const zoneField=document.getElementById("zonaJugador");
  const regionField=document.getElementById("regionJugador");
  if(!playerField){alert("No se encontró el campo de ID del jugador.");return;}
  const playerId=playerField.value.trim();
  const zoneId=zoneField ? zoneField.value.trim() : null;
  if(zoneField && !zoneId){alert("Selecciona o introduce el servidor/Zone ID.");return;}
  if(regionField && typeof productoDeRegion==="function" && productoSeleccionado && productoSeleccionado.local && !productoDeRegion(selectedProduct,regionField.value) && !productoDeRegion(productoSeleccionado.proveedor,regionField.value)){alert("Este paquete no corresponde a la región seleccionada.");return;}
  if(!playerId){alert("Introduce tu ID de jugador.");return;}
  if(typeof validacionJugador!=="undefined" && validacionJugador.status==="INVALID" && validacionJugador.playerId===playerId){alert("El ID del jugador no es válido. Compruébalo antes de pagar.");return;}
  const {data:{session},error:sessionError}=await supabase.auth.getSession();
  if(sessionError || !session?.access_token){alert("Debes iniciar sesión para continuar.");return;}
  boton.disabled=true;
  try{
   if(typeof procesando!=="undefined") procesando=true;
   mostrarEstado("Registrando el pago manual… No cierres esta página.");
   const {data:orderId,error:createError}=await supabase.rpc("create_manual_game_order",{p_product_id:selectedProduct.id,p_player_id:playerId,p_payment_method:select.value,p_zone_id:zoneId});
   if(createError) throw new Error(createError.message||"No se pudo crear la solicitud de pago.");
   if(typeof orderId!=="string" || !/^[0-9a-f-]{36}$/i.test(orderId)) throw new Error("El servidor no devolvió un pedido válido.");
   pedidoPendienteId=orderId; accionPendiente="enviar"; localStorage.setItem("gg_manual_game_payment_pending",orderId); guardarPedidoPendiente(); actualizarBoton();
   const ext=file.type==="application/pdf"?"pdf":file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
   const path=session.user.id+"/"+orderId+"/"+crypto.randomUUID()+"."+ext;
   const {error:uploadError}=await supabase.storage.from("manual-game-proofs").upload(path,file,{contentType:file.type,upsert:false});
   if(uploadError) throw new Error("El pedido quedó registrado, pero no se pudo subir el comprobante: "+uploadError.message+". Contacta a soporte antes de crear otro pedido.");
   const {error:proofError}=await supabase.rpc("attach_manual_game_payment_proof",{p_order_id:orderId,p_proof_path:path});
   if(proofError) throw new Error("El comprobante se subió, pero no se pudo asociar al pedido. Contacta a soporte: "+proofError.message);
   mostrarEstado("Comprobante enviado. Pedido pendiente de revisión administrativa. No se enviará al proveedor hasta que aprueben el pago.","success");
   alert("¡Comprobante enviado! Tu pedido está pendiente de revisión. La recarga no se enviará hasta que administración apruebe el pago.");
  }catch(error){console.error("Pago manual:",error);mostrarEstado(error.message||"No se pudo enviar el comprobante.","error");alert(error.message||"No se pudo enviar el comprobante.");}
  finally{if(typeof procesando!=="undefined") procesando=false; actualizarBoton();}
 },true);
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",iniciar); else iniciar();
})();