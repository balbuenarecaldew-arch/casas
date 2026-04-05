// ═══════════════════════════════════════
// PEGAR DESDE EXCEL
// ═══════════════════════════════════════
let _pasteMode='', _pasteRows=[], _pasteCols=0;
let _pasteDetectedHeaders=[]; // headers detected from current paste

// ─── LEARNED COLUMN MAPPINGS ───────────────────
// Stores header_name → field_key mappings the user has confirmed
function getLearnedMappings(mode){
  try{ return JSON.parse(localStorage.getItem('paste_learned_'+mode))||{}; }catch{return{}}
}
function saveLearnedMappings(mode, map){
  localStorage.setItem('paste_learned_'+mode, JSON.stringify(map));
}
// Header synonyms: common Excel header names → field keys
const HEADER_SYNONYMS_GASTOS={
  'fecha':       'fecha',
  'date':        'fecha',
  'concepto':    'concepto',
  'descripcion': 'concepto',
  'descripción': 'concepto',
  'detalle':     'concepto',
  'item':        'concepto',
  'cantidad':    'cantidad',
  'qty':         'cantidad',
  'monto':       'monto',
  'monto pagado':'monto',
  'pagado':      'monto',
  'importe':     'monto',
  'total':       'monto',
  'valor':       'monto',
  'registro':    'registro',
  'nro':         'registro',
  'numero':      'registro',
  'número':      'registro',
  'cheque':      'montoCheque',
  'monto cheque':'montoCheque',
  'cheque pagado':'montoCheque',
  'devuelto':    'devuelto',
  'devolucion':  'devuelto',
  'devolución':  'devuelto',
  'saldo total': 'saldoTotal',
  'saldo':       'saldoTotal',
  'saldo cheque':'saldoCheque',
};
const HEADER_SYNONYMS_CERTS={
  'fecha':       'fecha',
  'date':        'fecha',
  'concepto':    'concepto',
  'certificado': 'concepto',
  'descripcion': 'concepto',
  'descripción': 'concepto',
  'bruto':       'bruto',
  'total bruto': 'bruto',
  'total':       'bruto',
  'monto':       'bruto',
  'neto':        'neto',
  'neto cobrado':'neto',
  'cobrado':     'neto',
};

const GASTO_FIELDS=[
  {key:'ignorar',label:'— Ignorar —'},
  {key:'fecha',label:'Fecha'},
  {key:'concepto',label:'Concepto'},
  {key:'cantidad',label:'Cantidad'},
  {key:'monto',label:'Monto Pagado'},
  {key:'registro',label:'Registro'},
  {key:'montoCheque',label:'Monto Cheque'},
  {key:'devuelto',label:'Devuelto'},
  {key:'saldoTotal',label:'Saldo Total'},
  {key:'saldoCheque',label:'Saldo Cheque'},
];
const CERT_FIELDS=[
  {key:'ignorar',label:'— Ignorar —'},
  {key:'fecha',label:'Fecha'},
  {key:'concepto',label:'Concepto / Certificado'},
  {key:'bruto',label:'Total Bruto'},
  {key:'neto',label:'Neto Cobrado'},
];

// Auto-detect column mapping based on content
function guessField(colVals, fields, colIdx){
  const sample=colVals.slice(0,5).join(' ').toLowerCase();
  // Date patterns
  if(colVals.some(v=>/^\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}$/.test(v.trim()))) return 'fecha';
  // Mostly numbers?
  const nums=colVals.filter(v=>/^[\d.,\s-]+$/.test(v.trim())&&v.trim().length>0);
  const isNumeric=nums.length>colVals.length*0.6;
  if(fields===GASTO_FIELDS){
    if(!isNumeric&&colIdx===0) return 'fecha';
    if(!isNumeric) return 'concepto';
    // First numeric col → monto, second → montoCheque
    return null; // let the numeric auto-assign handle it
  }else{
    if(!isNumeric&&colIdx===0) return 'fecha';
    if(!isNumeric) return 'concepto';
    return null;
  }
}

window.openPaste=function(mode){
  if(!cur||!obras[cur]){toast('Seleccioná una obra primero','err');return}
  _pasteMode=mode;
  gs('mPasteTitle').textContent='📋 Pegar desde Excel — '+(mode==='gastos'?'Gastos':'Certificados');
  gs('pasteArea').value='';
  gs('pasteStep1').style.display='';
  gs('pasteStep2').style.display='none';
  openM('mPaste');
  setTimeout(()=>gs('pasteArea').focus(),200);
};

window.parsePaste=function(){
  const raw=gs('pasteArea').value.trim();
  if(!raw){toast('Pegá datos primero','err');return}

  // Parse: split by newlines, then by tabs (Excel copies as TSV)
  const lines=raw.split(/\r?\n/).filter(l=>l.trim());
  if(!lines.length){toast('No se detectaron filas','err');return}

  // Detect separator: tab or semicolon or multiple spaces
  let sep='\t';
  if(lines[0].indexOf('\t')<0){
    if(lines[0].indexOf(';')>=0) sep=';';
    else if(lines[0].indexOf(',')>=0 && !/^\d+,\d+$/.test(lines[0].trim())) sep=',';
  }

  _pasteRows=lines.map(l=>l.split(sep).map(c=>c.trim()));
  _pasteCols=Math.max(..._pasteRows.map(r=>r.length));

  // Pad short rows
  _pasteRows.forEach(r=>{while(r.length<_pasteCols)r.push('')});

  // Detect if first row is header
  const fields=_pasteMode==='gastos'?GASTO_FIELDS:CERT_FIELDS;
  let hasHeader=false;
  _pasteDetectedHeaders=[];
  const firstRow=_pasteRows[0].map(c=>c.toLowerCase().trim());
  const headerKeywords=['fecha','concepto','monto','bruto','neto','certificado','pagado','cheque','retenc','cantidad','devuelto','saldo','registro'];
  if(firstRow.some(c=>headerKeywords.some(k=>c.includes(k)))){
    hasHeader=true;
    _pasteDetectedHeaders=_pasteRows[0].map(c=>c.trim()); // save original headers
    _pasteRows.shift(); // remove header row
  }

  if(!_pasteRows.length){toast('No hay datos para importar','err');return}

  gs('pasteRowCount').textContent=_pasteRows.length;
  gs('pasteColCount').textContent=_pasteCols;
  gs('pasteImportCount').textContent=_pasteRows.length;

  // Build column mapping dropdowns
  const mapRow=gs('pasteMapRow');
  mapRow.innerHTML='';

  // Auto-assign columns using: 1) learned mappings 2) header synonyms 3) content analysis
  const numericCols=[];
  for(let c=0;c<_pasteCols;c++){
    const colVals=_pasteRows.map(r=>r[c]||'');
    const nums=colVals.filter(v=>/^[\d.,\s-]+$/.test(v.trim())&&v.trim().length>0);
    if(nums.length>colVals.length*0.5) numericCols.push(c);
  }

  const assigned=new Set();
  const autoMap=[];
  const learned=getLearnedMappings(_pasteMode);
  const synonyms=_pasteMode==='gastos'?HEADER_SYNONYMS_GASTOS:HEADER_SYNONYMS_CERTS;
  const validKeys=new Set(fields.map(f=>f.key).filter(k=>k!=='ignorar'));

  for(let c=0;c<_pasteCols;c++){
    const colVals=_pasteRows.map(r=>r[c]||'');
    let guess=null;

    // Priority 1: Learned mapping from previous user corrections
    if(_pasteDetectedHeaders.length>c){
      const hdr=_pasteDetectedHeaders[c].toLowerCase().trim();
      if(learned[hdr] && validKeys.has(learned[hdr]) && !assigned.has(learned[hdr])){
        guess=learned[hdr];
      }
    }

    // Priority 2: Header synonym matching
    if(!guess && _pasteDetectedHeaders.length>c){
      const hdr=_pasteDetectedHeaders[c].toLowerCase().trim();
      // Try exact match first, then partial
      if(synonyms[hdr] && !assigned.has(synonyms[hdr])){
        guess=synonyms[hdr];
      } else {
        // Try matching partial: e.g. header "Cheque Pagado" contains "cheque pagado"
        for(const [syn,field] of Object.entries(synonyms)){
          if(!assigned.has(field) && (hdr.includes(syn) || syn.includes(hdr)) && hdr.length>1){
            guess=field; break;
          }
        }
      }
    }

    // Priority 3: Original content-based analysis
    if(!guess) guess=guessField(colVals, fields, c);

    // For numeric columns, auto-assign in order
    if(!guess&&numericCols.includes(c)){
      if(_pasteMode==='gastos'){
        const numFields=['monto','montoCheque','devuelto','saldoTotal','saldoCheque'];
        guess=numFields.find(f=>!assigned.has(f))||null;
      }else{
        const numFields=['bruto','neto'];
        guess=numFields.find(f=>!assigned.has(f))||null;
      }
    }

    if(guess&&assigned.has(guess)) guess=null;
    if(guess) assigned.add(guess);
    autoMap.push(guess||'ignorar');

    // Build UI
    const box=document.createElement('div');
    box.className='paste-col-box';

    const label=document.createElement('div');
    label.className='pcl';
    if(_pasteDetectedHeaders.length>c && _pasteDetectedHeaders[c]){
      label.textContent=_pasteDetectedHeaders[c];
      label.title='Encabezado detectado: '+_pasteDetectedHeaders[c];
      label.style.color='var(--gold)';
    } else {
      label.textContent='Col '+(c+1);
    }
    box.appendChild(label);

    const preview=document.createElement('div');
    preview.className='pcv';
    preview.textContent=colVals[0]||'(vacío)';
    preview.title=colVals.slice(0,3).join(' | ');
    box.appendChild(preview);

    const sel=document.createElement('select');
    sel.className='paste-sel';
    sel.id='pmap-'+c;
    fields.forEach(f=>{
      const opt=document.createElement('option');
      opt.value=f.key; opt.textContent=f.label;
      sel.appendChild(opt);
    });
    sel.value=autoMap[c];
    sel.onchange=()=>renderPastePreview();
    box.appendChild(sel);
    mapRow.appendChild(box);
  }

  // Show hint if learned mappings were used
  const learnedHint=gs('pasteLearnedHint');
  if(learnedHint){
    const usedLearned=_pasteDetectedHeaders.length>0 && autoMap.some((m,i)=>{
      if(m==='ignorar'||!_pasteDetectedHeaders[i])return false;
      const hdr=_pasteDetectedHeaders[i].toLowerCase().trim();
      return learned[hdr]===m;
    });
    learnedHint.style.display=usedLearned?'inline':'none';
  }

  renderPastePreview();
  gs('pasteStep1').style.display='none';
  gs('pasteStep2').style.display='';
};

function renderPastePreview(){
  const fields=_pasteMode==='gastos'?GASTO_FIELDS:CERT_FIELDS;
  const mapping=[];
  for(let c=0;c<_pasteCols;c++){
    const sel=gs('pmap-'+c);
    mapping.push(sel?sel.value:'ignorar');
  }

  // Build header
  const thead=gs('pastePreviewHead');
  let hh='<tr>';
  mapping.forEach((m,i)=>{
    const f=fields.find(f=>f.key===m);
    hh+=`<th style="${m==='ignorar'?'opacity:.4':''}">${f?f.label:'Col '+(i+1)}</th>`;
  });
  hh+='</tr>';
  thead.innerHTML=hh;

  // Build body (max 20 rows preview)
  const tbody=gs('pastePreviewBody');
  let bh='';
  const showRows=_pasteRows.slice(0,20);
  showRows.forEach(row=>{
    bh+='<tr>';
    row.forEach((val,i)=>{
      const dim=mapping[i]==='ignorar'?'opacity:.35;text-decoration:line-through':'';
      bh+=`<td style="${dim}">${val||'—'}</td>`;
    });
    bh+='</tr>';
  });
  if(_pasteRows.length>20) bh+=`<tr><td colspan="${_pasteCols}" style="text-align:center;color:var(--muted);font-style:italic">...y ${_pasteRows.length-20} filas más</td></tr>`;
  tbody.innerHTML=bh;
}

window.backToPasteStep1=function(){
  gs('pasteStep1').style.display='';
  gs('pasteStep2').style.display='none';
};

window.resetLearnedMappings=function(){
  localStorage.removeItem('paste_learned_gastos');
  localStorage.removeItem('paste_learned_certificados');
  toast('Memoria de mapeos reseteada. Pegá de nuevo para re-detectar.','ok');
  backToPasteStep1();
};

function parseNum(v){
  if(!v) return 0;
  // Remove dots used as thousand separators, replace comma with dot for decimals
  let s=String(v).replace(/\s/g,'');
  // If has dot and comma: 1.234.567,89 or 1,234,567.89
  if(s.includes('.')&&s.includes(',')){
    if(s.lastIndexOf(',')>s.lastIndexOf('.')){ // 1.234,56 format
      s=s.replace(/\./g,'').replace(',','.');
    } else { // 1,234.56 format
      s=s.replace(/,/g,'');
    }
  } else if(s.includes(',')){
    // Could be 1,234 (thousands) or 1,5 (decimal)
    // If there's more than one comma or digits after comma > 2, it's thousands
    const parts=s.split(',');
    if(parts.length>2||parts[parts.length-1].length===3){
      s=s.replace(/,/g,'');
    }else{
      s=s.replace(',','.');
    }
  } else {
    // Only dots: could be 1.234.567 (thousands) or 1.5
    const parts=s.split('.');
    if(parts.length>2){
      s=s.replace(/\./g,'');
    }
    // If single dot with 3 digits after, likely thousands: 5.000
    else if(parts.length===2&&parts[1].length===3&&parts[0].length>=1){
      s=s.replace(/\./g,'');
    }
  }
  return parseFloat(s)||0;
}

window.importPaste=async function(){
  if(_importing)return;
  if(!cur||!obras[cur]){toast('Seleccioná una obra','err');return}
  _importing=true;

  const mapping=[];
  for(let c=0;c<_pasteCols;c++){
    const sel=gs('pmap-'+c);
    mapping.push(sel?sel.value:'ignorar');
  }

  // Check at least one meaningful field mapped
  const hasField=mapping.some(m=>m!=='ignorar');
  if(!hasField){toast('Asigná al menos una columna','err');return}

  let count=0;
  if(_pasteMode==='gastos'){
    for(const row of _pasteRows){
      const g={fecha:'',concepto:'',cantidad:'',monto:0,registro:'',montoCheque:0,devuelto:0,saldoTotal:0,saldoCheque:0,costoTotal:0};
      row.forEach((val,i)=>{
        const field=mapping[i];
        if(field==='ignorar')return;
        if(['monto','montoCheque','devuelto','saldoTotal','saldoCheque'].includes(field)){
          g[field]=parseNum(val);
        }else{
          g[field]=val;
        }
      });
      g.costoTotal=(g.monto||0)+(g.saldoTotal||0)+(g.saldoCheque||0);
      if(!g.concepto&&!g.monto&&!g.montoCheque)continue; // skip empty
      const gid=Date.now().toString(36)+Math.random().toString(36).slice(2,6)+count;
      g.id=gid;
      if(!gastos[cur])gastos[cur]=[];
      gastos[cur].push({...g});
      await fbSet('obras/'+cur+'/gastos/'+gid,g);
      count++;
    }
    renderGastosPage();
  }else{
    for(const row of _pasteRows){
      const c={fecha:'',concepto:'',bruto:0,neto:0,retencion:0};
      row.forEach((val,i)=>{
        const field=mapping[i];
        if(field==='ignorar')return;
        if(['bruto','neto'].includes(field)){
          c[field]=parseNum(val);
        }else{
          c[field]=val;
        }
      });
      c.retencion=(c.bruto||0)-(c.neto||0);
      if(!c.concepto&&!c.bruto&&!c.neto)continue;
      const cid=Date.now().toString(36)+Math.random().toString(36).slice(2,6)+count;
      c.id=cid;
      if(!certificados[cur])certificados[cur]=[];
      certificados[cur].push({...c});
      await fbSet('obras/'+cur+'/certificados/'+cid,c);
      count++;
    }
    renderCerts();
  }

  closeM('mPaste');

  // Learn from the user's column mapping choices
  if(_pasteDetectedHeaders.length){
    const learned=getLearnedMappings(_pasteMode);
    mapping.forEach((field,i)=>{
      if(field!=='ignorar' && _pasteDetectedHeaders[i]){
        const hdr=_pasteDetectedHeaders[i].toLowerCase().trim();
        if(hdr) learned[hdr]=field;
      }
    });
    saveLearnedMappings(_pasteMode, learned);
  }

  _pasteRows=[];
  _pasteDetectedHeaders=[];
  _importing=false;
  touchObra();
  toast(`✅ ${count} ${_pasteMode==='gastos'?'gastos':'certificados'} importados`,'ok');
};

