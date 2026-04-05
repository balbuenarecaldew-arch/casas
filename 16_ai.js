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

