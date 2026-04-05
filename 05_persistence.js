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

