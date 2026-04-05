// ═══════════════════════════════════════
// CONTRATISTA MODULE
// ═══════════════════════════════════════
function migrateContratistaData(){
  // Migrate old contratistaMonto to contratistas array
  Object.values(obras).forEach(o=>{
    if(!o.contratistas&&o.contratistaMonto!=null&&o.contratistaMonto!==''){
      const m=parseFloat(o.contratistaMonto);
      if(!isNaN(m)&&m>0){
        o.contratistas=[{id:uid(),nombre:'Contratista',monto:m}];
      }
      delete o.contratistaMonto;
    }
  });
  // Migrate old payments without contratistaId
  contratistaPagos.forEach(p=>{
    if(p.obraId&&!p.contratistaId){
      const o=obras[p.obraId];
      if(o&&o.contratistas&&o.contratistas.length){
        p.contratistaId=o.contratistas[0].id;
      }
    }
  });
}
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
    opt.value=o.id;
    opt.textContent=(o.num?'Nº'+o.num+' – ':'')+o.nombre;
    sel.appendChild(opt);
  });
  if(val) sel.value=val;
}

function _fillContratistaDropdown(obraId, selId){
  const sel=gs(selId);
  if(!sel) return;
  sel.innerHTML='';
  if(!obraId){
    sel.innerHTML='<option value="">— Elegí una obra primero —</option>';
    return;
  }
  const contrs=getObraContratistas(obraId);
  if(!contrs.length){
    sel.innerHTML='<option value="">— No hay contratistas en esta obra —</option>';
    return;
  }
  if(contrs.length===1){
    const c=contrs[0];
    sel.innerHTML='<option value="'+c.id+'">'+c.nombre+'</option>';
    return;
  }
  sel.innerHTML='<option value="">— Seleccioná contratista —</option>';
  contrs.forEach(c=>{
    const opt=document.createElement('option');
    opt.value=c.id;
    opt.textContent=c.nombre;
    sel.appendChild(opt);
  });
}

window.populateContratistaSelect=function(){
  const obraId=gs('ct-obra')?.value||'';
  _fillContratistaDropdown(obraId,'ct-contratista');
};

window.populateEditContratistaSelect=function(){
  const obraId=gs('ect-obra')?.value||'';
  _fillContratistaDropdown(obraId,'ect-contratista');
};

function renderContratista(){
  migrateContratistaData();
  populateContratistaObraSelect('ct-obra');
  gs('ct-fecha').value=gs('ct-fecha').value||today();

  gs('ct-count').textContent=contratistaPagos.length;
  const sortVal=(gs('contratistaSort')?.value)||'num-asc';
  const filterVal=(gs('contratistaFilter')?.value)||'todas';
  let obraList=Object.values(obras).filter(o=>(o.estado||'EN EJECUCIÓN')==='EN EJECUCIÓN');
  const _salMap={};
  obraList.forEach(o=>{
    const ad=calcContratistaAdeudadoObra(o.id);
    const en=calcContratistaEntregadoObra(o.id);
    const nPagos=contratistaPagos.filter(p=>p.obraId===o.id).length;
    const nContrs=getObraContratistas(o.id).length;
    _salMap[o.id]={sal:ad-en, pct:ad>0?Math.min(100,en/ad*100):0, nPagos, ad, nContrs};
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
  let _ctOpen={};
  try{_ctOpen=JSON.parse(localStorage.getItem('th_ct_open')||'{}');}catch(e){}
  if(obraList.length){
    const totalEjecucion=Object.values(obras).filter(o=>(o.estado||'EN EJECUCIÓN')==='EN EJECUCIÓN').length;
    const sinAsignar=calcContratistaSinAsignar();
    let html=obraList.map(o=>{
      const con=calcCon(o.id);
      const contrs=getObraContratistas(o.id);
      const adeObra=calcContratistaAdeudadoObra(o.id);
      const entObra=calcContratistaEntregadoObra(o.id);
      const salObra=adeObra-entObra;
      const isOpen=_ctOpen[o.id]===true;
      // Chips
      const nContrs=contrs.length;
      const contrsChip=`<span class="ct-acc-chip" style="background:rgba(157,127,218,.1);color:var(--purple)">${nContrs} contratista${nContrs!==1?'s':''}</span>`;
      const pendChip=salObra>0
        ?`<span class="ct-acc-chip" style="background:rgba(224,82,82,.1);color:var(--acc3)">Pend: ${fGs(salObra)}</span>`
        :(adeObra>0?`<span class="ct-acc-chip" style="background:rgba(61,212,154,.1);color:var(--green)">✓ Saldado</span>`:'');
      // Build contratista sections inside accordion body
      let contratistasHtml='';
      contrs.forEach(c=>{
        const cAde=parseFloat(c.monto)||0;
        const cEnt=calcContratistaEntregadoContr(o.id,c.id);
        const cSal=cAde-cEnt;
        const cPct=cAde>0?Math.min(100,cEnt/cAde*100):0;
        const cSalColor=cSal>0?'var(--acc3)':'var(--green)';
        const cPagos=contratistaPagos.filter(p=>p.obraId===o.id&&p.contratistaId===c.id).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
        let cEntregasHtml='';
        if(cPagos.length){
          cEntregasHtml=cPagos.map(p=>`
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
          cEntregasHtml='<div class="gestor-card-empty">Sin entregas aún</div>';
        }
        contratistasHtml+=`
        <div style="border:1px solid rgba(157,127,218,.15);border-radius:8px;padding:.6rem;margin-bottom:.6rem;background:rgba(157,127,218,.03)">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:.4rem;margin-bottom:.5rem;flex-wrap:wrap">
            <div style="display:flex;align-items:center;gap:.4rem;flex:1;min-width:0">
              <span style="font-size:.7rem;color:var(--purple)">👷</span>
              <input type="text" value="${(c.nombre||'').replace(/"/g,'&quot;')}" 
                class="gestor-corresponde-input" style="border-color:rgba(157,127,218,.25);color:var(--purple);font-weight:600;font-size:.72rem;flex:1;min-width:80px"
                onclick="event.stopPropagation()"
                onchange="updateContratistaNombre('${o.id}','${c.id}',this.value)"
                placeholder="Nombre del contratista" title="Nombre del contratista">
            </div>
            <button class="btn btn-danger btn-xs" style="padding:2px 7px;font-size:.52rem;flex-shrink:0" 
              onclick="event.stopPropagation();removeContratistaFromObra('${o.id}','${c.id}')" title="Eliminar contratista">✕</button>
          </div>
          <div class="gestor-obra-corresponde" style="background:rgba(157,127,218,.06);border-color:rgba(157,127,218,.12);margin:0 0 .4rem 0">
            <div>
              <div class="gestor-obra-corresponde-label" style="color:var(--purple);font-size:.6rem">Monto asignado</div>
            </div>
            <div class="gestor-corresponde-edit">
              <input type="number" class="gestor-corresponde-input" style="border-color:rgba(157,127,218,.25);color:var(--purple)" value="${Math.round(cAde)}" 
                onclick="event.stopPropagation()"
                onchange="updateContratistaMonto('${o.id}','${c.id}',this.value)"
                placeholder="Monto" title="Monto asignado a este contratista">
            </div>
          </div>
          <div class="gestor-obra-card-stats" style="margin-bottom:.3rem">
            <div class="gestor-obra-stat"><span class="gestor-obra-stat-label">Entregado</span><span class="gestor-obra-stat-val" style="color:var(--purple)">${fGs(cEnt)}</span></div>
            <div class="gestor-obra-stat"><span class="gestor-obra-stat-label">Pendiente</span><span class="gestor-obra-stat-val" style="color:${cSalColor}">${fGs(cSal)}</span></div>
          </div>
          <div class="prog-wrap" style="margin-top:.2rem;margin-bottom:.3rem">
            <div class="prog-bar"><div class="prog-fill" style="width:${cPct}%;background:var(--purple)"></div></div>
            <div style="font-size:.5rem;color:var(--muted);text-align:right;margin-top:2px">${cPct.toFixed(0)}% cubierto</div>
          </div>
          <div style="font-size:.5rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-top:.4rem;margin-bottom:.2rem;display:flex;align-items:center;gap:6px">
            <span style="width:10px;height:1.5px;background:linear-gradient(90deg,var(--purple),transparent);display:inline-block;border-radius:1px"></span>
            Entregas (${cPagos.length})
          </div>
          <div class="gestor-card-list">${cEntregasHtml}</div>
          <div class="gestor-quick-add" style="background:rgba(157,127,218,.04);border-color:rgba(157,127,218,.2)">
            <input type="number" class="gestor-quick-input" id="cqa-m-${o.id}-${c.id}" placeholder="Monto" style="width:90px" onclick="event.stopPropagation()">
            <input type="text" class="gestor-quick-input" id="cqa-c-${o.id}-${c.id}" placeholder="Concepto..." style="flex:1;min-width:0"
              onclick="event.stopPropagation()"
              onkeydown="if(event.key==='Enter')quickAddContratistaObra('${o.id}','${c.id}')">
            <button class="btn btn-xs" style="background:rgba(157,127,218,.15);color:var(--purple);border:1px solid rgba(157,127,218,.2);padding:3px 8px;font-size:.6rem" 
              onclick="event.stopPropagation();quickAddContratistaObra('${o.id}','${c.id}')">+ Entrega</button>
          </div>
        </div>`;
      });
      // Add contratista button
      contratistasHtml+=`
        <div style="text-align:center;margin-top:.4rem">
          <button class="btn btn-ghost btn-xs" style="color:var(--purple);border-color:rgba(157,127,218,.25);font-size:.6rem;padding:4px 12px"
            onclick="event.stopPropagation();addContratistaToObra('${o.id}')">+ Agregar contratista</button>
        </div>`;
      return`<div class="ct-accordion">
        <div class="ct-acc-header${isOpen?' open':''}" onclick="toggleCtAccordion('${o.id}',this)">
          <div class="ct-acc-left">
            <span class="ct-acc-num" style="font-size:1rem;font-weight:800;letter-spacing:.02em">${o.num?'Nº'+o.num:''}</span>
            <span class="ct-acc-name" style="white-space:normal;word-break:break-word">${o.nombre||'Sin nombre'}</span>
          </div>
          <div class="ct-acc-right">
            ${contrsChip}${pendChip}
            <span class="ct-acc-arrow">▼</span>
          </div>
        </div>
        <div class="ct-acc-body" style="${isOpen?'display:block':''}">
          <div style="display:flex;align-items:center;justify-content:flex-end;gap:.3rem;margin-bottom:.5rem">
            <button class="btn btn-ghost btn-xs" style="padding:2px 7px;font-size:.58rem" onclick="event.stopPropagation();editObra('${o.id}')" title="Editar obra">✏️</button>
            <button class="btn btn-danger btn-xs" style="padding:2px 7px;font-size:.58rem" onclick="event.stopPropagation();limpiarContratistaObra('${o.id}')" title="Limpiar datos del contratista">🧹</button>
          </div>
          ${contratistasHtml}
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
  const entregado=calcContratistaEntregado();
  if(!list.length){
    tbody.innerHTML='<tr class="empty-row"><td colspan="6">Sin entregas registradas</td></tr>';
    gs('ct-tf').textContent='₲ 0'; return;
  }
  tbody.innerHTML=list.map((p,i)=>{
    const oNombre=p.obraId&&obras[p.obraId]?(obras[p.obraId].num?'Nº'+obras[p.obraId].num+' – ':'')+obras[p.obraId].nombre:'';
    const cName=p.contratistaId&&p.obraId&&obras[p.obraId]?.contratistas?
      (obras[p.obraId].contratistas.find(c=>c.id===p.contratistaId)?.nombre||''):'';
    return`<tr${p.obraId?' style="background:rgba(157,127,218,.03)"':''}>
      <td style="color:var(--muted);font-size:.68rem;text-align:center;font-weight:600">${i+1}</td>
      <td>${p.fecha||'—'}</td>
      <td style="font-family:'Syne',sans-serif;color:var(--txt);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.concepto||''}">${p.concepto||'Entrega'}${cName?' <span style="font-size:.55rem;color:var(--purple)">('+cName+')</span>':''}</td>
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

window.addContratistaToObra=async function(obraId){
  const o=obras[obraId]; if(!o)return;
  if(!o.contratistas) o.contratistas=[];
  const nombre=prompt('Nombre del contratista:');
  if(!nombre||!nombre.trim()){return}
  o.contratistas.push({id:uid(),nombre:nombre.trim(),monto:0});
  await fbSet('obras/'+obraId,o);
  saveCache(); renderContratista();
  toast('Contratista "'+nombre.trim()+'" agregado ✓','ok');
};
window.removeContratistaFromObra=function(obraId,cId){
  const o=obras[obraId]; if(!o||!o.contratistas)return;
  const c=o.contratistas.find(x=>x.id===cId);
  const cName=c?.nombre||'contratista';
  const pagosContr=contratistaPagos.filter(p=>p.obraId===obraId&&p.contratistaId===cId);
  const msg='¿Eliminar "'+cName+'" de "'+o.nombre+'"?\n'
    +(pagosContr.length?'— Se eliminarán '+pagosContr.length+' entrega(s)\n':'')
    +'— Se eliminará el monto asignado';
  requireAuth(msg,async()=>{
    o.contratistas=o.contratistas.filter(x=>x.id!==cId);
    contratistaPagos=contratistaPagos.filter(p=>!(p.obraId===obraId&&p.contratistaId===cId));
    await fbSet('obras/'+obraId,o);
    await fbSet('contratista/pagos',{lista:contratistaPagos});
    saveCache(); renderContratista();
    toast('Contratista "'+cName+'" eliminado ✓','ok');
  });
};
window.updateContratistaNombre=async function(obraId,cId,nombre){
  const o=obras[obraId]; if(!o||!o.contratistas)return;
  const c=o.contratistas.find(x=>x.id===cId);
  if(!c)return;
  c.nombre=nombre.trim()||'Contratista';
  await fbSet('obras/'+obraId,o);
  saveCache();
  toast('Nombre actualizado ✓','ok');
};
window.updateContratistaMonto=async function(obraId,cId,val){
  const o=obras[obraId]; if(!o||!o.contratistas)return;
  const c=o.contratistas.find(x=>x.id===cId);
  if(!c)return;
  const num=parseFloat(val);
  c.monto=isNaN(num)?0:num;
  await fbSet('obras/'+obraId,o);
  saveCache(); renderContratista();
  toast('Monto actualizado ✓','ok');
};

window.clrContratistaForm=function(){
  gs('ct-fecha').value=today(); gs('ct-monto').value=''; gs('ct-concepto').value=''; gs('ct-obra').value='';
  const cSel=gs('ct-contratista'); if(cSel) cSel.innerHTML='<option value="">— Elegí una obra primero —</option>';
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
  const contratistaId=gs('ct-contratista')?.value||'';
  if(obraId&&!contratistaId){
    const contrs=getObraContratistas(obraId);
    if(contrs.length>1){toast('Seleccioná un contratista','err');return}
  }
  if(obraId&&obras[obraId]?.estado==='FINALIZADA'){toast('🔒 Obra FINALIZADA — no se puede asignar gastos','err');return}
  const p={id:uid(),fecha:v('ct-fecha')||today(),monto,
    concepto:v('ct-concepto')||'Pago contratista',
    obraId,contratistaId};
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
  _fillContratistaDropdown(p.obraId||'','ect-contratista');
  if(p.contratistaId) gs('ect-contratista').value=p.contratistaId;
  openM('mEditContratista');
};
window.saveEditContratista=async function(){
  const id=gs('ect-id').value;
  const p=contratistaPagos.find(p=>p.id===id);
  if(!p){toast('No encontrado','err');return}
  const newObraId=gs('ect-obra').value||'';
  const newContrId=gs('ect-contratista')?.value||'';
  if(newObraId&&!newContrId){
    const contrs=getObraContratistas(newObraId);
    if(contrs.length>1){toast('Seleccioná un contratista','err');return}
  }
  if(newObraId&&obras[newObraId]?.estado==='FINALIZADA'){toast('🔒 No se puede asignar a obra FINALIZADA','err');return}
  p.fecha=gs('ect-fecha').value;
  p.monto=parseFloat(gs('ect-monto').value)||0;
  p.concepto=gs('ect-concepto').value;
  p.obraId=newObraId;
  p.contratistaId=newContrId;
  await fbSet('contratista/pagos',{lista:contratistaPagos});
  saveCache(); closeM('mEditContratista'); renderContratista();
  toast('Entrega actualizada ✓','ok');
};
window.asignarContratistaObra=function(id){
  window.editContratistaPago(id);
};
window.updateContratistaMontoObra=async function(obraId,val){
  // Legacy compatibility - redirect to first contratista
  if(!obras[obraId])return;
  const contrs=getObraContratistas(obraId);
  if(contrs.length){
    updateContratistaMonto(obraId,contrs[0].id,val);
  }
};
window.quickAddContratistaObra=async function(obraId,contratistaId){
  if(obras[obraId]?.estado==='FINALIZADA'){toast('🔒 Obra FINALIZADA — no se puede asignar gastos','err');return}
  const mEl=gs('cqa-m-'+obraId+'-'+contratistaId);
  const cEl=gs('cqa-c-'+obraId+'-'+contratistaId);
  const monto=parseFloat(mEl?.value)||0;
  if(!monto){toast('Ingresá el monto','err');return}
  const cName=obras[obraId]?.contratistas?.find(c=>c.id===contratistaId)?.nombre||'contratista';
  const p={id:uid(),fecha:today(),monto,concepto:cEl?.value?.trim()||'Pago a '+cName,obraId,contratistaId};
  contratistaPagos.push(p);
  await fbSet('contratista/pagos',{lista:contratistaPagos});
  saveCache(); renderContratista();
  toast('Entrega registrada para '+cName+' ✓','ok');
};
window.limpiarContratistaObra=function(obraId){
  const o=obras[obraId]; if(!o)return;
  const pagosAsignados=contratistaPagos.filter(p=>p.obraId===obraId);
  const nContrs=(o.contratistas||[]).length;
  const msg='¿Limpiar datos de contratistas para "'+o.nombre+'"?\n'
    +(pagosAsignados.length?'— Se eliminarán '+pagosAsignados.length+' entrega(s)\n':'')
    +(nContrs?'— Se eliminarán '+nContrs+' contratista(s)':'');
  requireAuth(msg,async()=>{
    contratistaPagos=contratistaPagos.filter(p=>p.obraId!==obraId);
    await fbSet('contratista/pagos',{lista:contratistaPagos});
    if(o.contratistas){delete o.contratistas; await fbSet('obras/'+obraId,o);}
    if(o.contratistaMonto!=null){delete o.contratistaMonto; await fbSet('obras/'+obraId,o);}
    saveCache(); renderContratista(); toast('Datos de contratistas limpiados para "'+o.nombre+'" ✓','ok');
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

