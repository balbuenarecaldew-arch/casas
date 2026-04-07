// ═══════════════════════════════════════
// RESUMEN
// ═══════════════════════════════════════
function renderResumen(){
  if(!cur){toast('Seleccioná una obra','err');navTo('obras');return}
  const o=obras[cur], r=calcRes(cur);
  gs('resumen-sub').innerHTML=(o.num?'<span style="font-size:1.2em;font-weight:800">N\xba'+o.num+'</span> \u2013 ':'')+o.nombre+' \u00b7 '+new Date().toLocaleDateString('es-PY');
  gs('rtbody').innerHTML=[
    ['MONTO CONTRATO',fGs(r.con),'y'],
    ['TOTAL DE GASTOS',fGs(r.tg),'r'],
    ['TOTAL BRUTO COBRADO',fGs(r.br),'b'],
    ['RETENCI\xd3N TOTAL',fGs(r.re),''],
    ['TOTAL NETO COBRADO',fGs(r.ne),'g'],
    ['GANANCIA NETA (neto \u2212 gastos)',fGs(r.gan),r.gan>=0?'g':'r'],
    ['PARA FERNANDO ('+cfg.socios+'%)',fGs(r.corrCadaUno),'y'],
    ['PARA WUILIAN ('+cfg.socios+'%)',fGs(r.corrCadaUno),'b'],
    ['PORCENTAJE DE GANANCIA',fPct(r.pct),''],
    ['SALDO A COBRAR',fGs(r.scob),'b'],
  ].map(([l,val,c])=>`<tr>
    <td style="font-family:'Syne',sans-serif;color:var(--dim);padding:.48rem .6rem;border-bottom:1px solid var(--border)">${l}</td>
    <td style="text-align:right;padding:.48rem .6rem;border-bottom:1px solid var(--border)" class="${c?'m-val '+c:''}">${val}</td>
  </tr>`).join('');
  // Tabla gastos
  const gl=gastos[cur]||[];
  const gPagosRes=cur?gestorPagosForObra(cur):[];
  const aPagosRes=cur?ayudaSocialPagosForObra(cur):[];
  const ctPagosRes=cur?contratistaPagosForObra(cur):[];
  const gtbody=gs('res-gtbody');
  if(gtbody){
    let resModHtml='';
    if(aPagosRes.length){
      resModHtml+=aPagosRes.map(p=>`<tr style="background:rgba(61,212,154,.04)"><td>${p.fecha||'\u2014'}</td><td style="font-family:'Syne',sans-serif;color:var(--green);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">🏛️ ${p.concepto||'Ayuda Social'}</td><td style="color:var(--green)">${fGs(p.monto)}</td><td>—</td><td>—</td><td style="color:var(--green)">${fGs(p.monto)}</td></tr>`).join('');
    }
    if(gPagosRes.length){
      resModHtml+=gPagosRes.map(p=>`<tr class="gestor-row-in-gastos"><td>${p.fecha||'\u2014'}</td><td style="font-family:'Syne',sans-serif;color:var(--amber);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">👷 ${p.concepto||'Entrega al Gestor'}</td><td style="color:var(--amber)">${fGs(p.monto)}</td><td>—</td><td>—</td><td style="color:var(--amber)">${fGs(p.monto)}</td></tr>`).join('');
    }
    if(ctPagosRes.length){
      resModHtml+=ctPagosRes.map(p=>{
        const cName=p.contratistaId&&obras[cur]?.contratistas?
          (obras[cur].contratistas.find(c=>c.id===p.contratistaId)?.nombre||''):'';
        return`<tr style="background:rgba(157,127,218,.04)"><td>${p.fecha||'\u2014'}</td><td style="font-family:'Syne',sans-serif;color:var(--purple);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">👔 ${p.concepto||'Pago Contratista'}${cName?' <span style="font-size:.6rem;opacity:.7">('+cName+')</span>':''}</td><td style="color:var(--purple)">${fGs(p.monto)}</td><td>—</td><td>—</td><td style="color:var(--purple)">${fGs(p.monto)}</td></tr>`;
      }).join('');
    }
    const regHtml=gl.length
      ? gl.map(g=>`<tr><td>${g.fecha||'\u2014'}</td><td style="font-family:'Syne',sans-serif;color:var(--txt);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${g.concepto}</td><td>${fGs(g.monto)}</td><td>${fGs(g.montoCheque)}</td><td>${fGs(g.devuelto)}</td><td style="color:var(--gold)">${fGs(g.costoTotal)}</td></tr>`).join('')
      : '';
    gtbody.innerHTML=(resModHtml+regHtml)||'<tr class="empty-row"><td colspan="6">Sin gastos</td></tr>';
    const gestorResTotal=gPagosRes.reduce((s,p)=>s+(parseFloat(p.monto)||0),0);
    const ayudaResTotal=aPagosRes.reduce((s,p)=>s+(parseFloat(p.monto)||0),0);
    const contratistaResTotal=ctPagosRes.reduce((s,p)=>s+(parseFloat(p.monto)||0),0);
    const tf1=gs('res-tf1'); if(tf1) tf1.textContent=fGs(gl.reduce((s,g)=>s+(parseFloat(g.monto)||0),0)+gestorResTotal+ayudaResTotal+contratistaResTotal);
    const tf3=gs('res-tf3'); if(tf3) tf3.textContent=fGs(gl.reduce((s,g)=>s+(parseFloat(g.costoTotal)||0),0)+gestorResTotal+ayudaResTotal+contratistaResTotal);
  }
  // Tabla certs
  const cl=certificados[cur]||[];
  const ctbody=gs('res-ctbody');
  if(ctbody){
    ctbody.innerHTML=cl.length
      ? cl.map(c=>`<tr><td>${c.fecha||'\u2014'}</td><td style="font-family:'Syne',sans-serif;color:var(--txt)">${c.concepto}</td><td style="color:var(--acc2)">${fGs(c.bruto)}</td><td style="color:var(--green)">${fGs(c.neto)}</td><td style="color:var(--acc3)">${fGs(c.retencion)}</td></tr>`).join('')
      : '<tr class="empty-row"><td colspan="5">Sin certificados</td></tr>';
    const ct=calcCertsT(cur);
    const rcb=gs('res-cb'); if(rcb) rcb.textContent=fGs(ct.br);
    const rcn=gs('res-cn'); if(rcn) rcn.textContent=fGs(ct.ne);
    const rcr=gs('res-cr'); if(rcr) rcr.textContent=fGs(ct.re);
  }
}

