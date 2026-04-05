// ═══════════════════════════════════════
// EXPORTAR UTILIDADES
// ═══════════════════════════════════════
function getUtilidadesData(){
  const list=Object.values(obras);
  let totGan=0,totF=0,totW=0;
  const rows=list.map(o=>{
    const r=calcRes(o.id);
    totGan+=r.gan; totF+=r.corrCadaUno; totW+=r.corrCadaUno;
    return{nombre:(o.num?'Nº'+o.num+' – ':'')+o.nombre,gan:r.gan,f:r.corrCadaUno,w:r.corrCadaUno};
  });
  const retF=totalRetiros('fernando'),retW=totalRetiros('wuilian');
  const retFList=retiros.fernando||[],retWList=retiros.wuilian||[];
  return{rows,totGan,totF,totW,retF,retW,saldoF:totF-retF,saldoW:totW-retW,retFList,retWList};
}

window.exportUtilidadesExcel=function(){
  const loadExcelJS=(cb)=>{
    if(window.ExcelJS){cb();return;}
    toast('Cargando librería...','info');
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
    s.onload=cb; document.head.appendChild(s);
  };
  loadExcelJS(async()=>{
    const d=getUtilidadesData();
    const wb=new ExcelJS.Workbook(); wb.creator='Thalamus Finanzas';
    const ws=wb.addWorksheet('UTILIDADES');
    ws.columns=[{key:'A',width:40},{key:'B',width:22},{key:'C',width:22},{key:'D',width:22}];
    const AZUL='1F3864',GOLD='C9A84C',VERDE='375623',GRIS='D9D9D9',AMAR='F4B942';
    const FMT='#,##0';
    const fill=(c)=>({type:'pattern',pattern:'solid',fgColor:{argb:'FF'+c}});
    const font=(b,c='000000',sz=10)=>({bold:b,color:{argb:'FF'+c},size:sz,name:'Calibri'});
    const thin={style:'thin',color:{argb:'FF000000'}};
    const brd={top:thin,left:thin,bottom:thin,right:thin};
    function sc(addr,val,opts={}){
      const c=ws.getCell(addr);c.value=val;
      if(opts.b||opts.c||opts.sz)c.font=font(opts.b||false,opts.c||'000000',opts.sz||10);
      if(opts.bg)c.fill=fill(opts.bg);
      c.alignment={horizontal:opts.al||'left',vertical:'middle'};
      if(opts.fmt)c.numFmt=opts.fmt;
      c.border=brd;
    }
    // Title
    ws.mergeCells('A1:D1');
    sc('A1','CONTROL DE UTILIDADES — '+today(),{b:true,c:'FFFFFF',bg:AZUL,sz:12,al:'center'});
    ws.getRow(1).height=28;
    // Headers
    ['A2','B2','C2','D2'].forEach((addr,i)=>{
      sc(addr,['Obra','Ganancia Neta','Fernando ('+cfg.socios+'%)','Wuilian ('+cfg.socios+'%)'][i],{b:true,c:'FFFFFF',bg:AZUL,al:'center'});
    });
    // Rows
    d.rows.forEach((r,i)=>{
      const rn=3+i;
      sc('A'+rn,r.nombre,{bg:i%2?GRIS:'FFFFFF'});
      sc('B'+rn,r.gan,{fmt:FMT,bg:i%2?GRIS:'FFFFFF',al:'right'});
      sc('C'+rn,r.f,{fmt:FMT,bg:i%2?GRIS:'FFFFFF',al:'right'});
      sc('D'+rn,r.w,{fmt:FMT,bg:i%2?GRIS:'FFFFFF',al:'right'});
    });
    // Totals
    let rn=3+d.rows.length;
    sc('A'+rn,'TOTAL GLOBAL',{b:true,bg:AMAR,al:'center'});
    sc('B'+rn,d.totGan,{b:true,bg:AMAR,fmt:FMT,al:'right'});
    sc('C'+rn,d.totF,{b:true,bg:AMAR,fmt:FMT,al:'right'});
    sc('D'+rn,d.totW,{b:true,bg:AMAR,fmt:FMT,al:'right'});
    rn+=2;
    // Resumen socios
    ws.mergeCells('A'+rn+':D'+rn);
    sc('A'+rn,'RESUMEN POR SOCIO',{b:true,c:'FFFFFF',bg:AZUL,sz:11,al:'center'}); rn++;
    const resumen=[
      ['Fernando — Le corresponde',d.totF],['Fernando — Retirado',d.retF],['Fernando — Saldo',d.saldoF],
      ['Wuilian — Le corresponde',d.totW],['Wuilian — Retirado',d.retW],['Wuilian — Saldo',d.saldoW],
    ];
    resumen.forEach(([label,val],i)=>{
      sc('A'+rn,label,{b:i%3===2,bg:i%3===2?AMAR:GRIS});
      sc('B'+rn,val,{b:i%3===2,bg:i%3===2?AMAR:GRIS,fmt:FMT,al:'right'});
      rn++;
    });
    // Retiros Fernando
    if(d.retFList.length){
      rn++;
      ws.mergeCells('A'+rn+':D'+rn);
      sc('A'+rn,'RETIROS — FERNANDO',{b:true,c:'FFFFFF',bg:'7A5515',al:'center'}); rn++;
      ['Fecha','Concepto','Monto'].forEach((h,i)=>sc(['A','B','C'][i]+rn,h,{b:true,c:'FFFFFF',bg:AZUL,al:'center'})); rn++;
      d.retFList.forEach(r=>{sc('A'+rn,r.fecha||'');sc('B'+rn,r.concepto||'');sc('C'+rn,r.monto||0,{fmt:FMT,al:'right'});rn++;});
    }
    // Retiros Wuilian
    if(d.retWList.length){
      rn++;
      ws.mergeCells('A'+rn+':D'+rn);
      sc('A'+rn,'RETIROS — WUILIAN',{b:true,c:'FFFFFF',bg:'2E75B6',al:'center'}); rn++;
      ['Fecha','Concepto','Monto'].forEach((h,i)=>sc(['A','B','C'][i]+rn,h,{b:true,c:'FFFFFF',bg:AZUL,al:'center'})); rn++;
      d.retWList.forEach(r=>{sc('A'+rn,r.fecha||'');sc('B'+rn,r.concepto||'');sc('C'+rn,r.monto||0,{fmt:FMT,al:'right'});rn++;});
    }
    const buffer=await wb.xlsx.writeBuffer();
    const blob=new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download='Utilidades_'+today()+'.xlsx';a.click();
    toast('Excel de Utilidades exportado ✓','ok');
  });
};

window.exportUtilidadesPDF=function(){
  if(typeof window.jspdf==='undefined'&&typeof jsPDF==='undefined'){
    toast('Cargando librería PDF...','info');
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
    s.onload=()=>{
      const s2=document.createElement('script');
      s2.src='https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js';
      s2.onload=()=>_buildUtilidadesPDF();
      document.head.appendChild(s2);
    };document.head.appendChild(s);
  }else{_buildUtilidadesPDF();}
};

function _buildUtilidadesPDF(){
  const jsPDF=window.jspdf?.jsPDF||window.jsPDF;
  if(!jsPDF){toast('Error cargando PDF','err');return}
  const d=getUtilidadesData();
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const W=doc.internal.pageSize.getWidth();
  const M=10;
  const AZUL=[31,56,100],AMAR=[244,185,66],GRIS=[230,230,230],BLACK=[0,0,0],WHITE=[255,255,255];
  const fNum=(x)=>Math.round(x||0).toLocaleString('es-PY');

  // Header
  doc.setFillColor(...AZUL);doc.rect(M,M,W-M*2,10,'F');
  doc.setTextColor(...WHITE);doc.setFontSize(12);doc.setFont('helvetica','bold');
  doc.text('CONTROL DE UTILIDADES',W/2,M+7,{align:'center'});
  doc.setFontSize(7);doc.setFont('helvetica','normal');
  doc.text(new Date().toLocaleDateString('es-PY'),W-M-2,M+7,{align:'right'});

  let y=M+14;

  // Tabla utilidades por obra
  doc.autoTable({startY:y,
    head:[['Obra','Ganancia Neta','Fernando ('+cfg.socios+'%)','Wuilian ('+cfg.socios+'%)']],
    body:d.rows.map(r=>[r.nombre,fNum(r.gan),fNum(r.f),fNum(r.w)]),
    foot:[['TOTAL GLOBAL',fNum(d.totGan),fNum(d.totF),fNum(d.totW)]],
    columnStyles:{0:{cellWidth:70},1:{halign:'right'},2:{halign:'right'},3:{halign:'right'}},
    styles:{fontSize:7.5,cellPadding:2.5,textColor:BLACK,lineColor:[180,180,180],lineWidth:0.2},
    headStyles:{fillColor:AZUL,textColor:WHITE,fontStyle:'bold',fontSize:7.5,halign:'center'},
    footStyles:{fillColor:AMAR,textColor:BLACK,fontStyle:'bold'},
    alternateRowStyles:{fillColor:GRIS},bodyStyles:{fillColor:WHITE},
    margin:{left:M,right:M},theme:'grid'
  });
  y=doc.lastAutoTable.finalY+8;

  // Resumen socios
  doc.setFillColor(...AZUL);doc.rect(M,y,W-M*2,7,'F');
  doc.setTextColor(...WHITE);doc.setFontSize(9);doc.setFont('helvetica','bold');
  doc.text('RESUMEN POR SOCIO',W/2,y+5,{align:'center'});y+=9;
  const resRows=[
    ['Fernando — Le corresponde',fNum(d.totF),false],['Fernando — Retirado',fNum(d.retF),false],['Fernando — Saldo',fNum(d.saldoF),true],
    ['Wuilian — Le corresponde',fNum(d.totW),false],['Wuilian — Retirado',fNum(d.retW),false],['Wuilian — Saldo',fNum(d.saldoW),true],
  ];
  const rW=80,vW=50,rX=W/2-(rW+vW)/2;
  resRows.forEach(([label,val,hl])=>{
    const bg=hl?AMAR:GRIS;
    doc.setFillColor(...bg);doc.rect(rX,y,rW,6.5,'F');doc.rect(rX+rW,y,vW,6.5,'F');
    doc.setDrawColor(180,180,180);doc.setLineWidth(0.2);doc.rect(rX,y,rW,6.5,'S');doc.rect(rX+rW,y,vW,6.5,'S');
    doc.setTextColor(...BLACK);doc.setFontSize(8);doc.setFont('helvetica',hl?'bold':'normal');
    doc.text(label,rX+2,y+4.5);doc.setFont('helvetica','bold');doc.text(val,rX+rW+vW-2,y+4.5,{align:'right'});
    y+=6.5;
  });
  y+=6;

  // Retiros
  const printRetiros=(nombre,list)=>{
    if(!list.length)return;
    if(y>250){doc.addPage();y=M;}
    doc.setFillColor(...AZUL);doc.rect(M,y,W-M*2,6,'F');
    doc.setTextColor(...WHITE);doc.setFontSize(8);doc.setFont('helvetica','bold');
    doc.text('RETIROS — '+nombre.toUpperCase(),W/2,y+4.2,{align:'center'});y+=7;
    doc.autoTable({startY:y,
      head:[['Fecha','Concepto','Monto']],
      body:list.map(r=>[r.fecha||'',r.concepto||'',fNum(r.monto)]),
      columnStyles:{2:{halign:'right'}},
      styles:{fontSize:7,cellPadding:2,textColor:BLACK,lineColor:[180,180,180],lineWidth:0.2},
      headStyles:{fillColor:AZUL,textColor:WHITE,fontStyle:'bold',halign:'center'},
      alternateRowStyles:{fillColor:GRIS},bodyStyles:{fillColor:WHITE},
      margin:{left:M,right:M},theme:'grid'
    });
    y=doc.lastAutoTable.finalY+6;
  };
  printRetiros('Fernando',d.retFList);
  printRetiros('Wuilian',d.retWList);

  // Footer
  const tp=doc.internal.getNumberOfPages();
  for(let i=1;i<=tp;i++){
    doc.setPage(i);const pH=doc.internal.pageSize.getHeight();
    doc.setFillColor(240,240,240);doc.rect(0,pH-8,W,8,'F');
    doc.setTextColor(100,100,120);doc.setFontSize(6.5);doc.setFont('helvetica','normal');
    doc.text('THALAMUS FINANZAS — Utilidades — '+new Date().toLocaleDateString('es-PY'),M,pH-3.5);
    doc.text('Página '+i+' de '+tp,W-M,pH-3.5,{align:'right'});
  }
  doc.save('Utilidades_'+today()+'.pdf');
  toast('PDF de Utilidades exportado ✓','ok');
}

// ═══════════════════════════════════════
// PDF — GESTOR
// ═══════════════════════════════════════
function _loadPDFLib(cb){
  if(typeof window.jspdf!=='undefined'||typeof jsPDF!=='undefined'){cb();return;}
  toast('Cargando librería PDF...','info');
  const s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
  s.onload=()=>{
    const s2=document.createElement('script');
    s2.src='https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js';
    s2.onload=cb; document.head.appendChild(s2);
  };document.head.appendChild(s);
}

window.exportGestorPDF=function(){_loadPDFLib(_buildGestorPDF);};

function _buildGestorPDF(){
  const jsPDF=window.jspdf?.jsPDF||window.jsPDF;
  if(!jsPDF){toast('Error cargando PDF','err');return}
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const W=doc.internal.pageSize.getWidth();
  const M=10;
  const AZUL=[31,56,100],AMBER=[232,160,68],GRIS=[230,230,230],BLACK=[0,0,0],WHITE=[255,255,255],GREEN=[46,125,50],RED=[224,82,82];
  const fNum=(x)=>Math.round(x||0).toLocaleString('es-PY');

  // Header
  doc.setFillColor(...AZUL);doc.rect(M,M,W-M*2,10,'F');
  doc.setTextColor(...WHITE);doc.setFontSize(12);doc.setFont('helvetica','bold');
  doc.text('CONTROL DE GESTOR (HERI)',W/2,M+7,{align:'center'});
  doc.setFontSize(7);doc.setFont('helvetica','normal');
  doc.text(new Date().toLocaleDateString('es-PY'),W-M-2,M+7,{align:'right'});

  let y=M+14;

  // Resumen global
  const adeudado=calcGestorAdeudado();
  const entregado=calcGestorEntregado();
  const saldo=adeudado-entregado;
  doc.autoTable({startY:y,
    head:[['Total Adeudado','Total Entregado','Saldo Pendiente']],
    body:[[fNum(adeudado),fNum(entregado),fNum(saldo)]],
    styles:{fontSize:9,cellPadding:3,textColor:BLACK,halign:'center'},
    headStyles:{fillColor:AZUL,textColor:WHITE,fontStyle:'bold'},
    bodyStyles:{fillColor:WHITE,fontStyle:'bold'},
    margin:{left:M,right:M},theme:'grid'
  });
  y=doc.lastAutoTable.finalY+6;

  // Tabla por obra
  const obraList=Object.values(obras).filter(o=>obraParticipaGestor(o.id)).sort((a,b)=>(parseInt(a.num)||0)-(parseInt(b.num)||0));
  const body=obraList.map(o=>{
    const ad=calcGestorAdeudadoObra(o.id);
    const en=calcGestorEntregadoObra(o.id);
    const sal=ad-en;
    const pagos=gestorPagos.filter(p=>p.obraId===o.id);
    return[(o.num?'Nº'+o.num:''),o.nombre||'',fNum(ad),fNum(en),fNum(sal),pagos.length.toString()];
  });
  doc.autoTable({startY:y,
    head:[['Nº','Obra','Corresponde','Entregado','Pendiente','Entregas']],
    body:body,
    foot:[['','TOTAL',fNum(adeudado),fNum(entregado),fNum(saldo),'']],
    columnStyles:{0:{cellWidth:14,halign:'center'},2:{halign:'right'},3:{halign:'right'},4:{halign:'right'},5:{halign:'center',cellWidth:18}},
    styles:{fontSize:7.5,cellPadding:2.5,textColor:BLACK,lineColor:[180,180,180],lineWidth:0.2},
    headStyles:{fillColor:AZUL,textColor:WHITE,fontStyle:'bold',halign:'center'},
    footStyles:{fillColor:AMBER,textColor:BLACK,fontStyle:'bold'},
    alternateRowStyles:{fillColor:GRIS},bodyStyles:{fillColor:WHITE},
    margin:{left:M,right:M},theme:'grid'
  });
  y=doc.lastAutoTable.finalY+6;

  // Detalle entregas por obra
  obraList.forEach(o=>{
    const pagos=gestorPagos.filter(p=>p.obraId===o.id).sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||''));
    if(!pagos.length)return;
    if(y>250){doc.addPage();y=M;}
    doc.setFillColor(...AMBER);doc.rect(M,y,W-M*2,6,'F');
    doc.setTextColor(...BLACK);doc.setFontSize(8);doc.setFont('helvetica','bold');
    doc.text((o.num?'Nº'+o.num+' — ':'')+o.nombre,M+2,y+4.2);y+=7;
    doc.autoTable({startY:y,
      head:[['Fecha','Concepto','Monto']],
      body:pagos.map(p=>[p.fecha||'',p.concepto||'Entrega',fNum(p.monto)]),
      columnStyles:{2:{halign:'right'}},
      styles:{fontSize:7,cellPadding:2,textColor:BLACK,lineColor:[180,180,180],lineWidth:0.2},
      headStyles:{fillColor:AZUL,textColor:WHITE,fontStyle:'bold',halign:'center'},
      alternateRowStyles:{fillColor:GRIS},bodyStyles:{fillColor:WHITE},
      margin:{left:M,right:M},theme:'grid'
    });
    y=doc.lastAutoTable.finalY+4;
  });

  // Footer
  const tp=doc.internal.getNumberOfPages();
  for(let i=1;i<=tp;i++){
    doc.setPage(i);const pH=doc.internal.pageSize.getHeight();
    doc.setFillColor(240,240,240);doc.rect(0,pH-8,W,8,'F');
    doc.setTextColor(100,100,120);doc.setFontSize(6.5);doc.setFont('helvetica','normal');
    doc.text('THALAMUS FINANZAS — Gestor — '+new Date().toLocaleDateString('es-PY'),M,pH-3.5);
    doc.text('Página '+i+' de '+tp,W-M,pH-3.5,{align:'right'});
  }
  doc.save('Gestor_'+today()+'.pdf');
  toast('PDF del Gestor exportado ✓','ok');
}

// ═══════════════════════════════════════
// PDF — AYUDA SOCIAL
// ═══════════════════════════════════════
window.exportAyudaPDF=function(){_loadPDFLib(_buildAyudaPDF);};

function _buildAyudaPDF(){
  const jsPDF=window.jspdf?.jsPDF||window.jsPDF;
  if(!jsPDF){toast('Error cargando PDF','err');return}
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const W=doc.internal.pageSize.getWidth();
  const M=10;
  const AZUL=[31,56,100],VERDE=[46,125,50],GRIS=[230,230,230],BLACK=[0,0,0],WHITE=[255,255,255],VERDE_CL=[61,212,154];
  const fNum=(x)=>Math.round(x||0).toLocaleString('es-PY');

  doc.setFillColor(...AZUL);doc.rect(M,M,W-M*2,10,'F');
  doc.setTextColor(...WHITE);doc.setFontSize(12);doc.setFont('helvetica','bold');
  doc.text('CONTROL DE AYUDA SOCIAL',W/2,M+7,{align:'center'});
  doc.setFontSize(7);doc.setFont('helvetica','normal');
  doc.text(new Date().toLocaleDateString('es-PY'),W-M-2,M+7,{align:'right'});

  let y=M+14;
  const adeudado=calcAyudaAdeudado();
  const entregado=calcAyudaEntregado();
  const saldo=adeudado-entregado;
  doc.autoTable({startY:y,
    head:[['Total Adeudado','Total Entregado','Saldo Pendiente']],
    body:[[fNum(adeudado),fNum(entregado),fNum(saldo)]],
    styles:{fontSize:9,cellPadding:3,textColor:BLACK,halign:'center'},
    headStyles:{fillColor:AZUL,textColor:WHITE,fontStyle:'bold'},
    bodyStyles:{fillColor:WHITE,fontStyle:'bold'},
    margin:{left:M,right:M},theme:'grid'
  });
  y=doc.lastAutoTable.finalY+6;

  const obraList=Object.values(obras).filter(o=>obraParticipaAyuda(o.id)).sort((a,b)=>(parseInt(a.num)||0)-(parseInt(b.num)||0));
  const body=obraList.map(o=>{
    const ad=calcAyudaAdeudadoObra(o.id);
    const en=calcAyudaEntregadoObra(o.id);
    const sal=ad-en;
    const pagos=ayudaSocialPagos.filter(p=>p.obraId===o.id);
    return[(o.num?'Nº'+o.num:''),o.nombre||'',fNum(ad),fNum(en),fNum(sal),pagos.length.toString()];
  });
  doc.autoTable({startY:y,
    head:[['Nº','Obra','Corresponde','Entregado','Pendiente','Entregas']],
    body:body,
    foot:[['','TOTAL',fNum(adeudado),fNum(entregado),fNum(saldo),'']],
    columnStyles:{0:{cellWidth:14,halign:'center'},2:{halign:'right'},3:{halign:'right'},4:{halign:'right'},5:{halign:'center',cellWidth:18}},
    styles:{fontSize:7.5,cellPadding:2.5,textColor:BLACK,lineColor:[180,180,180],lineWidth:0.2},
    headStyles:{fillColor:VERDE,textColor:WHITE,fontStyle:'bold',halign:'center'},
    footStyles:{fillColor:VERDE_CL,textColor:BLACK,fontStyle:'bold'},
    alternateRowStyles:{fillColor:GRIS},bodyStyles:{fillColor:WHITE},
    margin:{left:M,right:M},theme:'grid'
  });
  y=doc.lastAutoTable.finalY+6;

  obraList.forEach(o=>{
    const pagos=ayudaSocialPagos.filter(p=>p.obraId===o.id).sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||''));
    if(!pagos.length)return;
    if(y>250){doc.addPage();y=M;}
    doc.setFillColor(...VERDE_CL);doc.rect(M,y,W-M*2,6,'F');
    doc.setTextColor(...BLACK);doc.setFontSize(8);doc.setFont('helvetica','bold');
    doc.text((o.num?'Nº'+o.num+' — ':'')+o.nombre,M+2,y+4.2);y+=7;
    doc.autoTable({startY:y,
      head:[['Fecha','Concepto','Monto']],
      body:pagos.map(p=>[p.fecha||'',p.concepto||'Entrega',fNum(p.monto)]),
      columnStyles:{2:{halign:'right'}},
      styles:{fontSize:7,cellPadding:2,textColor:BLACK,lineColor:[180,180,180],lineWidth:0.2},
      headStyles:{fillColor:VERDE,textColor:WHITE,fontStyle:'bold',halign:'center'},
      alternateRowStyles:{fillColor:GRIS},bodyStyles:{fillColor:WHITE},
      margin:{left:M,right:M},theme:'grid'
    });
    y=doc.lastAutoTable.finalY+4;
  });

  const tp=doc.internal.getNumberOfPages();
  for(let i=1;i<=tp;i++){
    doc.setPage(i);const pH=doc.internal.pageSize.getHeight();
    doc.setFillColor(240,240,240);doc.rect(0,pH-8,W,8,'F');
    doc.setTextColor(100,100,120);doc.setFontSize(6.5);doc.setFont('helvetica','normal');
    doc.text('THALAMUS FINANZAS — Ayuda Social — '+new Date().toLocaleDateString('es-PY'),M,pH-3.5);
    doc.text('Página '+i+' de '+tp,W-M,pH-3.5,{align:'right'});
  }
  doc.save('AyudaSocial_'+today()+'.pdf');
  toast('PDF de Ayuda Social exportado ✓','ok');
}

// ═══════════════════════════════════════
// PDF — CONTRATISTAS
// ═══════════════════════════════════════
window.exportContratistaPDF=function(){_loadPDFLib(_buildContratistaPDF);};

function _buildContratistaPDF(){
  const jsPDF=window.jspdf?.jsPDF||window.jsPDF;
  if(!jsPDF){toast('Error cargando PDF','err');return}
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const W=doc.internal.pageSize.getWidth();
  const M=10;
  const AZUL=[31,56,100],PURPLE=[107,79,176],PURP_CL=[157,127,218],GRIS=[230,230,230],BLACK=[0,0,0],WHITE=[255,255,255],RED=[224,82,82],GREEN=[46,125,50];
  const fNum=(x)=>Math.round(x||0).toLocaleString('es-PY');

  doc.setFillColor(...PURPLE);doc.rect(M,M,W-M*2,10,'F');
  doc.setTextColor(...WHITE);doc.setFontSize(12);doc.setFont('helvetica','bold');
  doc.text('CONTROL DE CONTRATISTAS',W/2,M+7,{align:'center'});
  doc.setFontSize(7);doc.setFont('helvetica','normal');
  doc.text(new Date().toLocaleDateString('es-PY'),W-M-2,M+7,{align:'right'});

  let y=M+14;
  const obraList=Object.values(obras).filter(o=>(o.estado||'EN EJECUCIÓN')==='EN EJECUCIÓN').sort((a,b)=>(parseInt(a.num)||0)-(parseInt(b.num)||0));

  obraList.forEach(o=>{
    const contrs=getObraContratistas(o.id);
    if(!contrs.length)return;
    if(y>240){doc.addPage();y=M;}

    // Obra header
    doc.setFillColor(...AZUL);doc.rect(M,y,W-M*2,7,'F');
    doc.setTextColor(...WHITE);doc.setFontSize(9);doc.setFont('helvetica','bold');
    doc.text((o.num?'Nº'+o.num+' — ':'')+o.nombre,M+2,y+5);
    doc.setFontSize(7);doc.setFont('helvetica','normal');
    doc.text('Contrato: '+fNum(calcCon(o.id)),W-M-2,y+5,{align:'right'});
    y+=9;

    contrs.forEach(c=>{
      if(y>255){doc.addPage();y=M;}
      const cAde=parseFloat(c.monto)||0;
      const cEnt=calcContratistaEntregadoContr(o.id,c.id);
      const cSal=cAde-cEnt;
      const cPct=cAde>0?Math.min(100,cEnt/cAde*100):0;
      const cPagos=contratistaPagos.filter(p=>p.obraId===o.id&&p.contratistaId===c.id).sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||''));

      // Contratista sub-header
      doc.setFillColor(...PURP_CL);doc.rect(M,y,W-M*2,6,'F');
      doc.setTextColor(...WHITE);doc.setFontSize(8);doc.setFont('helvetica','bold');
      doc.text('👷 '+c.nombre,M+2,y+4.2);
      doc.text('Asignado: '+fNum(cAde)+' | Entregado: '+fNum(cEnt)+' | Pendiente: '+fNum(cSal)+' ('+cPct.toFixed(0)+'%)',W-M-2,y+4.2,{align:'right'});
      y+=7;

      if(cPagos.length){
        doc.autoTable({startY:y,
          head:[['Fecha','Concepto','Monto']],
          body:cPagos.map(p=>[p.fecha||'',p.concepto||'Entrega',fNum(p.monto)]),
          foot:[['','Total Entregado',fNum(cEnt)]],
          columnStyles:{2:{halign:'right'}},
          styles:{fontSize:7,cellPadding:2,textColor:BLACK,lineColor:[180,180,180],lineWidth:0.2},
          headStyles:{fillColor:PURPLE,textColor:WHITE,fontStyle:'bold',halign:'center'},
          footStyles:{fillColor:GRIS,textColor:BLACK,fontStyle:'bold'},
          alternateRowStyles:{fillColor:[245,242,252]},bodyStyles:{fillColor:WHITE},
          margin:{left:M+4,right:M+4},theme:'grid'
        });
        y=doc.lastAutoTable.finalY+4;
      }else{
        doc.setTextColor(150,150,150);doc.setFontSize(7);doc.setFont('helvetica','italic');
        doc.text('Sin entregas registradas',M+6,y+3);y+=6;
      }
    });
    y+=3;
  });

  // Pagos sin asignar
  const sinPagos=contratistaPagos.filter(p=>!p.obraId);
  if(sinPagos.length){
    if(y>250){doc.addPage();y=M;}
    doc.setFillColor(...RED);doc.rect(M,y,W-M*2,6,'F');
    doc.setTextColor(...WHITE);doc.setFontSize(8);doc.setFont('helvetica','bold');
    doc.text('⚠️ ENTREGAS SIN ASIGNAR A OBRA ('+sinPagos.length+')',M+2,y+4.2);y+=7;
    doc.autoTable({startY:y,
      head:[['Fecha','Concepto','Monto']],
      body:sinPagos.map(p=>[p.fecha||'',p.concepto||'Entrega',fNum(p.monto)]),
      columnStyles:{2:{halign:'right'}},
      styles:{fontSize:7,cellPadding:2,textColor:BLACK,lineColor:[180,180,180],lineWidth:0.2},
      headStyles:{fillColor:PURPLE,textColor:WHITE,fontStyle:'bold',halign:'center'},
      margin:{left:M,right:M},theme:'grid'
    });
    y=doc.lastAutoTable.finalY+4;
  }

  const tp=doc.internal.getNumberOfPages();
  for(let i=1;i<=tp;i++){
    doc.setPage(i);const pH=doc.internal.pageSize.getHeight();
    doc.setFillColor(240,240,240);doc.rect(0,pH-8,W,8,'F');
    doc.setTextColor(100,100,120);doc.setFontSize(6.5);doc.setFont('helvetica','normal');
    doc.text('THALAMUS FINANZAS — Contratistas — '+new Date().toLocaleDateString('es-PY'),M,pH-3.5);
    doc.text('Página '+i+' de '+tp,W-M,pH-3.5,{align:'right'});
  }
  doc.save('Contratistas_'+today()+'.pdf');
  toast('PDF de Contratistas exportado ✓','ok');
}
