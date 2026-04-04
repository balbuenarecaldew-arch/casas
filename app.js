// ═══════════════════════════════════════
// AUTH & ROLES
// ═══════════════════════════════════════
let _currentUser=null, _currentRole='socio';

async function hashPass(p){
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(p+'_thalamus2024'));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function getUsers(){try{return JSON.parse(localStorage.getItem('th_users'))||{};}catch{return {};}}
function saveUsersDB(u){localStorage.setItem('th_users',JSON.stringify(u));}

// Seed default users if none exist
(async function seedUsers(){
  const u=getUsers();
  if(Object.keys(u).length===0){
    u['fernando']={hash:await hashPass('fernando'),role:'socio',pass:'fernando'};
    u['wuilian']={hash:await hashPass('wuilian'),role:'socio',pass:'wuilian'};
    saveUsersDB(u);
  }
})();

window.doLogin=async function(){
  const el=id=>document.getElementById(id);
  const user=el('login-user').value.trim().toLowerCase();
  const pass=el('login-pass').value;
  if(!user||!pass){el('login-err').textContent='Completá usuario y contraseña';return}
  const users=getUsers();
  if(!users[user]){el('login-err').textContent='Usuario no encontrado';return}
  if(users[user].hash!==await hashPass(pass)){el('login-err').textContent='Contraseña incorrecta';return}
  _currentUser=user; _currentRole=users[user].role||'socio';
  sessionStorage.setItem('th_session',JSON.stringify({user,role:_currentRole}));
  el('loginOverlay').classList.add('hidden');
  applyRole();
  window.initApp&&window.initApp();
};

window.doLogout=function(){
  _currentUser=null; _currentRole='socio';
  sessionStorage.removeItem('th_session');
  location.reload();
};

function applyRole(){
  const el=id=>document.getElementById(id);
  // Update topbar
  el('topAvatar').textContent=_currentUser?_currentUser.charAt(0).toUpperCase():'?';
  el('topUser').textContent=_currentUser||'';

  // Show/hide elements based on role
  const isOp=_currentRole==='operador';
  document.querySelectorAll('.socio-only').forEach(e=>{
    if(isOp) e.classList.add('role-restricted');
    else e.classList.remove('role-restricted');
  });

  // For "Nueva obra" button: operador can't create new obras
  const newBtn=document.querySelector('.btn-new');
  if(newBtn){if(isOp)newBtn.classList.add('role-restricted');else newBtn.classList.remove('role-restricted');}

  // User admin panel
  renderUserList();
}

function renderUserList(){
  const list=document.getElementById('userList');
  if(!list)return;
  const users=getUsers();
  let h='';
  for(const[name,data]of Object.entries(users)){
    const self=name===_currentUser;
    const pw=data.pass||'••••';
    h+='<div class="user-row">';
    h+='<span class="u-name">'+(self?'<b>'+name+'</b> (vos)':name)+'</span>';
    h+='<span style="font-size:.64rem;color:var(--muted);font-family:\'JetBrains Mono\',monospace;cursor:pointer" title="Click para ver/ocultar" onclick="this.textContent=this.textContent===\'••••\'?\''+pw+'\':\'••••\'">'+'••••'+'</span>';
    h+='<span class="u-role '+(data.role||'socio')+'">'+(data.role==='operador'?'Operador':'Socio')+'</span>';
    if(!self)h+=' <button class="btn-logout" style="margin-left:6px" onclick="adminDelUser(\''+name+'\')">✕</button>';
    if(!self)h+=' <button class="btn-logout" style="margin-left:4px;border-color:var(--gold);color:var(--gold)" onclick="adminResetPass(\''+name+'\')">🔑</button>';
    h+='</div>';
  }
  list.innerHTML=h;
  renderLoginHistory();
}

window.adminAddUser=async function(){
  const name=document.getElementById('adm-user').value.trim().toLowerCase();
  const pass=document.getElementById('adm-pass').value;
  const role=document.getElementById('adm-role').value;
  if(!name||!pass){toast('Completá usuario y contraseña','err');return}
  if(name.length<2){toast('Usuario: mínimo 2 caracteres','err');return}
  if(pass.length<4){toast('Contraseña: mínimo 4 caracteres','err');return}
  const users=getUsers();
  if(users[name]){toast('Ese usuario ya existe','err');return}
  users[name]={hash:await hashPass(pass),role,pass};
  saveUsersDB(users);
  document.getElementById('adm-user').value='';document.getElementById('adm-pass').value='';
  renderUserList();
  toast('Usuario "'+name+'" creado como '+role+' ✓','ok');
};

window.adminDelUser=function(name){
  requireAuth('⚠️ Eliminar usuario "'+name+'".',()=>{
    const users=getUsers();delete users[name];saveUsersDB(users);
    renderUserList();toast('Usuario eliminado','ok');
  });
};

window.adminResetPass=async function(name){
  const np=prompt('Nueva contraseña para "'+name+'" (mínimo 4):');
  if(!np||np.length<4){toast('Contraseña muy corta','err');return}
  const users=getUsers();users[name].hash=await hashPass(np);users[name].pass=np;saveUsersDB(users);
  toast('Contraseña de "'+name+'" actualizada ✓','ok');
};

// Auto-login from session
(function trySession(){
  try{
    const s=JSON.parse(sessionStorage.getItem('th_session'));
    if(s&&s.user){
      const users=getUsers();
      if(users[s.user]){
        _currentUser=s.user;_currentRole=users[s.user].role||'socio';
        document.addEventListener('DOMContentLoaded',()=>{
          document.getElementById('loginOverlay').classList.add('hidden');
          applyRole();
        });
        return;
      }
    }
  }catch{}
})();

// Enter key on login
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'){
    const a=document.activeElement;
    if(a&&(a.id==='login-user'||a.id==='login-pass'))doLogin();
  }
});

// ── Login tracking ──
async function trackLogin(user){
  try{
    const log=await fbGetDoc('logins/history')||{};
    if(!log[user])log[user]=[];
    log[user].unshift({time:Date.now(),date:new Date().toLocaleString('es-PY')});
    if(log[user].length>10)log[user]=log[user].slice(0,10);
    await fbSet('logins/history',log);
  }catch(e){
    // Fallback localStorage
    const log=JSON.parse(localStorage.getItem('th_logins')||'{}');
    if(!log[user])log[user]=[];
    log[user].unshift({time:Date.now(),date:new Date().toLocaleString('es-PY')});
    if(log[user].length>10)log[user]=log[user].slice(0,10);
    localStorage.setItem('th_logins',JSON.stringify(log));
  }
}
async function getLogins(){
  try{
    const log=await fbGetDoc('logins/history');
    if(log)return log;
  }catch(e){}
  try{return JSON.parse(localStorage.getItem('th_logins')||'{}');}catch{return{};}
}
async function renderLoginHistory(){
  const el=document.getElementById('loginHistory');
  if(!el)return;
  const log=await getLogins();
  const users=getUsers();
  let h='';
  for(const[name]of Object.entries(users)){
    const entries=log[name]||[];
    const last=entries[0];
    const isSelf=name===_currentUser;
    const dot=last?'🟢':'⚪';
    const ago=last?timeAgo(last.time):'Nunca se conectó';
    h+='<div class="user-row">';
    h+='<span style="font-size:.9rem;margin-right:2px">'+dot+'</span>';
    h+='<span class="u-name" style="flex:1">'+(isSelf?'<b>'+name+'</b> (vos)':name)+'</span>';
    h+='<span style="font-size:.66rem;color:var(--dim)">'+ago+'</span>';
    if(last)h+='<span style="font-size:.58rem;color:var(--muted);margin-left:6px">'+last.date+'</span>';
    h+='</div>';
  }
  el.innerHTML=h;
}
function timeAgo(ts){
  const diff=Date.now()-ts;
  const mins=Math.floor(diff/60000);
  if(mins<1)return'Ahora mismo';
  if(mins<60)return'Hace '+mins+' min';
  const hrs=Math.floor(mins/60);
  if(hrs<24)return'Hace '+hrs+'h';
  const days=Math.floor(hrs/24);
  if(days===1)return'Ayer';
  return'Hace '+days+' días';
}

// ═══════════════════════════════════════
// STATE
// ═══════════════════════════════════════
let obras={}, gastos={}, certificados={}, retiros={fernando:[],wuilian:[]}, gestorPagos=[], ayudaSocialPagos=[], contratistaPagos=[];
let cfg={ayuda:10,heri:1,socios:50};
let cur=null, qrows=[], pendAI=[], _importing=false;

// ═══════════════════════════════════════
// UTILS
// ═══════════════════════════════════════
const gs=id=>document.getElementById(id);
const v=id=>gs(id)?.value?.trim()||'';
function fGs(x){if(!x||isNaN(x))x=0;return '₲ '+Math.round(x).toLocaleString('es-PY')}
function fPct(x){return (x*100).toFixed(1)+'%'}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2)}
function today(){return new Date().toISOString().split('T')[0]}

function toast(msg,type='ok'){
  const t=gs('toast');t.textContent=msg;t.className='toast show '+type;
  clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),3200);
}
function openM(id){gs(id).classList.add('open')}
function closeM(id){gs(id).classList.remove('open')}
window.closeM=closeM;
function doConfirm(title,msg,cb){
  gs('mCTitle').textContent=title;gs('mCMsg').textContent=msg;
  gs('mCOk').onclick=()=>{closeM('mConfirm');cb()};
  openM('mConfirm');
}
function requireAuth(msg,cb){
  const pw=prompt(msg+'\n\nIngresá la contraseña para continuar:');
  if(!pw){if(pw!==null) toast('Cancelado','err');return}
  if(pw.trim().toUpperCase()!=='THALAMUS'){toast('Contraseña incorrecta','err');return}
  cb();
}

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

// ═══════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════
async function fbSet(path,data){
  if(window._fbOk&&window._db){
    try{
      const p=path.split('/');
      await window._FBM.setDoc(window._FBM.doc(window._db,...p),data);
      return;
    }catch(e){console.warn('fbSet error:',e)}
  }
  localStorage.setItem('oc/'+path,JSON.stringify(data));
}
async function fbDel(path){
  if(window._fbOk&&window._db){
    try{const p=path.split('/');await window._FBM.deleteDoc(window._FBM.doc(window._db,...p));return;}catch(e){}
  }
  localStorage.removeItem('oc/'+path);
}
async function fbGetAll(col){
  if(window._fbOk&&window._db){
    try{
      const snap=await window._FBM.getDocs(window._FBM.collection(window._db,...col.split('/')));
      const res={}; snap.forEach(d=>{res[d.id]=d.data()}); return res;
    }catch(e){console.warn('fbGetAll error:',e)}
  }
  const res={},prefix='oc/'+col+'/';
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(k.startsWith(prefix)){try{res[k.slice(prefix.length)]=JSON.parse(localStorage.getItem(k));}catch{}}
  }
  return res;
}
async function fbGetDoc(path){
  if(window._fbOk&&window._db){
    try{
      const p=path.split('/');
      const snap=await window._FBM.getDoc(window._FBM.doc(window._db,...p));
      return snap.exists()?snap.data():null;
    }catch(e){}
  }
  try{return JSON.parse(localStorage.getItem('oc/'+path));}catch{return null}
}

// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════
// ── Cache helpers ──
function saveCache(){
  try{localStorage.setItem('th_cache',JSON.stringify({obras,gastos,certificados,retiros,gestorPagos,ayudaSocialPagos,contratistaPagos,cfg,_ts:Date.now()}));}catch(e){}
}
function loadCache(){
  try{return JSON.parse(localStorage.getItem('th_cache'));}catch{return null;}
}

window.initApp = async function(){
  if(!_currentUser){return;}
  const p=localStorage.getItem('ocCfg');
  if(p) try{cfg=JSON.parse(p);}catch{}
  gs('p-ay').value=cfg.ayuda; gs('p-he').value=cfg.heri; gs('p-so').value=cfg.socios;

  // ── PASO 1: Cargar del caché INSTANTÁNEO ──
  const cache=loadCache();
  let fromCache=false;
  if(cache&&cache.obras&&Object.keys(cache.obras).length){
    obras=cache.obras; gastos=cache.gastos||{}; certificados=cache.certificados||{}; retiros=cache.retiros||{fernando:[],wuilian:[]}; gestorPagos=cache.gestorPagos||[]; ayudaSocialPagos=cache.ayudaSocialPagos||[]; contratistaPagos=cache.contratistaPagos||[];
    if(cache.cfg) cfg=cache.cfg;
    fromCache=true;
    // Renderizar inmediatamente con datos del caché
    populateSel(); navTo('obras');
    applyRole(); renderUserList();
    if(_currentUser==='fernando') toast('BIENVENIDO MI QUERIDO BRO 🤜🤛','ok');
    else toast('Bienvenido, '+_currentUser+' ✓','ok');
  }

  // ── PASO 2: Sincronizar con Firebase en background ──
  try{
    const raw=await fbGetAll('obras');
    const newObras={};
    for(const [id,d] of Object.entries(raw||{})){
      newObras[id]={...d,id};
      if(!newObras[id].lastModified) newObras[id].lastModified=Date.now()-(Object.keys(raw).length*1000);
    }
    const ids=Object.keys(newObras);
    const [gastosArr, certsArr, rd, gp, asp, ctp] = await Promise.all([
      Promise.all(ids.map(id=>fbGetAll('obras/'+id+'/gastos').then(gr=>({id,data:gr})))),
      Promise.all(ids.map(id=>fbGetAll('obras/'+id+'/certificados').then(cr=>({id,data:cr})))),
      fbGetDoc('retiros/socios'),
      fbGetDoc('gestor/pagos'),
      fbGetDoc('ayudaSocial/pagos'),
      fbGetDoc('contratista/pagos')
    ]);
    obras=newObras;
    gastos={}; certificados={};
    gastosArr.forEach(({id,data})=>{
      gastos[id]=Object.entries(data||{}).map(([gid,gd])=>({...gd,id:gd.id||gid}));
    });
    certsArr.forEach(({id,data})=>{
      certificados[id]=Object.entries(data||{}).map(([cid,cd])=>({...cd,id:cd.id||cid}));
    });
    if(rd) retiros={fernando:rd.fernando||[],wuilian:rd.wuilian||[]};
    if(gp) gestorPagos=gp.lista||[];
    if(asp) ayudaSocialPagos=asp.lista||[];
    if(ctp) contratistaPagos=ctp.lista||[];

    // Guardar en caché para la próxima vez
    saveCache();

    // Re-renderizar con datos frescos (solo si cambió algo o no teníamos caché)
    populateSel();
    const activePage=document.querySelector('.page.active');
    if(activePage){
      const name=activePage.id.replace('page-','');
      navTo(name);
    }
    applyRole(); renderUserList();

    if(!fromCache){
      if(_currentUser==='fernando') toast('BIENVENIDO MI QUERIDO BRO 🤜🤛','ok');
      else toast('Bienvenido, '+_currentUser+' ✓','ok');
    }
  }catch(e){
    console.warn('Firebase sync error:',e);
    if(!fromCache) toast('Error cargando datos de Firebase','err');
    else toast('Usando datos del caché (Firebase no responde)','info');
  }

  // Track login y backup en background
  trackLogin(_currentUser);
  autoBackup();
};

window.saveAndConnect=async function(){
  const c={apiKey:v('cfg-ak'),authDomain:v('cfg-ad'),projectId:v('cfg-pid'),
    storageBucket:v('cfg-bk'),messagingSenderId:v('cfg-ms'),appId:v('cfg-ai2')};
  if(!c.apiKey){toast('Ingresá API Key','err');return}
  localStorage.setItem('fbCfg',JSON.stringify(c));
  const ok=await window.connectFB(c);
  if(ok){await window.initApp();toast('Firebase reconectado ✓','ok');}
  else toast('No se pudo conectar','err');
};

// ═══════════════════════════════════════
// FÓRMULAS (exactas a la planilla)
// ═══════════════════════════════════════
function obraAy(id){const o=obras[id];return o?.ayuda!=null?parseFloat(o.ayuda):cfg.ayuda}
function obraHe(id){const o=obras[id];return o?.heri!=null?parseFloat(o.heri):cfg.heri}
// obraGes = alias de obraHe: HERI es el gestor
function obraGes(id){return obraHe(id)}
function calcCon(id){const o=obras[id]||{};return(parseFloat(o.contrato)||0)+(parseFloat(o.adenda)||0)}
function costoG(g){return(parseFloat(g.monto)||0)+(parseFloat(g.saldoTotal)||0)+(parseFloat(g.saldoCheque)||0)}
function calcAy(id){return calcCon(id)*(obraAy(id)/100)}
function calcHe(id){return calcCon(id)*(obraHe(id)/100)}
function gestorPagosForObra(id){return gestorPagos.filter(p=>p.obraId===id)}
function gestorTotalForObra(id){return gestorPagosForObra(id).reduce((s,p)=>s+(parseFloat(p.monto)||0),0)}
function ayudaSocialPagosForObra(id){return ayudaSocialPagos.filter(p=>p.obraId===id)}
function ayudaSocialTotalForObra(id){return ayudaSocialPagosForObra(id).reduce((s,p)=>s+(parseFloat(p.monto)||0),0)}
function contratistaPagosForObra(id){return contratistaPagos.filter(p=>p.obraId===id)}
function contratistaTotalForObra(id){return contratistaPagosForObra(id).reduce((s,p)=>s+(parseFloat(p.monto)||0),0)}
function calcContratistaAdeudadoObra(id){const o=obras[id];const m=parseFloat(o?.contratistaMonto);return isNaN(m)?0:m;}
function calcTE(id){return(gastos[id]||[]).reduce((s,g)=>s+(parseFloat(g.monto)||0),0)+ayudaSocialTotalForObra(id)+gestorTotalForObra(id)+contratistaTotalForObra(id)}
function calcTK(id){return(gastos[id]||[]).reduce((s,g)=>s+costoG(g),0)+ayudaSocialTotalForObra(id)+gestorTotalForObra(id)+contratistaTotalForObra(id)}
function calcCertsT(id){
  const cs=certificados[id]||[];
  return{
    br:cs.reduce((s,c)=>s+(parseFloat(c.bruto)||0),0),
    ne:cs.reduce((s,c)=>s+(parseFloat(c.neto)||0),0),
    re:cs.reduce((s,c)=>s+((parseFloat(c.bruto)||0)-(parseFloat(c.neto)||0)),0)
  };
}
function calcRes(id){
  const con=calcCon(id),tg=calcTE(id),tk=calcTK(id);
  const{br,ne,re}=calcCertsT(id);
  const gan=ne-tg,pct=br>0?gan/br:0;
  // Cada socio recibe el 50% (cfg.socios) de la ganancia neta
  const corrCadaUno=gan*(cfg.socios/100);
  return{con,tg,tk,br,ne,re,gan,corrCadaUno,pct,scob:con-br,spag:tk};
}
async function touchObra(){if(cur&&obras[cur]){obras[cur].lastModified=Date.now();await fbSet('obras/'+cur,obras[cur]);}saveCache();}

// ═══════════════════════════════════════
// OBRAS
// ═══════════════════════════════════════
function populateSel(){
  const sel=gs('obraSelect');
  sel.innerHTML='<option value="">— Seleccioná una obra —</option>';
  Object.values(obras).sort((a,b)=>(parseInt(b.num)||0)-(parseInt(a.num)||0)).forEach(o=>{
    const opt=document.createElement('option');
    opt.value=o.id; opt.textContent=(o.num?'Nº'+o.num+' – ':'')+o.nombre;
    sel.appendChild(opt);
  });
  if(cur) sel.value=cur;
}
function renderObrasGrid(){
  const g=gs('obrasGrid');
  const list=Object.values(obras);
  const isOp=_currentRole==='operador';
  if(!list.length){g.innerHTML='<div style="color:var(--muted);font-size:.8rem;padding:.5rem">Sin obras. Presioná <b>+ Nueva obra</b>.</div>';return}
  // Restore saved sort preference
  const savedSort=localStorage.getItem('th_obraSort');
  const sortSel=gs('obraSort');
  if(savedSort&&sortSel&&sortSel.value!==savedSort) sortSel.value=savedSort;
  const sort=sortSel?.value||savedSort||'num-desc';
  const [key,dir]=sort.split('-');
  const asc=dir==='asc'?1:-1;
  if(key==='num') list.sort((a,b)=>asc*((parseInt(a.num)||999)-(parseInt(b.num)||999)));
  else if(key==='fecha') list.sort((a,b)=>asc*((a.lastModified||0)-(b.lastModified||0)));
  else list.sort((a,b)=>asc*(a.nombre||'').localeCompare(b.nombre||''));
  g.innerHTML=list.map(o=>{
    const r=calcRes(o.id);
    return`<div class="obra-card ${o.id===cur?'act':''}" onclick="selectObra('${o.id}')">
      <div class="oc-num">${o.num?'Nº'+o.num+' ·':''} ${o.estado||'EN EJECUCIÓN'}${o.estado==='FINALIZADA'?' 🔒':''}</div>
      <div class="oc-nombre">${o.nombre||'Sin nombre'}</div>
      <div class="oc-stats">
        ${isOp?'':`<span class="oc-stat">Contrato: ${fGs(calcCon(o.id))}</span>`}
        <span class="oc-stat">Gastos: ${fGs(r.tg)}</span>
        ${isOp?'':`<span class="oc-stat">Cobrado: ${fGs(r.br)}</span>`}
      </div>
      <div style="margin-top:.46rem;display:flex;gap:.3rem">
        ${isOp?'':`<button class="btn btn-ghost btn-xs" onclick="event.stopPropagation();editObra('${o.id}')">✏️ Editar</button>`}
        ${isOp?'':`<button class="btn btn-danger btn-xs" onclick="event.stopPropagation();delObra('${o.id}')">🗑️</button>`}
        <button class="btn btn-secondary btn-xs" onclick="event.stopPropagation();selectObra('${o.id}')">Abrir →</button>
      </div>
    </div>`;
  }).join('');
}
function selectObra(id){
  cur=id; gs('obraSelect').value=id; renderObrasGrid();
  toast('Obra: '+(obras[id]?.nombre||id),'info');
  navTo(_currentRole==='operador'?'gastos':'dashboard');
}
window.selectObra=selectObra;

window.switchObra=function(id){
  if(!id)return;
  cur=id; gs('obraSelect').value=id; renderObrasGrid();
  toast('Obra: '+(obras[id]?.nombre||id),'info');
  // Refrescar página activa
  const active=document.querySelector('.page.active');
  if(active){
    const name=active.id.replace('page-','');
    if(['dashboard','gastos','certificados','resumen'].includes(name)) navTo(name);
  }
};

window.goNextObra=function(){
  const sorted=Object.values(obras).sort((a,b)=>(parseInt(a.num)||0)-(parseInt(b.num)||0));
  if(!sorted.length)return;
  if(!cur){switchObra(sorted[0].id);return}
  const idx=sorted.findIndex(o=>o.id===cur);
  const next=sorted[(idx+1)%sorted.length];
  cur=next.id; gs('obraSelect').value=next.id;
  const active=document.querySelector('.page.active');
  if(active) navTo(active.id.replace('page-',''));
  toast('→ '+(next.num?'Nº'+next.num+' – ':'')+next.nombre,'info');
};

window.openNuevaObra=function(){
  gs('mObraTitle').textContent='Nueva Obra'; gs('o-eid').value='';
  const nums=Object.values(obras).map(o=>parseInt(o.num)||0).filter(n=>n>0);
  gs('o-num').value=nums.length?Math.max(...nums)+1:1;
  gs('o-nom').value=''; gs('o-fi').value=today();
  gs('o-mc').value=''; gs('o-ad').value='0'; gs('o-es').value='EN EJECUCIÓN';
  gs('o-ay').value=cfg.ayuda; gs('o-he').value=cfg.heri;
  openM('mObra');
};
window.editObra=function(id){
  const o=obras[id]; if(!o)return;
  if(o.estado==='FINALIZADA'){
    return requireAuth('🔒 La obra "'+o.nombre+'" está FINALIZADA.\nPara editarla necesitás la contraseña.',()=>{
      _openEditObra(id);
    });
  }
  _openEditObra(id);
};
function _openEditObra(id){
  const o=obras[id]; if(!o)return;
  gs('mObraTitle').textContent='Editar Obra'; gs('o-eid').value=id;
  gs('o-num').value=o.num||''; gs('o-nom').value=o.nombre||'';
  gs('o-fi').value=o.fecha||''; gs('o-mc').value=o.contrato||0;
  gs('o-ad').value=o.adenda||0; gs('o-es').value=o.estado||'EN EJECUCIÓN';
  gs('o-ay').value=o.ayuda!=null?o.ayuda:cfg.ayuda;
  gs('o-he').value=o.heri!=null?o.heri:cfg.heri;
  openM('mObra');
};
window.saveObra=async function(){
  const nom=v('o-nom'); if(!nom){toast('Ingresá el nombre','err');return}
  const eid=v('o-eid'); const id=eid||uid();
  const o={id,nombre:nom,num:v('o-num'),fecha:v('o-fi'),
    contrato:parseFloat(gs('o-mc').value)||0,
    adenda:parseFloat(gs('o-ad').value)||0,
    estado:v('o-es'),
    ayuda:parseFloat(gs('o-ay').value),
    heri:parseFloat(gs('o-he').value),
    lastModified:Date.now()
  };
  obras[id]=o;
  if(!gastos[id])gastos[id]=[];
  if(!certificados[id])certificados[id]=[];
  await fbSet('obras/'+id,o);
  closeM('mObra'); populateSel(); renderObrasGrid(); saveCache();
  // Actualizar módulos si están activos
  if(gs('page-gestor')?.classList.contains('active')) renderGestor();
  if(gs('page-ayudaSocial')?.classList.contains('active')) renderAyudaSocial();
  if(gs('page-contratista')?.classList.contains('active')) renderContratista();
  if(!eid)selectObra(id);
  toast('Obra guardada','ok');
};
window.delObra=function(id){
  const o=obras[id]; if(!o)return;
  requireAuth('⚠️ Eliminar obra "'+o.nombre+'".\nSe borrarán todos sus datos.',async()=>{
    for(const g of(gastos[id]||[]))await fbDel('obras/'+id+'/gastos/'+g.id);
    for(const c of(certificados[id]||[]))await fbDel('obras/'+id+'/certificados/'+c.id);
    await fbDel('obras/'+id);
    delete obras[id]; delete gastos[id]; delete certificados[id];
    // Desasignar pagos del gestor y ayuda social que estaban en esta obra
    let gestorChanged=false, ayudaChanged=false, contratistaChanged=false;
    gestorPagos.forEach(p=>{if(p.obraId===id){p.obraId='';gestorChanged=true;}});
    if(gestorChanged) fbSet('gestor/pagos',{lista:gestorPagos});
    ayudaSocialPagos.forEach(p=>{if(p.obraId===id){p.obraId='';ayudaChanged=true;}});
    if(ayudaChanged) fbSet('ayudaSocial/pagos',{lista:ayudaSocialPagos});
    contratistaPagos.forEach(p=>{if(p.obraId===id){p.obraId='';contratistaChanged=true;}});
    if(contratistaChanged) fbSet('contratista/pagos',{lista:contratistaPagos});
    if(cur===id)cur=null; populateSel(); renderObrasGrid(); saveCache();
    // Actualizar módulos si están activos
    if(gs('page-gestor')?.classList.contains('active')) renderGestor();
    if(gs('page-ayudaSocial')?.classList.contains('active')) renderAyudaSocial();
    if(gs('page-contratista')?.classList.contains('active')) renderContratista();
    toast('Obra eliminada','info');
  });
};

// ═══════════════════════════════════════
// DASHBOARD OBRA
// ═══════════════════════════════════════
function renderDash(){
  if(!cur||!obras[cur]){
    gs('dsh-title').textContent='Dashboard';
    gs('dsh-sub').textContent='← Seleccioná una obra primero';
    gs('dsh-strip').style.display='none'; return;
  }
  const o=obras[cur],r=calcRes(cur);
  gs('dsh-title').textContent='Dashboard — '+(o.num?'Nº'+o.num+' – ':'')+o.nombre;
  gs('dsh-sub').textContent='Al '+new Date().toLocaleDateString('es-PY');
  gs('dsh-strip').style.display='flex';
  gs('dsh-nombre').textContent=o.nombre; gs('dsh-fecha').textContent=o.fecha||'—';
  gs('dsh-estado').textContent=o.estado; gs('dsh-contrato').textContent=fGs(r.con);
  gs('dsh-ay').textContent=obraAy(cur)+'%'; gs('dsh-he').textContent=obraHe(cur)+'%';
  gs('dm-g').textContent=fGs(r.tg); gs('dm-b').textContent=fGs(r.br);
  gs('dm-r').textContent=fGs(r.re); gs('dm-n').textContent=fGs(r.ne);
  gs('dm-ga').textContent=fGs(r.gan); gs('dm-s').textContent=fGs(r.corrCadaUno);
  gs('dm-p').textContent=fPct(r.pct); gs('dm-sc').textContent=fGs(r.scob);
  const p1=r.con>0?Math.min(100,r.br/r.con*100):0;
  const p2=r.ne>0?Math.min(100,r.tg/r.ne*100):0;
  gs('pf1').style.width=p1+'%'; gs('pp1').textContent=p1.toFixed(1)+'%';
  gs('pf2').style.width=p2+'%'; gs('pp2').textContent=p2.toFixed(1)+'%';
}

// ═══════════════════════════════════════
// DASHBOARD GLOBAL
// ═══════════════════════════════════════
function renderGlobal(){
  const list=Object.values(obras);
  let totCon=0,totG=0,totBr=0,totRe=0,totNe=0,totGan=0,totAcob=0,enEj=0;
  const rows=list.map(o=>{
    const r=calcRes(o.id);
    totCon+=r.con; totG+=r.tg; totBr+=r.br; totRe+=r.re;
    totNe+=r.ne; totGan+=r.gan; totAcob+=r.scob;
    if(o.estado==='EN EJECUCIÓN') enEj++;
    const ganC=r.gan>=0?'color:var(--green)':'color:var(--acc3)';
    const acobC=r.scob>0?'color:var(--gold)':'color:var(--muted)';
    return`<tr>
      <td><span class="obra-link" onclick="selectObra('${o.id}')">${o.nombre}</span></td>
      <td><span class="tag ${o.estado==='FINALIZADA'?'tag-g':o.estado==='PARALIZADA'?'tag-r':'tag-y'}">${o.estado||'EN EJECUCIÓN'}</span></td>
      <td>${fGs(r.con)}</td><td style="color:var(--acc2)">${fGs(r.br)}</td>
      <td style="${acobC}">${fGs(r.scob)}</td>
      <td style="color:var(--acc3)">${fGs(r.tg)}</td>
      <td style="color:var(--green)">${fGs(r.ne)}</td>
      <td style="${ganC}">${fGs(r.gan)}</td>
      <td>${fPct(r.pct)}</td>
    </tr>`;
  }).join('');
  gs('globalTbody').innerHTML=rows||'<tr class="empty-row"><td colspan="9">Sin obras</td></tr>';
  gs('globalTfoot').innerHTML=`
    <td>TOTAL (${list.length})</td><td></td>
    <td>${fGs(totCon)}</td><td style="color:var(--acc2)">${fGs(totBr)}</td>
    <td style="color:var(--gold)">${fGs(totAcob)}</td>
    <td style="color:var(--acc3)">${fGs(totG)}</td>
    <td style="color:var(--green)">${fGs(totNe)}</td>
    <td style="color:var(--green)">${fGs(totGan)}</td><td></td>`;
  gs('gm-con').textContent=fGs(totCon);
  gs('gm-bruto').textContent=fGs(totBr);
  gs('gm-acob').textContent=fGs(totAcob);
  gs('gm-ret').textContent=fGs(totRe);
  gs('gm-neto').textContent=fGs(totNe);
  gs('gm-gasto').textContent=fGs(totG);
  gs('gm-gan').textContent=fGs(totGan);
  // totGan * cfg.socios/100 * 2 porque son dos socios
  gs('gm-soc').textContent=fGs(totGan*(cfg.socios/100));
  const pct=totCon>0?Math.min(100,totBr/totCon*100):0;
  gs('gp-fill').style.width=pct+'%'; gs('gp-pct').textContent=pct.toFixed(1)+'%';
  gs('gp-cobrado').textContent=fGs(totBr);
  gs('gp-pend').textContent=fGs(totAcob);
  gs('gp-ej').textContent=enEj;
}

// ═══════════════════════════════════════
// GASTOS — CARGA RÁPIDA
// ═══════════════════════════════════════
function renderGastosPage(){
  if(!cur){toast('Seleccioná una obra primero','err');navTo('obras');return}
  const o=obras[cur];
  gs('gsub').textContent='Obra: '+(o.num?'Nº'+o.num+' – ':'')+o.nombre;
  gs('gstrip').style.display='flex'; gs('gsn').textContent=o.nombre;
  updGStrip();
  if(qrows.length===0)addRow();
  renderQRows(); renderGSaved();
}
function updGStrip(){
  if(!cur)return;
  gs('gst').textContent=fGs(calcTE(cur));
  gs('gsk').textContent=fGs(calcTK(cur));
  gs('gsas').textContent=fGs(ayudaSocialTotalForObra(cur));
  gs('gsg').textContent=fGs(gestorTotalForObra(cur));
  gs('gsct').textContent=fGs(contratistaTotalForObra(cur));
}
function addRow(d){
  qrows.push({_id:uid(),fecha:d?.fecha||today(),concepto:d?.concepto||'',
    cantidad:'',monto:d?.monto||'',montoCheque:'',devuelto:'',
    saldoTotal:'',saldoCheque:'',tipo:d?.tipo||'transferencia'});
  renderQRows();
  setTimeout(()=>{const ins=document.querySelectorAll('.qr-c');ins[ins.length-1]?.focus();},40);
}
window.addRow=addRow;
function renderQRows(){
  gs('qrows').innerHTML=qrows.map(r=>`
    <div class="qgrid">
      <div><span class="qi-lbl">Fecha</span><input class="qi" type="date" value="${r.fecha}" onchange="uqr('${r._id}','fecha',this.value)"></div>
      <div><span class="qi-lbl">Concepto</span><input class="qi qr-c" type="text" value="${r.concepto}" placeholder="Materiales, planilla..." onchange="uqr('${r._id}','concepto',this.value)" onkeydown="qEnter(event,'${r._id}')"></div>
      <div><span class="qi-lbl">Cant.</span><input class="qi" type="number" value="${r.cantidad}" placeholder="—" oninput="uqr('${r._id}','cantidad',this.value)"></div>
      <div><span class="qi-lbl">Monto Pag.</span><input class="qi" type="number" value="${r.monto}" placeholder="0" oninput="uqr('${r._id}','monto',this.value);updChip('${r._id}')"></div>
      <div><span class="qi-lbl">M.Cheque</span><input class="qi" type="number" value="${r.montoCheque}" placeholder="0" oninput="uqr('${r._id}','montoCheque',this.value);updChip('${r._id}')"></div>
      <div><span class="qi-lbl">Devuelto</span><input class="qi" type="number" value="${r.devuelto}" placeholder="0" oninput="uqr('${r._id}','devuelto',this.value)"></div>
      <div style="display:flex;flex-direction:column;gap:3px;align-items:flex-end">
        <span class="qi-lbl">Costo Total</span>
        <div style="display:flex;gap:4px;align-items:center">
          <div class="cchip" id="chip-${r._id}">${fGs(cRow(r))}</div>
          <button class="del-btn" onclick="delRow('${r._id}')">✕</button>
        </div>
      </div>
    </div>`).join('');
}
function cRow(r){return(parseFloat(r.monto)||0)+(parseFloat(r.saldoTotal)||0)+(parseFloat(r.saldoCheque)||0)}
function uqr(id,f,v2){const r=qrows.find(r=>r._id===id);if(r)r[f]=v2}
window.uqr=uqr;
function updChip(id){const r=qrows.find(r=>r._id===id);const ch=gs('chip-'+id);if(r&&ch)ch.textContent=fGs(cRow(r))}
window.updChip=updChip;
function delRow(id){qrows=qrows.filter(r=>r._id!==id);if(!qrows.length)addRow();else renderQRows()}
window.delRow=delRow;
function qEnter(e,id){
  if(e.key!=='Enter')return;
  const idx=qrows.findIndex(r=>r._id===id);
  if(idx===qrows.length-1)addRow();
  else document.querySelectorAll('.qr-c')[idx+1]?.focus();
}
window.qEnter=qEnter;
window.saveAllRows=async function(){
  if(_importing)return;
  if(!cur){toast('Sin obra activa','err');return}
  if(obras[cur]?.estado==='FINALIZADA'){toast('🔒 Obra FINALIZADA — desbloquear desde Editar Obra','err');return}
  const toSave=qrows.filter(r=>r.concepto.trim());
  if(!toSave.length){toast('Ingresá al menos un concepto','err');return}
  _importing=true;
  for(const r of toSave){
    const g={id:uid(),fecha:r.fecha,concepto:r.concepto,
      cantidad:parseFloat(r.cantidad)||0,monto:parseFloat(r.monto)||0,
      montoCheque:parseFloat(r.montoCheque)||0,devuelto:parseFloat(r.devuelto)||0,
      saldoTotal:parseFloat(r.saldoTotal)||0,saldoCheque:parseFloat(r.saldoCheque)||0,
      tipo:r.tipo,costoTotal:cRow(r)};
    gastos[cur].push(g);
    await fbSet('obras/'+cur+'/gastos/'+g.id,g);
  }
  qrows=[]; addRow(); updGStrip(); renderGSaved();
  gs('saveMsg').textContent=toSave.length+' guardado(s) ✓';
  setTimeout(()=>gs('saveMsg').textContent='',4000);
  _importing=false;
  touchObra();
  toast(toSave.length+' gastos guardados','ok');
};
function renderGSaved(){
  const list=gastos[cur]||[];
  const tbody=gs('gtbody');
  const cnt=gs('gSavedCount');
  // Gestor payments assigned to this obra
  const gPagos=cur?gestorPagosForObra(cur):[];
  // Ayuda Social payments assigned to this obra
  const aPagos=cur?ayudaSocialPagosForObra(cur):[];
  // Contratista payments assigned to this obra
  const ctPagos=cur?contratistaPagosForObra(cur):[];
  const totalItems=list.length+gPagos.length+aPagos.length+ctPagos.length;
  if(cnt) cnt.textContent=totalItems?'('+totalItems+')':'';
  let html='';
  // ── AYUDA SOCIAL ROWS ──
  if(aPagos.length){
    html+=aPagos.map((p,i)=>`<tr style="background:rgba(61,212,154,.04) !important">
      <td style="color:var(--green);font-size:.68rem;text-align:center;font-weight:600"><span class="tag tag-g" style="font-size:.5rem">A.SOCIAL</span></td>
      <td>${p.fecha||'—'}</td>
      <td style="font-family:'Syne',sans-serif;color:var(--green);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.concepto||'Ayuda Social'}">🏛️ ${p.concepto||'Ayuda Social'}</td>
      <td style="color:var(--green)">${fGs(p.monto)}</td><td>—</td>
      <td>—</td><td>—</td><td>—</td>
      <td style="color:var(--green);font-weight:600">${fGs(p.monto)}</td>
      <td><span class="tag tag-g" style="font-size:.5rem">A.SOCIAL</span></td>
      <td style="white-space:nowrap"><button class="btn btn-ghost btn-xs" onclick="navTo('ayudaSocial')" title="Ver en Ayuda Social">🏛️</button></td>
    </tr>`).join('');
  }
  // ── GESTOR ROWS ──
  if(gPagos.length){
    html+=gPagos.map((p,i)=>`<tr class="gestor-row-in-gastos">
      <td style="color:var(--amber);font-size:.68rem;text-align:center;font-weight:600"><span class="gestor-badge">GESTOR</span></td>
      <td>${p.fecha||'—'}</td>
      <td style="font-family:'Syne',sans-serif;color:var(--amber);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.concepto||'Entrega al Gestor'}">👷 ${p.concepto||'Entrega al Gestor'}</td>
      <td style="color:var(--amber)">${fGs(p.monto)}</td><td>—</td>
      <td>—</td><td>—</td><td>—</td>
      <td style="color:var(--amber);font-weight:600">${fGs(p.monto)}</td>
      <td><span class="gestor-badge">GESTOR</span></td>
      <td style="white-space:nowrap"><button class="btn btn-ghost btn-xs" onclick="navTo('gestor')" title="Ver en Gestor">👷</button></td>
    </tr>`).join('');
  }
  // ── CONTRATISTA ROWS ──
  if(ctPagos.length){
    html+=ctPagos.map((p,i)=>`<tr style="background:rgba(157,127,218,.04) !important">
      <td style="color:var(--purple);font-size:.68rem;text-align:center;font-weight:600"><span class="tag tag-p" style="font-size:.5rem">CONTRAT.</span></td>
      <td>${p.fecha||'—'}</td>
      <td style="font-family:'Syne',sans-serif;color:var(--purple);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.concepto||'Pago Contratista'}">👔 ${p.concepto||'Pago Contratista'}</td>
      <td style="color:var(--purple)">${fGs(p.monto)}</td><td>—</td>
      <td>—</td><td>—</td><td>—</td>
      <td style="color:var(--purple);font-weight:600">${fGs(p.monto)}</td>
      <td><span class="tag tag-p" style="font-size:.5rem">CONTRAT.</span></td>
      <td style="white-space:nowrap"><button class="btn btn-ghost btn-xs" onclick="navTo('contratista')" title="Ver en Contratista">👔</button></td>
    </tr>`).join('');
  }
  if(!list.length&&!gPagos.length&&!aPagos.length&&!ctPagos.length){
    tbody.innerHTML='<tr class="empty-row"><td colspan="11">Sin gastos registrados aún</td></tr>';
    ['tf1','tf2','tf3'].forEach(id=>gs(id).textContent='₲ 0'); return;
  }
  // ── REGULAR GASTOS ──
  html+=list.map((g,i)=>`<tr>
    <td style="color:var(--muted);font-size:.68rem;text-align:center;font-weight:600">${i+1}</td>
    <td>${g.fecha||'—'}</td>
    <td style="font-family:'Syne',sans-serif;color:var(--txt);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${g.concepto}">${g.concepto}</td>
    <td>${fGs(g.monto)}</td><td>${fGs(g.montoCheque)}</td>
    <td>${fGs(g.devuelto)}</td><td>${fGs(g.saldoTotal)}</td><td>${fGs(g.saldoCheque)}</td>
    <td style="color:var(--gold);font-weight:600">${fGs(g.costoTotal)}</td>
    <td><span class="tag tag-b">${g.tipo||'—'}</span></td>
    <td style="white-space:nowrap"><button class="btn btn-ghost btn-xs" onclick="editG('${g.id}',${i+1})" title="Editar">✏️</button><button class="btn btn-danger btn-xs" onclick="delG('${g.id}')">✕</button></td>
  </tr>`).join('');
  tbody.innerHTML=html;
  const gestorTotal=gPagos.reduce((s,p)=>s+(parseFloat(p.monto)||0),0);
  const ayudaTotal=aPagos.reduce((s,p)=>s+(parseFloat(p.monto)||0),0);
  gs('tf1').textContent=fGs(list.reduce((s,g)=>s+(parseFloat(g.monto)||0),0)+gestorTotal+ayudaTotal);
  gs('tf2').textContent=fGs(list.reduce((s,g)=>s+(parseFloat(g.montoCheque)||0),0));
  gs('tf3').textContent=fGs(list.reduce((s,g)=>s+(parseFloat(g.costoTotal)||0),0)+gestorTotal+ayudaTotal);
}
window.delG=function(id){
  requireAuth('⚠️ Eliminar este gasto.',async()=>{
    gastos[cur]=(gastos[cur]||[]).filter(g=>g.id!==id);
    updGStrip(); renderGSaved();
    try{ await fbDel('obras/'+cur+'/gastos/'+id); }catch(e){}
    try{ localStorage.removeItem('oc/obras/'+cur+'/gastos/'+id); }catch(e){}
    toast('Gasto eliminado','info');
  });
};
window.borrarTodosGastos=function(){
  if(!cur||!obras[cur])return;
  const list=gastos[cur]||[];
  if(!list.length){toast('No hay gastos para borrar','info');return}
  const nombre=obras[cur].nombre||'';
  requireAuth('⚠️ Vas a borrar los '+list.length+' gastos de "'+nombre+'".\nEsta acción NO se puede deshacer.',async()=>{
    const toDelete=[...list];
    gastos[cur]=[];
    updGStrip(); renderGSaved();
    toast('Borrando de la base de datos...','info');
    for(const g of toDelete){
      const gid=g.id;
      if(!gid)continue;
      try{ await fbDel('obras/'+cur+'/gastos/'+gid); }catch(e){ console.warn('fbDel error:',e); }
      try{ localStorage.removeItem('oc/obras/'+cur+'/gastos/'+gid); }catch(e){}
    }
    toast('Todos los gastos de "'+nombre+'" eliminados ✓','ok');
  });
};

// ═══════════════════════════════════════
// CERTIFICADOS
// ═══════════════════════════════════════
window.updCert=function(){
  const b=parseFloat(gs('c-b').value)||0,n=parseFloat(gs('c-n').value)||0;
  gs('c-rc').textContent=fGs(b-n);
};
window.clrCert=function(){gs('c-f').value=today();gs('c-c').value='';gs('c-b').value='';gs('c-n').value='';gs('c-rc').textContent='₲ 0'};
window.saveCert=async function(){
  if(!cur){toast('Seleccioná una obra','err');return}
  if(obras[cur]?.estado==='FINALIZADA'){toast('🔒 Obra FINALIZADA — desbloquear desde Editar Obra','err');return}
  const conc=v('c-c'); if(!conc){toast('Ingresá el concepto','err');return}
  const c={id:uid(),fecha:v('c-f'),concepto:conc,
    bruto:parseFloat(gs('c-b').value)||0,neto:parseFloat(gs('c-n').value)||0};
  c.retencion=c.bruto-c.neto;
  certificados[cur].push(c);
  await fbSet('obras/'+cur+'/certificados/'+c.id,c);
  window.clrCert(); renderCerts(); touchObra(); toast('Certificado registrado','ok');
};
window.delC=function(id){
  requireAuth('⚠️ Eliminar este certificado.',async()=>{
    certificados[cur]=(certificados[cur]||[]).filter(c=>c.id!==id);
    renderCerts();
    try{ await fbDel('obras/'+cur+'/certificados/'+id); }catch(e){}
    try{ localStorage.removeItem('oc/obras/'+cur+'/certificados/'+id); }catch(e){}
    toast('Eliminado','info');
  });
};
window.borrarTodosCerts=function(){
  if(!cur||!obras[cur])return;
  const list=certificados[cur]||[];
  if(!list.length){toast('No hay certificados para borrar','info');return}
  const nombre=obras[cur].nombre||'';
  requireAuth('⚠️ Vas a borrar los '+list.length+' certificados de "'+nombre+'".\nEsta acción NO se puede deshacer.',async()=>{
    const toDelete=[...list];
    certificados[cur]=[];
    renderCerts();
    toast('Borrando de la base de datos...','info');
    for(const c of toDelete){
      const cid=c.id;
      if(!cid)continue;
      try{ await fbDel('obras/'+cur+'/certificados/'+cid); }catch(e){ console.warn('fbDel error:',e); }
      try{ localStorage.removeItem('oc/obras/'+cur+'/certificados/'+cid); }catch(e){}
    }
    toast('Todos los certificados de "'+nombre+'" eliminados ✓','ok');
  });
};

// ── Editar gasto individual ──
window.editG=function(id,num){
  if(obras[cur]?.estado==='FINALIZADA'){toast('🔒 Obra FINALIZADA — desbloquear desde Editar Obra','err');return}
  const g=(gastos[cur]||[]).find(g=>g.id===id);
  if(!g){toast('Gasto no encontrado','err');return}
  gs('eg-id').value=id;
  gs('editGNum').textContent='#'+num;
  gs('eg-fecha').value=g.fecha||'';
  gs('eg-concepto').value=g.concepto||'';
  gs('eg-cantidad').value=g.cantidad||'';
  gs('eg-monto').value=g.monto||0;
  gs('eg-registro').value=g.registro||'';
  gs('eg-montoCheque').value=g.montoCheque||0;
  gs('eg-devuelto').value=g.devuelto||0;
  gs('eg-saldoTotal').value=g.saldoTotal||0;
  gs('eg-saldoCheque').value=g.saldoCheque||0;
  openM('mEditG');
};
window.saveEditG=async function(){
  const id=gs('eg-id').value;
  const g=(gastos[cur]||[]).find(g=>g.id===id);
  if(!g){toast('Gasto no encontrado','err');return}
  g.fecha=gs('eg-fecha').value;
  g.concepto=gs('eg-concepto').value;
  g.cantidad=parseFloat(gs('eg-cantidad').value)||0;
  g.monto=parseFloat(gs('eg-monto').value)||0;
  g.registro=gs('eg-registro').value;
  g.montoCheque=parseFloat(gs('eg-montoCheque').value)||0;
  g.devuelto=parseFloat(gs('eg-devuelto').value)||0;
  g.saldoTotal=parseFloat(gs('eg-saldoTotal').value)||0;
  g.saldoCheque=parseFloat(gs('eg-saldoCheque').value)||0;
  g.costoTotal=(g.monto||0)+(g.saldoTotal||0)+(g.saldoCheque||0);
  await fbSet('obras/'+cur+'/gastos/'+id,g);
  closeM('mEditG');
  updGStrip(); renderGSaved();
  touchObra();
  toast('Gasto actualizado ✓','ok');
};

// ── Editar certificado individual ──
window.editC=function(id,num){
  if(obras[cur]?.estado==='FINALIZADA'){toast('🔒 Obra FINALIZADA — desbloquear desde Editar Obra','err');return}
  const c=(certificados[cur]||[]).find(c=>c.id===id);
  if(!c){toast('Certificado no encontrado','err');return}
  gs('ec-id').value=id;
  gs('editCNum').textContent='#'+num;
  gs('ec-fecha').value=c.fecha||'';
  gs('ec-concepto').value=c.concepto||'';
  gs('ec-bruto').value=c.bruto||0;
  gs('ec-neto').value=c.neto||0;
  gs('ec-ret').textContent=fGs((c.bruto||0)-(c.neto||0));
  // Live update retención
  gs('ec-bruto').oninput=gs('ec-neto').oninput=function(){
    const b=parseFloat(gs('ec-bruto').value)||0, n=parseFloat(gs('ec-neto').value)||0;
    gs('ec-ret').textContent=fGs(b-n);
  };
  openM('mEditC');
};
window.saveEditC=async function(){
  const id=gs('ec-id').value;
  const c=(certificados[cur]||[]).find(c=>c.id===id);
  if(!c){toast('Certificado no encontrado','err');return}
  c.fecha=gs('ec-fecha').value;
  c.concepto=gs('ec-concepto').value;
  c.bruto=parseFloat(gs('ec-bruto').value)||0;
  c.neto=parseFloat(gs('ec-neto').value)||0;
  c.retencion=c.bruto-c.neto;
  await fbSet('obras/'+cur+'/certificados/'+id,c);
  closeM('mEditC');
  renderCerts();
  touchObra();
  toast('Certificado actualizado ✓','ok');
};

function renderCerts(){
  if(!cur){toast('Seleccioná una obra','err');navTo('obras');return}
  const o=obras[cur];
  gs('cstrip').style.display='flex'; gs('csn').textContent=o.nombre;
  const{br,ne,re}=calcCertsT(cur);
  gs('csb').textContent=fGs(br); gs('csr').textContent=fGs(re); gs('csne').textContent=fGs(ne);
  const list=certificados[cur]||[], tbody=gs('ctbody');
  const cnt=gs('cSavedCount');
  if(cnt) cnt.textContent=list.length?'('+list.length+')':'';
  if(!list.length){
    tbody.innerHTML='<tr class="empty-row"><td colspan="7">Sin certificados</td></tr>';
    gs('ctb').textContent=gs('ctn').textContent=gs('ctr').textContent='₲ 0'; return;
  }
  tbody.innerHTML=list.map((c,i)=>`<tr>
    <td style="color:var(--muted);font-size:.68rem;text-align:center;font-weight:600">${i+1}</td>
    <td>${c.fecha||'—'}</td>
    <td style="font-family:'Syne',sans-serif;color:var(--txt)">${c.concepto}</td>
    <td style="color:var(--acc2)">${fGs(c.bruto)}</td>
    <td style="color:var(--green)">${fGs(c.neto)}</td>
    <td style="color:var(--acc3)">${fGs(c.retencion)}</td>
    <td style="white-space:nowrap"><button class="btn btn-ghost btn-xs" onclick="editC('${c.id}',${i+1})" title="Editar">✏️</button><button class="btn btn-danger btn-xs" onclick="delC('${c.id}')">✕</button></td>
  </tr>`).join('');
  gs('ctb').textContent=fGs(br); gs('ctn').textContent=fGs(ne); gs('ctr').textContent=fGs(re);
}

// ═══════════════════════════════════════
// RESUMEN
// ═══════════════════════════════════════
function renderResumen(){
  if(!cur){toast('Seleccioná una obra','err');navTo('obras');return}
  const o=obras[cur], r=calcRes(cur);
  gs('resumen-sub').textContent=(o.num?'N\xba'+o.num+' \u2013 ':'')+o.nombre+' \u00b7 '+new Date().toLocaleDateString('es-PY');
  gs('rtbody').innerHTML=[
    ['MONTO CONTRATO',fGs(r.con),'y'],
    ['TOTAL DE GASTOS',fGs(r.tg),'r'],
    ['TOTAL BRUTO COBRADO',fGs(r.br),'b'],
    ['RETENCI\xd3N TOTAL',fGs(r.re),''],
    ['TOTAL NETO COBRADO',fGs(r.ne),'g'],
    ['GANANCIA NETA (neto \u2212 gastos)',fGs(r.gan),r.gan>=0?'g':'r'],
    ['PARA FERNANDO ('+cfg.socios+'%)',fGs(r.corrCadaUno),'y'],
    ['PARA WUILIAN ('+cfg.socios+'%)',fGs(r.corrCadaUno),'b'],
    ['PORCENTAJE DE GANANCIA',fPct(r.pct),''],
    ['SALDO A COBRAR',fGs(r.scob),'b'],
  ].map(([l,val,c])=>`<tr>
    <td style="font-family:'Syne',sans-serif;color:var(--dim);padding:.48rem .6rem;border-bottom:1px solid var(--border)">${l}</td>
    <td style="text-align:right;padding:.48rem .6rem;border-bottom:1px solid var(--border)" class="${c?'m-val '+c:''}">${val}</td>
  </tr>`).join('');
  // Tabla gastos
  const gl=gastos[cur]||[];
  const gPagosRes=cur?gestorPagosForObra(cur):[];
  const aPagosRes=cur?ayudaSocialPagosForObra(cur):[];
  const ctPagosRes=cur?contratistaPagosForObra(cur):[];
  const gtbody=gs('res-gtbody');
  if(gtbody){
    let resModHtml='';
    if(aPagosRes.length){
      resModHtml+=aPagosRes.map(p=>`<tr style="background:rgba(61,212,154,.04)"><td>${p.fecha||'\u2014'}</td><td style="font-family:'Syne',sans-serif;color:var(--green);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">🏛️ ${p.concepto||'Ayuda Social'}</td><td style="color:var(--green)">${fGs(p.monto)}</td><td>—</td><td>—</td><td style="color:var(--green)">${fGs(p.monto)}</td></tr>`).join('');
    }
    if(gPagosRes.length){
      resModHtml+=gPagosRes.map(p=>`<tr class="gestor-row-in-gastos"><td>${p.fecha||'\u2014'}</td><td style="font-family:'Syne',sans-serif;color:var(--amber);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">👷 ${p.concepto||'Entrega al Gestor'}</td><td style="color:var(--amber)">${fGs(p.monto)}</td><td>—</td><td>—</td><td style="color:var(--amber)">${fGs(p.monto)}</td></tr>`).join('');
    }
    if(ctPagosRes.length){
      resModHtml+=ctPagosRes.map(p=>`<tr style="background:rgba(157,127,218,.04)"><td>${p.fecha||'\u2014'}</td><td style="font-family:'Syne',sans-serif;color:var(--purple);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">👔 ${p.concepto||'Pago Contratista'}</td><td style="color:var(--purple)">${fGs(p.monto)}</td><td>—</td><td>—</td><td style="color:var(--purple)">${fGs(p.monto)}</td></tr>`).join('');
    }
    const regHtml=gl.length
      ? gl.map(g=>`<tr><td>${g.fecha||'\u2014'}</td><td style="font-family:'Syne',sans-serif;color:var(--txt);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${g.concepto}</td><td>${fGs(g.monto)}</td><td>${fGs(g.montoCheque)}</td><td>${fGs(g.devuelto)}</td><td style="color:var(--gold)">${fGs(g.costoTotal)}</td></tr>`).join('')
      : '';
    gtbody.innerHTML=(resModHtml+regHtml)||'<tr class="empty-row"><td colspan="6">Sin gastos</td></tr>';
    const gestorResTotal=gPagosRes.reduce((s,p)=>s+(parseFloat(p.monto)||0),0);
    const ayudaResTotal=aPagosRes.reduce((s,p)=>s+(parseFloat(p.monto)||0),0);
    const contratistaResTotal=ctPagosRes.reduce((s,p)=>s+(parseFloat(p.monto)||0),0);
    const tf1=gs('res-tf1'); if(tf1) tf1.textContent=fGs(gl.reduce((s,g)=>s+(parseFloat(g.monto)||0),0)+gestorResTotal+ayudaResTotal+contratistaResTotal);
    const tf3=gs('res-tf3'); if(tf3) tf3.textContent=fGs(gl.reduce((s,g)=>s+(parseFloat(g.costoTotal)||0),0)+gestorResTotal+ayudaResTotal+contratistaResTotal);
  }
  // Tabla certs
  const cl=certificados[cur]||[];
  const ctbody=gs('res-ctbody');
  if(ctbody){
    ctbody.innerHTML=cl.length
      ? cl.map(c=>`<tr><td>${c.fecha||'\u2014'}</td><td style="font-family:'Syne',sans-serif;color:var(--txt)">${c.concepto}</td><td style="color:var(--acc2)">${fGs(c.bruto)}</td><td style="color:var(--green)">${fGs(c.neto)}</td><td style="color:var(--acc3)">${fGs(c.retencion)}</td></tr>`).join('')
      : '<tr class="empty-row"><td colspan="5">Sin certificados</td></tr>';
    const ct=calcCertsT(cur);
    const rcb=gs('res-cb'); if(rcb) rcb.textContent=fGs(ct.br);
    const rcn=gs('res-cn'); if(rcn) rcn.textContent=fGs(ct.ne);
    const rcr=gs('res-cr'); if(rcr) rcr.textContent=fGs(ct.re);
  }
}

// ═══════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════
function totalRetiros(socio){return(retiros[socio]||[]).reduce((s,r)=>s+(r.monto||0),0)}
function renderUtilidades(){
  const list=Object.values(obras);
  let totGan=0,totCorrF=0,totCorrW=0;
  const retF=totalRetiros('fernando'), retW=totalRetiros('wuilian');

  const rows=list.map(o=>{
    const r=calcRes(o.id);
    // Cada socio recibe cfg.socios% (50%) de la ganancia neta
    totGan+=r.gan; totCorrF+=r.corrCadaUno; totCorrW+=r.corrCadaUno;
    const ganC=r.gan>=0?'color:var(--green)':'color:var(--acc3)';
    return`<tr>
      <td style="font-family:'Syne',sans-serif;color:var(--txt);font-weight:600">${o.nombre}</td>
      <td style="${ganC}">${fGs(r.gan)}</td>
      <td style="color:var(--gold);font-weight:600">${fGs(r.corrCadaUno)}</td>
      <td style="color:var(--acc2);font-weight:600">${fGs(r.corrCadaUno)}</td>
    </tr>`;
  }).join('');

  const saldoF=totCorrF-retF, saldoW=totCorrW-retW;
  gs('utilTbody').innerHTML=rows||'<tr class="empty-row"><td colspan="4">Sin obras</td></tr>';
  gs('utilTfoot').innerHTML=`
    <td>TOTAL GLOBAL</td>
    <td style="color:var(--green)">${fGs(totGan)}</td>
    <td style="color:var(--gold);font-weight:700">${fGs(totCorrF)}</td>
    <td style="color:var(--acc2);font-weight:700">${fGs(totCorrW)}</td>`;

  gs('ut-gan').textContent=fGs(totGan);
  gs('ut-cf').textContent=fGs(totCorrF);
  gs('ut-rf').textContent=fGs(retF);
  gs('ut-sf').textContent=fGs(saldoF);
  gs('ut-cw').textContent=fGs(totCorrW);
  gs('ut-rw').textContent=fGs(retW);
  gs('ut-sw').textContent=fGs(saldoW);

  gs('fs-total').textContent=fGs(totCorrF);
  gs('fs-ret').textContent=fGs(retF);
  gs('fs-sal').textContent=fGs(saldoF);
  gs('ws-total').textContent=fGs(totCorrW);
  gs('ws-ret').textContent=fGs(retW);
  gs('ws-sal').textContent=fGs(saldoW);

  const colorSF=saldoF>=0?'var(--green)':'var(--acc3)';
  const colorSW=saldoW>=0?'var(--green)':'var(--acc3)';
  gs('fs-sal').style.color=colorSF; gs('ut-sf').style.color=colorSF;
  gs('ws-sal').style.color=colorSW; gs('ut-sw').style.color=colorSW;

  renderRetirosList('fernando','fs-list');
  renderRetirosList('wuilian','ws-list');
}
function renderRetirosList(socio,elId){
  const list=retiros[socio]||[];
  if(!list.length){gs(elId).innerHTML='<div style="color:var(--muted);font-size:.7rem;padding:.2rem 0">Sin retiros registrados</div>';return}
  gs(elId).innerHTML=list.slice().reverse().map((r,i)=>`
    <div class="retiro-item">
      <div><div style="font-weight:600;font-size:.71rem;color:var(--txt)">${r.concepto||'Retiro'}</div><div class="retiro-fecha">${r.fecha||'—'}</div></div>
      <div style="display:flex;align-items:center;gap:.35rem">
        <span class="retiro-monto">-${fGs(r.monto)}</span>
        <button class="del-btn" style="width:19px;height:19px;font-size:.58rem" onclick="delRetiro('${socio}',${list.length-1-i})">✕</button>
      </div>
    </div>`).join('');
}
window.openRetiro=function(socio){
  gs('mRetiroTitle').textContent='Retiro — '+(socio==='fernando'?'Fernando':'Wuilian');
  gs('retiro-socio').value=socio;
  gs('ret-f').value=today(); gs('ret-m').value=''; gs('ret-c').value='';
  openM('mRetiro');
};
window.saveRetiro=async function(){
  const socio=v('retiro-socio');
  const monto=parseFloat(gs('ret-m').value)||0;
  if(!monto){toast('Ingresá el monto','err');return}
  const r={id:uid(),fecha:v('ret-f'),monto,concepto:v('ret-c')};
  if(!retiros[socio])retiros[socio]=[];
  retiros[socio].push(r);
  await fbSet('retiros/socios',retiros);
  closeM('mRetiro'); renderUtilidades(); saveCache(); toast('Retiro registrado','ok');
};
window.delRetiro=function(socio,idx){
  requireAuth('⚠️ Eliminar este retiro de '+socio+'.',async()=>{
    retiros[socio].splice(idx,1);
    await fbSet('retiros/socios',retiros);
    renderUtilidades(); saveCache(); toast('Retiro eliminado','info');
  });
};

// ═══════════════════════════════════════
// GESTOR — CONTROL DE PAGOS
// ═══════════════════════════════════════
function calcGestorAdeudadoObra(id){
  const o=obras[id];
  if(o&&o.gestorMonto!=null&&o.gestorMonto!==''){
    const manual=parseFloat(o.gestorMonto);
    if(!isNaN(manual)) return manual;
  }
  return calcCon(id)*(obraGes(id)/100);
}
function calcGestorAdeudado(){
  return Object.values(obras).reduce((s,o)=>s+calcGestorAdeudadoObra(o.id),0);
}
function calcGestorEntregado(){
  return gestorPagos.reduce((s,p)=>s+(parseFloat(p.monto)||0),0);
}
function calcGestorEntregadoObra(id){
  return gestorPagos.filter(p=>p.obraId===id).reduce((s,p)=>s+(parseFloat(p.monto)||0),0);
}
function calcGestorSinAsignar(){
  return gestorPagos.filter(p=>!p.obraId).reduce((s,p)=>s+(parseFloat(p.monto)||0),0);
}

function populateGestorObraSelect(selId){
  const sel=gs(selId);
  if(!sel) return;
  const val=sel.value;
  sel.innerHTML='<option value="">— Sin asignar —</option>';
  Object.values(obras).sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'')).forEach(o=>{
    const opt=document.createElement('option');
    opt.value=o.id; opt.textContent=(o.num?'Nº'+o.num+' – ':'')+o.nombre;
    sel.appendChild(opt);
  });
  if(val) sel.value=val;
}

function renderGestor(){
  populateGestorObraSelect('gp-obra');
  gs('gp-fecha').value=gs('gp-fecha').value||today();
  const adeudado=calcGestorAdeudado();
  const entregado=calcGestorEntregado();
  const saldo=adeudado-entregado;
  gs('ges-adeudado').textContent=fGs(adeudado);
  gs('ges-entregado').textContent=fGs(entregado);
  gs('ges-saldo').textContent=fGs(saldo);
  gs('ges-saldo').style.color=saldo>0?'var(--amber)':'var(--green)';
  gs('ges-count').textContent=gestorPagos.length;
  const sortVal=(gs('gestorSort')?.value)||'num-asc';
  const filterVal=(gs('gestorFilter')?.value)||'todas';
  let obraList=Object.values(obras);
  // Calcular pendiente para filtering y sorting
  const _salMap={};
  obraList.forEach(o=>{
    const ad=calcGestorAdeudadoObra(o.id);
    const en=calcGestorEntregadoObra(o.id);
    const nPagos=gestorPagos.filter(p=>p.obraId===o.id).length;
    _salMap[o.id]={sal:ad-en, pct:ad>0?Math.min(100,en/ad*100):0, nPagos};
  });
  // Filtrar
  if(filterVal==='actuales')      obraList=obraList.filter(o=>obraHe(o.id)!==0);
  if(filterVal==='pendientes')    obraList=obraList.filter(o=>_salMap[o.id].sal>0.5);
  if(filterVal==='saldadas')      obraList=obraList.filter(o=>_salMap[o.id].sal<=0.5);
  if(filterVal==='con-entregas')  obraList=obraList.filter(o=>_salMap[o.id].nPagos>0);
  if(filterVal==='sin-entregas')  obraList=obraList.filter(o=>_salMap[o.id].nPagos===0);
  obraList.sort((a,b)=>{
    if(sortVal==='num-asc')  return (parseInt(a.num)||0)-(parseInt(b.num)||0);
    if(sortVal==='num-desc') return (parseInt(b.num)||0)-(parseInt(a.num)||0);
    if(sortVal==='nombre-asc') return (a.nombre||'').localeCompare(b.nombre||'');
    if(sortVal==='pendiente-desc') return _salMap[b.id].sal-_salMap[a.id].sal;
    if(sortVal==='pendiente-asc')  return _salMap[a.id].sal-_salMap[b.id].sal;
    if(sortVal==='cubierto-desc')  return _salMap[b.id].pct-_salMap[a.id].pct;
    if(sortVal==='cubierto-asc')   return _salMap[a.id].pct-_salMap[b.id].pct;
    return 0;
  });
  if(obraList.length){
    const totalObras=Object.keys(obras).length;
    const sinAsignar=calcGestorSinAsignar();
    let html=obraList.map(o=>{
      const con=calcCon(o.id);
      const gesPct=obraGes(o.id);
      const autoCalc=con*(gesPct/100);
      const hasOverride=o.gestorMonto!=null&&o.gestorMonto!=='';
      const adeObra=calcGestorAdeudadoObra(o.id);
      const entObra=calcGestorEntregadoObra(o.id);
      const salObra=adeObra-entObra;
      const pctPagado=adeObra>0?Math.min(100,entObra/adeObra*100):0;
      const pagosObra=gestorPagos.filter(p=>p.obraId===o.id).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
      const salColor=salObra>0?'var(--acc3)':'var(--green)';
      // Entregas list HTML
      let entregasHtml='';
      if(pagosObra.length){
        entregasHtml=pagosObra.map(p=>`
          <div class="gestor-card-entrega">
            <div class="gestor-card-entrega-left">
              <div class="gestor-card-entrega-concepto">${p.concepto||'Entrega'}</div>
              <div class="gestor-card-entrega-fecha">${p.fecha||'—'}</div>
            </div>
            <div class="gestor-card-entrega-right">
              <span class="gestor-card-entrega-monto">${fGs(p.monto)}</span>
              <button class="del-btn" style="width:18px;height:18px;font-size:.52rem" onclick="editGestorPago('${p.id}')" title="Editar">✏️</button>
              <button class="del-btn" style="width:18px;height:18px;font-size:.52rem" onclick="delGestorPago('${p.id}')" title="Eliminar">✕</button>
            </div>
          </div>`).join('');
      }else{
        entregasHtml='<div class="gestor-card-empty">Sin entregas asignadas aún</div>';
      }
      // Auto button: siempre visible — resaltado si hay override, apagado si ya está en auto
      const autoBtn=`<button class="gestor-corresponde-auto" 
        onclick="resetGestorMontoObra('${o.id}')" 
        title="${hasOverride?'Volver al cálculo automático':'Ya en automático: '+gesPct+'% de contrato'}"
        style="${hasOverride?'':'opacity:.35;cursor:default;pointer-events:none'}">↺ Auto (${gesPct}%)</button>`;
      return`<div class="gestor-obra-card">
        <div class="gestor-obra-card-header">
          <div class="gestor-obra-card-title" style="flex:1;min-width:0">
            <span class="gestor-obra-card-num" style="flex-shrink:0">${o.num?'Nº'+o.num:''}</span>
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${o.nombre||'Sin nombre'}</span>
          </div>
          <div style="display:flex;align-items:center;gap:.35rem;flex-shrink:0;margin-left:.4rem">
            <span style="font-size:.58rem;color:var(--muted);font-family:'JetBrains Mono',monospace;white-space:nowrap">Contrato: ${fGs(con)}</span>
            <button class="btn btn-ghost btn-xs" style="padding:2px 7px;font-size:.58rem;flex-shrink:0" onclick="event.stopPropagation();editObra('${o.id}')" title="Editar obra">✏️</button>
            <button class="btn btn-danger btn-xs" style="padding:2px 7px;font-size:.58rem;flex-shrink:0" onclick="event.stopPropagation();limpiarGestorObra('${o.id}')" title="Limpiar datos del gestor para esta obra">🧹</button>
          </div>
        </div>
        <div class="gestor-obra-card-body">
          <div class="gestor-obra-corresponde">
            <div>
              <div class="gestor-obra-corresponde-label">Le corresponde al gestor</div>
              <div style="font-size:.5rem;color:var(--muted);margin-top:1px">${hasOverride?'⚠️ Monto manual':'Auto: '+gesPct+'% de '+fGs(con)}</div>
            </div>
            <div class="gestor-corresponde-edit">
              <input type="number" class="gestor-corresponde-input" value="${Math.round(adeObra)}" 
                onchange="updateGestorMontoObra('${o.id}',this.value)"
                title="Editá el monto que le corresponde al gestor por esta obra">
              ${autoBtn}
            </div>
          </div>
          <div class="gestor-obra-card-stats">
            <div class="gestor-obra-stat"><span class="gestor-obra-stat-label">Total Entregado</span><span class="gestor-obra-stat-val" style="color:var(--amber)">${fGs(entObra)}</span></div>
            <div class="gestor-obra-stat"><span class="gestor-obra-stat-label">Pendiente</span><span class="gestor-obra-stat-val" style="color:${salColor}">${fGs(salObra)}</span></div>
          </div>
          <div class="prog-wrap" style="margin-top:.35rem;margin-bottom:.1rem">
            <div class="prog-bar"><div class="prog-fill" style="width:${pctPagado}%;background:var(--amber)"></div></div>
            <div style="font-size:.52rem;color:var(--muted);text-align:right;margin-top:2px">${pctPagado.toFixed(0)}% cubierto</div>
          </div>
          <div style="font-size:.54rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-top:.5rem;margin-bottom:.25rem;display:flex;align-items:center;gap:6px">
            <span style="width:12px;height:1.5px;background:linear-gradient(90deg,var(--amber),transparent);display:inline-block;border-radius:1px"></span>
            Entregas (${pagosObra.length})
          </div>
          <div class="gestor-card-list">${entregasHtml}</div>
          <div class="gestor-quick-add">
            <input type="number" class="gestor-quick-input" id="gqa-m-${o.id}" placeholder="Monto" style="width:90px">
            <input type="text" class="gestor-quick-input" id="gqa-c-${o.id}" placeholder="Concepto..." style="flex:1;min-width:0"
              onkeydown="if(event.key==='Enter')quickAddGestorObra('${o.id}')">
            <button class="btn btn-xs" style="background:rgba(232,160,68,.15);color:var(--amber);border:1px solid rgba(232,160,68,.2);padding:3px 8px;font-size:.6rem" 
              onclick="quickAddGestorObra('${o.id}')">+ Entrega</button>
          </div>
        </div>
      </div>`;
    }).join('');
    // Pagos sin asignar
    const sinPagos=gestorPagos.filter(p=>!p.obraId).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
    if(sinPagos.length){
      let sinHtml=sinPagos.map(p=>`
        <div class="gestor-card-entrega">
          <div class="gestor-card-entrega-left">
            <div class="gestor-card-entrega-concepto">${p.concepto||'Entrega'}</div>
            <div class="gestor-card-entrega-fecha">${p.fecha||'—'}</div>
          </div>
          <div class="gestor-card-entrega-right">
            <span class="gestor-card-entrega-monto">${fGs(p.monto)}</span>
            <button class="del-btn" style="width:18px;height:18px;font-size:.52rem" onclick="editGestorPago('${p.id}')" title="Editar/Asignar">✏️</button>
            <button class="del-btn" style="width:18px;height:18px;font-size:.52rem" onclick="delGestorPago('${p.id}')" title="Eliminar">✕</button>
          </div>
        </div>`).join('');
      html+=`<div class="gestor-obra-card" style="border-color:rgba(232,160,68,.25)">
        <div class="gestor-obra-card-header" style="background:linear-gradient(135deg,rgba(224,82,82,.06),transparent)">
          <div class="gestor-obra-card-title" style="color:var(--amber)">⚠️ Sin asignar a obra</div>
        </div>
        <div class="gestor-obra-card-body">
          <div class="gestor-obra-card-stats">
            <div class="gestor-obra-stat"><span class="gestor-obra-stat-label">Total sin asignar</span><span class="gestor-obra-stat-val" style="color:var(--amber)">${fGs(sinAsignar)}</span></div>
          </div>
          <div style="font-size:.54rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-top:.5rem;margin-bottom:.25rem;display:flex;align-items:center;gap:6px">
            <span style="width:12px;height:1.5px;background:linear-gradient(90deg,var(--amber),transparent);display:inline-block;border-radius:1px"></span>
            Entregas pendientes de asignar (${sinPagos.length})
          </div>
          <div class="gestor-card-list">${sinHtml}</div>
        </div>
      </div>`;
    }
    const filterChip=filterVal!=='todas'?`<div style="font-size:.62rem;color:var(--amber);margin-bottom:.5rem;display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:var(--amber);flex-shrink:0"></span>Mostrando <b>${obraList.length}</b> de ${totalObras} obras</div>`:'';
    gs('gestorObraGrid').innerHTML=filterChip+html;
  }else{
    const totalObras=Object.keys(obras).length;
    const msg=totalObras>0
      ?`<div style="color:var(--muted);font-size:.76rem">Ninguna obra coincide con el filtro — <button class="btn btn-ghost btn-xs" onclick="document.getElementById('gestorFilter').value='todas';renderGestor()" style="font-size:.68rem">Ver todas</button></div>`
      :'<div style="color:var(--muted);font-size:.76rem">Sin obras registradas</div>';
    gs('gestorObraGrid').innerHTML=msg;
  }

  // ── Historial de entregas ──
  const list=[...gestorPagos].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
  const hcnt=gs('ges-hist-count');
  if(hcnt) hcnt.textContent=list.length?'('+list.length+')':'';
  const tbody=gs('gestorTbody');
  if(!list.length){
    tbody.innerHTML='<tr class="empty-row"><td colspan="6">Sin entregas registradas</td></tr>';
    gs('ges-tf').textContent='₲ 0'; return;
  }
  tbody.innerHTML=list.map((p,i)=>{
    const oNombre=p.obraId&&obras[p.obraId]?(obras[p.obraId].num?'Nº'+obras[p.obraId].num+' – ':'')+obras[p.obraId].nombre:'';
    return`<tr${p.obraId?' class="gestor-row-in-gastos"':''}>
      <td style="color:var(--muted);font-size:.68rem;text-align:center;font-weight:600">${i+1}</td>
      <td>${p.fecha||'—'}</td>
      <td style="font-family:'Syne',sans-serif;color:var(--txt);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.concepto||''}">${p.concepto||'Entrega'}</td>
      <td style="color:var(--amber);font-weight:600">${fGs(p.monto)}</td>
      <td>${p.obraId?'<span class="gestor-obra-tag" onclick="selectObra(\''+p.obraId+'\')">🏗️ '+oNombre+'</span>':'<span class="gestor-obra-tag sin">Sin asignar</span>'}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-ghost btn-xs" onclick="editGestorPago('${p.id}')" title="Editar">✏️</button>
        <button class="btn btn-ghost btn-xs" onclick="asignarGestorObra('${p.id}')" title="Asignar a obra">🏗️</button>
        <button class="btn btn-danger btn-xs" onclick="delGestorPago('${p.id}')">✕</button>
      </td>
    </tr>`;
  }).join('');
  gs('ges-tf').textContent=fGs(entregado);
}

window.clrGestorForm=function(){
  gs('gp-fecha').value=today(); gs('gp-monto').value=''; gs('gp-concepto').value=''; gs('gp-obra').value='';
};

window.saveGestorPago=async function(){
  const monto=parseFloat(gs('gp-monto').value)||0;
  if(!monto){toast('Ingresá el monto','err');return}
  const obraId=gs('gp-obra').value||'';
  if(obraId&&obras[obraId]?.estado==='FINALIZADA'){toast('🔒 Obra FINALIZADA — no se puede asignar gastos','err');return}
  const p={id:uid(),fecha:v('gp-fecha')||today(),monto,
    concepto:v('gp-concepto')||'Entrega semanal',
    obraId};
  gestorPagos.push(p);
  await fbSet('gestor/pagos',{lista:gestorPagos});
  saveCache();
  window.clrGestorForm();
  gs('gp-fecha').value=today();
  renderGestor();
  toast('Entrega al gestor registrada ✓','ok');
};

window.delGestorPago=function(id){
  requireAuth('⚠️ Eliminar esta entrega al gestor.',async()=>{
    gestorPagos=gestorPagos.filter(p=>p.id!==id);
    await fbSet('gestor/pagos',{lista:gestorPagos});
    saveCache(); renderGestor(); toast('Entrega eliminada','info');
  });
};

window.editGestorPago=function(id){
  const p=gestorPagos.find(p=>p.id===id);
  if(!p){toast('No encontrado','err');return}
  gs('egs-id').value=id;
  gs('egs-fecha').value=p.fecha||'';
  gs('egs-monto').value=p.monto||0;
  gs('egs-concepto').value=p.concepto||'';
  populateGestorObraSelect('egs-obra');
  gs('egs-obra').value=p.obraId||'';
  openM('mEditGestor');
};

window.saveEditGestor=async function(){
  const id=gs('egs-id').value;
  const p=gestorPagos.find(p=>p.id===id);
  if(!p){toast('No encontrado','err');return}
  const newObraId=gs('egs-obra').value||'';
  if(newObraId&&obras[newObraId]?.estado==='FINALIZADA'){toast('🔒 No se puede asignar a obra FINALIZADA','err');return}
  p.fecha=gs('egs-fecha').value;
  p.monto=parseFloat(gs('egs-monto').value)||0;
  p.concepto=gs('egs-concepto').value;
  p.obraId=newObraId;
  await fbSet('gestor/pagos',{lista:gestorPagos});
  saveCache(); closeM('mEditGestor'); renderGestor();
  toast('Entrega actualizada ✓','ok');
};

window.asignarGestorObra=function(id){
  const p=gestorPagos.find(p=>p.id===id);
  if(!p){toast('No encontrado','err');return}
  // Open the edit modal focused on obra assignment
  window.editGestorPago(id);
};

window.addGestorEntregaObra=function(obraId){
  // Pre-fill the form with this obra and scroll to form
  gs('gp-fecha').value=today();
  gs('gp-monto').value='';
  gs('gp-concepto').value='';
  populateGestorObraSelect('gp-obra');
  gs('gp-obra').value=obraId;
  // Scroll to form
  const formCard=gs('gp-fecha').closest('.card');
  if(formCard) formCard.scrollIntoView({behavior:'smooth',block:'start'});
  gs('gp-monto').focus();
  toast('Cargá la entrega para '+(obras[obraId]?.nombre||'esta obra'),'info');
};

window.updateGestorMontoObra=async function(obraId,val){
  if(!obras[obraId])return;
  const num=parseFloat(val);
  const autoCalc=calcCon(obraId)*(obraGes(obraId)/100);
  // If the user typed the same as the auto value, treat as no override
  if(!isNaN(num)&&Math.abs(num-autoCalc)<1){
    delete obras[obraId].gestorMonto;
  }else{
    obras[obraId].gestorMonto=isNaN(num)?'':num;
  }
  await fbSet('obras/'+obraId,obras[obraId]);
  saveCache(); renderGestor();
  toast('Monto del gestor actualizado ✓','ok');
};

window.resetGestorMontoObra=async function(obraId){
  if(!obras[obraId])return;
  delete obras[obraId].gestorMonto;
  await fbSet('obras/'+obraId,obras[obraId]);
  saveCache(); renderGestor();
  toast('Vuelto al cálculo automático ('+obraGes(obraId)+'%)','ok');
};

window.quickAddGestorObra=async function(obraId){
  if(obras[obraId]?.estado==='FINALIZADA'){toast('🔒 Obra FINALIZADA — no se puede asignar gastos','err');return}
  const mEl=gs('gqa-m-'+obraId);
  const cEl=gs('gqa-c-'+obraId);
  const monto=parseFloat(mEl?.value)||0;
  if(!monto){toast('Ingresá el monto','err');return}
  const p={id:uid(),fecha:today(),monto,concepto:cEl?.value?.trim()||'Entrega semanal',obraId};
  gestorPagos.push(p);
  await fbSet('gestor/pagos',{lista:gestorPagos});
  saveCache(); renderGestor();
  toast('Entrega registrada en '+(obras[obraId]?.nombre||'obra')+' ✓','ok');
};

window.limpiarGestorObra=function(obraId){
  const o=obras[obraId]; if(!o)return;
  const pagosAsignados=gestorPagos.filter(p=>p.obraId===obraId);
  const msg='¿Limpiar datos del gestor para "'+o.nombre+'"?\n'
    +(pagosAsignados.length?'— Se eliminarán '+pagosAsignados.length+' entrega(s)\n':'')
    +'— Se reseteará el monto manual (si existe)';
  requireAuth(msg,async()=>{
    gestorPagos=gestorPagos.filter(p=>p.obraId!==obraId);
    await fbSet('gestor/pagos',{lista:gestorPagos});
    if(o.gestorMonto!=null){delete o.gestorMonto; await fbSet('obras/'+obraId,o);}
    saveCache(); renderGestor(); toast('Datos del gestor limpiados para "'+o.nombre+'" ✓','ok');
  });
};

window.resetTodosGestorAuto=function(){
  const conOverride=Object.values(obras).filter(o=>o.gestorMonto!=null&&o.gestorMonto!=="");
  if(!conOverride.length){toast("No hay montos manuales activos","info");return}
  requireAuth("¿Resetear los "+conOverride.length+" monto(s) manuales a cálculo automático?",async()=>{
    for(const o of conOverride){delete o.gestorMonto;await fbSet("obras/"+ o.id,o);}
    saveCache(); renderGestor(); toast("Todos los montos reseteados a auto ✓","ok");
  });
};

window.borrarTodosGestor=function(){
  if(!gestorPagos.length){toast('No hay entregas para borrar','info');return}
  requireAuth('⚠️ Vas a borrar las '+gestorPagos.length+' entregas al gestor.',async()=>{
    gestorPagos=[];
    await fbSet('gestor/pagos',{lista:gestorPagos});
    saveCache(); renderGestor(); toast('Todas las entregas eliminadas ✓','ok');
  });
};

// ═══════════════════════════════════════
// AYUDA SOCIAL MODULE
// ═══════════════════════════════════════
function calcAyudaAdeudadoObra(id){
  const o=obras[id];
  if(o&&o.ayudaMonto!=null&&o.ayudaMonto!==''){
    const manual=parseFloat(o.ayudaMonto);
    if(!isNaN(manual)) return manual;
  }
  return calcCon(id)*(obraAy(id)/100);
}
function calcAyudaAdeudado(){
  return Object.values(obras).reduce((s,o)=>s+calcAyudaAdeudadoObra(o.id),0);
}
function calcAyudaEntregado(){
  return ayudaSocialPagos.reduce((s,p)=>s+(parseFloat(p.monto)||0),0);
}
function calcAyudaEntregadoObra(id){
  return ayudaSocialPagos.filter(p=>p.obraId===id).reduce((s,p)=>s+(parseFloat(p.monto)||0),0);
}
function calcAyudaSinAsignar(){
  return ayudaSocialPagos.filter(p=>!p.obraId).reduce((s,p)=>s+(parseFloat(p.monto)||0),0);
}

function populateAyudaObraSelect(selId){
  const sel=gs(selId);
  if(!sel) return;
  const val=sel.value;
  sel.innerHTML='<option value="">— Sin asignar —</option>';
  Object.values(obras).sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'')).forEach(o=>{
    const opt=document.createElement('option');
    opt.value=o.id; opt.textContent=(o.num?'Nº'+o.num+' – ':'')+o.nombre;
    sel.appendChild(opt);
  });
  if(val) sel.value=val;
}

function renderAyudaSocial(){
  populateAyudaObraSelect('as-obra');
  gs('as-fecha').value=gs('as-fecha').value||today();
  const adeudado=calcAyudaAdeudado();
  const entregado=calcAyudaEntregado();
  const saldo=adeudado-entregado;
  gs('as-adeudado').textContent=fGs(adeudado);
  gs('as-entregado').textContent=fGs(entregado);
  gs('as-saldo').textContent=fGs(saldo);
  gs('as-saldo').style.color=saldo>0?'var(--amber)':'var(--green)';
  gs('as-count').textContent=ayudaSocialPagos.length;
  const sortVal=(gs('ayudaSort')?.value)||'num-asc';
  const filterVal=(gs('ayudaFilter')?.value)||'todas';
  let obraList=Object.values(obras);
  const _salMap={};
  obraList.forEach(o=>{
    const ad=calcAyudaAdeudadoObra(o.id);
    const en=calcAyudaEntregadoObra(o.id);
    const nPagos=ayudaSocialPagos.filter(p=>p.obraId===o.id).length;
    _salMap[o.id]={sal:ad-en, pct:ad>0?Math.min(100,en/ad*100):0, nPagos};
  });
  if(filterVal==='actuales')      obraList=obraList.filter(o=>obraAy(o.id)!==0);
  if(filterVal==='pendientes')    obraList=obraList.filter(o=>_salMap[o.id].sal>0.5);
  if(filterVal==='saldadas')      obraList=obraList.filter(o=>_salMap[o.id].sal<=0.5);
  if(filterVal==='con-entregas')  obraList=obraList.filter(o=>_salMap[o.id].nPagos>0);
  if(filterVal==='sin-entregas')  obraList=obraList.filter(o=>_salMap[o.id].nPagos===0);
  obraList.sort((a,b)=>{
    if(sortVal==='num-asc')  return (parseInt(a.num)||0)-(parseInt(b.num)||0);
    if(sortVal==='num-desc') return (parseInt(b.num)||0)-(parseInt(a.num)||0);
    if(sortVal==='nombre-asc') return (a.nombre||'').localeCompare(b.nombre||'');
    if(sortVal==='pendiente-desc') return _salMap[b.id].sal-_salMap[a.id].sal;
    if(sortVal==='pendiente-asc')  return _salMap[a.id].sal-_salMap[b.id].sal;
    if(sortVal==='cubierto-desc')  return _salMap[b.id].pct-_salMap[a.id].pct;
    if(sortVal==='cubierto-asc')   return _salMap[a.id].pct-_salMap[b.id].pct;
    return 0;
  });
  if(obraList.length){
    const totalObras=Object.keys(obras).length;
    const sinAsignar=calcAyudaSinAsignar();
    let html=obraList.map(o=>{
      const con=calcCon(o.id);
      const ayPct=obraAy(o.id);
      const autoCalc=con*(ayPct/100);
      const hasOverride=o.ayudaMonto!=null&&o.ayudaMonto!=='';
      const adeObra=calcAyudaAdeudadoObra(o.id);
      const entObra=calcAyudaEntregadoObra(o.id);
      const salObra=adeObra-entObra;
      const pctPagado=adeObra>0?Math.min(100,entObra/adeObra*100):0;
      const pagosObra=ayudaSocialPagos.filter(p=>p.obraId===o.id).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
      const salColor=salObra>0?'var(--acc3)':'var(--green)';
      let entregasHtml='';
      if(pagosObra.length){
        entregasHtml=pagosObra.map(p=>`
          <div class="gestor-card-entrega">
            <div class="gestor-card-entrega-left">
              <div class="gestor-card-entrega-concepto">${p.concepto||'Entrega'}</div>
              <div class="gestor-card-entrega-fecha">${p.fecha||'—'}</div>
            </div>
            <div class="gestor-card-entrega-right">
              <span class="gestor-card-entrega-monto" style="color:var(--green)">${fGs(p.monto)}</span>
              <button class="del-btn" style="width:18px;height:18px;font-size:.52rem" onclick="editAyudaPago('${p.id}')" title="Editar">✏️</button>
              <button class="del-btn" style="width:18px;height:18px;font-size:.52rem" onclick="delAyudaPago('${p.id}')" title="Eliminar">✕</button>
            </div>
          </div>`).join('');
      }else{
        entregasHtml='<div class="gestor-card-empty">Sin entregas asignadas aún</div>';
      }
      const autoBtn=`<button class="gestor-corresponde-auto" 
        onclick="resetAyudaMontoObra('${o.id}')" 
        title="${hasOverride?'Volver al cálculo automático':'Ya en automático: '+ayPct+'% de contrato'}"
        style="${hasOverride?'':'opacity:.35;cursor:default;pointer-events:none'}">↺ Auto (${ayPct}%)</button>`;
      return`<div class="gestor-obra-card">
        <div class="gestor-obra-card-header">
          <div class="gestor-obra-card-title" style="flex:1;min-width:0">
            <span class="gestor-obra-card-num" style="flex-shrink:0">${o.num?'Nº'+o.num:''}</span>
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${o.nombre||'Sin nombre'}</span>
          </div>
          <div style="display:flex;align-items:center;gap:.35rem;flex-shrink:0;margin-left:.4rem">
            <span style="font-size:.58rem;color:var(--muted);font-family:'JetBrains Mono',monospace;white-space:nowrap">Contrato: ${fGs(con)}</span>
            <button class="btn btn-ghost btn-xs" style="padding:2px 7px;font-size:.58rem;flex-shrink:0" onclick="event.stopPropagation();editObra('${o.id}')" title="Editar obra">✏️</button>
            <button class="btn btn-danger btn-xs" style="padding:2px 7px;font-size:.58rem;flex-shrink:0" onclick="event.stopPropagation();limpiarAyudaObra('${o.id}')" title="Limpiar datos de Ayuda Social para esta obra">🧹</button>
          </div>
        </div>
        <div class="gestor-obra-card-body">
          <div class="gestor-obra-corresponde">
            <div>
              <div class="gestor-obra-corresponde-label" style="color:var(--green)">Corresponde (Ayuda Social)</div>
              <div style="font-size:.5rem;color:var(--muted);margin-top:1px">${hasOverride?'⚠️ Monto manual':'Auto: '+ayPct+'% de '+fGs(con)}</div>
            </div>
            <div class="gestor-corresponde-edit">
              <input type="number" class="gestor-corresponde-input" value="${Math.round(adeObra)}" 
                onchange="updateAyudaMontoObra('${o.id}',this.value)"
                title="Editá el monto de Ayuda Social para esta obra">
              ${autoBtn}
            </div>
          </div>
          <div class="gestor-obra-card-stats">
            <div class="gestor-obra-stat"><span class="gestor-obra-stat-label">Total Entregado</span><span class="gestor-obra-stat-val" style="color:var(--green)">${fGs(entObra)}</span></div>
            <div class="gestor-obra-stat"><span class="gestor-obra-stat-label">Pendiente</span><span class="gestor-obra-stat-val" style="color:${salColor}">${fGs(salObra)}</span></div>
          </div>
          <div class="prog-wrap" style="margin-top:.35rem;margin-bottom:.1rem">
            <div class="prog-bar"><div class="prog-fill" style="width:${pctPagado}%;background:var(--green)"></div></div>
            <div style="font-size:.52rem;color:var(--muted);text-align:right;margin-top:2px">${pctPagado.toFixed(0)}% cubierto</div>
          </div>
          <div style="font-size:.54rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-top:.5rem;margin-bottom:.25rem;display:flex;align-items:center;gap:6px">
            <span style="width:12px;height:1.5px;background:linear-gradient(90deg,var(--green),transparent);display:inline-block;border-radius:1px"></span>
            Entregas (${pagosObra.length})
          </div>
          <div class="gestor-card-list">${entregasHtml}</div>
          <div class="gestor-quick-add">
            <input type="number" class="gestor-quick-input" id="aqa-m-${o.id}" placeholder="Monto" style="width:90px">
            <input type="text" class="gestor-quick-input" id="aqa-c-${o.id}" placeholder="Concepto..." style="flex:1;min-width:0"
              onkeydown="if(event.key==='Enter')quickAddAyudaObra('${o.id}')">
            <button class="btn btn-xs" style="background:rgba(61,212,154,.15);color:var(--green);border:1px solid rgba(61,212,154,.2);padding:3px 8px;font-size:.6rem" 
              onclick="quickAddAyudaObra('${o.id}')">+ Entrega</button>
          </div>
        </div>
      </div>`;
    }).join('');
    const sinPagos=ayudaSocialPagos.filter(p=>!p.obraId).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
    if(sinPagos.length){
      let sinHtml=sinPagos.map(p=>`
        <div class="gestor-card-entrega">
          <div class="gestor-card-entrega-left">
            <div class="gestor-card-entrega-concepto">${p.concepto||'Entrega'}</div>
            <div class="gestor-card-entrega-fecha">${p.fecha||'—'}</div>
          </div>
          <div class="gestor-card-entrega-right">
            <span class="gestor-card-entrega-monto" style="color:var(--green)">${fGs(p.monto)}</span>
            <button class="del-btn" style="width:18px;height:18px;font-size:.52rem" onclick="editAyudaPago('${p.id}')" title="Editar/Asignar">✏️</button>
            <button class="del-btn" style="width:18px;height:18px;font-size:.52rem" onclick="delAyudaPago('${p.id}')" title="Eliminar">✕</button>
          </div>
        </div>`).join('');
      html+=`<div class="gestor-obra-card" style="border-color:rgba(61,212,154,.25)">
        <div class="gestor-obra-card-header" style="background:linear-gradient(135deg,rgba(61,212,154,.06),transparent)">
          <div class="gestor-obra-card-title" style="color:var(--green)">⚠️ Sin asignar a obra</div>
        </div>
        <div class="gestor-obra-card-body">
          <div class="gestor-obra-card-stats">
            <div class="gestor-obra-stat"><span class="gestor-obra-stat-label">Total sin asignar</span><span class="gestor-obra-stat-val" style="color:var(--green)">${fGs(sinAsignar)}</span></div>
          </div>
          <div style="font-size:.54rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-top:.5rem;margin-bottom:.25rem;display:flex;align-items:center;gap:6px">
            <span style="width:12px;height:1.5px;background:linear-gradient(90deg,var(--green),transparent);display:inline-block;border-radius:1px"></span>
            Entregas pendientes de asignar (${sinPagos.length})
          </div>
          <div class="gestor-card-list">${sinHtml}</div>
        </div>
      </div>`;
    }
    const filterChip=filterVal!=='todas'?`<div style="font-size:.62rem;color:var(--green);margin-bottom:.5rem;display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:var(--green);flex-shrink:0"></span>Mostrando <b>${obraList.length}</b> de ${totalObras} obras</div>`:'';
    gs('ayudaObraGrid').innerHTML=filterChip+html;
  }else{
    const totalObras=Object.keys(obras).length;
    const msg=totalObras>0
      ?`<div style="color:var(--muted);font-size:.76rem">Ninguna obra coincide con el filtro — <button class="btn btn-ghost btn-xs" onclick="document.getElementById('ayudaFilter').value='todas';renderAyudaSocial()" style="font-size:.68rem">Ver todas</button></div>`
      :'<div style="color:var(--muted);font-size:.76rem">Sin obras registradas</div>';
    gs('ayudaObraGrid').innerHTML=msg;
  }

  // Historial
  const list=[...ayudaSocialPagos].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
  const hcnt=gs('as-hist-count');
  if(hcnt) hcnt.textContent=list.length?'('+list.length+')':'';
  const tbody=gs('ayudaTbody');
  if(!list.length){
    tbody.innerHTML='<tr class="empty-row"><td colspan="6">Sin entregas registradas</td></tr>';
    gs('as-tf').textContent='₲ 0'; return;
  }
  tbody.innerHTML=list.map((p,i)=>{
    const oNombre=p.obraId&&obras[p.obraId]?(obras[p.obraId].num?'Nº'+obras[p.obraId].num+' – ':'')+obras[p.obraId].nombre:'';
    return`<tr${p.obraId?' style="background:rgba(61,212,154,.03)"':''}>
      <td style="color:var(--muted);font-size:.68rem;text-align:center;font-weight:600">${i+1}</td>
      <td>${p.fecha||'—'}</td>
      <td style="font-family:'Syne',sans-serif;color:var(--txt);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.concepto||''}">${p.concepto||'Entrega'}</td>
      <td style="color:var(--green);font-weight:600">${fGs(p.monto)}</td>
      <td>${p.obraId?'<span class="gestor-obra-tag" onclick="selectObra(\''+p.obraId+'\')">🏗️ '+oNombre+'</span>':'<span class="gestor-obra-tag sin">Sin asignar</span>'}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-ghost btn-xs" onclick="editAyudaPago('${p.id}')" title="Editar">✏️</button>
        <button class="btn btn-ghost btn-xs" onclick="asignarAyudaObra('${p.id}')" title="Asignar a obra">🏗️</button>
        <button class="btn btn-danger btn-xs" onclick="delAyudaPago('${p.id}')">✕</button>
      </td>
    </tr>`;
  }).join('');
  gs('as-tf').textContent=fGs(entregado);
}

window.clrAyudaForm=function(){
  gs('as-fecha').value=today(); gs('as-monto').value=''; gs('as-concepto').value=''; gs('as-obra').value='';
};
window.saveAyudaPago=async function(){
  const monto=parseFloat(gs('as-monto').value)||0;
  if(!monto){toast('Ingresá el monto','err');return}
  const obraId=gs('as-obra').value||'';
  if(obraId&&obras[obraId]?.estado==='FINALIZADA'){toast('🔒 Obra FINALIZADA — no se puede asignar gastos','err');return}
  const p={id:uid(),fecha:v('as-fecha')||today(),monto,
    concepto:v('as-concepto')||'Ayuda social',
    obraId};
  ayudaSocialPagos.push(p);
  await fbSet('ayudaSocial/pagos',{lista:ayudaSocialPagos});
  saveCache(); window.clrAyudaForm(); gs('as-fecha').value=today();
  renderAyudaSocial(); toast('Entrega de Ayuda Social registrada ✓','ok');
};
window.delAyudaPago=function(id){
  requireAuth('⚠️ Eliminar esta entrega de Ayuda Social.',async()=>{
    ayudaSocialPagos=ayudaSocialPagos.filter(p=>p.id!==id);
    await fbSet('ayudaSocial/pagos',{lista:ayudaSocialPagos});
    saveCache(); renderAyudaSocial(); toast('Entrega eliminada','info');
  });
};
window.editAyudaPago=function(id){
  const p=ayudaSocialPagos.find(p=>p.id===id);
  if(!p){toast('No encontrado','err');return}
  gs('eas-id').value=id;
  gs('eas-fecha').value=p.fecha||'';
  gs('eas-monto').value=p.monto||0;
  gs('eas-concepto').value=p.concepto||'';
  populateAyudaObraSelect('eas-obra');
  gs('eas-obra').value=p.obraId||'';
  openM('mEditAyuda');
};
window.saveEditAyuda=async function(){
  const id=gs('eas-id').value;
  const p=ayudaSocialPagos.find(p=>p.id===id);
  if(!p){toast('No encontrado','err');return}
  const newObraId=gs('eas-obra').value||'';
  if(newObraId&&obras[newObraId]?.estado==='FINALIZADA'){toast('🔒 No se puede asignar a obra FINALIZADA','err');return}
  p.fecha=gs('eas-fecha').value;
  p.monto=parseFloat(gs('eas-monto').value)||0;
  p.concepto=gs('eas-concepto').value;
  p.obraId=newObraId;
  await fbSet('ayudaSocial/pagos',{lista:ayudaSocialPagos});
  saveCache(); closeM('mEditAyuda'); renderAyudaSocial();
  toast('Entrega actualizada ✓','ok');
};
window.asignarAyudaObra=function(id){
  window.editAyudaPago(id);
};
window.updateAyudaMontoObra=async function(obraId,val){
  if(!obras[obraId])return;
  const num=parseFloat(val);
  const autoCalc=calcCon(obraId)*(obraAy(obraId)/100);
  if(!isNaN(num)&&Math.abs(num-autoCalc)<1){
    delete obras[obraId].ayudaMonto;
  }else{
    obras[obraId].ayudaMonto=isNaN(num)?'':num;
  }
  await fbSet('obras/'+obraId,obras[obraId]);
  saveCache(); renderAyudaSocial();
  toast('Monto de Ayuda Social actualizado ✓','ok');
};
window.resetAyudaMontoObra=async function(obraId){
  if(!obras[obraId])return;
  delete obras[obraId].ayudaMonto;
  await fbSet('obras/'+obraId,obras[obraId]);
  saveCache(); renderAyudaSocial();
  toast('Vuelto al cálculo automático ('+obraAy(obraId)+'%)','ok');
};
window.quickAddAyudaObra=async function(obraId){
  if(obras[obraId]?.estado==='FINALIZADA'){toast('🔒 Obra FINALIZADA — no se puede asignar gastos','err');return}
  const mEl=gs('aqa-m-'+obraId);
  const cEl=gs('aqa-c-'+obraId);
  const monto=parseFloat(mEl?.value)||0;
  if(!monto){toast('Ingresá el monto','err');return}
  const p={id:uid(),fecha:today(),monto,concepto:cEl?.value?.trim()||'Ayuda social',obraId};
  ayudaSocialPagos.push(p);
  await fbSet('ayudaSocial/pagos',{lista:ayudaSocialPagos});
  saveCache(); renderAyudaSocial();
  toast('Entrega registrada en '+(obras[obraId]?.nombre||'obra')+' ✓','ok');
};
window.limpiarAyudaObra=function(obraId){
  const o=obras[obraId]; if(!o)return;
  const pagosAsignados=ayudaSocialPagos.filter(p=>p.obraId===obraId);
  const msg='¿Limpiar datos de Ayuda Social para "'+o.nombre+'"?\n'
    +(pagosAsignados.length?'— Se eliminarán '+pagosAsignados.length+' entrega(s)\n':'')
    +'— Se reseteará el monto manual (si existe)';
  requireAuth(msg,async()=>{
    ayudaSocialPagos=ayudaSocialPagos.filter(p=>p.obraId!==obraId);
    await fbSet('ayudaSocial/pagos',{lista:ayudaSocialPagos});
    if(o.ayudaMonto!=null){delete o.ayudaMonto; await fbSet('obras/'+obraId,o);}
    saveCache(); renderAyudaSocial(); toast('Datos de Ayuda Social limpiados para "'+o.nombre+'" ✓','ok');
  });
};
window.resetTodosAyudaAuto=function(){
  const conOverride=Object.values(obras).filter(o=>o.ayudaMonto!=null&&o.ayudaMonto!=="");
  if(!conOverride.length){toast("No hay montos manuales activos","info");return}
  requireAuth("¿Resetear los "+conOverride.length+" monto(s) manuales a cálculo automático?",async()=>{
    for(const o of conOverride){delete o.ayudaMonto;await fbSet("obras/"+ o.id,o);}
    saveCache(); renderAyudaSocial(); toast("Todos los montos reseteados a auto ✓","ok");
  });
};
window.borrarTodosAyuda=function(){
  if(!ayudaSocialPagos.length){toast('No hay entregas para borrar','info');return}
  requireAuth('⚠️ Vas a borrar las '+ayudaSocialPagos.length+' entregas de Ayuda Social.',async()=>{
    ayudaSocialPagos=[];
    await fbSet('ayudaSocial/pagos',{lista:ayudaSocialPagos});
    saveCache(); renderAyudaSocial(); toast('Todas las entregas eliminadas ✓','ok');
  });
};

// ═══════════════════════════════════════
// CONTRATISTA MODULE
// ═══════════════════════════════════════
function calcContratistaAdeudado(){
  return Object.values(obras).reduce((s,o)=>s+calcContratistaAdeudadoObra(o.id),0);
}
function calcContratistaEntregado(){
  return contratistaPagos.reduce((s,p)=>s+(parseFloat(p.monto)||0),0);
}
function calcContratistaEntregadoObra(id){
  return contratistaPagos.filter(p=>p.obraId===id).reduce((s,p)=>s+(parseFloat(p.monto)||0),0);
}
function calcContratistaSinAsignar(){
  return contratistaPagos.filter(p=>!p.obraId).reduce((s,p)=>s+(parseFloat(p.monto)||0),0);
}
function populateContratistaObraSelect(selId){
  const sel=gs(selId);
  if(!sel) return;
  const val=sel.value;
  sel.innerHTML='<option value="">— Sin asignar —</option>';
  Object.values(obras).filter(o=>(o.estado||'EN EJECUCIÓN')==='EN EJECUCIÓN').sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'')).forEach(o=>{
    const opt=document.createElement('option');
    opt.value=o.id; opt.textContent=(o.num?'Nº'+o.num+' – ':'')+o.nombre;
    sel.appendChild(opt);
  });
  if(val) sel.value=val;
}

function renderContratista(){
  populateContratistaObraSelect('ct-obra');
  gs('ct-fecha').value=gs('ct-fecha').value||today();
  const adeudado=calcContratistaAdeudado();
  const entregado=calcContratistaEntregado();
  const saldo=adeudado-entregado;
  gs('ct-adeudado').textContent=fGs(adeudado);
  gs('ct-entregado').textContent=fGs(entregado);
  gs('ct-saldo').textContent=fGs(saldo);
  gs('ct-saldo').style.color=saldo>0?'var(--purple)':'var(--green)';
  gs('ct-count').textContent=contratistaPagos.length;
  const sortVal=(gs('contratistaSort')?.value)||'num-asc';
  const filterVal=(gs('contratistaFilter')?.value)||'todas';
  // BASE: solo obras EN EJECUCIÓN
  let obraList=Object.values(obras).filter(o=>(o.estado||'EN EJECUCIÓN')==='EN EJECUCIÓN');
  const _salMap={};
  obraList.forEach(o=>{
    const ad=calcContratistaAdeudadoObra(o.id);
    const en=calcContratistaEntregadoObra(o.id);
    const nPagos=contratistaPagos.filter(p=>p.obraId===o.id).length;
    _salMap[o.id]={sal:ad-en, pct:ad>0?Math.min(100,en/ad*100):0, nPagos, ad};
  });
  if(filterVal==='con-monto')      obraList=obraList.filter(o=>_salMap[o.id].ad>0);
  if(filterVal==='pendientes')    obraList=obraList.filter(o=>_salMap[o.id].sal>0.5);
  if(filterVal==='saldadas')      obraList=obraList.filter(o=>_salMap[o.id].ad>0&&_salMap[o.id].sal<=0.5);
  if(filterVal==='con-entregas')  obraList=obraList.filter(o=>_salMap[o.id].nPagos>0);
  if(filterVal==='sin-entregas')  obraList=obraList.filter(o=>_salMap[o.id].nPagos===0);
  obraList.sort((a,b)=>{
    if(sortVal==='num-asc')  return (parseInt(a.num)||0)-(parseInt(b.num)||0);
    if(sortVal==='num-desc') return (parseInt(b.num)||0)-(parseInt(a.num)||0);
    if(sortVal==='nombre-asc') return (a.nombre||'').localeCompare(b.nombre||'');
    if(sortVal==='pendiente-desc') return _salMap[b.id].sal-_salMap[a.id].sal;
    if(sortVal==='pendiente-asc')  return _salMap[a.id].sal-_salMap[b.id].sal;
    if(sortVal==='cubierto-desc')  return _salMap[b.id].pct-_salMap[a.id].pct;
    if(sortVal==='cubierto-asc')   return _salMap[a.id].pct-_salMap[b.id].pct;
    return 0;
  });
  // Leer estados desplegados desde localStorage
  let _ctOpen={};
  try{_ctOpen=JSON.parse(localStorage.getItem('th_ct_open')||'{}');}catch(e){}
  if(obraList.length){
    const totalEjecucion=Object.values(obras).filter(o=>(o.estado||'EN EJECUCIÓN')==='EN EJECUCIÓN').length;
    const sinAsignar=calcContratistaSinAsignar();
    let html=obraList.map(o=>{
      const con=calcCon(o.id);
      const adeObra=calcContratistaAdeudadoObra(o.id);
      const entObra=calcContratistaEntregadoObra(o.id);
      const salObra=adeObra-entObra;
      const pctPagado=adeObra>0?Math.min(100,entObra/adeObra*100):0;
      const pctContrato=con>0?(adeObra/con*100):0;
      const pagosObra=contratistaPagos.filter(p=>p.obraId===o.id).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
      const salColor=salObra>0?'var(--acc3)':'var(--green)';
      const isOpen=_ctOpen[o.id]===true;
      let entregasHtml='';
      if(pagosObra.length){
        entregasHtml=pagosObra.map(p=>`
          <div class="gestor-card-entrega">
            <div class="gestor-card-entrega-left">
              <div class="gestor-card-entrega-concepto">${p.concepto||'Entrega'}</div>
              <div class="gestor-card-entrega-fecha">${p.fecha||'—'}</div>
            </div>
            <div class="gestor-card-entrega-right">
              <span class="gestor-card-entrega-monto" style="color:var(--purple)">${fGs(p.monto)}</span>
              <button class="del-btn" style="width:18px;height:18px;font-size:.52rem" onclick="event.stopPropagation();editContratistaPago('${p.id}')" title="Editar">✏️</button>
              <button class="del-btn" style="width:18px;height:18px;font-size:.52rem" onclick="event.stopPropagation();delContratistaPago('${p.id}')" title="Eliminar">✕</button>
            </div>
          </div>`).join('');
      }else{
        entregasHtml='<div class="gestor-card-empty">Sin entregas asignadas aún</div>';
      }
      // Chips del header
      const pendChip=salObra>0
        ?`<span class="ct-acc-chip" style="background:rgba(224,82,82,.1);color:var(--acc3)">Pend: ${fGs(salObra)}</span>`
        :(adeObra>0?`<span class="ct-acc-chip" style="background:rgba(61,212,154,.1);color:var(--green)">✓ Saldado</span>`:'');
      const pctChip=adeObra>0?`<span class="ct-acc-chip" style="background:rgba(157,127,218,.1);color:var(--purple)">${pctContrato.toFixed(1)}%</span>`
        :`<span class="ct-acc-chip" style="background:rgba(138,150,176,.08);color:var(--muted)">Sin monto</span>`;
      return`<div class="ct-accordion">
        <div class="ct-acc-header${isOpen?' open':''}" onclick="toggleCtAccordion('${o.id}',this)">
          <div class="ct-acc-left">
            <span class="ct-acc-num">${o.num?'Nº'+o.num:''}</span>
            <span class="ct-acc-name">${o.nombre||'Sin nombre'}</span>
          </div>
          <div class="ct-acc-right">
            <span style="font-size:.55rem;color:var(--muted);font-family:'JetBrains Mono',monospace">${fGs(con)}</span>
            ${pctChip}${pendChip}
            <span class="ct-acc-arrow">▼</span>
          </div>
        </div>
        <div class="ct-acc-body" style="${isOpen?'display:block':''}">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:.5rem;flex-wrap:wrap;margin-bottom:.6rem">
            <div class="gestor-obra-corresponde" style="background:rgba(157,127,218,.06);border-color:rgba(157,127,218,.12);flex:1;min-width:250px;margin:0">
              <div>
                <div class="gestor-obra-corresponde-label" style="color:var(--purple)">Le corresponde al contratista</div>
                <div style="font-size:.5rem;color:var(--muted);margin-top:1px">Monto manual — <b style="color:var(--purple)">${pctContrato.toFixed(2)}%</b> del contrato</div>
              </div>
              <div class="gestor-corresponde-edit">
                <input type="number" class="gestor-corresponde-input" style="border-color:rgba(157,127,218,.25);color:var(--purple)" value="${Math.round(adeObra)}" 
                  onclick="event.stopPropagation()"
                  onchange="updateContratistaMontoObra('${o.id}',this.value)"
                  placeholder="Ingresá monto"
                  title="Ingresá el monto que le corresponde al contratista por esta obra">
              </div>
            </div>
            <div style="display:flex;gap:.3rem;flex-shrink:0">
              <button class="btn btn-ghost btn-xs" style="padding:2px 7px;font-size:.58rem" onclick="event.stopPropagation();editObra('${o.id}')" title="Editar obra">✏️</button>
              <button class="btn btn-danger btn-xs" style="padding:2px 7px;font-size:.58rem" onclick="event.stopPropagation();limpiarContratistaObra('${o.id}')" title="Limpiar datos del contratista">🧹</button>
            </div>
          </div>
          ${adeObra>0?`<div style="font-size:.56rem;color:var(--purple);margin-bottom:.5rem;text-align:center;font-family:'JetBrains Mono',monospace;font-weight:600;letter-spacing:.03em;background:rgba(157,127,218,.06);padding:3px 8px;border-radius:4px">
            📊 ${pctContrato.toFixed(2)}% del contrato total (${fGs(con)})
          </div>`:''}
          <div class="gestor-obra-card-stats" style="margin-bottom:.4rem">
            <div class="gestor-obra-stat"><span class="gestor-obra-stat-label">Total Entregado</span><span class="gestor-obra-stat-val" style="color:var(--purple)">${fGs(entObra)}</span></div>
            <div class="gestor-obra-stat"><span class="gestor-obra-stat-label">Pendiente</span><span class="gestor-obra-stat-val" style="color:${salColor}">${fGs(salObra)}</span></div>
          </div>
          <div class="prog-wrap" style="margin-top:.2rem;margin-bottom:.3rem">
            <div class="prog-bar"><div class="prog-fill" style="width:${pctPagado}%;background:var(--purple)"></div></div>
            <div style="font-size:.52rem;color:var(--muted);text-align:right;margin-top:2px">${pctPagado.toFixed(0)}% cubierto</div>
          </div>
          <div style="font-size:.54rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-top:.5rem;margin-bottom:.25rem;display:flex;align-items:center;gap:6px">
            <span style="width:12px;height:1.5px;background:linear-gradient(90deg,var(--purple),transparent);display:inline-block;border-radius:1px"></span>
            Entregas (${pagosObra.length})
          </div>
          <div class="gestor-card-list">${entregasHtml}</div>
          <div class="gestor-quick-add" style="background:rgba(157,127,218,.04);border-color:rgba(157,127,218,.2)">
            <input type="number" class="gestor-quick-input" id="cqa-m-${o.id}" placeholder="Monto" style="width:90px" onclick="event.stopPropagation()">
            <input type="text" class="gestor-quick-input" id="cqa-c-${o.id}" placeholder="Concepto..." style="flex:1;min-width:0"
              onclick="event.stopPropagation()"
              onkeydown="if(event.key==='Enter')quickAddContratistaObra('${o.id}')">
            <button class="btn btn-xs" style="background:rgba(157,127,218,.15);color:var(--purple);border:1px solid rgba(157,127,218,.2);padding:3px 8px;font-size:.6rem" 
              onclick="event.stopPropagation();quickAddContratistaObra('${o.id}')">+ Entrega</button>
          </div>
        </div>
      </div>`;
    }).join('');
    // Pagos sin asignar
    const sinPagos=contratistaPagos.filter(p=>!p.obraId).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
    if(sinPagos.length){
      const sinOpen=_ctOpen['_sin']===true;
      let sinHtml=sinPagos.map(p=>`
        <div class="gestor-card-entrega">
          <div class="gestor-card-entrega-left">
            <div class="gestor-card-entrega-concepto">${p.concepto||'Entrega'}</div>
            <div class="gestor-card-entrega-fecha">${p.fecha||'—'}</div>
          </div>
          <div class="gestor-card-entrega-right">
            <span class="gestor-card-entrega-monto" style="color:var(--purple)">${fGs(p.monto)}</span>
            <button class="del-btn" style="width:18px;height:18px;font-size:.52rem" onclick="event.stopPropagation();editContratistaPago('${p.id}')" title="Editar/Asignar">✏️</button>
            <button class="del-btn" style="width:18px;height:18px;font-size:.52rem" onclick="event.stopPropagation();delContratistaPago('${p.id}')" title="Eliminar">✕</button>
          </div>
        </div>`).join('');
      html+=`<div class="ct-accordion" style="border-color:rgba(157,127,218,.25)">
        <div class="ct-acc-header${sinOpen?' open':''}" onclick="toggleCtAccordion('_sin',this)" style="background:rgba(224,82,82,.04)">
          <div class="ct-acc-left">
            <span class="ct-acc-name" style="color:var(--purple)">⚠️ Sin asignar a obra (${sinPagos.length})</span>
          </div>
          <div class="ct-acc-right">
            <span class="ct-acc-chip" style="background:rgba(157,127,218,.1);color:var(--purple)">${fGs(sinAsignar)}</span>
            <span class="ct-acc-arrow">▼</span>
          </div>
        </div>
        <div class="ct-acc-body" style="${sinOpen?'display:block':''}">
          <div class="gestor-card-list">${sinHtml}</div>
        </div>
      </div>`;
    }
    const filterChip=filterVal!=='todas'?`<div style="font-size:.62rem;color:var(--purple);margin-bottom:.5rem;display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:var(--purple);flex-shrink:0"></span>Mostrando <b>${obraList.length}</b> de ${totalEjecucion} obras en ejecución</div>`:'';
    gs('contratistaObraGrid').innerHTML=filterChip+html;
  }else{
    const totalEjecucion=Object.values(obras).filter(o=>(o.estado||'EN EJECUCIÓN')==='EN EJECUCIÓN').length;
    const msg=totalEjecucion>0
      ?`<div style="color:var(--muted);font-size:.76rem">Ninguna obra coincide con el filtro — <button class="btn btn-ghost btn-xs" onclick="document.getElementById('contratistaFilter').value='todas';renderContratista()" style="font-size:.68rem">Ver todas en ejecución</button></div>`
      :'<div style="color:var(--muted);font-size:.76rem">No hay obras en ejecución</div>';
    gs('contratistaObraGrid').innerHTML=msg;
  }

  // Historial
  const list=[...contratistaPagos].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
  const hcnt=gs('ct-hist-count');
  if(hcnt) hcnt.textContent=list.length?'('+list.length+')':'';
  const tbody=gs('contratistaTbody');
  if(!list.length){
    tbody.innerHTML='<tr class="empty-row"><td colspan="6">Sin entregas registradas</td></tr>';
    gs('ct-tf').textContent='₲ 0'; return;
  }
  tbody.innerHTML=list.map((p,i)=>{
    const oNombre=p.obraId&&obras[p.obraId]?(obras[p.obraId].num?'Nº'+obras[p.obraId].num+' – ':'')+obras[p.obraId].nombre:'';
    return`<tr${p.obraId?' style="background:rgba(157,127,218,.03)"':''}>
      <td style="color:var(--muted);font-size:.68rem;text-align:center;font-weight:600">${i+1}</td>
      <td>${p.fecha||'—'}</td>
      <td style="font-family:'Syne',sans-serif;color:var(--txt);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.concepto||''}">${p.concepto||'Entrega'}</td>
      <td style="color:var(--purple);font-weight:600">${fGs(p.monto)}</td>
      <td>${p.obraId?'<span class="gestor-obra-tag" style="background:rgba(157,127,218,.1);color:var(--purple);border-color:rgba(157,127,218,.15)" onclick="selectObra(\''+p.obraId+'\')">🏗️ '+oNombre+'</span>':'<span class="gestor-obra-tag sin">Sin asignar</span>'}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-ghost btn-xs" onclick="editContratistaPago('${p.id}')" title="Editar">✏️</button>
        <button class="btn btn-ghost btn-xs" onclick="asignarContratistaObra('${p.id}')" title="Asignar a obra">🏗️</button>
        <button class="btn btn-danger btn-xs" onclick="delContratistaPago('${p.id}')">✕</button>
      </td>
    </tr>`;
  }).join('');
  gs('ct-tf').textContent=fGs(entregado);
}

window.clrContratistaForm=function(){
  gs('ct-fecha').value=today(); gs('ct-monto').value=''; gs('ct-concepto').value=''; gs('ct-obra').value='';
};
window.toggleCtAccordion=function(id,headerEl){
  let _ctOpen={};
  try{_ctOpen=JSON.parse(localStorage.getItem('th_ct_open')||'{}');}catch(e){}
  const isOpen=headerEl.classList.toggle('open');
  const body=headerEl.nextElementSibling;
  if(body) body.style.display=isOpen?'block':'none';
  _ctOpen[id]=isOpen;
  try{localStorage.setItem('th_ct_open',JSON.stringify(_ctOpen));}catch(e){}
};
window.saveContratistaPago=async function(){
  const monto=parseFloat(gs('ct-monto').value)||0;
  if(!monto){toast('Ingresá el monto','err');return}
  const obraId=gs('ct-obra').value||'';
  if(obraId&&obras[obraId]?.estado==='FINALIZADA'){toast('🔒 Obra FINALIZADA — no se puede asignar gastos','err');return}
  const p={id:uid(),fecha:v('ct-fecha')||today(),monto,
    concepto:v('ct-concepto')||'Pago contratista',
    obraId};
  contratistaPagos.push(p);
  await fbSet('contratista/pagos',{lista:contratistaPagos});
  saveCache(); window.clrContratistaForm(); gs('ct-fecha').value=today();
  renderContratista(); toast('Entrega al contratista registrada ✓','ok');
};
window.delContratistaPago=function(id){
  requireAuth('⚠️ Eliminar esta entrega al contratista.',async()=>{
    contratistaPagos=contratistaPagos.filter(p=>p.id!==id);
    await fbSet('contratista/pagos',{lista:contratistaPagos});
    saveCache(); renderContratista(); toast('Entrega eliminada','info');
  });
};
window.editContratistaPago=function(id){
  const p=contratistaPagos.find(p=>p.id===id);
  if(!p){toast('No encontrado','err');return}
  gs('ect-id').value=id;
  gs('ect-fecha').value=p.fecha||'';
  gs('ect-monto').value=p.monto||0;
  gs('ect-concepto').value=p.concepto||'';
  populateContratistaObraSelect('ect-obra');
  gs('ect-obra').value=p.obraId||'';
  openM('mEditContratista');
};
window.saveEditContratista=async function(){
  const id=gs('ect-id').value;
  const p=contratistaPagos.find(p=>p.id===id);
  if(!p){toast('No encontrado','err');return}
  const newObraId=gs('ect-obra').value||'';
  if(newObraId&&obras[newObraId]?.estado==='FINALIZADA'){toast('🔒 No se puede asignar a obra FINALIZADA','err');return}
  p.fecha=gs('ect-fecha').value;
  p.monto=parseFloat(gs('ect-monto').value)||0;
  p.concepto=gs('ect-concepto').value;
  p.obraId=newObraId;
  await fbSet('contratista/pagos',{lista:contratistaPagos});
  saveCache(); closeM('mEditContratista'); renderContratista();
  toast('Entrega actualizada ✓','ok');
};
window.asignarContratistaObra=function(id){
  window.editContratistaPago(id);
};
window.updateContratistaMontoObra=async function(obraId,val){
  if(!obras[obraId])return;
  const num=parseFloat(val);
  obras[obraId].contratistaMonto=isNaN(num)||num===0?'':num;
  await fbSet('obras/'+obraId,obras[obraId]);
  saveCache(); renderContratista();
  toast('Monto del contratista actualizado ✓','ok');
};
window.quickAddContratistaObra=async function(obraId){
  if(obras[obraId]?.estado==='FINALIZADA'){toast('🔒 Obra FINALIZADA — no se puede asignar gastos','err');return}
  const mEl=gs('cqa-m-'+obraId);
  const cEl=gs('cqa-c-'+obraId);
  const monto=parseFloat(mEl?.value)||0;
  if(!monto){toast('Ingresá el monto','err');return}
  const p={id:uid(),fecha:today(),monto,concepto:cEl?.value?.trim()||'Pago contratista',obraId};
  contratistaPagos.push(p);
  await fbSet('contratista/pagos',{lista:contratistaPagos});
  saveCache(); renderContratista();
  toast('Entrega registrada en '+(obras[obraId]?.nombre||'obra')+' ✓','ok');
};
window.limpiarContratistaObra=function(obraId){
  const o=obras[obraId]; if(!o)return;
  const pagosAsignados=contratistaPagos.filter(p=>p.obraId===obraId);
  const msg='¿Limpiar datos del contratista para "'+o.nombre+'"?\n'
    +(pagosAsignados.length?'— Se eliminarán '+pagosAsignados.length+' entrega(s)\n':'')
    +'— Se reseteará el monto asignado';
  requireAuth(msg,async()=>{
    contratistaPagos=contratistaPagos.filter(p=>p.obraId!==obraId);
    await fbSet('contratista/pagos',{lista:contratistaPagos});
    if(o.contratistaMonto!=null){delete o.contratistaMonto; await fbSet('obras/'+obraId,o);}
    saveCache(); renderContratista(); toast('Datos del contratista limpiados para "'+o.nombre+'" ✓','ok');
  });
};
window.borrarTodosContratista=function(){
  if(!contratistaPagos.length){toast('No hay entregas para borrar','info');return}
  requireAuth('⚠️ Vas a borrar las '+contratistaPagos.length+' entregas al contratista.',async()=>{
    contratistaPagos=[];
    await fbSet('contratista/pagos',{lista:contratistaPagos});
    saveCache(); renderContratista(); toast('Todas las entregas eliminadas ✓','ok');
  });
};

// ═══════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════
window.saveCfgP=function(){
  const _ay=parseFloat(gs('p-ay').value), _he=parseFloat(gs('p-he').value), _so=parseFloat(gs('p-so').value);
  cfg={...cfg, ayuda:isNaN(_ay)?10:_ay, heri:isNaN(_he)?1:_he, socios:isNaN(_so)?50:_so};
  localStorage.setItem('ocCfg',JSON.stringify(cfg)); saveCache(); toast('Parámetros guardados','ok');
  if(gs('page-gestor')?.classList.contains('active')) renderGestor();
  if(gs('page-ayudaSocial')?.classList.contains('active')) renderAyudaSocial();
  if(gs('page-contratista')?.classList.contains('active')) renderContratista();
};
window.exportJSON=function(){
  const data=JSON.stringify({obras,gastos,certificados,retiros,gestorPagos,ayudaSocialPagos,contratistaPagos,cfg},null,2);
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));
  a.download='thalamus_'+today()+'.json'; a.click(); toast('Exportado','ok');
};

// ═══════════════════════════════════════
// BACKUP & RESTAURACIÓN
// ═══════════════════════════════════════
function buildBackupData(){
  return{
    _meta:{version:1,date:new Date().toISOString(),user:_currentUser,timestamp:Date.now()},
    obras,gastos,certificados,retiros,gestorPagos,ayudaSocialPagos,contratistaPagos,cfg
  };
}

window.downloadBackup=function(){
  const data=buildBackupData();
  const json=JSON.stringify(data,null,2);
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([json],{type:'application/json'}));
  const fecha=today().replace(/-/g,'');
  a.download='backup_thalamus_'+fecha+'.json';
  a.click();
  toast('Backup descargado ✓','ok');
};

window.restoreBackup=async function(e){
  const f=e.target.files[0]; if(!f)return;
  try{
    const text=await f.text();
    const data=JSON.parse(text);
    // Validate structure
    if(!data.obras&&!data.gastos){
      toast('Archivo inválido: no contiene datos de Thalamus','err');return;
    }
    const obraCount=Object.keys(data.obras||{}).length;
    const gastoCount=Object.values(data.gastos||{}).reduce((s,arr)=>s+(arr?.length||0),0);
    const certCount=Object.values(data.certificados||{}).reduce((s,arr)=>s+(arr?.length||0),0);

    const msg='¿Restaurar este backup?\n\n'+
      '📁 '+obraCount+' obras\n'+
      '💸 '+gastoCount+' gastos\n'+
      '📄 '+certCount+' certificados\n'+
      (data._meta?'\n📅 Fecha: '+new Date(data._meta.date).toLocaleString('es-PY'):'') +
      (data._meta?.user?'\n👤 Usuario: '+data._meta.user:'') +
      '\n\n⚠️ Esto REEMPLAZA todos los datos actuales.';

    if(!confirm(msg))return;

    // Write BORRAR for safety
    const check=prompt('Escribí RESTAURAR para confirmar:');
    if(!check||check.trim().toUpperCase()!=='RESTAURAR'){
      toast('Operación cancelada','err');return;
    }

    toast('Restaurando datos...','info');

    // ── PASO 1: Actualizar estado en memoria INMEDIATAMENTE ──
    const newObras=data.obras||{};
    for(const[id,o]of Object.entries(newObras)){if(!o.id)o.id=id;}
    obras=newObras;
    gastos=data.gastos||{};
    certificados=data.certificados||{};
    retiros=data.retiros||{fernando:[],wuilian:[]};
    gestorPagos=data.gestorPagos||[];
    ayudaSocialPagos=data.ayudaSocialPagos||[];
    contratistaPagos=data.contratistaPagos||[];
    if(data.cfg){
      cfg=data.cfg;
      localStorage.setItem('ocCfg',JSON.stringify(cfg));
    }
    cur=null;

    // ── PASO 2: Guardar en caché para que initApp lo use ──
    saveCache();

    // ── PASO 3: Renderizar inmediatamente con los datos frescos ──
    populateSel(); navTo('obras'); applyRole();

    // ── PASO 4: Escribir a Firebase en background ──
    try{
      // Borrar obras actuales de Firebase que NO están en el backup
      const existingFB=await fbGetAll('obras');
      for(const oid of Object.keys(existingFB||{})){
        if(!newObras[oid]){
          // Esta obra no está en el backup, eliminarla de Firebase
          const fbGastos=await fbGetAll('obras/'+oid+'/gastos');
          for(const gid of Object.keys(fbGastos||{})){try{await fbDel('obras/'+oid+'/gastos/'+gid);}catch(e){}}
          const fbCerts=await fbGetAll('obras/'+oid+'/certificados');
          for(const cid of Object.keys(fbCerts||{})){try{await fbDel('obras/'+oid+'/certificados/'+cid);}catch(e){}}
          try{await fbDel('obras/'+oid);}catch(e){}
        }
      }
      // Escribir las obras del backup
      for(const[id,o]of Object.entries(newObras)){
        await fbSet('obras/'+id,o);
      }
      // Escribir gastos
      for(const[obraId,lista]of Object.entries(gastos)){
        // Primero limpiar gastos viejos de Firebase para esta obra
        const fbGastos=await fbGetAll('obras/'+obraId+'/gastos');
        for(const gid of Object.keys(fbGastos||{})){
          if(!(lista||[]).find(g=>g.id===gid)){try{await fbDel('obras/'+obraId+'/gastos/'+gid);}catch(e){}}
        }
        for(const g of(lista||[])){
          if(g.id) await fbSet('obras/'+obraId+'/gastos/'+g.id,g);
        }
      }
      // Escribir certificados
      for(const[obraId,lista]of Object.entries(certificados)){
        const fbCerts=await fbGetAll('obras/'+obraId+'/certificados');
        for(const cid of Object.keys(fbCerts||{})){
          if(!(lista||[]).find(c=>c.id===cid)){try{await fbDel('obras/'+obraId+'/certificados/'+cid);}catch(e){}}
        }
        for(const c of(lista||[])){
          if(c.id) await fbSet('obras/'+obraId+'/certificados/'+c.id,c);
        }
      }
      // Retiros y gestor
      if(data.retiros) await fbSet('retiros/socios',retiros);
      if(data.gestorPagos) await fbSet('gestor/pagos',{lista:gestorPagos});
      if(data.ayudaSocialPagos) await fbSet('ayudaSocial/pagos',{lista:ayudaSocialPagos});
      if(data.contratistaPagos) await fbSet('contratista/pagos',{lista:contratistaPagos});
      if(data.ayudaSocialPagos) await fbSet('ayudaSocial/pagos',{lista:ayudaSocialPagos});
      if(data.contratistaPagos) await fbSet('contratista/pagos',{lista:contratistaPagos});
    }catch(fbErr){
      console.warn('Error sincronizando restore con Firebase:',fbErr);
    }

    toast('✅ Backup restaurado: '+obraCount+' obras, '+gastoCount+' gastos, '+certCount+' certificados','ok');
  }catch(err){
    console.error('Restore error:',err);
    toast('Error al restaurar: '+err.message,'err');
  }
  e.target.value=''; // reset file input
};

// ── Auto-backup en Firebase ──
async function autoBackup(){
  try{
    const data=buildBackupData();
    const backups=await fbGetDoc('backups/list')||{items:[]};
    const items=backups.items||[];

    // Check if already backed up today
    const todayStr=today();
    if(items.length&&items[0].date===todayStr) return; // already backed up today

    // Add new backup
    const backupId='bk_'+todayStr.replace(/-/g,'');
    await fbSet('backups/'+backupId,data);

    // Update list
    items.unshift({id:backupId,date:todayStr,time:new Date().toLocaleString('es-PY'),user:_currentUser});
    if(items.length>5){
      // Delete oldest
      for(const old of items.slice(5)){
        try{await fbDel('backups/'+old.id);}catch(e){}
      }
    }
    await fbSet('backups/list',{items:items.slice(0,5)});
    console.log('Auto-backup completado:',backupId);
  }catch(e){
    console.warn('Auto-backup error:',e);
  }
}

window.loadBackupList=async function(){
  const el=gs('backupList');
  if(!el)return;
  el.innerHTML='<div style="padding:.5rem;color:var(--muted);font-size:.7rem">Cargando...</div>';
  try{
    const backups=await fbGetDoc('backups/list')||{items:[]};
    const items=backups.items||[];
    if(!items.length){
      el.innerHTML='<div style="padding:.5rem;color:var(--muted);font-size:.7rem">Sin backups automáticos aún</div>';
      return;
    }
    el.innerHTML=items.map((b,i)=>`
      <div class="user-row">
        <span style="font-size:.78rem;margin-right:4px">${i===0?'🟢':'⚪'}</span>
        <span class="u-name" style="flex:1;font-size:.72rem">
          ${b.date} <span style="color:var(--muted)">${b.time||''}</span>
        </span>
        <span style="font-size:.6rem;color:var(--dim)">${b.user||''}</span>
        <button class="btn-logout" style="margin-left:6px;border-color:var(--green);color:var(--green)" onclick="restoreFromFirebase('${b.id}')">Restaurar</button>
        <button class="btn-logout" style="margin-left:4px" onclick="downloadFirebaseBackup('${b.id}','${b.date}')">⬇️</button>
      </div>
    `).join('');
  }catch(e){
    el.innerHTML='<div style="padding:.5rem;color:var(--acc3);font-size:.7rem">Error cargando backups</div>';
  }
};

window.downloadFirebaseBackup=async function(id,fecha){
  toast('Descargando backup...','info');
  try{
    const data=await fbGetDoc('backups/'+id);
    if(!data){toast('Backup no encontrado','err');return;}
    const json=JSON.stringify(data,null,2);
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([json],{type:'application/json'}));
    a.download='backup_thalamus_'+fecha.replace(/-/g,'')+'.json';
    a.click();
    toast('Backup descargado ✓','ok');
  }catch(e){toast('Error: '+e.message,'err');}
};

window.restoreFromFirebase=async function(id){
  if(!confirm('¿Restaurar desde este backup?\n\nEsto REEMPLAZA todos los datos actuales.'))return;
  const check=prompt('Escribí RESTAURAR para confirmar:');
  if(!check||check.trim().toUpperCase()!=='RESTAURAR'){toast('Cancelado','err');return;}
  toast('Descargando backup...','info');
  try{
    const data=await fbGetDoc('backups/'+id);
    if(!data){toast('Backup no encontrado','err');return;}

    const obraCount=Object.keys(data.obras||{}).length;

    // ── PASO 1: Actualizar estado en memoria INMEDIATAMENTE ──
    const newObras=data.obras||{};
    for(const[oid,o]of Object.entries(newObras)){if(!o.id)o.id=oid;}
    obras=newObras;
    gastos=data.gastos||{};
    certificados=data.certificados||{};
    retiros=data.retiros||{fernando:[],wuilian:[]};
    gestorPagos=data.gestorPagos||[];
    ayudaSocialPagos=data.ayudaSocialPagos||[];
    contratistaPagos=data.contratistaPagos||[];
    if(data.cfg){
      cfg=data.cfg;
      localStorage.setItem('ocCfg',JSON.stringify(cfg));
    }
    cur=null;

    // ── PASO 2: Guardar en caché y renderizar ──
    saveCache();
    populateSel(); navTo('obras'); applyRole();

    // ── PASO 3: Escribir a Firebase en background ──
    toast('Sincronizando con Firebase...','info');
    try{
      // Borrar obras que no están en el backup
      const existingFB=await fbGetAll('obras');
      for(const oid of Object.keys(existingFB||{})){
        if(!newObras[oid]){
          const fbG=await fbGetAll('obras/'+oid+'/gastos');
          for(const gid of Object.keys(fbG||{})){try{await fbDel('obras/'+oid+'/gastos/'+gid);}catch(e){}}
          const fbC=await fbGetAll('obras/'+oid+'/certificados');
          for(const cid of Object.keys(fbC||{})){try{await fbDel('obras/'+oid+'/certificados/'+cid);}catch(e){}}
          try{await fbDel('obras/'+oid);}catch(e){}
        }
      }
      // Escribir obras
      for(const[oid,o]of Object.entries(newObras)) await fbSet('obras/'+oid,o);
      // Escribir gastos (limpiando viejos)
      for(const[obraId,lista]of Object.entries(gastos)){
        const fbG=await fbGetAll('obras/'+obraId+'/gastos');
        for(const gid of Object.keys(fbG||{})){
          if(!(lista||[]).find(g=>g.id===gid)){try{await fbDel('obras/'+obraId+'/gastos/'+gid);}catch(e){}}
        }
        for(const g of(lista||[])){if(g.id)await fbSet('obras/'+obraId+'/gastos/'+g.id,g);}
      }
      // Escribir certificados (limpiando viejos)
      for(const[obraId,lista]of Object.entries(certificados)){
        const fbC=await fbGetAll('obras/'+obraId+'/certificados');
        for(const cid of Object.keys(fbC||{})){
          if(!(lista||[]).find(c=>c.id===cid)){try{await fbDel('obras/'+obraId+'/certificados/'+cid);}catch(e){}}
        }
        for(const c of(lista||[])){if(c.id)await fbSet('obras/'+obraId+'/certificados/'+c.id,c);}
      }
      // Retiros, gestor y ayuda social
      await fbSet('retiros/socios',retiros);
      await fbSet('gestor/pagos',{lista:gestorPagos});
      await fbSet('ayudaSocial/pagos',{lista:ayudaSocialPagos});
      await fbSet('contratista/pagos',{lista:contratistaPagos});
    }catch(fbErr){
      console.warn('Error sync restore:',fbErr);
    }

    toast('✅ Backup restaurado: '+obraCount+' obras','ok');
  }catch(e){toast('Error: '+e.message,'err');}
};

// ═══════════════════════════════════════
// AI — IMPORTAR WHATSAPP
// ═══════════════════════════════════════
window.loadFile=function(e){
  const f=e.target.files[0]; if(!f)return;
  const r=new FileReader(); r.onload=ev=>{gs('ai-txt').value=ev.target.result;toast('Archivo cargado','ok')};
  r.readAsText(f,'utf-8');
};
const aiDrop=document.getElementById('aiDrop');
aiDrop.addEventListener('dragover',e=>{e.preventDefault();aiDrop.classList.add('over')});
aiDrop.addEventListener('dragleave',()=>aiDrop.classList.remove('over'));
aiDrop.addEventListener('drop',e=>{
  e.preventDefault(); aiDrop.classList.remove('over');
  const f=e.dataTransfer.files[0]; if(!f)return;
  const r=new FileReader(); r.onload=ev=>gs('ai-txt').value=ev.target.result; r.readAsText(f,'utf-8');
});
window.clrAI=function(){gs('ai-txt').value='';gs('aiCard').style.display='none';pendAI=[]};
window.clrAIRes=function(){gs('aiCard').style.display='none';pendAI=[]};
window.runAI=async function(){
  const key=v('ai-key'),txt=gs('ai-txt').value.trim();
  if(!key){toast('Ingresá tu API Key de Anthropic','err');return}
  if(!txt){toast('Pegá el texto del chat','err');return}
  if(!cur){toast('Seleccioná una obra primero','err');return}
  gs('aiBar').classList.add('on'); gs('aiCard').style.display='none';
  const prompt=`Sos asistente de administración de obras de construcción en Paraguay (moneda: guaraníes ₲).
Analizá este chat de WhatsApp y extraé TODOS los movimientos financieros.

Tipos:
- "gasto": pagos, transferencias, compras, planillas de personal, servicios, efectivo
- "certificado": cobros recibidos por certificados de avance, cheques del comitente

Para cada ítem devolvé exactamente:
{"tipo":"gasto|certificado","fecha":"YYYY-MM-DD","concepto":"descripción max 60 chars","monto":numero_guaranies,"registro":"nro_si_existe","subTipo":"transferencia|efectivo|cheque|planilla|certificado"}

Reglas:
- "2.500.000" o "2,5 millones" → 2500000
- Fecha dd/mm/aa → YYYY-MM-DD
- Sin monto claro → omitir
- Respondé SOLO con un JSON array válido, sin texto ni backticks

CHAT:
${txt.substring(0,9000)}`;
  try{
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':key,
        'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:4000,
        messages:[{role:'user',content:prompt}]})
    });
    const d=await res.json(); gs('aiBar').classList.remove('on');
    if(d.error){toast('Error API: '+d.error.message,'err');return}
    let raw=d.content[0].text.trim(),items=[];
    try{items=JSON.parse(raw)}catch{const m=raw.match(/\[[\s\S]*\]/);if(m)items=JSON.parse(m[0])}
    if(!Array.isArray(items)||!items.length){toast('Sin movimientos detectados','info');return}
    pendAI=items; renderAI(items); toast(items.length+' ítems detectados','ok');
  }catch(e){gs('aiBar').classList.remove('on');toast('Error: '+e.message,'err')}
};
function renderAI(items){
  gs('aiCnt').textContent=items.length;
  gs('aiList').innerHTML=items.map((it,i)=>`
    <div class="ai-item">
      <div class="ai-lft">
        <div style="display:flex;gap:.3rem;margin-bottom:2px">
          <span class="tag ${it.tipo==='gasto'?'tag-r':'tag-g'}">${it.tipo.toUpperCase()}</span>
          <span class="tag tag-b">${it.subTipo||'—'}</span>
        </div>
        <div class="ai-conc">${it.concepto}</div>
        <div class="ai-meta">${it.fecha||'?'}${it.registro?' · '+it.registro:''}</div>
      </div>
      <div style="display:flex;align-items:center;gap:.4rem">
        <span class="ai-monto">${fGs(it.monto||0)}</span>
        <button class="btn btn-danger btn-xs" onclick="remAI(${i})">✕</button>
      </div>
    </div>`).join('');
  gs('aiCard').style.display='block';
}
window.remAI=function(i){pendAI.splice(i,1);if(!pendAI.length){window.clrAIRes();return}renderAI(pendAI)};
window.importAll=async function(){
  if(_importing)return;
  if(!cur){toast('Seleccioná una obra','err');return}
  _importing=true;
  let ng=0,nc=0;
  for(const it of pendAI){
    if(it.tipo==='gasto'){
      const g={id:uid(),fecha:it.fecha||today(),concepto:it.concepto||'',cantidad:0,
        monto:it.monto||0,montoCheque:0,devuelto:0,saldoTotal:0,saldoCheque:0,
        tipo:it.subTipo||'transferencia',costoTotal:it.monto||0,registro:it.registro||''};
      gastos[cur].push(g); await fbSet('obras/'+cur+'/gastos/'+g.id,g); ng++;
    } else {
      const c={id:uid(),fecha:it.fecha||today(),concepto:it.concepto||'',
        bruto:it.monto||0,neto:it.monto||0,retencion:0};
      certificados[cur].push(c); await fbSet('obras/'+cur+'/certificados/'+c.id,c); nc++;
    }
  }
  window.clrAIRes(); updGStrip();
  _importing=false;
  toast(`Importados: ${ng} gastos, ${nc} certificados ✓`,'ok');
};

// Init fechas por defecto
document.addEventListener('DOMContentLoaded',()=>{
  ['c-f','ret-f'].forEach(id=>{const el=gs(id);if(el)el.value=today()});
  if(_currentUser && window._fbOk !== undefined && !window._appLoaded){
    window._appLoaded=true; window.initApp&&window.initApp();
  }
});
setTimeout(()=>{if(!window._appLoaded && _currentUser){window._appLoaded=true;window.initApp&&window.initApp();}},5000);

// ═══════════════════════════════════════
// PEGAR DESDE EXCEL
// ═══════════════════════════════════════
let _pasteMode='', _pasteRows=[], _pasteCols=0;
let _pasteDetectedHeaders=[]; // headers detected from current paste

// ─── LEARNED COLUMN MAPPINGS ───────────────────
// Stores header_name → field_key mappings the user has confirmed
function getLearnedMappings(mode){
  try{ return JSON.parse(localStorage.getItem('paste_learned_'+mode))||{}; }catch{return{}}
}
function saveLearnedMappings(mode, map){
  localStorage.setItem('paste_learned_'+mode, JSON.stringify(map));
}
// Header synonyms: common Excel header names → field keys
const HEADER_SYNONYMS_GASTOS={
  'fecha':       'fecha',
  'date':        'fecha',
  'concepto':    'concepto',
  'descripcion': 'concepto',
  'descripción': 'concepto',
  'detalle':     'concepto',
  'item':        'concepto',
  'cantidad':    'cantidad',
  'qty':         'cantidad',
  'monto':       'monto',
  'monto pagado':'monto',
  'pagado':      'monto',
  'importe':     'monto',
  'total':       'monto',
  'valor':       'monto',
  'registro':    'registro',
  'nro':         'registro',
  'numero':      'registro',
  'número':      'registro',
  'cheque':      'montoCheque',
  'monto cheque':'montoCheque',
  'cheque pagado':'montoCheque',
  'devuelto':    'devuelto',
  'devolucion':  'devuelto',
  'devolución':  'devuelto',
  'saldo total': 'saldoTotal',
  'saldo':       'saldoTotal',
  'saldo cheque':'saldoCheque',
};
const HEADER_SYNONYMS_CERTS={
  'fecha':       'fecha',
  'date':        'fecha',
  'concepto':    'concepto',
  'certificado': 'concepto',
  'descripcion': 'concepto',
  'descripción': 'concepto',
  'bruto':       'bruto',
  'total bruto': 'bruto',
  'total':       'bruto',
  'monto':       'bruto',
  'neto':        'neto',
  'neto cobrado':'neto',
  'cobrado':     'neto',
};

const GASTO_FIELDS=[
  {key:'ignorar',label:'— Ignorar —'},
  {key:'fecha',label:'Fecha'},
  {key:'concepto',label:'Concepto'},
  {key:'cantidad',label:'Cantidad'},
  {key:'monto',label:'Monto Pagado'},
  {key:'registro',label:'Registro'},
  {key:'montoCheque',label:'Monto Cheque'},
  {key:'devuelto',label:'Devuelto'},
  {key:'saldoTotal',label:'Saldo Total'},
  {key:'saldoCheque',label:'Saldo Cheque'},
];
const CERT_FIELDS=[
  {key:'ignorar',label:'— Ignorar —'},
  {key:'fecha',label:'Fecha'},
  {key:'concepto',label:'Concepto / Certificado'},
  {key:'bruto',label:'Total Bruto'},
  {key:'neto',label:'Neto Cobrado'},
];

// Auto-detect column mapping based on content
function guessField(colVals, fields, colIdx){
  const sample=colVals.slice(0,5).join(' ').toLowerCase();
  // Date patterns
  if(colVals.some(v=>/^\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}$/.test(v.trim()))) return 'fecha';
  // Mostly numbers?
  const nums=colVals.filter(v=>/^[\d.,\s-]+$/.test(v.trim())&&v.trim().length>0);
  const isNumeric=nums.length>colVals.length*0.6;
  if(fields===GASTO_FIELDS){
    if(!isNumeric&&colIdx===0) return 'fecha';
    if(!isNumeric) return 'concepto';
    // First numeric col → monto, second → montoCheque
    return null; // let the numeric auto-assign handle it
  }else{
    if(!isNumeric&&colIdx===0) return 'fecha';
    if(!isNumeric) return 'concepto';
    return null;
  }
}

window.openPaste=function(mode){
  if(!cur||!obras[cur]){toast('Seleccioná una obra primero','err');return}
  _pasteMode=mode;
  gs('mPasteTitle').textContent='📋 Pegar desde Excel — '+(mode==='gastos'?'Gastos':'Certificados');
  gs('pasteArea').value='';
  gs('pasteStep1').style.display='';
  gs('pasteStep2').style.display='none';
  openM('mPaste');
  setTimeout(()=>gs('pasteArea').focus(),200);
};

window.parsePaste=function(){
  const raw=gs('pasteArea').value.trim();
  if(!raw){toast('Pegá datos primero','err');return}

  // Parse: split by newlines, then by tabs (Excel copies as TSV)
  const lines=raw.split(/\r?\n/).filter(l=>l.trim());
  if(!lines.length){toast('No se detectaron filas','err');return}

  // Detect separator: tab or semicolon or multiple spaces
  let sep='\t';
  if(lines[0].indexOf('\t')<0){
    if(lines[0].indexOf(';')>=0) sep=';';
    else if(lines[0].indexOf(',')>=0 && !/^\d+,\d+$/.test(lines[0].trim())) sep=',';
  }

  _pasteRows=lines.map(l=>l.split(sep).map(c=>c.trim()));
  _pasteCols=Math.max(..._pasteRows.map(r=>r.length));

  // Pad short rows
  _pasteRows.forEach(r=>{while(r.length<_pasteCols)r.push('')});

  // Detect if first row is header
  const fields=_pasteMode==='gastos'?GASTO_FIELDS:CERT_FIELDS;
  let hasHeader=false;
  _pasteDetectedHeaders=[];
  const firstRow=_pasteRows[0].map(c=>c.toLowerCase().trim());
  const headerKeywords=['fecha','concepto','monto','bruto','neto','certificado','pagado','cheque','retenc','cantidad','devuelto','saldo','registro'];
  if(firstRow.some(c=>headerKeywords.some(k=>c.includes(k)))){
    hasHeader=true;
    _pasteDetectedHeaders=_pasteRows[0].map(c=>c.trim()); // save original headers
    _pasteRows.shift(); // remove header row
  }

  if(!_pasteRows.length){toast('No hay datos para importar','err');return}

  gs('pasteRowCount').textContent=_pasteRows.length;
  gs('pasteColCount').textContent=_pasteCols;
  gs('pasteImportCount').textContent=_pasteRows.length;

  // Build column mapping dropdowns
  const mapRow=gs('pasteMapRow');
  mapRow.innerHTML='';

  // Auto-assign columns using: 1) learned mappings 2) header synonyms 3) content analysis
  const numericCols=[];
  for(let c=0;c<_pasteCols;c++){
    const colVals=_pasteRows.map(r=>r[c]||'');
    const nums=colVals.filter(v=>/^[\d.,\s-]+$/.test(v.trim())&&v.trim().length>0);
    if(nums.length>colVals.length*0.5) numericCols.push(c);
  }

  const assigned=new Set();
  const autoMap=[];
  const learned=getLearnedMappings(_pasteMode);
  const synonyms=_pasteMode==='gastos'?HEADER_SYNONYMS_GASTOS:HEADER_SYNONYMS_CERTS;
  const validKeys=new Set(fields.map(f=>f.key).filter(k=>k!=='ignorar'));

  for(let c=0;c<_pasteCols;c++){
    const colVals=_pasteRows.map(r=>r[c]||'');
    let guess=null;

    // Priority 1: Learned mapping from previous user corrections
    if(_pasteDetectedHeaders.length>c){
      const hdr=_pasteDetectedHeaders[c].toLowerCase().trim();
      if(learned[hdr] && validKeys.has(learned[hdr]) && !assigned.has(learned[hdr])){
        guess=learned[hdr];
      }
    }

    // Priority 2: Header synonym matching
    if(!guess && _pasteDetectedHeaders.length>c){
      const hdr=_pasteDetectedHeaders[c].toLowerCase().trim();
      // Try exact match first, then partial
      if(synonyms[hdr] && !assigned.has(synonyms[hdr])){
        guess=synonyms[hdr];
      } else {
        // Try matching partial: e.g. header "Cheque Pagado" contains "cheque pagado"
        for(const [syn,field] of Object.entries(synonyms)){
          if(!assigned.has(field) && (hdr.includes(syn) || syn.includes(hdr)) && hdr.length>1){
            guess=field; break;
          }
        }
      }
    }

    // Priority 3: Original content-based analysis
    if(!guess) guess=guessField(colVals, fields, c);

    // For numeric columns, auto-assign in order
    if(!guess&&numericCols.includes(c)){
      if(_pasteMode==='gastos'){
        const numFields=['monto','montoCheque','devuelto','saldoTotal','saldoCheque'];
        guess=numFields.find(f=>!assigned.has(f))||null;
      }else{
        const numFields=['bruto','neto'];
        guess=numFields.find(f=>!assigned.has(f))||null;
      }
    }

    if(guess&&assigned.has(guess)) guess=null;
    if(guess) assigned.add(guess);
    autoMap.push(guess||'ignorar');

    // Build UI
    const box=document.createElement('div');
    box.className='paste-col-box';

    const label=document.createElement('div');
    label.className='pcl';
    if(_pasteDetectedHeaders.length>c && _pasteDetectedHeaders[c]){
      label.textContent=_pasteDetectedHeaders[c];
      label.title='Encabezado detectado: '+_pasteDetectedHeaders[c];
      label.style.color='var(--gold)';
    } else {
      label.textContent='Col '+(c+1);
    }
    box.appendChild(label);

    const preview=document.createElement('div');
    preview.className='pcv';
    preview.textContent=colVals[0]||'(vacío)';
    preview.title=colVals.slice(0,3).join(' | ');
    box.appendChild(preview);

    const sel=document.createElement('select');
    sel.className='paste-sel';
    sel.id='pmap-'+c;
    fields.forEach(f=>{
      const opt=document.createElement('option');
      opt.value=f.key; opt.textContent=f.label;
      sel.appendChild(opt);
    });
    sel.value=autoMap[c];
    sel.onchange=()=>renderPastePreview();
    box.appendChild(sel);
    mapRow.appendChild(box);
  }

  // Show hint if learned mappings were used
  const learnedHint=gs('pasteLearnedHint');
  if(learnedHint){
    const usedLearned=_pasteDetectedHeaders.length>0 && autoMap.some((m,i)=>{
      if(m==='ignorar'||!_pasteDetectedHeaders[i])return false;
      const hdr=_pasteDetectedHeaders[i].toLowerCase().trim();
      return learned[hdr]===m;
    });
    learnedHint.style.display=usedLearned?'inline':'none';
  }

  renderPastePreview();
  gs('pasteStep1').style.display='none';
  gs('pasteStep2').style.display='';
};

function renderPastePreview(){
  const fields=_pasteMode==='gastos'?GASTO_FIELDS:CERT_FIELDS;
  const mapping=[];
  for(let c=0;c<_pasteCols;c++){
    const sel=gs('pmap-'+c);
    mapping.push(sel?sel.value:'ignorar');
  }

  // Build header
  const thead=gs('pastePreviewHead');
  let hh='<tr>';
  mapping.forEach((m,i)=>{
    const f=fields.find(f=>f.key===m);
    hh+=`<th style="${m==='ignorar'?'opacity:.4':''}">${f?f.label:'Col '+(i+1)}</th>`;
  });
  hh+='</tr>';
  thead.innerHTML=hh;

  // Build body (max 20 rows preview)
  const tbody=gs('pastePreviewBody');
  let bh='';
  const showRows=_pasteRows.slice(0,20);
  showRows.forEach(row=>{
    bh+='<tr>';
    row.forEach((val,i)=>{
      const dim=mapping[i]==='ignorar'?'opacity:.35;text-decoration:line-through':'';
      bh+=`<td style="${dim}">${val||'—'}</td>`;
    });
    bh+='</tr>';
  });
  if(_pasteRows.length>20) bh+=`<tr><td colspan="${_pasteCols}" style="text-align:center;color:var(--muted);font-style:italic">...y ${_pasteRows.length-20} filas más</td></tr>`;
  tbody.innerHTML=bh;
}

window.backToPasteStep1=function(){
  gs('pasteStep1').style.display='';
  gs('pasteStep2').style.display='none';
};

window.resetLearnedMappings=function(){
  localStorage.removeItem('paste_learned_gastos');
  localStorage.removeItem('paste_learned_certificados');
  toast('Memoria de mapeos reseteada. Pegá de nuevo para re-detectar.','ok');
  backToPasteStep1();
};

function parseNum(v){
  if(!v) return 0;
  // Remove dots used as thousand separators, replace comma with dot for decimals
  let s=String(v).replace(/\s/g,'');
  // If has dot and comma: 1.234.567,89 or 1,234,567.89
  if(s.includes('.')&&s.includes(',')){
    if(s.lastIndexOf(',')>s.lastIndexOf('.')){ // 1.234,56 format
      s=s.replace(/\./g,'').replace(',','.');
    } else { // 1,234.56 format
      s=s.replace(/,/g,'');
    }
  } else if(s.includes(',')){
    // Could be 1,234 (thousands) or 1,5 (decimal)
    // If there's more than one comma or digits after comma > 2, it's thousands
    const parts=s.split(',');
    if(parts.length>2||parts[parts.length-1].length===3){
      s=s.replace(/,/g,'');
    }else{
      s=s.replace(',','.');
    }
  } else {
    // Only dots: could be 1.234.567 (thousands) or 1.5
    const parts=s.split('.');
    if(parts.length>2){
      s=s.replace(/\./g,'');
    }
    // If single dot with 3 digits after, likely thousands: 5.000
    else if(parts.length===2&&parts[1].length===3&&parts[0].length>=1){
      s=s.replace(/\./g,'');
    }
  }
  return parseFloat(s)||0;
}

window.importPaste=async function(){
  if(_importing)return;
  if(!cur||!obras[cur]){toast('Seleccioná una obra','err');return}
  _importing=true;

  const mapping=[];
  for(let c=0;c<_pasteCols;c++){
    const sel=gs('pmap-'+c);
    mapping.push(sel?sel.value:'ignorar');
  }

  // Check at least one meaningful field mapped
  const hasField=mapping.some(m=>m!=='ignorar');
  if(!hasField){toast('Asigná al menos una columna','err');return}

  let count=0;
  if(_pasteMode==='gastos'){
    for(const row of _pasteRows){
      const g={fecha:'',concepto:'',cantidad:'',monto:0,registro:'',montoCheque:0,devuelto:0,saldoTotal:0,saldoCheque:0,costoTotal:0};
      row.forEach((val,i)=>{
        const field=mapping[i];
        if(field==='ignorar')return;
        if(['monto','montoCheque','devuelto','saldoTotal','saldoCheque'].includes(field)){
          g[field]=parseNum(val);
        }else{
          g[field]=val;
        }
      });
      g.costoTotal=(g.monto||0)+(g.saldoTotal||0)+(g.saldoCheque||0);
      if(!g.concepto&&!g.monto&&!g.montoCheque)continue; // skip empty
      const gid=Date.now().toString(36)+Math.random().toString(36).slice(2,6)+count;
      g.id=gid;
      if(!gastos[cur])gastos[cur]=[];
      gastos[cur].push({...g});
      await fbSet('obras/'+cur+'/gastos/'+gid,g);
      count++;
    }
    renderGastosPage();
  }else{
    for(const row of _pasteRows){
      const c={fecha:'',concepto:'',bruto:0,neto:0,retencion:0};
      row.forEach((val,i)=>{
        const field=mapping[i];
        if(field==='ignorar')return;
        if(['bruto','neto'].includes(field)){
          c[field]=parseNum(val);
        }else{
          c[field]=val;
        }
      });
      c.retencion=(c.bruto||0)-(c.neto||0);
      if(!c.concepto&&!c.bruto&&!c.neto)continue;
      const cid=Date.now().toString(36)+Math.random().toString(36).slice(2,6)+count;
      c.id=cid;
      if(!certificados[cur])certificados[cur]=[];
      certificados[cur].push({...c});
      await fbSet('obras/'+cur+'/certificados/'+cid,c);
      count++;
    }
    renderCerts();
  }

  closeM('mPaste');

  // Learn from the user's column mapping choices
  if(_pasteDetectedHeaders.length){
    const learned=getLearnedMappings(_pasteMode);
    mapping.forEach((field,i)=>{
      if(field!=='ignorar' && _pasteDetectedHeaders[i]){
        const hdr=_pasteDetectedHeaders[i].toLowerCase().trim();
        if(hdr) learned[hdr]=field;
      }
    });
    saveLearnedMappings(_pasteMode, learned);
  }

  _pasteRows=[];
  _pasteDetectedHeaders=[];
  _importing=false;
  touchObra();
  toast(`✅ ${count} ${_pasteMode==='gastos'?'gastos':'certificados'} importados`,'ok');
};

// ═══════════════════════════════════════
// EXPORTAR EXCEL
// ═══════════════════════════════════════
window.exportExcel = function(){
  if(!cur||!obras[cur]){toast('Seleccioná una obra primero','err');return}

  const loadExcelJS = (cb) => {
    if(window.ExcelJS){cb();return;}
    toast('Cargando librería...','info');
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
    s.onload=cb; s.onerror=()=>toast('Error cargando librería','err');
    document.head.appendChild(s);
  };

  loadExcelJS(async ()=>{
    toast('Generando planilla...','info');
    try {
      const o=obras[cur];
      const _gpExcel=gestorPagosForObra(cur).map(p=>({fecha:p.fecha,concepto:'👷 GESTOR: '+(p.concepto||'Entrega'),cantidad:0,monto:parseFloat(p.monto)||0,montoCheque:0,devuelto:0,saldoTotal:0,saldoCheque:0,costoTotal:parseFloat(p.monto)||0,tipo:'gestor'}));
      const _apExcel=ayudaSocialPagosForObra(cur).map(p=>({fecha:p.fecha,concepto:'🏛️ A.SOCIAL: '+(p.concepto||'Ayuda Social'),cantidad:0,monto:parseFloat(p.monto)||0,montoCheque:0,devuelto:0,saldoTotal:0,saldoCheque:0,costoTotal:parseFloat(p.monto)||0,tipo:'ayuda_social'}));
      const _ctExcel=contratistaPagosForObra(cur).map(p=>({fecha:p.fecha,concepto:'👔 CONTRAT.: '+(p.concepto||'Pago Contratista'),cantidad:0,monto:parseFloat(p.monto)||0,montoCheque:0,devuelto:0,saldoTotal:0,saldoCheque:0,costoTotal:parseFloat(p.monto)||0,tipo:'contratista'}));
      const gl=[..._apExcel,..._gpExcel,..._ctExcel,...(gastos[cur]||[])];
      const cl=certificados[cur]||[];

      const wb=new ExcelJS.Workbook();
      wb.creator='Thalamus Finanzas';
      wb.created=new Date();
      const ws=wb.addWorksheet('\u2726 PLANILLA MADRE',{
        pageSetup:{orientation:'landscape',fitToPage:true,fitToWidth:1}
      });

      ws.columns=[
        {key:'A',width:4},{key:'B',width:14},{key:'C',width:46},
        {key:'D',width:12},{key:'E',width:18},{key:'F',width:12},
        {key:'G',width:18},{key:'H',width:13},{key:'I',width:13},
        {key:'J',width:13},{key:'K',width:17.11}
      ];

      const AZUL_OSC='1F3864', AZUL_MED='2E75B6', VERDE_OSC='375623';
      const VERDE_MED='2E7D32', AZUL_CL='D6E4F0', VERDE_CL='E8F5E9';
      const GRIS='D9D9D9', AMARILLO='F4B942', AMAR_INP='FFFACD';
      const FMT_NUM='#,##0', FMT_PCT='0.0%';

      const fill=(c)=>({type:'pattern',pattern:'solid',fgColor:{argb:'FF'+c}});
      const font=(bold,color='000000',sz=10)=>({bold,color:{argb:'FF'+color},size:sz,name:'Calibri'});
      const aln=(h='left',v='middle',wrap=false)=>({horizontal:h,vertical:v,wrapText:wrap});

      function setCell(addr, val, opts={}){
        const c=ws.getCell(addr);
        c.value=val;
        if(opts.bold!==undefined||opts.color||opts.size) c.font=font(opts.bold||false, opts.color||'000000', opts.size||10);
        if(opts.bg) c.fill=fill(opts.bg);
        c.alignment=aln(opts.align||'left', opts.valign||'middle', opts.wrap||false);
        if(opts.fmt) c.numFmt=opts.fmt;
      }

      // ── FILAS 1-5: Título e info ──
      ws.mergeCells('B1:K1');
      const nombreObra=(o.num?`Nº${o.num} – `:'')+o.nombre;
      setCell('B1',nombreObra,{bold:true,color:'FFFFFF',bg:AZUL_OSC,align:'center',size:14});
      ws.getRow(1).height=34.5;

      [2,3,4,5].forEach(r=>ws.getRow(r).height=18);
      ws.mergeCells('B2:C2'); ws.mergeCells('D2:F2');
      ws.mergeCells('B3:C3'); ws.mergeCells('D3:F3');
      ws.mergeCells('B4:C4'); ws.mergeCells('D4:F4');
      ws.mergeCells('B5:C5'); ws.mergeCells('D5:F5');
      setCell('B2','FECHA DE INICIO',{bold:true,bg:GRIS});
      setCell('D2',o.fecha||'',{bg:AMAR_INP});
      setCell('B3','MONTO CONTRATO',{bold:true,bg:GRIS});
      setCell('D3',parseFloat(o.contrato)||0,{bg:AMAR_INP,align:'right',fmt:FMT_NUM});
      setCell('B4','ADENDA',{bold:true,bg:GRIS});
      setCell('D4',parseFloat(o.adenda)||0,{bg:AMAR_INP,align:'right',fmt:FMT_NUM});
      setCell('B5','ESTADO',{bold:true,bg:GRIS});
      setCell('D5',o.estado||'EN EJECUCIÓN',{bg:AMAR_INP});

      // ── FILA 7-8: Header gastos ──
      ws.mergeCells('B7:K7');
      setCell('B7','TOTAL DE GASTOS REALES',{bold:true,color:'FFFFFF',bg:AZUL_MED,align:'center',size:11});
      ws.getRow(7).height=22;
      const h8=[['B','FECHA'],['C','CONCEPTO'],['D','CANTIDAD'],
        ['E','MONTO PAGADO'],['F','REGISTRO'],['G','MONTO PAGADO'],
        ['H','DEVUELTO'],['I','SALDO TOTAL'],['J','SALDO CHEQUE'],['K','COSTO TOTAL']];
      h8.forEach(([col,txt])=>setCell(`${col}8`,txt,{bold:true,color:'FFFFFF',bg:AZUL_OSC,align:'center',wrap:true,size:9}));
      ws.getRow(8).height=30;

      // ── GASTOS DINÁMICO ──
      const gStart=9;
      const gCount=Math.max(gl.length,1);
      for(let i=0;i<gCount;i++){
        const rn=gStart+i, g=gl[i]||null, row=''+rn;
        ws.getRow(rn).height=15.75;
        setCell('B'+row,g?.fecha||'',{bg:AZUL_CL});
        setCell('C'+row,g?.concepto||'',{bg:AZUL_CL});
        setCell('D'+row,g?.cantidad||'',{bg:AZUL_CL,align:'right'});
        setCell('E'+row,parseFloat(g?.monto)||0,{bg:AZUL_CL,align:'right',fmt:FMT_NUM});
        setCell('F'+row,g?.registro||'',{bg:AZUL_CL});
        setCell('G'+row,parseFloat(g?.montoCheque)||0,{bg:AZUL_CL,align:'right',fmt:FMT_NUM});
        setCell('H'+row,parseFloat(g?.devuelto)||0,{bg:AZUL_CL,align:'right',fmt:FMT_NUM});
        setCell('I'+row,parseFloat(g?.saldoTotal)||0,{bg:AZUL_CL,align:'right',fmt:FMT_NUM});
        setCell('J'+row,parseFloat(g?.saldoCheque)||0,{bg:AZUL_CL,align:'right',fmt:FMT_NUM});
        ws.getCell('K'+row).value={formula:'J'+row};
        ws.getCell('K'+row).fill=fill(AZUL_CL);
        ws.getCell('K'+row).numFmt=FMT_NUM;
        ws.getCell('K'+row).alignment=aln('right');
      }
      const gEnd=gStart+gCount-1;

      // ── Total Gastos ──
      const rTG=gEnd+1;
      ws.getRow(rTG).height=18;
      ws.mergeCells('B'+rTG+':D'+rTG);
      setCell('B'+rTG,'TOTAL GASTOS',{bold:true,bg:AMARILLO,align:'center'});
      ws.getCell('E'+rTG).value={formula:`SUM(E${gStart}:E${gEnd})`};
      ws.getCell('E'+rTG).fill=fill(AMARILLO); ws.getCell('E'+rTG).font=font(true); ws.getCell('E'+rTG).numFmt=FMT_NUM; ws.getCell('E'+rTG).alignment=aln('right');
      ws.getCell('K'+rTG).value={formula:`SUM(K${gStart}:K${gEnd})`};
      ws.getCell('K'+rTG).fill=fill(AMARILLO); ws.getCell('K'+rTG).numFmt=FMT_NUM; ws.getCell('K'+rTG).alignment=aln('right');

      // ── CERTIFICADOS DINÁMICO ──
      const rCH=rTG+2; // cert header
      ws.mergeCells('B'+rCH+':J'+rCH);
      ws.getRow(rCH).height=22;
      setCell('B'+rCH,'DETALLE DE PAGOS RECIBIDOS (CERTIFICADOS)',{bold:true,color:'FFFFFF',bg:VERDE_OSC,align:'center',size:11});

      const rCC=rCH+1; // cert columns
      ws.getRow(rCC).height=20;
      [['B','FECHA'],['C','CONCEPTO / CERTIFICADO'],['E','TOTAL PAGADO (BRUTO)'],
       ['G','RETENCIÓN REAL'],['H','NETO COBRADO']].forEach(([col,txt])=>
        setCell(col+rCC,txt,{bold:true,color:'FFFFFF',bg:AZUL_OSC,align:'center',size:9}));

      const cStart=rCC+1;
      const cCount=Math.max(cl.length,1);
      for(let i=0;i<cCount;i++){
        const rn=cStart+i, c=cl[i]||null, row=''+rn;
        ws.getRow(rn).height=15.75;
        setCell('B'+row,c?.fecha||'',{bg:VERDE_CL});
        setCell('C'+row,c?.concepto||'',{bg:VERDE_CL});
        setCell('E'+row,parseFloat(c?.bruto)||0,{bg:VERDE_CL,align:'right',fmt:FMT_NUM});
        setCell('H'+row,parseFloat(c?.neto)||0,{bg:VERDE_CL,align:'right',fmt:FMT_NUM});
        ws.getCell('G'+row).value={formula:'E'+row+'-H'+row};
        ws.getCell('G'+row).fill=fill(VERDE_CL); ws.getCell('G'+row).numFmt=FMT_NUM; ws.getCell('G'+row).alignment=aln('right');
      }
      const cEnd=cStart+cCount-1;

      // ── Total Pagos Recibidos ──
      const rTC=cEnd+1;
      ws.getRow(rTC).height=18;
      ws.mergeCells('B'+rTC+':D'+rTC);
      setCell('B'+rTC,'TOTAL PAGOS RECIBIDOS',{bold:true,color:'FFFFFF',bg:VERDE_MED,align:'center'});
      ['E','G','H'].forEach(col=>{
        ws.getCell(col+rTC).value={formula:`SUM(${col}${cStart}:${col}${cEnd})`};
        ws.getCell(col+rTC).fill=fill(VERDE_MED); ws.getCell(col+rTC).font=font(true,'FFFFFF');
        ws.getCell(col+rTC).numFmt=FMT_NUM; ws.getCell(col+rTC).alignment=aln('right');
      });

      // ── RESUMEN GENERAL ──
      const rRH=rTC+2; // resumen header
      ws.mergeCells('B'+rRH+':J'+rRH);
      ws.getRow(rRH).height=15.6;
      setCell('B'+rRH,'RESUMEN GENERAL',{bold:true,color:'FFFFFF',bg:AZUL_OSC,align:'center',size:12});

      const r1=rRH+1; // MONTO CONTRATO row

      const resumen=[
        [r1,  'MONTO CONTRATO',              {formula:'D3+D4'},                             FMT_NUM, false],
        [r1+1,'TOTAL DE GASTOS',             {formula:'E'+rTG},                             FMT_NUM, false],
        [r1+2,'TOTAL BRUTO COBRADO',         {formula:'E'+rTC},                             FMT_NUM, false],
        [r1+3,'RETENCIÓN TOTAL',             {formula:'G'+rTC},                             FMT_NUM, false],
        [r1+4,'TOTAL NETO COBRADO',          {formula:'H'+rTC},                             FMT_NUM, false],
        [r1+5,'GANANCIA NETA (neto - gastos)',{formula:'H'+rTC+'-E'+rTG},                   FMT_NUM, false],
        [r1+6,'PARA SOCIOS (50%)',           {formula:'(H'+rTC+'-E'+rTG+')/2'},             FMT_NUM, true ],
        [r1+7,'PORCENTAJE DE GANANCIA',      {formula:'IFERROR((H'+rTC+'-E'+rTG+')/E'+rTC+',0)'}, FMT_PCT, false],
        [r1+8,'SALDO A COBRAR',              {formula:'H'+r1+'-E'+rTC},                    FMT_NUM, false],
        [r1+9,'SALDO A PAGAR',               {formula:'K'+rTG},                             FMT_NUM, false],
      ];
      resumen.forEach(([rn,label,formula,fmt,bold])=>{
        ws.getRow(rn).height=18;
        const bg=bold?AMARILLO:GRIS;
        ws.mergeCells('B'+rn+':F'+rn);
        setCell('B'+rn,label,{bold,bg,align:'left'});
        const hCell=ws.getCell('H'+rn);
        hCell.value=formula; hCell.fill=fill(bg);
        hCell.font=font(bold); hCell.numFmt=fmt; hCell.alignment=aln('right');
      });

      ws.views=[{state:'frozen',ySplit:8,xSplit:1,topLeftCell:'B9',activeCell:'B9'}];

      const buffer=await wb.xlsx.writeBuffer();
      const blob=new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      const fn=`Planilla_${o.num?'N'+o.num+'_':''}${o.nombre.replace(/[^a-zA-Z0-9]/g,'_')}_${today()}.xlsx`;
      a.href=url; a.download=fn; a.click();
      URL.revokeObjectURL(url);
      toast('Excel exportado ✓','ok');

    }catch(err){
      console.error(err);
      toast('Error generando Excel: '+err.message,'err');
    }
  });
};

window.exportPDF = function(){
  if(!cur||!obras[cur]){toast('Seleccioná una obra primero','err');return}
  if(typeof window.jspdf==='undefined'&&typeof jsPDF==='undefined'){
    toast('Cargando librería PDF...','info');
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
    s.onload=()=>{
      const s2=document.createElement('script');
      s2.src='https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js';
      s2.onload=()=>_buildPDF();
      document.head.appendChild(s2);
    };
    document.head.appendChild(s);
  } else {
    _buildPDF();
  }
};

function _buildPDF(){
  const jsPDF=window.jspdf?.jsPDF||window.jsPDF;
  if(!jsPDF){toast('Error cargando PDF','err');return}
  const o=obras[cur], r=calcRes(cur);
  const nombre=(o.num?'Nº'+o.num+' – ':'')+o.nombre;
  const _gpPdf=gestorPagosForObra(cur).map(p=>({fecha:p.fecha,concepto:'👷 GESTOR: '+(p.concepto||'Entrega'),cantidad:0,monto:parseFloat(p.monto)||0,montoCheque:0,devuelto:0,saldoTotal:0,saldoCheque:0,costoTotal:parseFloat(p.monto)||0}));
  const _apPdf=ayudaSocialPagosForObra(cur).map(p=>({fecha:p.fecha,concepto:'🏛️ A.SOCIAL: '+(p.concepto||'Ayuda Social'),cantidad:0,monto:parseFloat(p.monto)||0,montoCheque:0,devuelto:0,saldoTotal:0,saldoCheque:0,costoTotal:parseFloat(p.monto)||0}));
  const _ctPdf=contratistaPagosForObra(cur).map(p=>({fecha:p.fecha,concepto:'👔 CONTRAT.: '+(p.concepto||'Pago Contratista'),cantidad:0,monto:parseFloat(p.monto)||0,montoCheque:0,devuelto:0,saldoTotal:0,saldoCheque:0,costoTotal:parseFloat(p.monto)||0}));
  const gl=[..._apPdf,..._gpPdf,..._ctPdf,...(gastos[cur]||[])];
  const cl=certificados[cur]||[];

  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  const W=doc.internal.pageSize.getWidth();
  const H=doc.internal.pageSize.getHeight();

  const AZUL_OSC=[31,56,100], AZUL_MED=[46,117,182], VERDE_OSC=[55,86,35];
  const VERDE_MED=[46,125,50], AZUL_CL=[214,228,240], VERDE_CL=[232,245,233];
  const GRIS=[217,217,217], AMARILLO=[244,185,66], AMAR_INP=[255,250,205];
  const WHITE=[255,255,255], BLACK=[0,0,0];

  const fNum=(x)=>{if(!x||isNaN(x))x=0;return Math.round(x).toLocaleString('es-PY')};
  const M=8;

  // Título
  doc.setFillColor(...AZUL_OSC); doc.rect(M,M,W-M*2,10,'F');
  doc.setTextColor(...WHITE); doc.setFontSize(12); doc.setFont('helvetica','bold');
  doc.text(nombre,W/2,M+7,{align:'center'});

  // Info obra
  let y=M+12;
  const infoRows=[['FECHA DE INICIO',o.fecha||''],['MONTO CONTRATO',fNum(parseFloat(o.contrato)||0)],
    ['ADENDA',fNum(parseFloat(o.adenda)||0)],['ESTADO',o.estado||'EN EJECUCIÓN']];
  infoRows.forEach(([label,val])=>{
    doc.setFillColor(...GRIS);doc.rect(M,y,60,6,'F');
    doc.setFillColor(...AMAR_INP);doc.rect(M+60,y,50,6,'F');
    doc.setTextColor(...BLACK);doc.setFontSize(8);doc.setFont('helvetica','bold');
    doc.text(label,M+2,y+4.2);
    doc.setFont('helvetica','normal');doc.text(val,M+62,y+4.2);
    y+=6;
  });
  y+=4;

  // GASTOS
  doc.setFillColor(...AZUL_MED);doc.rect(M,y,W-M*2,7,'F');
  doc.setTextColor(...WHITE);doc.setFontSize(10);doc.setFont('helvetica','bold');
  doc.text('TOTAL DE GASTOS REALES',W/2,y+5.2,{align:'center'});
  y+=8;

  const gastosHead=[['Nº','Fecha','Concepto','Cant.','Monto Pagado','Registro','M.Cheque','Devuelto','Saldo Total','Saldo Cheque','Costo Total']];
  const moduleCount=_apPdf.length+_gpPdf.length+_ctPdf.length;
  const gastosBody=gl.map((g,i)=>[(i+1).toString(),g.fecha||'',g.concepto||'',g.cantidad||'',
    fNum(g.monto),g.registro||'',fNum(g.montoCheque),fNum(g.devuelto),fNum(g.saldoTotal),fNum(g.saldoCheque),fNum(g.costoTotal)]);
  const totalMP=gl.reduce((s,g)=>s+(parseFloat(g.monto)||0),0);
  const totalCh=gl.reduce((s,g)=>s+(parseFloat(g.montoCheque)||0),0);
  const totalCT=gl.reduce((s,g)=>s+(parseFloat(g.costoTotal)||0),0);

  doc.autoTable({startY:y,head:gastosHead,body:gastosBody,
    foot:[['','','TOTAL GASTOS','',fNum(totalMP),'',fNum(totalCh),'','','',fNum(totalCT)]],
    columnStyles:{0:{cellWidth:8,halign:'center'},1:{cellWidth:18},2:{cellWidth:52},3:{cellWidth:12,halign:'center'},
      4:{cellWidth:24,halign:'right'},5:{cellWidth:18},6:{cellWidth:24,halign:'right'},7:{cellWidth:20,halign:'right'},
      8:{cellWidth:20,halign:'right'},9:{cellWidth:20,halign:'right'},10:{cellWidth:24,halign:'right'}},
    styles:{fontSize:6.5,cellPadding:1.8,textColor:BLACK,lineColor:[180,180,180],lineWidth:0.2},
    headStyles:{fillColor:AZUL_OSC,textColor:WHITE,fontStyle:'bold',fontSize:6.5,halign:'center'},
    footStyles:{fillColor:AMARILLO,textColor:BLACK,fontStyle:'bold',fontSize:7},
    alternateRowStyles:{fillColor:AZUL_CL},bodyStyles:{fillColor:WHITE},
    margin:{left:M,right:M},theme:'grid',
    didParseCell:function(data){if(data.section==='body'&&data.row.index<moduleCount){data.cell.styles.fillColor=AZUL_CL;data.cell.styles.fontStyle='italic';}}
  });
  y=doc.lastAutoTable.finalY+6;

  // CERTIFICADOS
  if(y>H-50){doc.addPage();y=M;}
  doc.setFillColor(...VERDE_OSC);doc.rect(M,y,W-M*2,7,'F');
  doc.setTextColor(...WHITE);doc.setFontSize(10);doc.setFont('helvetica','bold');
  doc.text('DETALLE DE PAGOS RECIBIDOS (CERTIFICADOS)',W/2,y+5.2,{align:'center'});
  y+=8;
  const ct=calcCertsT(cur);
  doc.autoTable({startY:y,
    head:[['Nº','Fecha','Concepto / Certificado','Total Pagado (Bruto)','Retención Real','Neto Cobrado']],
    body:cl.map((c,i)=>[(i+1).toString(),c.fecha||'',c.concepto||'',fNum(c.bruto),fNum(c.retencion),fNum(c.neto)]),
    foot:[['','','TOTAL PAGOS RECIBIDOS',fNum(ct.br),fNum(ct.re),fNum(ct.ne)]],
    columnStyles:{0:{cellWidth:8,halign:'center'},1:{cellWidth:22},2:{cellWidth:70},3:{cellWidth:35,halign:'right'},4:{cellWidth:30,halign:'right'},5:{cellWidth:35,halign:'right'}},
    styles:{fontSize:7,cellPadding:2,textColor:BLACK,lineColor:[180,180,180],lineWidth:0.2},
    headStyles:{fillColor:AZUL_OSC,textColor:WHITE,fontStyle:'bold',fontSize:7,halign:'center'},
    footStyles:{fillColor:VERDE_MED,textColor:WHITE,fontStyle:'bold',fontSize:7.5},
    alternateRowStyles:{fillColor:VERDE_CL},bodyStyles:{fillColor:WHITE},
    margin:{left:M,right:M},theme:'grid'
  });
  y=doc.lastAutoTable.finalY+6;

  // RESUMEN GENERAL
  if(y>H-75){doc.addPage();y=M;}
  doc.setFillColor(...AZUL_OSC);doc.rect(M,y,W-M*2,7,'F');
  doc.setTextColor(...WHITE);doc.setFontSize(10);doc.setFont('helvetica','bold');
  doc.text('RESUMEN GENERAL',W/2,y+5.2,{align:'center'});
  y+=9;

  const resRows=[
    ['MONTO CONTRATO',fNum(r.con),false,GRIS],['TOTAL DE GASTOS',fNum(r.tg),false,GRIS],
    ['TOTAL BRUTO COBRADO',fNum(r.br),false,GRIS],['RETENCIÓN TOTAL',fNum(r.re),false,GRIS],
    ['TOTAL NETO COBRADO',fNum(r.ne),false,GRIS],['GANANCIA NETA (neto - gastos)',fNum(r.gan),false,GRIS],
    ['PARA FERNANDO ('+cfg.socios+'%)',fNum(r.corrCadaUno),true,AMARILLO],
    ['PARA WUILIAN ('+cfg.socios+'%)',fNum(r.corrCadaUno),true,AMARILLO],
    ['PORCENTAJE DE GANANCIA',fPct(r.pct),false,GRIS],
    ['SALDO A COBRAR',fNum(r.scob),false,GRIS],['SALDO A PAGAR',fNum(r.tk-r.tg),false,GRIS],
  ];
  const resLW=100,resVW=60,resX=W/2-(resLW+resVW)/2;
  resRows.forEach(([label,val,hl,bg])=>{
    doc.setFillColor(...bg);doc.rect(resX,y,resLW,7,'F');doc.rect(resX+resLW,y,resVW,7,'F');
    doc.setDrawColor(180,180,180);doc.setLineWidth(0.2);doc.rect(resX,y,resLW,7,'S');doc.rect(resX+resLW,y,resVW,7,'S');
    doc.setTextColor(...BLACK);doc.setFontSize(8);doc.setFont('helvetica',hl?'bold':'normal');
    doc.text(label,resX+2,y+5);doc.setFont('helvetica','bold');doc.text(val,resX+resLW+resVW-2,y+5,{align:'right'});
    y+=7;
  });

  // Footer
  const tp=doc.internal.getNumberOfPages();
  for(let i=1;i<=tp;i++){
    doc.setPage(i);const pH=doc.internal.pageSize.getHeight();
    doc.setFillColor(240,240,240);doc.rect(0,pH-8,W,8,'F');
    doc.setDrawColor(...AZUL_MED);doc.setLineWidth(0.3);doc.line(M,pH-8,W-M,pH-8);
    doc.setTextColor(100,100,120);doc.setFontSize(6.5);doc.setFont('helvetica','normal');
    doc.text('THALAMUS FINANZAS — '+new Date().toLocaleDateString('es-PY'),M,pH-3.5);
    doc.text('Página '+i+' de '+tp,W-M,pH-3.5,{align:'right'});
  }

  const fn='Planilla_'+(o.num?'N'+o.num+'_':'')+o.nombre.replace(/[^a-zA-Z0-9]/g,'_')+'_'+today()+'.pdf';
  doc.save(fn);toast('PDF exportado ✓','ok');
}

// ═══════════════════════════════════════
// EXPORTAR UTILIDADES
// ═══════════════════════════════════════
function getUtilidadesData(){
  const list=Object.values(obras);
  let totGan=0,totF=0,totW=0;
  const rows=list.map(o=>{
    const r=calcRes(o.id);
    totGan+=r.gan; totF+=r.corrCadaUno; totW+=r.corrCadaUno;
    return{nombre:(o.num?'Nº'+o.num+' – ':'')+o.nombre,gan:r.gan,f:r.corrCadaUno,w:r.corrCadaUno};
  });
  const retF=totalRetiros('fernando'),retW=totalRetiros('wuilian');
  const retFList=retiros.fernando||[],retWList=retiros.wuilian||[];
  return{rows,totGan,totF,totW,retF,retW,saldoF:totF-retF,saldoW:totW-retW,retFList,retWList};
}

window.exportUtilidadesExcel=function(){
  const loadExcelJS=(cb)=>{
    if(window.ExcelJS){cb();return;}
    toast('Cargando librería...','info');
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
    s.onload=cb; document.head.appendChild(s);
  };
  loadExcelJS(async()=>{
    const d=getUtilidadesData();
    const wb=new ExcelJS.Workbook(); wb.creator='Thalamus Finanzas';
    const ws=wb.addWorksheet('UTILIDADES');
    ws.columns=[{key:'A',width:40},{key:'B',width:22},{key:'C',width:22},{key:'D',width:22}];
    const AZUL='1F3864',GOLD='C9A84C',VERDE='375623',GRIS='D9D9D9',AMAR='F4B942';
    const FMT='#,##0';
    const fill=(c)=>({type:'pattern',pattern:'solid',fgColor:{argb:'FF'+c}});
    const font=(b,c='000000',sz=10)=>({bold:b,color:{argb:'FF'+c},size:sz,name:'Calibri'});
    const thin={style:'thin',color:{argb:'FF000000'}};
    const brd={top:thin,left:thin,bottom:thin,right:thin};
    function sc(addr,val,opts={}){
      const c=ws.getCell(addr);c.value=val;
      if(opts.b||opts.c||opts.sz)c.font=font(opts.b||false,opts.c||'000000',opts.sz||10);
      if(opts.bg)c.fill=fill(opts.bg);
      c.alignment={horizontal:opts.al||'left',vertical:'middle'};
      if(opts.fmt)c.numFmt=opts.fmt;
      c.border=brd;
    }
    // Title
    ws.mergeCells('A1:D1');
    sc('A1','CONTROL DE UTILIDADES — '+today(),{b:true,c:'FFFFFF',bg:AZUL,sz:12,al:'center'});
    ws.getRow(1).height=28;
    // Headers
    ['A2','B2','C2','D2'].forEach((addr,i)=>{
      sc(addr,['Obra','Ganancia Neta','Fernando ('+cfg.socios+'%)','Wuilian ('+cfg.socios+'%)'][i],{b:true,c:'FFFFFF',bg:AZUL,al:'center'});
    });
    // Rows
    d.rows.forEach((r,i)=>{
      const rn=3+i;
      sc('A'+rn,r.nombre,{bg:i%2?GRIS:'FFFFFF'});
      sc('B'+rn,r.gan,{fmt:FMT,bg:i%2?GRIS:'FFFFFF',al:'right'});
      sc('C'+rn,r.f,{fmt:FMT,bg:i%2?GRIS:'FFFFFF',al:'right'});
      sc('D'+rn,r.w,{fmt:FMT,bg:i%2?GRIS:'FFFFFF',al:'right'});
    });
    // Totals
    let rn=3+d.rows.length;
    sc('A'+rn,'TOTAL GLOBAL',{b:true,bg:AMAR,al:'center'});
    sc('B'+rn,d.totGan,{b:true,bg:AMAR,fmt:FMT,al:'right'});
    sc('C'+rn,d.totF,{b:true,bg:AMAR,fmt:FMT,al:'right'});
    sc('D'+rn,d.totW,{b:true,bg:AMAR,fmt:FMT,al:'right'});
    rn+=2;
    // Resumen socios
    ws.mergeCells('A'+rn+':D'+rn);
    sc('A'+rn,'RESUMEN POR SOCIO',{b:true,c:'FFFFFF',bg:AZUL,sz:11,al:'center'}); rn++;
    const resumen=[
      ['Fernando — Le corresponde',d.totF],['Fernando — Retirado',d.retF],['Fernando — Saldo',d.saldoF],
      ['Wuilian — Le corresponde',d.totW],['Wuilian — Retirado',d.retW],['Wuilian — Saldo',d.saldoW],
    ];
    resumen.forEach(([label,val],i)=>{
      sc('A'+rn,label,{b:i%3===2,bg:i%3===2?AMAR:GRIS});
      sc('B'+rn,val,{b:i%3===2,bg:i%3===2?AMAR:GRIS,fmt:FMT,al:'right'});
      rn++;
    });
    // Retiros Fernando
    if(d.retFList.length){
      rn++;
      ws.mergeCells('A'+rn+':D'+rn);
      sc('A'+rn,'RETIROS — FERNANDO',{b:true,c:'FFFFFF',bg:'7A5515',al:'center'}); rn++;
      ['Fecha','Concepto','Monto'].forEach((h,i)=>sc(['A','B','C'][i]+rn,h,{b:true,c:'FFFFFF',bg:AZUL,al:'center'})); rn++;
      d.retFList.forEach(r=>{sc('A'+rn,r.fecha||'');sc('B'+rn,r.concepto||'');sc('C'+rn,r.monto||0,{fmt:FMT,al:'right'});rn++;});
    }
    // Retiros Wuilian
    if(d.retWList.length){
      rn++;
      ws.mergeCells('A'+rn+':D'+rn);
      sc('A'+rn,'RETIROS — WUILIAN',{b:true,c:'FFFFFF',bg:'2E75B6',al:'center'}); rn++;
      ['Fecha','Concepto','Monto'].forEach((h,i)=>sc(['A','B','C'][i]+rn,h,{b:true,c:'FFFFFF',bg:AZUL,al:'center'})); rn++;
      d.retWList.forEach(r=>{sc('A'+rn,r.fecha||'');sc('B'+rn,r.concepto||'');sc('C'+rn,r.monto||0,{fmt:FMT,al:'right'});rn++;});
    }
    const buffer=await wb.xlsx.writeBuffer();
    const blob=new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download='Utilidades_'+today()+'.xlsx';a.click();
    toast('Excel de Utilidades exportado ✓','ok');
  });
};

window.exportUtilidadesPDF=function(){
  if(typeof window.jspdf==='undefined'&&typeof jsPDF==='undefined'){
    toast('Cargando librería PDF...','info');
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
    s.onload=()=>{
      const s2=document.createElement('script');
      s2.src='https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js';
      s2.onload=()=>_buildUtilidadesPDF();
      document.head.appendChild(s2);
    };document.head.appendChild(s);
  }else{_buildUtilidadesPDF();}
};

function _buildUtilidadesPDF(){
  const jsPDF=window.jspdf?.jsPDF||window.jsPDF;
  if(!jsPDF){toast('Error cargando PDF','err');return}
  const d=getUtilidadesData();
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const W=doc.internal.pageSize.getWidth();
  const M=10;
  const AZUL=[31,56,100],AMAR=[244,185,66],GRIS=[230,230,230],BLACK=[0,0,0],WHITE=[255,255,255];
  const fNum=(x)=>Math.round(x||0).toLocaleString('es-PY');

  // Header
  doc.setFillColor(...AZUL);doc.rect(M,M,W-M*2,10,'F');
  doc.setTextColor(...WHITE);doc.setFontSize(12);doc.setFont('helvetica','bold');
  doc.text('CONTROL DE UTILIDADES',W/2,M+7,{align:'center'});
  doc.setFontSize(7);doc.setFont('helvetica','normal');
  doc.text(new Date().toLocaleDateString('es-PY'),W-M-2,M+7,{align:'right'});

  let y=M+14;

  // Tabla utilidades por obra
  doc.autoTable({startY:y,
    head:[['Obra','Ganancia Neta','Fernando ('+cfg.socios+'%)','Wuilian ('+cfg.socios+'%)']],
    body:d.rows.map(r=>[r.nombre,fNum(r.gan),fNum(r.f),fNum(r.w)]),
    foot:[['TOTAL GLOBAL',fNum(d.totGan),fNum(d.totF),fNum(d.totW)]],
    columnStyles:{0:{cellWidth:70},1:{halign:'right'},2:{halign:'right'},3:{halign:'right'}},
    styles:{fontSize:7.5,cellPadding:2.5,textColor:BLACK,lineColor:[180,180,180],lineWidth:0.2},
    headStyles:{fillColor:AZUL,textColor:WHITE,fontStyle:'bold',fontSize:7.5,halign:'center'},
    footStyles:{fillColor:AMAR,textColor:BLACK,fontStyle:'bold'},
    alternateRowStyles:{fillColor:GRIS},bodyStyles:{fillColor:WHITE},
    margin:{left:M,right:M},theme:'grid'
  });
  y=doc.lastAutoTable.finalY+8;

  // Resumen socios
  doc.setFillColor(...AZUL);doc.rect(M,y,W-M*2,7,'F');
  doc.setTextColor(...WHITE);doc.setFontSize(9);doc.setFont('helvetica','bold');
  doc.text('RESUMEN POR SOCIO',W/2,y+5,{align:'center'});y+=9;
  const resRows=[
    ['Fernando — Le corresponde',fNum(d.totF),false],['Fernando — Retirado',fNum(d.retF),false],['Fernando — Saldo',fNum(d.saldoF),true],
    ['Wuilian — Le corresponde',fNum(d.totW),false],['Wuilian — Retirado',fNum(d.retW),false],['Wuilian — Saldo',fNum(d.saldoW),true],
  ];
  const rW=80,vW=50,rX=W/2-(rW+vW)/2;
  resRows.forEach(([label,val,hl])=>{
    const bg=hl?AMAR:GRIS;
    doc.setFillColor(...bg);doc.rect(rX,y,rW,6.5,'F');doc.rect(rX+rW,y,vW,6.5,'F');
    doc.setDrawColor(180,180,180);doc.setLineWidth(0.2);doc.rect(rX,y,rW,6.5,'S');doc.rect(rX+rW,y,vW,6.5,'S');
    doc.setTextColor(...BLACK);doc.setFontSize(8);doc.setFont('helvetica',hl?'bold':'normal');
    doc.text(label,rX+2,y+4.5);doc.setFont('helvetica','bold');doc.text(val,rX+rW+vW-2,y+4.5,{align:'right'});
    y+=6.5;
  });
  y+=6;

  // Retiros
  const printRetiros=(nombre,list)=>{
    if(!list.length)return;
    if(y>250){doc.addPage();y=M;}
    doc.setFillColor(...AZUL);doc.rect(M,y,W-M*2,6,'F');
    doc.setTextColor(...WHITE);doc.setFontSize(8);doc.setFont('helvetica','bold');
    doc.text('RETIROS — '+nombre.toUpperCase(),W/2,y+4.2,{align:'center'});y+=7;
    doc.autoTable({startY:y,
      head:[['Fecha','Concepto','Monto']],
      body:list.map(r=>[r.fecha||'',r.concepto||'',fNum(r.monto)]),
      columnStyles:{2:{halign:'right'}},
      styles:{fontSize:7,cellPadding:2,textColor:BLACK,lineColor:[180,180,180],lineWidth:0.2},
      headStyles:{fillColor:AZUL,textColor:WHITE,fontStyle:'bold',halign:'center'},
      alternateRowStyles:{fillColor:GRIS},bodyStyles:{fillColor:WHITE},
      margin:{left:M,right:M},theme:'grid'
    });
    y=doc.lastAutoTable.finalY+6;
  };
  printRetiros('Fernando',d.retFList);
  printRetiros('Wuilian',d.retWList);

  // Footer
  const tp=doc.internal.getNumberOfPages();
  for(let i=1;i<=tp;i++){
    doc.setPage(i);const pH=doc.internal.pageSize.getHeight();
    doc.setFillColor(240,240,240);doc.rect(0,pH-8,W,8,'F');
    doc.setTextColor(100,100,120);doc.setFontSize(6.5);doc.setFont('helvetica','normal');
    doc.text('THALAMUS FINANZAS — Utilidades — '+new Date().toLocaleDateString('es-PY'),M,pH-3.5);
    doc.text('Página '+i+' de '+tp,W-M,pH-3.5,{align:'right'});
  }
  doc.save('Utilidades_'+today()+'.pdf');
  toast('PDF de Utilidades exportado ✓','ok');
}
