(() => {
"use strict";
function initManualPayments(){
 const base=document.querySelector(".contenedor");
 if(!base||document.getElementById("manualGamePayments"))return;
 const panel=document.createElement("section");
 panel.id="manualGamePayments";
 panel.style.cssText="margin:26px 0;padding:20px;background:rgba(7,20,38,.95);border:1px solid rgba(0,170,255,.28);border-radius:15px";
 panel.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px"><h2 style="color:#00b7ff;font-size:21px">Pagos manuales de juegos</h2><button id="ggManualRefresh" class="boton-push" type="button">Actualizar</button></div><p style="color:#9eb3ca;margin-bottom:14px;font-size:13px">Revisa el comprobante antes de aprobar. Solo los pagos aprobados pueden enviarse a Next Level.</p><div id="ggManualList"><div class="vacio">Cargando solicitudes…</div></div>';
 const stats=base.querySelector(".estadisticas");
 if(stats)stats.insertAdjacentElement("afterend",panel);else base.prepend(panel);
 panel.querySelector("#ggManualRefresh").addEventListener("click",load);
 load();
 async function load(){
  const list=panel.querySelector("#ggManualList");list.replaceChildren();
  const {data:{user},error:authError}=await supabaseClient.auth.getUser();
  if(authError||!user){list.textContent="Inicia sesión con una cuenta administradora para revisar los pagos.";return;}
  const {data:rows,error}=await supabaseClient.from("manual_game_payments").select("id,game_order_id,user_id,payment_method,payment_amount,payment_currency,proof_path,status,created_at,review_note").order("created_at",{ascending:false}).limit(100);
  if(error){list.textContent="No se pudieron cargar los pagos manuales: "+error.message;return;}
  if(!rows||!rows.length){list.innerHTML='<div class="vacio">Todavía no hay pagos manuales.</div>';return;}
  for(const row of rows){
   const card=document.createElement("article");card.style.cssText="padding:15px;margin:12px 0;border:1px solid rgba(0,170,255,.22);border-radius:12px;background:rgba(0,0,0,.16)";
   const head=document.createElement("div");head.style.cssText="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px";
   const title=document.createElement("strong");title.style.color="#00b7ff";title.textContent=row.payment_method+" · "+Number(row.payment_amount).toLocaleString("es-ES")+" "+row.payment_currency;
   const status=document.createElement("span");status.textContent=String(row.status||"pending").toUpperCase();status.style.cssText="font-weight:bold;color:"+(row.status==="approved"?"#5dffb0":row.status==="rejected"?"#ff7777":"#ffd66b");
   head.append(title,status);card.append(head);
   const detail=document.createElement("p");detail.style.cssText="font-size:13px;line-height:1.7;color:#c5d7ea;overflow-wrap:anywhere";
   detail.textContent="Pedido: "+row.game_order_id+" · Usuario: "+row.user_id+" · Fecha: "+new Date(row.created_at).toLocaleString("es-ES");
   card.append(detail);
   const {data:orderDetails,error:orderDetailsError}=await supabaseClient.from("game_orders").select("player_id,zone_id,price_gvr,product:game_products(game,product_name)").eq("id",row.game_order_id).maybeSingle();
   if(!orderDetailsError&&orderDetails){
    const product=Array.isArray(orderDetails.product)?orderDetails.product[0]:orderDetails.product;
    const gameLine=document.createElement("p");gameLine.style.cssText="font-size:13px;line-height:1.7;color:#d8e9fb;overflow-wrap:anywhere";
    gameLine.textContent="Juego: "+(product?.game||"No disponible")+" · Paquete: "+(product?.product_name||"No disponible")+" · ID jugador: "+(orderDetails.player_id||"—")+(orderDetails.zone_id?" · Zona/servidor: "+orderDetails.zone_id:"")+" · Precio base: "+Number(orderDetails.price_gvr||0).toLocaleString("es-ES")+" GVR";
    card.append(gameLine);
   }
   if(row.proof_path){
    const {data:signed,error:signedError}=await supabaseClient.storage.from("manual-game-proofs").createSignedUrl(row.proof_path,300);
    if(!signedError&&signed?.signedUrl){const a=document.createElement("a");a.href=signed.signedUrl;a.target="_blank";a.rel="noopener noreferrer";a.textContent="Ver comprobante (enlace temporal)";a.style.cssText="display:inline-block;margin:8px 0;color:#00d0ff";card.append(a);}
    else {const msg=document.createElement("p");msg.textContent="No se pudo abrir el comprobante.";msg.style.color="#ffb6b6";card.append(msg);}
   }else{const no=document.createElement("p");no.textContent="Falta comprobante.";no.style.color="#ffd66b";card.append(no);}
   if(row.status==="pending"&&row.proof_path){
    const actions=document.createElement("div");actions.style.cssText="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px";
    for(const [decision,label] of [["approved","Aprobar pago"],["rejected","Rechazar pago"]]){
     const b=document.createElement("button");b.type="button";b.className="boton-push";b.textContent=label;
     if(decision==="rejected"){b.style.background="#772b38";b.style.borderColor="#ff6677";}
     b.addEventListener("click",async()=>{
      if(!confirm(decision==="approved"?"¿Confirmas que verificaste el pago y deseas aprobarlo?":"¿Confirmas que deseas rechazar este pago?"))return;
      const note=prompt("Nota de revisión (opcional):")||null;b.disabled=true;
      const {error:reviewError}=await supabaseClient.rpc("admin_review_manual_game_payment",{p_order_id:row.game_order_id,p_decision:decision,p_review_note:note});
      if(reviewError){alert("No se pudo revisar el pago: "+reviewError.message);b.disabled=false;return;}
      alert(decision==="approved"?"Pago aprobado. El usuario podrá continuar el pedido; el proveedor no se llama automáticamente desde este panel.":"Pago rechazado.");
      load();
     });
     actions.append(b);
    }
    card.append(actions);
   }
   list.append(card);
  }
 }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initManualPayments);else initManualPayments();
})();