// ═══════════════════════════════════════
// STATE
// ═══════════════════════════════════════
let obras={}, gastos={}, certificados={}, actividades=[], retiros={fernando:[],wuilian:[]}, gestorPagos=[], ayudaSocialPagos=[], contratistaPagos=[];
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
