// ═══════════════════════════════════════
// NAVEGACIÓN — UNA SOLA FUNCIÓN
// ═══════════════════════════════════════
function navTo(name){
  // Operador restrictions
  const restricted=['global','dashboard','resumen','utilidades','gestor','ayudaSocial','contratista','ai','config'];
  if(_currentRole==='operador'&&restricted.includes(name)){name='obras';}
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.querySelectorAll('.bn-item').forEach(b=>b.classList.remove('active'));
  gs('page-'+name)?.classList.add('active');
  gs('nav-'+name)?.classList.add('active');
  gs('bn-'+name)?.classList.add('active');
  closeSidebar();
  // Render según página
  if(name==='obras') renderObrasGrid();
  else if(name==='dashboard') renderDash();
  else if(name==='gastos') renderGastosPage();
  else if(name==='certificados') renderCerts();
  else if(name==='resumen') renderResumen();
  else if(name==='global') renderGlobal();
  else if(name==='utilidades') renderUtilidades();
  else if(name==='gestor') renderGestor();
  else if(name==='ayudaSocial') renderAyudaSocial();
  else if(name==='contratista') renderContratista();
  else if(name==='config'){ loadBackupList(); }
}
window.navTo=navTo;
// Alias goPage para compatibilidad
window.goPage=navTo;

// ═══════════════════════════════════════
// SIDEBAR MOBILE
// ═══════════════════════════════════════
function toggleSidebar(){
  const sb=gs('sidebar'), ov=gs('sideOverlay');
  const open=sb.classList.toggle('open');
  ov.classList.toggle('open',open);
}
function closeSidebar(){
  gs('sidebar')?.classList.remove('open');
  gs('sideOverlay')?.classList.remove('open');
}
window.toggleSidebar=toggleSidebar;
window.closeSidebar=closeSidebar;

