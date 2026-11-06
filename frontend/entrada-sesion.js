/* Muestra la identidad de Gamers Gold una sola vez por sesión de pestaña. */
(function(){
  "use strict";
  const loader=document.getElementById("gg-session-loader");
  if(!loader)return;
  const KEY="gamersGoldPantallasVisto";
  try{
    if(sessionStorage.getItem(KEY)==="true"){
      loader.hidden=true;
      return;
    }
    sessionStorage.setItem(KEY,"true");
  }catch(error){
    console.warn("No se pudo consultar sessionStorage para la animación de entrada.",error);
  }
  window.setTimeout(function(){
    loader.classList.add("gg-session-out");
    window.setTimeout(function(){
      loader.remove();
    },600);
  },3000);
})();
