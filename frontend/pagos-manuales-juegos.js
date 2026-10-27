(() => {
"use strict";
const style = document.createElement("style");
style.textContent = `
.gg-metodos{box-sizing:border-box;width:100%;max-width:100%;margin:8px 0 12px;padding:10px 12px;border:1px solid #164b75;border-radius:18px;background:linear-gradient(145deg,#091a35,#07152b);color:#fff;box-shadow:0 6px 16px rgba(0,0,0,.16)}
.gg-metodos .gg-titulo{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:15px;font-weight:800;color:#fff}
.gg-metodos .gg-titulo:before{content:"";display:inline-block;width:21px;height:21px;flex:0 0 21px;background:center/contain no-repeat url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%2300baff%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Crect x=%273%27 y=%275%27 width=%2718%27 height=%2714%27 rx=%272%27/%3E%3Cpath d=%27M3 10h18M16 15h2%27/%3E%3C/svg%3E") }
.gg-metodos .gg-opciones{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;flex-wrap:nowrap}
.gg-metodos .gg-metodo-icon{display:block;width:18px;height:18px;margin:0 auto 4px;fill:none;stroke:#00baff;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:0 0 auto}.gg-metodos .gg-opcion.activo .gg-metodo-icon{stroke:#fff}.gg-metodos .gg-opcion span{display:block;line-height:1.1}.gg-metodos .gg-opcion{box-sizing:border-box;min-width:0;min-height:40px;padding:7px 3px;border:1px solid #164b75;border-radius:11px;background:linear-gradient(145deg,#0b3157,#09203b);color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 3px 9px rgba(0,0,0,.16);white-space:nowrap}
.gg-metodos .gg-opcion.activo{border-color:#45c8ff;background:linear-gradient(120deg,#087cff,#00baff);color:#fff;box-shadow:0 4px 10px rgba(0,91,255,.2)}
.gg-metodos .gg-opcion:disabled{opacity:.4;cursor:not-allowed;background:#07152b;color:#8fa5bd}
.gg-player-card{margin:12px 0;padding:14px 16px;border:1px solid #164b75;border-radius:22px;background:linear-gradient(145deg,#091a35,#07152b);color:#fff;box-shadow:0 8px 22px rgba(0,0,0,.18)}
.gg-player-card label[for="idjugador"],.gg-player-card label[for="idJugador"]{display:flex;align-items:center;gap:9px;margin:0 0 10px;color:#fff;font-size:16px;font-weight:800}
.gg-player-card label[for="idjugador"]::before,.gg-player-card label[for="idJugador"]::before{content:"";display:inline-block;flex:0 0 24px;width:24px;height:24px;background:center/contain no-repeat url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%2300baff%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2%27/%3E%3Ccircle cx=%2712%27 cy=%277%27 r=%274%27/%3E%3C/svg%3E")}
.gg-player-card input#idjugador,.gg-player-card input#idJugador{box-sizing:border-box;width:100%;min-height:48px;padding:12px 14px;border:1px solid #00baff;border-radius:13px;background:#050b18;color:#fff;outline:none;font-size:15px}
.gg-player-card input#idjugador::placeholder,.gg-player-card input#idJugador::placeholder{color:#8fa5bd}
.gg-player-card input#idjugador:focus,.gg-player-card input#idJugador:focus{border-color:#00baff;box-shadow:0 0 0 3px rgba(0,186,255,.12)}
.gg-metodos input{width:100%;margin-top:7px;padding:11px;border-radius:9px;border:1px solid #204c78;background:#050b18;color:#fff}
@media(max-width:390px){.gg-metodos .gg-opciones{grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}.gg-metodos .gg-opcion{font-size:10px;padding:7px 1px;min-height:38px;border-radius:9px}}
`;
document.head.appendChild(style);
function iniciar(){
 const boton=document.getElementById("botonContinuar");
 if(!boton || document.getElementById("ggMetodoPago")) return;
 const panel=document.createElement("section");
 panel.className="gg-metodos";
 panel.innerHTML='<div class="gg-titulo">Método de pago</div><div class="gg-opciones" role="group" aria-label="Método de pago"><button type="button" class="gg-opcion" data-metodo="CUP" disabled><svg class="gg-metodo-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/></svg><span>CUP</span></button><button type="button" class="gg-opcion" data-metodo="USDT"><svg class="gg-metodo-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M6 7h12M12 7v11M8 10h8M9 14h6"/></svg><span>USDT</span></button><button type="button" class="gg-opcion" data-metodo="GVR"><svg class="gg-metodo-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 21 7v10l-9 5-9-5V7z"/><path d="m8 9 4-2 4 2-4 2zM8 14l4 2 4-2"/></svg><span>GVR</span></button><button type="button" class="gg-opcion" data-metodo="SALDO_MOVIL"><svg class="gg-metodo-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M9 5h6M10 18h4"/></svg><span>Saldo móvil</span></button></div><input id="ggMetodoPago" type="hidden" value="GVR">';
 const playerField=document.getElementById("idjugador")||document.getElementById("idJugador");
 const playerLabel=playerField?document.querySelector('label[for="'+playerField.id+'"]'):null;
 const playerCard=playerField?.closest(".player-id-card, .player-card, .campo, .form-group, .formulario-campo")||playerField?.parentElement;
 if(playerCard && playerField){
  playerCard.classList.add("gg-player-card");
  /* Coloca el selector inmediatamente después del campo donde se escribe el ID. */
  playerField.insertAdjacentElement("afterend",panel);
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
 const SUPABASE_URL="https://gsuhzcavghsiolmipnzi.supabase.co";
 const SUPABASE_KEY="sb_publishable_VEu9lvcUF1mp0xS0fXHPdA_592bfknx";
 let tarifasCache=null, productosCache=null, cargandoTarifas=null, cargandoProductosGVR=null;
 const preciosGVRPorNombre=new Map();
 function claveTarjeta(card){return normalizarNombre(card.querySelector(".producto-nombre")?.textContent);}
 function precioGVRValido(value){const text=String(value||"").trim();return !!text&&!/^(cargando tarifa|tarifa pendiente)/i.test(text)&&!/(^|\s)NaN(\s|$)/i.test(text)&&!/^undefined(?:\s|$)/i.test(text);}
 function guardarPrecioGVR(card,price){const key=claveTarjeta(card);const value=String(price?.textContent||"").trim();if(key&&precioGVRValido(value)){preciosGVRPorNombre.set(key,value);price.dataset.ggOriginalPrice=value;}else if(price?.dataset.ggOriginalPrice&&!precioGVRValido(price.dataset.ggOriginalPrice)){delete price.dataset.ggOriginalPrice;}}
 const clientePago=import("https://esm.sh/@supabase/supabase-js@2").then(({createClient})=>createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}));
 function normalizarNombre(valor){return String(valor||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();}
 async function cargarTarifas(){
  if(tarifasCache&&productosCache)return;
  if(cargandoTarifas)return cargandoTarifas;
  cargandoTarifas=(async()=>{
   const client=await clientePago;
   const [productsResult,pricesResult]=await Promise.all([
    client.from("game_products").select("id,product_name,provider_product_id,game,price_gvr,active").eq("active",true).eq("provider","nextlevel"),
    client.from("manual_game_product_prices").select("product_id,payment_method,base_amount,payment_currency").eq("active",true)
   ]);
   if(productsResult.error)throw productsResult.error;
   if(pricesResult.error)throw pricesResult.error;
   productosCache=productsResult.data||[];
   tarifasCache=new Map((pricesResult.data||[]).map(row=>[row.product_id+"|"+row.payment_method,row]));
  })();
  try{await cargandoTarifas;}finally{cargandoTarifas=null;}
 }
 function productoParaTarjeta(card){
  if(!productosCache)return null;
  const id=String(card.dataset.ggProductId||"").trim();
  if(id){const byId=productosCache.find(p=>String(p.id)===id);if(byId)return byId;}
  const name=normalizarNombre(card.querySelector(".producto-nombre")?.textContent);
  if(!name)return null;
  const exact=productosCache.filter(p=>normalizarNombre(p.product_name)===name);
  if(exact.length===1)return exact[0];
  const candidates=productosCache.filter(p=>{const n=normalizarNombre(p.product_name);return n&&(name.includes(n)||n.includes(name));});
  return candidates.length===1?candidates[0]:null;
 }
 async function cargarProductosGVR(){
  if(productosCache)return;
  if(cargandoProductosGVR)return cargandoProductosGVR;
  cargandoProductosGVR=(async()=>{
   const client=await clientePago;
   const {data,error}=await client.from("game_products").select("id,product_name,provider_product_id,game,price_gvr,active").eq("active",true).eq("provider","nextlevel");
   if(error)throw error;
   productosCache=data||[];
  })();
  try{await cargandoProductosGVR;}finally{cargandoProductosGVR=null;}
 }
 async function restaurarPreciosGVRDesdeSupabase(){
  try{
   await cargarProductosGVR();
   if(select.value!=="GVR")return;
   const cards=[...document.querySelectorAll(".producto, .boton-oferta")].filter(card=>card.querySelector(".producto-precio, .precio-oferta"));
   cards.forEach(card=>{
    const price=card.querySelector(".producto-precio, .precio-oferta");
    const product=productoParaTarjeta(card);
    if(!price||!product)return;
    const amount=Number(product.price_gvr);
    if(!Number.isFinite(amount)||amount<=0)return;
    price.textContent=amount.toLocaleString("es-ES",{maximumFractionDigits:3})+" GVR";
    price.dataset.ggOriginalPrice=price.textContent;
    price.dataset.ggManualMethod="";
    preciosGVRPorNombre.set(claveTarjeta(card),price.textContent);
   });
  }catch(error){console.error("No se pudieron restaurar los precios GVR desde Supabase:",error);}
 }
 function formatoTarifa(row,method){
  const amount=Number(row.base_amount);
  if(!Number.isFinite(amount)||amount<=0)return "Tarifa pendiente";
  if(method==="USDT")return amount.toLocaleString("es-ES",{minimumFractionDigits:2,maximumFractionDigits:2})+" USDT";
  return amount.toLocaleString("es-ES",{maximumFractionDigits:2})+" CUP";
 }
 function pintar(){panel.querySelectorAll("[data-metodo]").forEach(b=>b.classList.toggle("activo",b.dataset.metodo===select.value));actualizarImporte();}
 async function actualizarImporte(){
  const method=select.value;
  const cards=[...document.querySelectorAll(".producto, .boton-oferta")].filter(card=>card.querySelector(".producto-precio, .precio-oferta"));
  /* Guarda el precio original únicamente cuando el catálogo está mostrando GVR.
     Nunca guardes "Cargando tarifa" o "Tarifa pendiente" como si fueran el precio GVR. */
  cards.forEach(card=>{
   const price=card.querySelector(".producto-precio, .precio-oferta");
   if(!price)return;
   if(method==="GVR"){
    const key=claveTarjeta(card);
    let original=price.dataset.ggOriginalPrice||preciosGVRPorNombre.get(key);
    if(!precioGVRValido(original)){
     delete price.dataset.ggOriginalPrice;
     preciosGVRPorNombre.delete(key);
     original="";
    }
    if(original)price.textContent=original;
    else guardarPrecioGVR(card,price);
    price.dataset.ggManualMethod="";
   }else{
    if(!precioGVRValido(price.dataset.ggOriginalPrice))delete price.dataset.ggOriginalPrice;
    if(!price.dataset.ggOriginalPrice && !price.dataset.ggManualMethod)guardarPrecioGVR(card,price);
    price.textContent="Cargando tarifa…";
    price.dataset.ggManualMethod=method;
   }
  });
  if(method==="GVR"){restaurarPreciosGVRDesdeSupabase();return;}
  try{
   await cargarTarifas();
   if(select.value!==method)return;
   /* Reconsulta las tarjetas actuales: el juego puede reconstruir el catálogo mientras cargan las tarifas. */
   const currentCards=[...document.querySelectorAll(".producto, .boton-oferta")].filter(card=>card.querySelector(".producto-precio, .precio-oferta"));
   currentCards.forEach(card=>{
    const price=card.querySelector(".producto-precio, .precio-oferta");
    if(!price)return;
    if(!price.dataset.ggOriginalPrice && !price.dataset.ggManualMethod && precioGVRValido(price.textContent))guardarPrecioGVR(card,price);
    const product=productoParaTarjeta(card);
    const row=product&&tarifasCache.get(product.id+"|"+method);
    price.textContent=row?formatoTarifa(row,method):"Tarifa pendiente";
    price.dataset.ggManualMethod=method;
   });
  }catch(error){
   console.error("No se pudieron cargar las tarifas manuales:",error);
   if(select.value!==method)return;
   document.querySelectorAll(".producto-precio, .precio-oferta").forEach(price=>{price.textContent="Tarifa pendiente";price.dataset.ggManualMethod=method;});
  }
 }
select.addEventListener("change",()=>{panel.querySelectorAll("[data-metodo]").forEach(b=>b.classList.toggle("activo",b.dataset.metodo===select.value));pintar();actualizarImporte();}); pintar();
/* Observa todo el documento: cada juego puede reconstruir sus tarjetas en contenedores distintos. */
 const observadorTarjetas=new MutationObserver(records=>{
  const catalogoCambio=records.some(record=>{
   const target=record.target;
   const priceElement=target.nodeType===1&&target.matches?.(".producto-precio, .precio-oferta")?target:target.parentElement?.matches?.(".producto-precio, .precio-oferta")?target.parentElement:null;
   if(priceElement){
    const value=String(priceElement.textContent||"").trim();
    return /\\b(?:NaN|undefined)\\b/i.test(value);
   }
   return true;
  });
  if(!catalogoCambio)return;
  if(select.value==="GVR"){
   restaurarPreciosGVRDesdeSupabase();
   return;
  }
  actualizarImporte();
 });
 observadorTarjetas.observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener("click",event=>{if(event.target.closest(".producto, .boton-oferta"))setTimeout(actualizarImporte,0);});
 boton.addEventListener("click",async function(event){
  if(select.value==="GVR") return;
  const savedManualId=localStorage.getItem("gg_manual_game_payment_pending");
  if(savedManualId){
   event.preventDefault(); event.stopImmediatePropagation();
   const bridge=window.ggManualPaymentBridge; const client=bridge?.getClient(); if(!client){mostrarEstado("No se pudo conectar con el juego. Recarga la página e inténtalo de nuevo.","error");return;} const {data:payment,error:paymentError}=await client.from("manual_game_payments").select("status,proof_path").eq("game_order_id",savedManualId).maybeSingle();
   if(paymentError){mostrarEstado("No se pudo consultar la revisión del pago. Inténtalo más tarde.","error");return;}
   if(payment?.status==="approved"){
    localStorage.removeItem("gg_manual_game_payment_pending");
    localStorage.removeItem("gg_manual_game_payment_method");
    mostrarEstado("El pago de este pedido ya fue aprobado. El pedido existente se conserva; no crees otro para evitar duplicados.","correcto");
    alert("El pago ya fue aprobado. Tu pedido existente se conserva; no vuelvas a crear otro pedido.");
    return;
   }
   if(payment?.status==="rejected"){
    localStorage.removeItem("gg_manual_game_payment_pending");
    localStorage.removeItem("gg_manual_game_payment_method");
    mostrarEstado("El pago fue rechazado. Contacta con soporte antes de realizar otra solicitud.","error");
    alert("El pago fue rechazado. Puedes contactar con soporte si necesitas aclararlo.");
    return;
   }
   if(!payment?.proof_path){mostrarEstado("El pedido está registrado, pero falta asociar el comprobante. No crees otro pedido; contacta con soporte para resolverlo.","error");return;}
   mostrarEstado("Tu comprobante sigue pendiente de revisión administrativa. No se enviará al proveedor todavía.","aviso");
   return;
  }
  event.preventDefault(); event.stopImmediatePropagation();
  if(typeof procesando!=="undefined" && procesando) return;
  if(select.value==="CUP"){alert("CUP todavía no está disponible. Falta configurar la tarjeta.");return;}
  const bridge=window.ggManualPaymentBridge; const client=bridge?.getClient(); const selectedProduct=bridge?.getProduct();
  if(!selectedProduct || !selectedProduct.id){alert("Selecciona primero un producto disponible.");return;}
  if(!bridge || !client){alert("No se pudo conectar con el sistema de compra. Recarga la página.");return;}
  if(typeof bridge.validate==="function" && !bridge.validate()) return;
  if(document.title.toLowerCase().includes("arena breakout") && bridge.getView && bridge.getView()!=="bonds"){alert("Selecciona primero una oferta disponible.");return;}
  const playerField=bridge.getPlayerField?bridge.getPlayerField():(document.getElementById("idjugador")||document.getElementById("idJugador"));
  const zoneField=bridge.getZoneField?bridge.getZoneField():document.getElementById("zonaJugador");
  const regionField=bridge.getRegionField?bridge.getRegionField():document.getElementById("regionJugador");
  if(!playerField){alert("No se encontró el campo de ID del jugador.");return;}
  const playerId=playerField.value.trim();
  const zoneId=zoneField ? zoneField.value.trim() : null;
  if(zoneField && !zoneId){alert("Selecciona o introduce el servidor/Zone ID.");return;}
  
  if(!playerId){alert("Introduce tu ID de jugador.");return;}
  if(playerField.maxLength>0 && playerId.length>playerField.maxLength){alert("El ID del jugador supera la longitud permitida.");return;}
  if(typeof validacionJugador!=="undefined" && validacionJugador.status==="INVALID" && validacionJugador.playerId===playerId){alert("El ID del jugador no es válido. Compruébalo antes de pagar.");return;}
  const {data:{session},error:sessionError}=await client.auth.getSession();
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
   /* Este archivo es un script independiente: las variables de los scripts type=module de cada juego no son globales. */
   localStorage.setItem("gg_manual_game_payment_pending",orderId);
   localStorage.setItem("gg_manual_game_payment_method",select.value);
   location.href="./comprobante-pago-juego.html?pedido="+encodeURIComponent(orderId);
  }catch(error){console.error("Pago manual:",error);mostrarEstado(error.message||"No se pudo enviar el comprobante.","error");alert(error.message||"No se pudo enviar el comprobante.");}
  finally{if(typeof procesando!=="undefined") procesando=false; if(typeof procesandoPedido!=="undefined") procesandoPedido=false; if(typeof actualizarBoton==="function") actualizarBoton();}
 },true);
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",iniciar); else iniciar();
})();