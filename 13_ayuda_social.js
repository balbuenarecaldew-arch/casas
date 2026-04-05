// ═══════════════════════════════════════
// AYUDA SOCIAL MODULE
// ═══════════════════════════════════════
function obraParticipaAyuda(id){
  const o=obras[id]; if(!o) return false;
  if(o.ayudaMonto!=null&&o.ayudaMonto!==''){
    const m=parseFloat(o.ayudaMonto); if(!isNaN(m)&&m>0) return true;
  }
  if(o.ayuda!=null&&calcCon(id)*(parseFloat(o.ayuda)/100)>0) return true;
  if(ayudaSocialPagos.some(p=>p.obraId===id)) return true;
  return false;
}
function calcAyudaAdeudadoObra(id){
  const o=obras[id];
  if(o&&o.ayudaMonto!=null&&o.ayudaMonto!==''){
    const manual=parseFloat(o.ayudaMonto);
    if(!isNaN(manual)) return manual;
  }
  if(o?.ayuda!=null){
    const amt=calcCon(id)*(parseFloat(o.ayuda)/100);
    if(amt>0) return amt;
  }
  const entregado=calcAyudaEntregadoObra(id);
  if(entregado>0) return entregado;
  return 0;
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
  if(filterVal==='actuales')      obraList=obraList.filter(o=>obraParticipaAyuda(o.id));
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
      const participa=obraParticipaAyuda(o.id);
      if(!participa){
        return`<div class="gestor-obra-card" style="opacity:.6;border-style:dashed">
          <div class="gestor-obra-card-header">
            <div class="gestor-obra-card-title" style="flex:1;min-width:0">
              <span class="gestor-obra-card-num" style="flex-shrink:0;font-size:1rem;font-weight:800;letter-spacing:.02em">${o.num?'Nº'+o.num:''}</span>
              <span style="white-space:normal;word-break:break-word">${o.nombre||'Sin nombre'}</span>
            </div>
            <div style="display:flex;align-items:center;gap:.35rem;flex-shrink:0;margin-left:.4rem">
              <span style="font-size:.6rem;color:var(--muted);font-style:italic">No incluida</span>
              <button class="btn btn-xs" style="background:rgba(61,212,154,.15);color:var(--green);border:1px solid rgba(61,212,154,.2);padding:3px 10px;font-size:.62rem;font-weight:600"
                onclick="event.stopPropagation();activarObraAyuda('${o.id}')">+ Incluir</button>
            </div>
          </div>
        </div>`;
      }
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
            <span class="gestor-obra-card-num" style="flex-shrink:0;font-size:1rem;font-weight:800;letter-spacing:.02em">${o.num?'Nº'+o.num:''}</span>
            <span style="white-space:normal;word-break:break-word">${o.nombre||'Sin nombre'}</span>
          </div>
          <div style="display:flex;align-items:center;gap:.35rem;flex-shrink:0;margin-left:.4rem">
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
  const msg='¿Quitar "'+o.nombre+'" de Ayuda Social?\n'
    +(pagosAsignados.length?'— Se eliminarán '+pagosAsignados.length+' entrega(s)\n':'')
    +'— Se quitará el % y monto asignado';
  requireAuth(msg,async()=>{
    ayudaSocialPagos=ayudaSocialPagos.filter(p=>p.obraId!==obraId);
    await fbSet('ayudaSocial/pagos',{lista:ayudaSocialPagos});
    if(o.ayudaMonto!=null) delete o.ayudaMonto;
    if(o.ayuda!=null) delete o.ayuda;
    await fbSet('obras/'+obraId,o);
    saveCache(); renderAyudaSocial(); toast('"'+o.nombre+'" quitada de Ayuda Social ✓','ok');
  });
};
window.activarObraAyuda=async function(obraId){
  const o=obras[obraId]; if(!o)return;
  o.ayuda=cfg.ayuda;
  await fbSet('obras/'+obraId,o);
  saveCache(); renderAyudaSocial();
  toast('"'+o.nombre+'" incluida en Ayuda Social ('+cfg.ayuda+'%) ✓','ok');
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

