/* Controla el cierre de la entrada de Gamers Gold en la sesión actual. */
(function(){
  "use strict";
  const loader=document.getElementById("gg-session-loader");
  if(!loader)return;
  if(!document.documentElement.classList.contains("gg-session-play")){
    loader.hidden=true;
    return;
  }
  window.setTimeout(function(){
    loader.classList.add("gg-session-out");
    window.setTimeout(function(){loader.remove();},600);
  },3000);
})();
