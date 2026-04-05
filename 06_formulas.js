// ═══════════════════════════════════════
// FÓRMULAS (exactas a la planilla)
// ═══════════════════════════════════════
function obraAy(id){const o=obras[id];return o?.ayuda!=null?parseFloat(o.ayuda):cfg.ayuda}
function obraHe(id){const o=obras[id];return o?.heri!=null?parseFloat(o.heri):cfg.heri}
// obraGes = alias de obraHe: HERI es el gestor
function obraGes(id){return obraHe(id)}
function calcCon(id){const o=obras[id]||{};return(parseFloat(o.contrato)||0)+(parseFloat(o.adenda)||0)}
function costoG(g){return(parseFloat(g.monto)||0)+(parseFloat(g.saldoTotal)||0)+(parseFloat(g.saldoCheque)||0)}
function calcAy(id){return calcCon(id)*(obraAy(id)/100)}
function calcHe(id){return calcCon(id)*(obraHe(id)/100)}
function gestorPagosForObra(id){return gestorPagos.filter(p=>p.obraId===id)}
function gestorTotalForObra(id){return gestorPagosForObra(id).reduce((s,p)=>s+(parseFloat(p.monto)||0),0)}
function ayudaSocialPagosForObra(id){return ayudaSocialPagos.filter(p=>p.obraId===id)}
function ayudaSocialTotalForObra(id){return ayudaSocialPagosForObra(id).reduce((s,p)=>s+(parseFloat(p.monto)||0),0)}
function contratistaPagosForObra(id){return contratistaPagos.filter(p=>p.obraId===id)}
function contratistaTotalForObra(id){return contratistaPagosForObra(id).reduce((s,p)=>s+(parseFloat(p.monto)||0),0)}
function getObraContratistas(id){const o=obras[id];if(!o)return[];if(o.contratistas&&o.contratistas.length)return o.contratistas;if(o.contratistaMonto!=null&&o.contratistaMonto!==''){return[{id:'_legacy',nombre:'Contratista',monto:parseFloat(o.contratistaMonto)||0}]}return[];}
function calcContratistaAdeudadoObra(id){return getObraContratistas(id).reduce((s,c)=>s+(parseFloat(c.monto)||0),0);}
function calcContratistaEntregadoContr(obraId,cId){return contratistaPagos.filter(p=>p.obraId===obraId&&p.contratistaId===cId).reduce((s,p)=>s+(parseFloat(p.monto)||0),0)}
function calcTE(id){return(gastos[id]||[]).reduce((s,g)=>s+(parseFloat(g.monto)||0),0)+ayudaSocialTotalForObra(id)+gestorTotalForObra(id)+contratistaTotalForObra(id)}
function calcTK(id){return(gastos[id]||[]).reduce((s,g)=>s+costoG(g),0)+ayudaSocialTotalForObra(id)+gestorTotalForObra(id)+contratistaTotalForObra(id)}
function calcCertsT(id){
  const cs=certificados[id]||[];
  return{
    br:cs.reduce((s,c)=>s+(parseFloat(c.bruto)||0),0),
    ne:cs.reduce((s,c)=>s+(parseFloat(c.neto)||0),0),
    re:cs.reduce((s,c)=>s+((parseFloat(c.bruto)||0)-(parseFloat(c.neto)||0)),0)
  };
}
function calcRes(id){
  const con=calcCon(id),tg=calcTE(id),tk=calcTK(id);
  const{br,ne,re}=calcCertsT(id);
  const gan=ne-tg,pct=br>0?gan/br:0;
  // Cada socio recibe el 50% (cfg.socios) de la ganancia neta
  const corrCadaUno=gan*(cfg.socios/100);
  return{con,tg,tk,br,ne,re,gan,corrCadaUno,pct,scob:con-br,spag:tk};
}
async function touchObra(){if(cur&&obras[cur]){obras[cur].lastModified=Date.now();await fbSet('obras/'+cur,obras[cur]);}saveCache();}

