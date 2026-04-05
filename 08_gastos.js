// ═══════════════════════════════════════
// GASTOS — CARGA RÁPIDA
// ═══════════════════════════════════════
function renderGastosPage(){
  if(!cur){toast('Seleccioná una obra primero','err');navTo('obras');return}
  const o=obras[cur];
  gs('gsub').innerHTML='Obra: '+(o.num?'<span style="font-size:1.2em;font-weight:800">Nº'+o.num+'</span> – ':'')+o.nombre;
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
    html+=ctPagos.map((p,i)=>{
      const cName=p.contratistaId&&obras[cur]?.contratistas?
        (obras[cur].contratistas.find(c=>c.id===p.contratistaId)?.nombre||''):'';
      return`<tr style="background:rgba(157,127,218,.04) !important">
      <td style="color:var(--purple);font-size:.68rem;text-align:center;font-weight:600"><span class="tag tag-p" style="font-size:.5rem">CONTRAT.</span></td>
      <td>${p.fecha||'—'}</td>
      <td style="font-family:'Syne',sans-serif;color:var(--purple);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.concepto||'Pago Contratista'}${cName?' ('+cName+')':''}">👔 ${p.concepto||'Pago Contratista'}${cName?' <span style="font-size:.6rem;opacity:.7">('+cName+')</span>':''}</td>
      <td style="color:var(--purple)">${fGs(p.monto)}</td><td>—</td>
      <td>—</td><td>—</td><td>—</td>
      <td style="color:var(--purple);font-weight:600">${fGs(p.monto)}</td>
      <td><span class="tag tag-p" style="font-size:.5rem">CONTRAT.</span></td>
      <td style="white-space:nowrap"><button class="btn btn-ghost btn-xs" onclick="navTo('contratista')" title="Ver en Contratista">👔</button></td>
    </tr>`}).join('');
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

