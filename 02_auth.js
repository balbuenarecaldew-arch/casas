// ═══════════════════════════════════════
// AUTH & ROLES
// ═══════════════════════════════════════
let _currentUser=null, _currentRole='socio';

async function hashPass(p){
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(p+'_thalamus2024'));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

// 🧂 Generar salt
function generateSalt(len=16){
  const chars='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s='';
  for(let i=0;i<len;i++) s+=chars[Math.floor(Math.random()*chars.length)];
  return s;
}

function getUsers(){try{return JSON.parse(localStorage.getItem('th_users'))||{};}catch{return {};}}
function saveUsersDB(u){localStorage.setItem('th_users',JSON.stringify(u));}

// Seed default users if none exist
(async function seedUsers(){
  const u=getUsers();
  if(Object.keys(u).length===0){
    const saltF=generateSalt(), saltW=generateSalt();
    u['fernando']={hash:await hashPass('fernando'+saltF),salt:saltF,role:'socio'};
    u['wuilian']={hash:await hashPass('wuilian'+saltW),salt:saltW,role:'socio'};
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

  const uData=users[user];

  // 🔐 Validación compatible con usuarios viejos (sin salt) y nuevos (con salt)
  const computedHash=uData.salt
    ? await hashPass(pass+uData.salt)
    : await hashPass(pass);

  if(uData.hash!==computedHash){el('login-err').textContent='Contraseña incorrecta';return}

  // 🔄 Migración automática silenciosa: si no tiene salt, lo agrega
  if(!uData.salt){
    const newSalt=generateSalt();
    uData.hash=await hashPass(pass+newSalt);
    uData.salt=newSalt;
    users[user]=uData;
    saveUsersDB(users);
  }

  _currentUser=user; _currentRole=uData.role||'socio';
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
  el('topAvatar').textContent=_currentUser?_currentUser.charAt(0).toUpperCase():'?';
  el('topUser').textContent=_currentUser||'';

  const isOp=_currentRole==='operador';
  document.querySelectorAll('.socio-only').forEach(e=>{
    if(isOp) e.classList.add('role-restricted');
    else e.classList.remove('role-restricted');
  });

  const newBtn=document.querySelector('.btn-new');
  if(newBtn){if(isOp)newBtn.classList.add('role-restricted');else newBtn.classList.remove('role-restricted');}

  renderUserList();
}

function renderUserList(){
  const list=document.getElementById('userList');
  if(!list)return;
  const users=getUsers();
  let h='';
  for(const[name,data]of Object.entries(users)){
    const self=name===_currentUser;
    h+='<div class="user-row">';
    h+='<span class="u-name">'+(self?'<b>'+name+'</b> (vos)':name)+'</span>';
    h+='<span style="font-size:.64rem;color:var(--muted);font-family:\'JetBrains Mono\',monospace;">••••</span>';
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
  const salt=generateSalt();
  users[name]={hash:await hashPass(pass+salt),salt,role};
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
  const users=getUsers();
  const salt=generateSalt();
  users[name].hash=await hashPass(np+salt);
  users[name].salt=salt;
  saveUsersDB(users);
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
