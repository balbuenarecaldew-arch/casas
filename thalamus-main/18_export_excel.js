// ═══════════════════════════════════════
// EXPORTAR EXCEL
// ═══════════════════════════════════════
window.exportExcel = function(){
  if(!cur||!obras[cur]){toast('Seleccioná una obra primero','err');return}

  const loadExcelJS = (cb) => {
    if(window.ExcelJS){cb();return;}
    toast('Cargando librería...','info');
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
    s.onload=cb; s.onerror=()=>toast('Error cargando librería','err');
    document.head.appendChild(s);
  };

  loadExcelJS(async ()=>{
    toast('Generando planilla...','info');
    try {
      const o=obras[cur];
      const _gpExcel=gestorPagosForObra(cur).map(p=>({fecha:p.fecha,concepto:'👷 GESTOR: '+(p.concepto||'Entrega'),cantidad:0,monto:parseFloat(p.monto)||0,montoCheque:0,devuelto:0,saldoTotal:0,saldoCheque:0,costoTotal:parseFloat(p.monto)||0,tipo:'gestor'}));
      const _apExcel=ayudaSocialPagosForObra(cur).map(p=>({fecha:p.fecha,concepto:'🏛️ A.SOCIAL: '+(p.concepto||'Ayuda Social'),cantidad:0,monto:parseFloat(p.monto)||0,montoCheque:0,devuelto:0,saldoTotal:0,saldoCheque:0,costoTotal:parseFloat(p.monto)||0,tipo:'ayuda_social'}));
      const _ctExcel=contratistaPagosForObra(cur).map(p=>({fecha:p.fecha,concepto:'👔 CONTRAT.: '+(p.concepto||'Pago Contratista'),cantidad:0,monto:parseFloat(p.monto)||0,montoCheque:0,devuelto:0,saldoTotal:0,saldoCheque:0,costoTotal:parseFloat(p.monto)||0,tipo:'contratista'}));
      const gl=[..._apExcel,..._gpExcel,..._ctExcel,...(gastos[cur]||[])];
      const cl=certificados[cur]||[];

      const wb=new ExcelJS.Workbook();
      wb.creator='Thalamus Finanzas';
      wb.created=new Date();
      const ws=wb.addWorksheet('\u2726 PLANILLA MADRE',{
        pageSetup:{orientation:'landscape',fitToPage:true,fitToWidth:1}
      });

      ws.columns=[
        {key:'A',width:4},{key:'B',width:14},{key:'C',width:46},
        {key:'D',width:12},{key:'E',width:18},{key:'F',width:12},
        {key:'G',width:18},{key:'H',width:13},{key:'I',width:13},
        {key:'J',width:13},{key:'K',width:17.11}
      ];

      const AZUL_OSC='1F3864', AZUL_MED='2E75B6', VERDE_OSC='375623';
      const VERDE_MED='2E7D32', AZUL_CL='D6E4F0', VERDE_CL='E8F5E9';
      const GRIS='D9D9D9', AMARILLO='F4B942', AMAR_INP='FFFACD';
      const FMT_NUM='#,##0', FMT_PCT='0.0%';

      const fill=(c)=>({type:'pattern',pattern:'solid',fgColor:{argb:'FF'+c}});
      const font=(bold,color='000000',sz=10)=>({bold,color:{argb:'FF'+color},size:sz,name:'Calibri'});
      const aln=(h='left',v='middle',wrap=false)=>({horizontal:h,vertical:v,wrapText:wrap});

      function setCell(addr, val, opts={}){
        const c=ws.getCell(addr);
        c.value=val;
        if(opts.bold!==undefined||opts.color||opts.size) c.font=font(opts.bold||false, opts.color||'000000', opts.size||10);
        if(opts.bg) c.fill=fill(opts.bg);
        c.alignment=aln(opts.align||'left', opts.valign||'middle', opts.wrap||false);
        if(opts.fmt) c.numFmt=opts.fmt;
      }

      // ── FILAS 1-5: Título e info ──
      ws.mergeCells('B1:K1');
      const nombreObra=(o.num?`Nº${o.num} – `:'')+o.nombre;
      setCell('B1',nombreObra,{bold:true,color:'FFFFFF',bg:AZUL_OSC,align:'center',size:14});
      ws.getRow(1).height=34.5;

      [2,3,4,5].forEach(r=>ws.getRow(r).height=18);
      ws.mergeCells('B2:C2'); ws.mergeCells('D2:F2');
      ws.mergeCells('B3:C3'); ws.mergeCells('D3:F3');
      ws.mergeCells('B4:C4'); ws.mergeCells('D4:F4');
      ws.mergeCells('B5:C5'); ws.mergeCells('D5:F5');
      setCell('B2','FECHA DE INICIO',{bold:true,bg:GRIS});
      setCell('D2',o.fecha||'',{bg:AMAR_INP});
      setCell('B3','MONTO CONTRATO',{bold:true,bg:GRIS});
      setCell('D3',parseFloat(o.contrato)||0,{bg:AMAR_INP,align:'right',fmt:FMT_NUM});
      setCell('B4','ADENDA',{bold:true,bg:GRIS});
      setCell('D4',parseFloat(o.adenda)||0,{bg:AMAR_INP,align:'right',fmt:FMT_NUM});
      setCell('B5','ESTADO',{bold:true,bg:GRIS});
      setCell('D5',o.estado||'EN EJECUCIÓN',{bg:AMAR_INP});

      // ── FILA 7-8: Header gastos ──
      ws.mergeCells('B7:K7');
      setCell('B7','TOTAL DE GASTOS REALES',{bold:true,color:'FFFFFF',bg:AZUL_MED,align:'center',size:11});
      ws.getRow(7).height=22;
      const h8=[['B','FECHA'],['C','CONCEPTO'],['D','CANTIDAD'],
        ['E','MONTO PAGADO'],['F','REGISTRO'],['G','MONTO PAGADO'],
        ['H','DEVUELTO'],['I','SALDO TOTAL'],['J','SALDO CHEQUE'],['K','COSTO TOTAL']];
      h8.forEach(([col,txt])=>setCell(`${col}8`,txt,{bold:true,color:'FFFFFF',bg:AZUL_OSC,align:'center',wrap:true,size:9}));
      ws.getRow(8).height=30;

      // ── GASTOS DINÁMICO ──
      const gStart=9;
      const gCount=Math.max(gl.length,1);
      for(let i=0;i<gCount;i++){
        const rn=gStart+i, g=gl[i]||null, row=''+rn;
        ws.getRow(rn).height=15.75;
        setCell('B'+row,g?.fecha||'',{bg:AZUL_CL});
        setCell('C'+row,g?.concepto||'',{bg:AZUL_CL});
        setCell('D'+row,g?.cantidad||'',{bg:AZUL_CL,align:'right'});
        setCell('E'+row,parseFloat(g?.monto)||0,{bg:AZUL_CL,align:'right',fmt:FMT_NUM});
        setCell('F'+row,g?.registro||'',{bg:AZUL_CL});
        setCell('G'+row,parseFloat(g?.montoCheque)||0,{bg:AZUL_CL,align:'right',fmt:FMT_NUM});
        setCell('H'+row,parseFloat(g?.devuelto)||0,{bg:AZUL_CL,align:'right',fmt:FMT_NUM});
        setCell('I'+row,parseFloat(g?.saldoTotal)||0,{bg:AZUL_CL,align:'right',fmt:FMT_NUM});
        setCell('J'+row,parseFloat(g?.saldoCheque)||0,{bg:AZUL_CL,align:'right',fmt:FMT_NUM});
        ws.getCell('K'+row).value={formula:'J'+row};
        ws.getCell('K'+row).fill=fill(AZUL_CL);
        ws.getCell('K'+row).numFmt=FMT_NUM;
        ws.getCell('K'+row).alignment=aln('right');
      }
      const gEnd=gStart+gCount-1;

      // ── Total Gastos ──
      const rTG=gEnd+1;
      ws.getRow(rTG).height=18;
      ws.mergeCells('B'+rTG+':D'+rTG);
      setCell('B'+rTG,'TOTAL GASTOS',{bold:true,bg:AMARILLO,align:'center'});
      ws.getCell('E'+rTG).value={formula:`SUM(E${gStart}:E${gEnd})`};
      ws.getCell('E'+rTG).fill=fill(AMARILLO); ws.getCell('E'+rTG).font=font(true); ws.getCell('E'+rTG).numFmt=FMT_NUM; ws.getCell('E'+rTG).alignment=aln('right');
      ws.getCell('K'+rTG).value={formula:`SUM(K${gStart}:K${gEnd})`};
      ws.getCell('K'+rTG).fill=fill(AMARILLO); ws.getCell('K'+rTG).numFmt=FMT_NUM; ws.getCell('K'+rTG).alignment=aln('right');

      // ── CERTIFICADOS DINÁMICO ──
      const rCH=rTG+2; // cert header
      ws.mergeCells('B'+rCH+':J'+rCH);
      ws.getRow(rCH).height=22;
      setCell('B'+rCH,'DETALLE DE PAGOS RECIBIDOS (CERTIFICADOS)',{bold:true,color:'FFFFFF',bg:VERDE_OSC,align:'center',size:11});

      const rCC=rCH+1; // cert columns
      ws.getRow(rCC).height=20;
      [['B','FECHA'],['C','CONCEPTO / CERTIFICADO'],['E','TOTAL PAGADO (BRUTO)'],
       ['G','RETENCIÓN REAL'],['H','NETO COBRADO']].forEach(([col,txt])=>
        setCell(col+rCC,txt,{bold:true,color:'FFFFFF',bg:AZUL_OSC,align:'center',size:9}));

      const cStart=rCC+1;
      const cCount=Math.max(cl.length,1);
      for(let i=0;i<cCount;i++){
        const rn=cStart+i, c=cl[i]||null, row=''+rn;
        ws.getRow(rn).height=15.75;
        setCell('B'+row,c?.fecha||'',{bg:VERDE_CL});
        setCell('C'+row,c?.concepto||'',{bg:VERDE_CL});
        setCell('E'+row,parseFloat(c?.bruto)||0,{bg:VERDE_CL,align:'right',fmt:FMT_NUM});
        setCell('H'+row,parseFloat(c?.neto)||0,{bg:VERDE_CL,align:'right',fmt:FMT_NUM});
        ws.getCell('G'+row).value={formula:'E'+row+'-H'+row};
        ws.getCell('G'+row).fill=fill(VERDE_CL); ws.getCell('G'+row).numFmt=FMT_NUM; ws.getCell('G'+row).alignment=aln('right');
      }
      const cEnd=cStart+cCount-1;

      // ── Total Pagos Recibidos ──
      const rTC=cEnd+1;
      ws.getRow(rTC).height=18;
      ws.mergeCells('B'+rTC+':D'+rTC);
      setCell('B'+rTC,'TOTAL PAGOS RECIBIDOS',{bold:true,color:'FFFFFF',bg:VERDE_MED,align:'center'});
      ['E','G','H'].forEach(col=>{
        ws.getCell(col+rTC).value={formula:`SUM(${col}${cStart}:${col}${cEnd})`};
        ws.getCell(col+rTC).fill=fill(VERDE_MED); ws.getCell(col+rTC).font=font(true,'FFFFFF');
        ws.getCell(col+rTC).numFmt=FMT_NUM; ws.getCell(col+rTC).alignment=aln('right');
      });

      // ── RESUMEN GENERAL ──
      const rRH=rTC+2; // resumen header
      ws.mergeCells('B'+rRH+':J'+rRH);
      ws.getRow(rRH).height=15.6;
      setCell('B'+rRH,'RESUMEN GENERAL',{bold:true,color:'FFFFFF',bg:AZUL_OSC,align:'center',size:12});

      const r1=rRH+1; // MONTO CONTRATO row

      const resumen=[
        [r1,  'MONTO CONTRATO',              {formula:'D3+D4'},                             FMT_NUM, false],
        [r1+1,'TOTAL DE GASTOS',             {formula:'E'+rTG},                             FMT_NUM, false],
        [r1+2,'TOTAL BRUTO COBRADO',         {formula:'E'+rTC},                             FMT_NUM, false],
        [r1+3,'RETENCIÓN TOTAL',             {formula:'G'+rTC},                             FMT_NUM, false],
        [r1+4,'TOTAL NETO COBRADO',          {formula:'H'+rTC},                             FMT_NUM, false],
        [r1+5,'GANANCIA NETA (neto - gastos)',{formula:'H'+rTC+'-E'+rTG},                   FMT_NUM, false],
        [r1+6,'PARA SOCIOS (50%)',           {formula:'(H'+rTC+'-E'+rTG+')/2'},             FMT_NUM, true ],
        [r1+7,'PORCENTAJE DE GANANCIA',      {formula:'IFERROR((H'+rTC+'-E'+rTG+')/E'+rTC+',0)'}, FMT_PCT, false],
        [r1+8,'SALDO A COBRAR',              {formula:'H'+r1+'-E'+rTC},                    FMT_NUM, false],
        [r1+9,'SALDO A PAGAR',               {formula:'K'+rTG},                             FMT_NUM, false],
      ];
      resumen.forEach(([rn,label,formula,fmt,bold])=>{
        ws.getRow(rn).height=18;
        const bg=bold?AMARILLO:GRIS;
        ws.mergeCells('B'+rn+':F'+rn);
        setCell('B'+rn,label,{bold,bg,align:'left'});
        const hCell=ws.getCell('H'+rn);
        hCell.value=formula; hCell.fill=fill(bg);
        hCell.font=font(bold); hCell.numFmt=fmt; hCell.alignment=aln('right');
      });

      ws.views=[{state:'frozen',ySplit:8,xSplit:1,topLeftCell:'B9',activeCell:'B9'}];

      const buffer=await wb.xlsx.writeBuffer();
      const blob=new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      const fn=`Planilla_${o.num?'N'+o.num+'_':''}${o.nombre.replace(/[^a-zA-Z0-9]/g,'_')}_${today()}.xlsx`;
      a.href=url; a.download=fn; a.click();
      URL.revokeObjectURL(url);
      toast('Excel exportado ✓','ok');

    }catch(err){
      console.error(err);
      toast('Error generando Excel: '+err.message,'err');
    }
  });
};

window.exportPDF = function(){
  if(!cur||!obras[cur]){toast('Seleccioná una obra primero','err');return}
  if(typeof window.jspdf==='undefined'&&typeof jsPDF==='undefined'){
    toast('Cargando librería PDF...','info');
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
    s.onload=()=>{
      const s2=document.createElement('script');
      s2.src='https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js';
      s2.onload=()=>_buildPDF();
      document.head.appendChild(s2);
    };
    document.head.appendChild(s);
  } else {
    _buildPDF();
  }
};

function _buildPDF(){
  const jsPDF=window.jspdf?.jsPDF||window.jsPDF;
  if(!jsPDF){toast('Error cargando PDF','err');return}
  const o=obras[cur], r=calcRes(cur);
  const nombre=(o.num?'Nº'+o.num+' – ':'')+o.nombre;
  const _gpPdf=gestorPagosForObra(cur).map(p=>({fecha:p.fecha,concepto:'👷 GESTOR: '+(p.concepto||'Entrega'),cantidad:0,monto:parseFloat(p.monto)||0,montoCheque:0,devuelto:0,saldoTotal:0,saldoCheque:0,costoTotal:parseFloat(p.monto)||0}));
  const _apPdf=ayudaSocialPagosForObra(cur).map(p=>({fecha:p.fecha,concepto:'🏛️ A.SOCIAL: '+(p.concepto||'Ayuda Social'),cantidad:0,monto:parseFloat(p.monto)||0,montoCheque:0,devuelto:0,saldoTotal:0,saldoCheque:0,costoTotal:parseFloat(p.monto)||0}));
  const _ctPdf=contratistaPagosForObra(cur).map(p=>({fecha:p.fecha,concepto:'👔 CONTRAT.: '+(p.concepto||'Pago Contratista'),cantidad:0,monto:parseFloat(p.monto)||0,montoCheque:0,devuelto:0,saldoTotal:0,saldoCheque:0,costoTotal:parseFloat(p.monto)||0}));
  const gl=[..._apPdf,..._gpPdf,..._ctPdf,...(gastos[cur]||[])];
  const cl=certificados[cur]||[];

  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  const W=doc.internal.pageSize.getWidth();
  const H=doc.internal.pageSize.getHeight();

  const AZUL_OSC=[31,56,100], AZUL_MED=[46,117,182], VERDE_OSC=[55,86,35];
  const VERDE_MED=[46,125,50], AZUL_CL=[214,228,240], VERDE_CL=[232,245,233];
  const GRIS=[217,217,217], AMARILLO=[244,185,66], AMAR_INP=[255,250,205];
  const WHITE=[255,255,255], BLACK=[0,0,0];

  const fNum=(x)=>{if(!x||isNaN(x))x=0;return Math.round(x).toLocaleString('es-PY')};
  const M=8;

  // Título
  doc.setFillColor(...AZUL_OSC); doc.rect(M,M,W-M*2,10,'F');
  doc.setTextColor(...WHITE); doc.setFontSize(12); doc.setFont('helvetica','bold');
  doc.text(nombre,W/2,M+7,{align:'center'});

  // Info obra
  let y=M+12;
  const infoRows=[['FECHA DE INICIO',o.fecha||''],['MONTO CONTRATO',fNum(parseFloat(o.contrato)||0)],
    ['ADENDA',fNum(parseFloat(o.adenda)||0)],['ESTADO',o.estado||'EN EJECUCIÓN']];
  infoRows.forEach(([label,val])=>{
    doc.setFillColor(...GRIS);doc.rect(M,y,60,6,'F');
    doc.setFillColor(...AMAR_INP);doc.rect(M+60,y,50,6,'F');
    doc.setTextColor(...BLACK);doc.setFontSize(8);doc.setFont('helvetica','bold');
    doc.text(label,M+2,y+4.2);
    doc.setFont('helvetica','normal');doc.text(val,M+62,y+4.2);
    y+=6;
  });
  y+=4;

  // GASTOS
  doc.setFillColor(...AZUL_MED);doc.rect(M,y,W-M*2,7,'F');
  doc.setTextColor(...WHITE);doc.setFontSize(10);doc.setFont('helvetica','bold');
  doc.text('TOTAL DE GASTOS REALES',W/2,y+5.2,{align:'center'});
  y+=8;

  const gastosHead=[['Nº','Fecha','Concepto','Cant.','Monto Pagado','Registro','M.Cheque','Devuelto','Saldo Total','Saldo Cheque','Costo Total']];
  const moduleCount=_apPdf.length+_gpPdf.length+_ctPdf.length;
  const gastosBody=gl.map((g,i)=>[(i+1).toString(),g.fecha||'',g.concepto||'',g.cantidad||'',
    fNum(g.monto),g.registro||'',fNum(g.montoCheque),fNum(g.devuelto),fNum(g.saldoTotal),fNum(g.saldoCheque),fNum(g.costoTotal)]);
  const totalMP=gl.reduce((s,g)=>s+(parseFloat(g.monto)||0),0);
  const totalCh=gl.reduce((s,g)=>s+(parseFloat(g.montoCheque)||0),0);
  const totalCT=gl.reduce((s,g)=>s+(parseFloat(g.costoTotal)||0),0);

  doc.autoTable({startY:y,head:gastosHead,body:gastosBody,
    foot:[['','','TOTAL GASTOS','',fNum(totalMP),'',fNum(totalCh),'','','',fNum(totalCT)]],
    columnStyles:{0:{cellWidth:8,halign:'center'},1:{cellWidth:18},2:{cellWidth:52},3:{cellWidth:12,halign:'center'},
      4:{cellWidth:24,halign:'right'},5:{cellWidth:18},6:{cellWidth:24,halign:'right'},7:{cellWidth:20,halign:'right'},
      8:{cellWidth:20,halign:'right'},9:{cellWidth:20,halign:'right'},10:{cellWidth:24,halign:'right'}},
    styles:{fontSize:6.5,cellPadding:1.8,textColor:BLACK,lineColor:[180,180,180],lineWidth:0.2},
    headStyles:{fillColor:AZUL_OSC,textColor:WHITE,fontStyle:'bold',fontSize:6.5,halign:'center'},
    footStyles:{fillColor:AMARILLO,textColor:BLACK,fontStyle:'bold',fontSize:7},
    alternateRowStyles:{fillColor:AZUL_CL},bodyStyles:{fillColor:WHITE},
    margin:{left:M,right:M},theme:'grid',
    didParseCell:function(data){if(data.section==='body'&&data.row.index<moduleCount){data.cell.styles.fillColor=AZUL_CL;data.cell.styles.fontStyle='italic';}}
  });
  y=doc.lastAutoTable.finalY+6;

  // CERTIFICADOS
  if(y>H-50){doc.addPage();y=M;}
  doc.setFillColor(...VERDE_OSC);doc.rect(M,y,W-M*2,7,'F');
  doc.setTextColor(...WHITE);doc.setFontSize(10);doc.setFont('helvetica','bold');
  doc.text('DETALLE DE PAGOS RECIBIDOS (CERTIFICADOS)',W/2,y+5.2,{align:'center'});
  y+=8;
  const ct=calcCertsT(cur);
  doc.autoTable({startY:y,
    head:[['Nº','Fecha','Concepto / Certificado','Total Pagado (Bruto)','Retención Real','Neto Cobrado']],
    body:cl.map((c,i)=>[(i+1).toString(),c.fecha||'',c.concepto||'',fNum(c.bruto),fNum(c.retencion),fNum(c.neto)]),
    foot:[['','','TOTAL PAGOS RECIBIDOS',fNum(ct.br),fNum(ct.re),fNum(ct.ne)]],
    columnStyles:{0:{cellWidth:8,halign:'center'},1:{cellWidth:22},2:{cellWidth:70},3:{cellWidth:35,halign:'right'},4:{cellWidth:30,halign:'right'},5:{cellWidth:35,halign:'right'}},
    styles:{fontSize:7,cellPadding:2,textColor:BLACK,lineColor:[180,180,180],lineWidth:0.2},
    headStyles:{fillColor:AZUL_OSC,textColor:WHITE,fontStyle:'bold',fontSize:7,halign:'center'},
    footStyles:{fillColor:VERDE_MED,textColor:WHITE,fontStyle:'bold',fontSize:7.5},
    alternateRowStyles:{fillColor:VERDE_CL},bodyStyles:{fillColor:WHITE},
    margin:{left:M,right:M},theme:'grid'
  });
  y=doc.lastAutoTable.finalY+6;

  // RESUMEN GENERAL
  if(y>H-75){doc.addPage();y=M;}
  doc.setFillColor(...AZUL_OSC);doc.rect(M,y,W-M*2,7,'F');
  doc.setTextColor(...WHITE);doc.setFontSize(10);doc.setFont('helvetica','bold');
  doc.text('RESUMEN GENERAL',W/2,y+5.2,{align:'center'});
  y+=9;

  const resRows=[
    ['MONTO CONTRATO',fNum(r.con),false,GRIS],['TOTAL DE GASTOS',fNum(r.tg),false,GRIS],
    ['TOTAL BRUTO COBRADO',fNum(r.br),false,GRIS],['RETENCIÓN TOTAL',fNum(r.re),false,GRIS],
    ['TOTAL NETO COBRADO',fNum(r.ne),false,GRIS],['GANANCIA NETA (neto - gastos)',fNum(r.gan),false,GRIS],
    ['PARA FERNANDO ('+cfg.socios+'%)',fNum(r.corrCadaUno),true,AMARILLO],
    ['PARA WUILIAN ('+cfg.socios+'%)',fNum(r.corrCadaUno),true,AMARILLO],
    ['PORCENTAJE DE GANANCIA',fPct(r.pct),false,GRIS],
    ['SALDO A COBRAR',fNum(r.scob),false,GRIS],['SALDO A PAGAR',fNum(r.tk-r.tg),false,GRIS],
  ];
  const resLW=100,resVW=60,resX=W/2-(resLW+resVW)/2;
  resRows.forEach(([label,val,hl,bg])=>{
    doc.setFillColor(...bg);doc.rect(resX,y,resLW,7,'F');doc.rect(resX+resLW,y,resVW,7,'F');
    doc.setDrawColor(180,180,180);doc.setLineWidth(0.2);doc.rect(resX,y,resLW,7,'S');doc.rect(resX+resLW,y,resVW,7,'S');
    doc.setTextColor(...BLACK);doc.setFontSize(8);doc.setFont('helvetica',hl?'bold':'normal');
    doc.text(label,resX+2,y+5);doc.setFont('helvetica','bold');doc.text(val,resX+resLW+resVW-2,y+5,{align:'right'});
    y+=7;
  });

  // Footer
  const tp=doc.internal.getNumberOfPages();
  for(let i=1;i<=tp;i++){
    doc.setPage(i);const pH=doc.internal.pageSize.getHeight();
    doc.setFillColor(240,240,240);doc.rect(0,pH-8,W,8,'F');
    doc.setDrawColor(...AZUL_MED);doc.setLineWidth(0.3);doc.line(M,pH-8,W-M,pH-8);
    doc.setTextColor(100,100,120);doc.setFontSize(6.5);doc.setFont('helvetica','normal');
    doc.text('THALAMUS FINANZAS — '+new Date().toLocaleDateString('es-PY'),M,pH-3.5);
    doc.text('Página '+i+' de '+tp,W-M,pH-3.5,{align:'right'});
  }

  const fn='Planilla_'+(o.num?'N'+o.num+'_':'')+o.nombre.replace(/[^a-zA-Z0-9]/g,'_')+'_'+today()+'.pdf';
  doc.save(fn);toast('PDF exportado ✓','ok');
}

