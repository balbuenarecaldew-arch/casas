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
  g.innerHTML=list.map((o,idx)=>{
    const r=calcRes(o.id);
    return`<div class="obra-card ${o.id===cur?'act':''}" onclick="selectObra('${o.id}')">
      <div class="oc-num"><span style="font-size:.62rem;color:var(--muted);margin-right:4px">${idx+1}.</span>${o.num?'<span style="font-size:1.1rem;font-weight:800;letter-spacing:.02em">Nº'+o.num+'</span> ·':''} ${o.estado||'EN EJECUCIÓN'}${o.estado==='FINALIZADA'?' 🔒':''}</div>
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
  gs('dsh-title').innerHTML='Dashboard — '+(o.num?'<span style="font-size:1.2em;font-weight:800">Nº'+o.num+'</span> – ':'')+o.nombre;
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

