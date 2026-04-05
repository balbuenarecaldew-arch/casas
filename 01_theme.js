// ═══════════════════════════════════════
// THEME SWITCHER
// ═══════════════════════════════════════
window.switchTheme=function(css){
  const oldLink=document.getElementById('themeCSS');
  if(!oldLink) return;
  // Create new link and load it BEFORE removing old one
  const newLink=document.createElement('link');
  newLink.rel='stylesheet'; newLink.href=css; newLink.id='themeCSS_new';
  newLink.onload=function(){
    // New CSS loaded successfully — swap
    oldLink.remove();
    newLink.id='themeCSS';
    localStorage.setItem('th_theme',css);
  };
  newLink.onerror=function(){
    // Failed — remove the broken link, keep old
    newLink.remove();
    const sel=document.getElementById('themeSelect');
    if(sel) sel.value=oldLink.href.split('/').pop();
    toast('No se pudo cargar "'+css+'" — verificá que el archivo existe en tu repo','err');
  };
  document.head.appendChild(newLink);
};
(function loadSavedTheme(){
  const saved=localStorage.getItem('th_theme');
  if(!saved) return;
  const link=document.getElementById('themeCSS');
  if(!link) return;
  const current=link.href.split('/').pop();
  if(current===saved) return;
  // Safe load: add new link, only swap on success
  const newLink=document.createElement('link');
  newLink.rel='stylesheet'; newLink.href=saved; newLink.id='themeCSS_init';
  newLink.onload=function(){
    link.remove();
    newLink.id='themeCSS';
  };
  newLink.onerror=function(){
    // Saved theme can't load — clear preference, keep default
    newLink.remove();
    localStorage.removeItem('th_theme');
  };
  document.head.appendChild(newLink);
  document.addEventListener('DOMContentLoaded',()=>{
    const sel=document.getElementById('themeSelect');
    if(sel) sel.value=document.getElementById('themeCSS')?.href?.split('/').pop()||'oscuro.css';
  });
})();

