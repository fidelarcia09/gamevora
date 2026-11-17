"use strict";

const SUPABASE_URL = "https://gsuhzcavghsiolmipnzi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_VEu9lvcUF1mp0xS0fXHPdA_592bfknx";
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let sales = [];
let customers = [];
let activeFilter = "all";
let activeTab = "home";
let realtimeChannel = null;

const $ = (id) => document.getElementById(id);
const clean = (value) => value == null ? "" : String(value).trim();
const safe = (value) => clean(value).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const statusMap = {pending:"Pendiente",pendiente:"Pendiente",processing:"Procesando",procesando:"Procesando",completed:"Completada",completado:"Completada",approved:"Completada",aprobado:"Completada",failed:"Error",error:"Error",cancelled:"Cancelada",canceled:"Cancelada",cancelado:"Cancelada",refunded:"Reembolsada",reembolsado:"Reembolsada"};
function normalizedStatus(value){return statusMap[clean(value).toLowerCase()] || (clean(value) || "Sin estado");}
function isCompleted(v){return ["completed","completado","approved","aprobado"].includes(clean(v).toLowerCase());}
function isPending(v){return ["pending","pendiente","processing","procesando"].includes(clean(v).toLowerCase());}
function dateOf(value){return value ? new Date(value) : null;}
function shortDate(value){const d=dateOf(value);return d&&!Number.isNaN(d.getTime())?d.toLocaleDateString("es-ES",{day:"2-digit",month:"short"}):"—";}
function money(value,currency){const n=Number(value);return Number.isFinite(n)?n.toLocaleString("es-ES",{maximumFractionDigits:2})+" "+(clean(currency)||""):"—";}
function publicOrderId(v){const id=clean(v.game_order_id)||clean(v.id);return id?"GT-"+id.replaceAll("-","").slice(0,8).toUpperCase():"—";}
function showError(message){$("errorBanner").textContent=message;$("errorBanner").classList.remove("hidden");}
function hideError(){$("errorBanner").classList.add("hidden");}

async function guardAdmin(){
  const {data:{user},error}=await db.auth.getUser();
  if(error)throw new Error("No se pudo validar la sesión: "+error.message);
  if(!user){location.replace("../frontend/index.html");return false;}
  const {data,isError}=await db.rpc("is_support_admin");
  if(isError)throw new Error("No se pudo comprobar el acceso administrativo.");
  if(data!==true){location.replace("../frontend/cuenta.html");return false;}
  return true;
}

async function loadSales(){
  const {data,error}=await db.from("ventas").select("*").order("created_at",{ascending:false}).limit(2000);
  if(error)throw new Error("No se pudieron leer las ventas de Supabase: "+error.message);
  sales=(data||[]).map(v=>({...v,usuario_id:clean(v.usuario_id),nombre_usuario:clean(v.nombre_usuario),correo_usuario:clean(v.correo_usuario)}));
  await loadCustomerContacts();
  renderAll();
}

async function loadCustomerContacts(){
  const ids=[...new Set(sales.map(v=>v.usuario_id).filter(Boolean))];
  const map=new Map();
  for(let i=0;i<ids.length;i+=100){
    const {data,error}=await db.functions.invoke("admin-user-contacts",{body:{user_ids:ids.slice(i,i+100)}});
    if(error){console.warn("No se pudieron cargar algunos datos de contacto:",error);break;}
    for(const u of data?.users||[])if(u?.user_id)map.set(u.user_id,u);
  }
  customers=[...new Map(sales.filter(v=>v.usuario_id).map(v=>[v.usuario_id,{
    id:v.usuario_id,
    name:v.nombre_usuario||clean(map.get(v.usuario_id)?.display_name)||"Usuario",
    email:v.correo_usuario||clean(map.get(v.usuario_id)?.email)||"Correo no disponible"
  }])).values()];
  customers.sort((a,b)=>a.name.localeCompare(b.name,"es"));
}

function monthSales(){const now=new Date();return sales.filter(v=>{const d=dateOf(v.created_at);return d&&d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();});}
function renderStats(){
  $("totalSales").textContent=sales.length.toLocaleString("es-ES");
  $("totalUsers").textContent=customers.length.toLocaleString("es-ES");
  $("monthSales").textContent=monthSales().length.toLocaleString("es-ES");
  $("completedSales").textContent=sales.filter(v=>isCompleted(v.estado)).length.toLocaleString("es-ES");
  const now=new Date(),days=[];
  for(let i=6;i>=0;i--){const d=new Date(now);d.setHours(0,0,0,0);d.setDate(d.getDate()-i);days.push(d);}
  const values=days.map(day=>sales.filter(v=>{const d=dateOf(v.created_at);return d&&d.toDateString()===day.toDateString();}).length);
  $("weekTotal").textContent=values.reduce((a,b)=>a+b,0)+" ventas";
  drawChart(values);
  $("usersCount").textContent=customers.length;
}
function drawChart(values){
  const max=Math.max(1,...values),points=values.map((v,i)=>({x:8+i*52.3,y:100-(v/max)*76}));
  const line=points.map((p,i)=>(i?"L":"M")+p.x.toFixed(1)+" "+p.y.toFixed(1)).join(" ");
  $("chartLine").setAttribute("d",line);
  $("chartArea").setAttribute("d",line+" L"+points[6].x+" 112 L"+points[0].x+" 112 Z");
  $("chartDots").innerHTML=points.map(p=>'<circle class="chart-dot" cx="'+p.x+'" cy="'+p.y+'" r="3.2"/>').join("");
  $("chartLabels").innerHTML=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));return "<span>"+d.toLocaleDateString("es-ES",{weekday:"short"}).replace(".","")+"</span>";}).join("");
}
function recordMarkup(v){
  const completed=isCompleted(v.estado),pending=isPending(v.estado),statusClass=completed?"completed":pending?"":"failed";
  const title=v.producto||v.juego||(v.tipo==="gvr"?"Compra de GVR":"Venta");
  const subtitle=[v.juego,v.nombre_usuario,publicOrderId(v)].filter(Boolean).join(" · ");
  return '<article class="record-card"><div class="record-icon"><svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM8 9h8M8 13h5"/></svg></div><div class="record-main"><div class="record-title">'+safe(title)+'</div><div class="record-sub">'+safe(subtitle)+'</div></div><div class="record-side"><div class="record-amount">'+safe(money(v.precio,v.moneda))+'</div><span class="status '+statusClass+'">'+safe(normalizedStatus(v.estado))+'</span><div class="record-date">'+safe(shortDate(v.created_at))+'</div></div></article>';
}
function renderSales(){
  let rows=[...sales];
  if(activeFilter==="completed")rows=rows.filter(v=>isCompleted(v.estado));
  if(activeFilter==="pending")rows=rows.filter(v=>isPending(v.estado));
  $("salesList").innerHTML=rows.length?rows.slice(0,activeTab==="sales"?200:6).map(recordMarkup).join(""):'<div class="empty-state">Todavía no hay ventas para mostrar.</div>';
}
function renderUsers(query=""){
  const q=query.trim().toLowerCase();
  const rows=customers.filter(u=>(u.name+" "+u.email+" "+u.id).toLowerCase().includes(q));
  $("usersList").innerHTML=rows.length?rows.map(u=>{
    const count=sales.filter(v=>v.usuario_id===u.id).length;
    return '<button class="record-card user-card" data-user="'+safe(u.id)+'" type="button"><div class="record-icon"><svg viewBox="0 0 24 24"><path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/></svg></div><div class="record-main"><div class="record-title">'+safe(u.name)+'</div><div class="record-sub">'+safe(u.email)+'</div></div><div class="record-side"><div class="record-amount">'+count+'</div><div class="record-date">ventas</div></div></button>';
  }).join(""):'<div class="empty-state">No se encontraron usuarios.</div>';
}
function renderAll(){renderStats();renderSales();renderUsers($("userSearch").value);}
function openUser(id){
  const u=customers.find(x=>x.id===id);if(!u)return;
  $("detailAvatar").textContent=(u.name||"U").trim().charAt(0).toUpperCase();
  $("detailName").textContent=u.name;$("detailEmail").textContent=u.email;$("detailId").textContent=u.id;
  const rows=sales.filter(v=>v.usuario_id===id);
  $("detailSalesCount").textContent=rows.length;
  $("userSalesList").innerHTML=rows.length?rows.map(recordMarkup).join(""):'<div class="empty-state">Este usuario todavía no tiene ventas.</div>';
  $("usersSection").classList.add("hidden");$("detailSection").classList.remove("hidden");
}
function setTab(tab){
  activeTab=tab;$("detailSection").classList.add("hidden");
  $("salesSection").classList.toggle("hidden",tab!=="sales"&&tab!=="home");
  $("usersSection").classList.toggle("hidden",tab!=="users");
  $("salesSection").classList.toggle("hidden",tab==="users");
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
  if(tab==="home"){$("salesSection").classList.remove("hidden");}
  if(tab==="sales"){activeFilter="all";document.querySelectorAll(".filter-chip").forEach(b=>b.classList.toggle("active",b.dataset.filter==="all"));renderSales();}
}
function subscribeRealtime(){
  if(realtimeChannel)db.removeChannel(realtimeChannel);
  realtimeChannel=db.channel("control-ggt-sales").on("postgres_changes",{event:"*",schema:"public",table:"ventas"},()=>loadSales().catch(e=>showError(e.message))).subscribe();
}

document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>setTab(b.dataset.tab)));
document.querySelectorAll(".filter-chip").forEach(b=>b.addEventListener("click",()=>{activeFilter=b.dataset.filter;document.querySelectorAll(".filter-chip").forEach(x=>x.classList.toggle("active",x===b));renderSales();}));
$("salesFilters").addEventListener("click",()=>{});
$("refreshButton").addEventListener("click",()=>loadSales().catch(e=>showError(e.message)));
$("userSearch").addEventListener("input",e=>renderUsers(e.target.value));
$("usersList").addEventListener("click",e=>{const b=e.target.closest("[data-user]");if(b)openUser(b.dataset.user);});
$("backToUsers").addEventListener("click",()=>{$("detailSection").classList.add("hidden");$("usersSection").classList.remove("hidden");});
document.querySelectorAll('[data-view="sales"]').forEach(b=>b.addEventListener("click",()=>setTab("sales")));

(async function start(){
  try{
    const allowed=await guardAdmin();if(!allowed)return;
    hideError();await loadSales();subscribeRealtime();
  }catch(error){showError(error.message||String(error));$("salesList").innerHTML='<div class="empty-state">No se pudo cargar el panel.</div>';}
})();