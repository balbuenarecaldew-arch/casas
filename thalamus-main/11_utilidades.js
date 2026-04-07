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

