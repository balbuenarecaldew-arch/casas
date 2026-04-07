// ═══════════════════════════════════════
// GESTOR — CONTROL DE PAGOS
// ═══════════════════════════════════════
function obraParticipaGestor(id){
  const o=obras[id]; if(!o) return false;
  if(o.gestorMonto!=null&&o.gestorMonto!==''){
    const m=parseFloat(o.gestorMonto); if(!isNaN(m)&&m>0) return true;
  }
  if(o.heri!=null&&parseFloat(o.heri)>0) return true;
  if(gestorPagos.some(p=>p.obraId===id)) return true;
  return false;
}
function calcGestorAdeudadoObra(id){
  const o=obras[id];
  if(o&&o.gestorMonto!=null&&o.gestorMonto!==''){
    const manual=parseFloat(o.gestorMonto);
    if(!isNaN(manual)) return manual;
  }
  if(o?.heri!=null){
    const amt=calcNetoObra(id)*(parseFloat(o.heri)/100);
    if(amt>0) return amt;
  }
  const entregado=calcGestorEntregadoObra(id);
  if(entregado>0) return entregado;
  return 0;
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
  const _salMap={};
  obraList.forEach(o=>{
    const ad=calcGestorAdeudadoObra(o.id);
    const en=calcGestorEntregadoObra(o.id);
    const nPagos=gestorPagos.filter(p=>p.obraId===o.id).length;
    _salMap[o.id]={sal:ad-en, pct:ad>0?Math.min(100,en/ad*100):0, nPagos};
  });
  if(filterVal==='actuales')      obraList=obraList.filter(o=>obraParticipaGestor(o.id));
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
      const neto=calcNetoObra(o.id);
      const participa=obraParticipaGestor(o.id);
      if(!participa){
        return`<div class="gestor-obra-card" style="opacity:.6;border-style:dashed">
          <div class="gestor-obra-card-header">
            <div class="gestor-obra-card-title" style="flex:1;min-width:0">
              <span class="gestor-obra-card-num" style="flex-shrink:0;font-size:1rem;font-weight:800;letter-spacing:.02em">${o.num?'Nº'+o.num:''}</span>
              <span style="white-space:normal;word-break:break-word">${o.nombre||'Sin nombre'}</span>
            </div>
            <div style="display:flex;align-items:center;gap:.35rem;flex-shrink:0;margin-left:.4rem">
              <span style="font-size:.6rem;color:var(--muted);font-style:italic">No incluida</span>
              <button class="btn btn-xs" style="background:rgba(232,160,68,.15);color:var(--amber);border:1px solid rgba(232,160,68,.2);padding:3px 10px;font-size:.62rem;font-weight:600"
                onclick="event.stopPropagation();activarObraGestor('${o.id}')">+ Incluir</button>
            </div>
          </div>
        </div>`;
      }
      const gesPct=obraGes(o.id);
      const autoCalc=neto*(gesPct/100);
      const hasOverride=o.gestorMonto!=null&&o.gestorMonto!=='';
      const adeObra=calcGestorAdeudadoObra(o.id);
      const entObra=calcGestorEntregadoObra(o.id);
      const salObra=adeObra-entObra;
      const pctPagado=adeObra>0?Math.min(100,entObra/adeObra*100):0;
      const pagosObra=gestorPagos.filter(p=>p.obraId===o.id).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
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
              <span class="gestor-card-entrega-monto">${fGs(p.monto)}</span>
              <button class="del-btn" style="width:18px;height:18px;font-size:.52rem" onclick="editGestorPago('${p.id}')" title="Editar">✏️</button>
              <button class="del-btn" style="width:18px;height:18px;font-size:.52rem" onclick="delGestorPago('${p.id}')" title="Eliminar">✕</button>
            </div>
          </div>`).join('');
      }else{
        entregasHtml='<div class="gestor-card-empty">Sin entregas asignadas aún</div>';
      }
      const autoBtn=`<button class="gestor-corresponde-auto" 
        onclick="resetGestorMontoObra('${o.id}')" 
        title="${hasOverride?'Volver al cálculo automático':'Ya en automático: '+gesPct+'% de neto cobrado'}"
        style="${hasOverride?'':'opacity:.35;cursor:default;pointer-events:none'}">↺ Auto (${gesPct}%)</button>`;
      return`<div class="gestor-obra-card">
        <div class="gestor-obra-card-header">
          <div class="gestor-obra-card-title" style="flex:1;min-width:0">
            <span class="gestor-obra-card-num" style="flex-shrink:0;font-size:1rem;font-weight:800;letter-spacing:.02em">${o.num?'Nº'+o.num:''}</span>
            <span style="white-space:normal;word-break:break-word">${o.nombre||'Sin nombre'}</span>
          </div>
          <div style="display:flex;align-items:center;gap:.35rem;flex-shrink:0;margin-left:.4rem">
            <button class="btn btn-ghost btn-xs" style="padding:2px 7px;font-size:.58rem;flex-shrink:0" onclick="event.stopPropagation();editObra('${o.id}')" title="Editar obra">✏️</button>
            <button class="btn btn-danger btn-xs" style="padding:2px 7px;font-size:.58rem;flex-shrink:0" onclick="event.stopPropagation();limpiarGestorObra('${o.id}')" title="Limpiar datos del gestor para esta obra">🧹</button>
          </div>
        </div>
        <div class="gestor-obra-card-body">
          <div class="gestor-obra-corresponde">
            <div>
              <div class="gestor-obra-corresponde-label">Le corresponde al gestor</div>
              <div style="font-size:.5rem;color:var(--muted);margin-top:1px">${hasOverride?'⚠️ Monto manual':'Auto: '+gesPct+'% de '+fGs(neto)+' (neto cobrado)'}</div>
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
  window.editGestorPago(id);
};

window.addGestorEntregaObra=function(obraId){
  gs('gp-fecha').value=today();
  gs('gp-monto').value='';
  gs('gp-concepto').value='';
  populateGestorObraSelect('gp-obra');
  gs('gp-obra').value=obraId;
  const formCard=gs('gp-fecha').closest('.card');
  if(formCard) formCard.scrollIntoView({behavior:'smooth',block:'start'});
  gs('gp-monto').focus();
  toast('Cargá la entrega para '+(obras[obraId]?.nombre||'esta obra'),'info');
};

window.updateGestorMontoObra=async function(obraId,val){
  if(!obras[obraId])return;
  const num=parseFloat(val);
  const autoCalc=calcNetoObra(obraId)*(obraGes(obraId)/100);
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
  toast('Vuelto al cálculo automático ('+obraGes(obraId)+'% de neto cobrado)','ok');
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
  const msg='¿Quitar "'+o.nombre+'" del gestor?\n'
    +(pagosAsignados.length?'— Se eliminarán '+pagosAsignados.length+' entrega(s)\n':'')
    +'— Se quitará el % y monto asignado';
  requireAuth(msg,async()=>{
    gestorPagos=gestorPagos.filter(p=>p.obraId!==obraId);
    await fbSet('gestor/pagos',{lista:gestorPagos});
    if(o.gestorMonto!=null) delete o.gestorMonto;
    if(o.heri!=null) delete o.heri;
    await fbSet('obras/'+obraId,o);
    saveCache(); renderGestor(); toast('"'+o.nombre+'" quitada del gestor ✓','ok');
  });
};
window.activarObraGestor=async function(obraId){
  const o=obras[obraId]; if(!o)return;
  o.heri=cfg.heri;
  await fbSet('obras/'+obraId,o);
  saveCache(); renderGestor();
  toast('"'+o.nombre+'" incluida en gestor ('+cfg.heri+'%) ✓','ok');
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
