// ═══════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════
window.saveCfgP=function(){
  const _ay=parseFloat(gs('p-ay').value), _he=parseFloat(gs('p-he').value), _so=parseFloat(gs('p-so').value);
  cfg={...cfg, ayuda:isNaN(_ay)?10:_ay, heri:isNaN(_he)?1:_he, socios:isNaN(_so)?50:_so};
  localStorage.setItem('ocCfg',JSON.stringify(cfg)); saveCache(); toast('Parámetros guardados','ok');
  if(gs('page-gestor')?.classList.contains('active')) renderGestor();
  if(gs('page-ayudaSocial')?.classList.contains('active')) renderAyudaSocial();
  if(gs('page-contratista')?.classList.contains('active')) renderContratista();
};
window.exportJSON=function(){
  const data=JSON.stringify({obras,gastos,certificados,retiros,gestorPagos,ayudaSocialPagos,contratistaPagos,cfg},null,2);
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));
  a.download='thalamus_'+today()+'.json'; a.click(); toast('Exportado','ok');
};

// ═══════════════════════════════════════
// BACKUP & RESTAURACIÓN
// ═══════════════════════════════════════
function buildBackupData(){
  return{
    _meta:{version:1,date:new Date().toISOString(),user:_currentUser,timestamp:Date.now()},
    obras,gastos,certificados,retiros,gestorPagos,ayudaSocialPagos,contratistaPagos,cfg
  };
}

window.downloadBackup=function(){
  const data=buildBackupData();
  const json=JSON.stringify(data,null,2);
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([json],{type:'application/json'}));
  const fecha=today().replace(/-/g,'');
  a.download='backup_thalamus_'+fecha+'.json';
  a.click();
  toast('Backup descargado ✓','ok');
};

window.restoreBackup=async function(e){
  const f=e.target.files[0]; if(!f)return;
  try{
    const text=await f.text();
    const data=JSON.parse(text);
    // Validate structure
    if(!data.obras&&!data.gastos){
      toast('Archivo inválido: no contiene datos de Thalamus','err');return;
    }
    const obraCount=Object.keys(data.obras||{}).length;
    const gastoCount=Object.values(data.gastos||{}).reduce((s,arr)=>s+(arr?.length||0),0);
    const certCount=Object.values(data.certificados||{}).reduce((s,arr)=>s+(arr?.length||0),0);

    const msg='¿Restaurar este backup?\n\n'+
      '📁 '+obraCount+' obras\n'+
      '💸 '+gastoCount+' gastos\n'+
      '📄 '+certCount+' certificados\n'+
      (data._meta?'\n📅 Fecha: '+new Date(data._meta.date).toLocaleString('es-PY'):'') +
      (data._meta?.user?'\n👤 Usuario: '+data._meta.user:'') +
      '\n\n⚠️ Esto REEMPLAZA todos los datos actuales.';

    if(!confirm(msg))return;

    // Write BORRAR for safety
    const check=prompt('Escribí RESTAURAR para confirmar:');
    if(!check||check.trim().toUpperCase()!=='RESTAURAR'){
      toast('Operación cancelada','err');return;
    }

    toast('Restaurando datos...','info');

    // ── PASO 1: Actualizar estado en memoria INMEDIATAMENTE ──
    const newObras=data.obras||{};
    for(const[id,o]of Object.entries(newObras)){if(!o.id)o.id=id;}
    obras=newObras;
    gastos=data.gastos||{};
    certificados=data.certificados||{};
    retiros=data.retiros||{fernando:[],wuilian:[]};
    gestorPagos=data.gestorPagos||[];
    ayudaSocialPagos=data.ayudaSocialPagos||[];
    contratistaPagos=data.contratistaPagos||[];
    if(data.cfg){
      cfg=data.cfg;
      localStorage.setItem('ocCfg',JSON.stringify(cfg));
    }
    cur=null;

    // ── PASO 2: Guardar en caché para que initApp lo use ──
    saveCache();

    // ── PASO 3: Renderizar inmediatamente con los datos frescos ──
    populateSel(); navTo('obras'); applyRole();

    // ── PASO 4: Escribir a Firebase en background ──
    try{
      // Borrar obras actuales de Firebase que NO están en el backup
      const existingFB=await fbGetAll('obras');
      for(const oid of Object.keys(existingFB||{})){
        if(!newObras[oid]){
          // Esta obra no está en el backup, eliminarla de Firebase
          const fbGastos=await fbGetAll('obras/'+oid+'/gastos');
          for(const gid of Object.keys(fbGastos||{})){try{await fbDel('obras/'+oid+'/gastos/'+gid);}catch(e){}}
          const fbCerts=await fbGetAll('obras/'+oid+'/certificados');
          for(const cid of Object.keys(fbCerts||{})){try{await fbDel('obras/'+oid+'/certificados/'+cid);}catch(e){}}
          try{await fbDel('obras/'+oid);}catch(e){}
        }
      }
      // Escribir las obras del backup
      for(const[id,o]of Object.entries(newObras)){
        await fbSet('obras/'+id,o);
      }
      // Escribir gastos
      for(const[obraId,lista]of Object.entries(gastos)){
        // Primero limpiar gastos viejos de Firebase para esta obra
        const fbGastos=await fbGetAll('obras/'+obraId+'/gastos');
        for(const gid of Object.keys(fbGastos||{})){
          if(!(lista||[]).find(g=>g.id===gid)){try{await fbDel('obras/'+obraId+'/gastos/'+gid);}catch(e){}}
        }
        for(const g of(lista||[])){
          if(g.id) await fbSet('obras/'+obraId+'/gastos/'+g.id,g);
        }
      }
      // Escribir certificados
      for(const[obraId,lista]of Object.entries(certificados)){
        const fbCerts=await fbGetAll('obras/'+obraId+'/certificados');
        for(const cid of Object.keys(fbCerts||{})){
          if(!(lista||[]).find(c=>c.id===cid)){try{await fbDel('obras/'+obraId+'/certificados/'+cid);}catch(e){}}
        }
        for(const c of(lista||[])){
          if(c.id) await fbSet('obras/'+obraId+'/certificados/'+c.id,c);
        }
      }
      // Retiros y gestor
      if(data.retiros) await fbSet('retiros/socios',retiros);
      if(data.gestorPagos) await fbSet('gestor/pagos',{lista:gestorPagos});
      if(data.ayudaSocialPagos) await fbSet('ayudaSocial/pagos',{lista:ayudaSocialPagos});
      if(data.contratistaPagos) await fbSet('contratista/pagos',{lista:contratistaPagos});
      if(data.ayudaSocialPagos) await fbSet('ayudaSocial/pagos',{lista:ayudaSocialPagos});
      if(data.contratistaPagos) await fbSet('contratista/pagos',{lista:contratistaPagos});
    }catch(fbErr){
      console.warn('Error sincronizando restore con Firebase:',fbErr);
    }

    toast('✅ Backup restaurado: '+obraCount+' obras, '+gastoCount+' gastos, '+certCount+' certificados','ok');
  }catch(err){
    console.error('Restore error:',err);
    toast('Error al restaurar: '+err.message,'err');
  }
  e.target.value=''; // reset file input
};

// ── Auto-backup en Firebase ──
async function autoBackup(){
  try{
    const data=buildBackupData();
    const backups=await fbGetDoc('backups/list')||{items:[]};
    const items=backups.items||[];

    // Check if already backed up today
    const todayStr=today();
    if(items.length&&items[0].date===todayStr) return; // already backed up today

    // Add new backup
    const backupId='bk_'+todayStr.replace(/-/g,'');
    await fbSet('backups/'+backupId,data);

    // Update list
    items.unshift({id:backupId,date:todayStr,time:new Date().toLocaleString('es-PY'),user:_currentUser});
    if(items.length>5){
      // Delete oldest
      for(const old of items.slice(5)){
        try{await fbDel('backups/'+old.id);}catch(e){}
      }
    }
    await fbSet('backups/list',{items:items.slice(0,5)});
    console.log('Auto-backup completado:',backupId);
  }catch(e){
    console.warn('Auto-backup error:',e);
  }
}

window.loadBackupList=async function(){
  const el=gs('backupList');
  if(!el)return;
  el.innerHTML='<div style="padding:.5rem;color:var(--muted);font-size:.7rem">Cargando...</div>';
  try{
    const backups=await fbGetDoc('backups/list')||{items:[]};
    const items=backups.items||[];
    if(!items.length){
      el.innerHTML='<div style="padding:.5rem;color:var(--muted);font-size:.7rem">Sin backups automáticos aún</div>';
      return;
    }
    el.innerHTML=items.map((b,i)=>`
      <div class="user-row">
        <span style="font-size:.78rem;margin-right:4px">${i===0?'🟢':'⚪'}</span>
        <span class="u-name" style="flex:1;font-size:.72rem">
          ${b.date} <span style="color:var(--muted)">${b.time||''}</span>
        </span>
        <span style="font-size:.6rem;color:var(--dim)">${b.user||''}</span>
        <button class="btn-logout" style="margin-left:6px;border-color:var(--green);color:var(--green)" onclick="restoreFromFirebase('${b.id}')">Restaurar</button>
        <button class="btn-logout" style="margin-left:4px" onclick="downloadFirebaseBackup('${b.id}','${b.date}')">⬇️</button>
      </div>
    `).join('');
  }catch(e){
    el.innerHTML='<div style="padding:.5rem;color:var(--acc3);font-size:.7rem">Error cargando backups</div>';
  }
};

window.downloadFirebaseBackup=async function(id,fecha){
  toast('Descargando backup...','info');
  try{
    const data=await fbGetDoc('backups/'+id);
    if(!data){toast('Backup no encontrado','err');return;}
    const json=JSON.stringify(data,null,2);
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([json],{type:'application/json'}));
    a.download='backup_thalamus_'+fecha.replace(/-/g,'')+'.json';
    a.click();
    toast('Backup descargado ✓','ok');
  }catch(e){toast('Error: '+e.message,'err');}
};

window.restoreFromFirebase=async function(id){
  if(!confirm('¿Restaurar desde este backup?\n\nEsto REEMPLAZA todos los datos actuales.'))return;
  const check=prompt('Escribí RESTAURAR para confirmar:');
  if(!check||check.trim().toUpperCase()!=='RESTAURAR'){toast('Cancelado','err');return;}
  toast('Descargando backup...','info');
  try{
    const data=await fbGetDoc('backups/'+id);
    if(!data){toast('Backup no encontrado','err');return;}

    const obraCount=Object.keys(data.obras||{}).length;

    // ── PASO 1: Actualizar estado en memoria INMEDIATAMENTE ──
    const newObras=data.obras||{};
    for(const[oid,o]of Object.entries(newObras)){if(!o.id)o.id=oid;}
    obras=newObras;
    gastos=data.gastos||{};
    certificados=data.certificados||{};
    retiros=data.retiros||{fernando:[],wuilian:[]};
    gestorPagos=data.gestorPagos||[];
    ayudaSocialPagos=data.ayudaSocialPagos||[];
    contratistaPagos=data.contratistaPagos||[];
    if(data.cfg){
      cfg=data.cfg;
      localStorage.setItem('ocCfg',JSON.stringify(cfg));
    }
    cur=null;

    // ── PASO 2: Guardar en caché y renderizar ──
    saveCache();
    populateSel(); navTo('obras'); applyRole();

    // ── PASO 3: Escribir a Firebase en background ──
    toast('Sincronizando con Firebase...','info');
    try{
      // Borrar obras que no están en el backup
      const existingFB=await fbGetAll('obras');
      for(const oid of Object.keys(existingFB||{})){
        if(!newObras[oid]){
          const fbG=await fbGetAll('obras/'+oid+'/gastos');
          for(const gid of Object.keys(fbG||{})){try{await fbDel('obras/'+oid+'/gastos/'+gid);}catch(e){}}
          const fbC=await fbGetAll('obras/'+oid+'/certificados');
          for(const cid of Object.keys(fbC||{})){try{await fbDel('obras/'+oid+'/certificados/'+cid);}catch(e){}}
          try{await fbDel('obras/'+oid);}catch(e){}
        }
      }
      // Escribir obras
      for(const[oid,o]of Object.entries(newObras)) await fbSet('obras/'+oid,o);
      // Escribir gastos (limpiando viejos)
      for(const[obraId,lista]of Object.entries(gastos)){
        const fbG=await fbGetAll('obras/'+obraId+'/gastos');
        for(const gid of Object.keys(fbG||{})){
          if(!(lista||[]).find(g=>g.id===gid)){try{await fbDel('obras/'+obraId+'/gastos/'+gid);}catch(e){}}
        }
        for(const g of(lista||[])){if(g.id)await fbSet('obras/'+obraId+'/gastos/'+g.id,g);}
      }
      // Escribir certificados (limpiando viejos)
      for(const[obraId,lista]of Object.entries(certificados)){
        const fbC=await fbGetAll('obras/'+obraId+'/certificados');
        for(const cid of Object.keys(fbC||{})){
          if(!(lista||[]).find(c=>c.id===cid)){try{await fbDel('obras/'+obraId+'/certificados/'+cid);}catch(e){}}
        }
        for(const c of(lista||[])){if(c.id)await fbSet('obras/'+obraId+'/certificados/'+c.id,c);}
      }
      // Retiros, gestor y ayuda social
      await fbSet('retiros/socios',retiros);
      await fbSet('gestor/pagos',{lista:gestorPagos});
      await fbSet('ayudaSocial/pagos',{lista:ayudaSocialPagos});
      await fbSet('contratista/pagos',{lista:contratistaPagos});
    }catch(fbErr){
      console.warn('Error sync restore:',fbErr);
    }

    toast('✅ Backup restaurado: '+obraCount+' obras','ok');
  }catch(e){toast('Error: '+e.message,'err');}
};

