function normalizeActividad(act){
  return {
    id:act.id||uid(),
    obraId:act.obraId||'',
    fecha:act.fecha||today(),
    titulo:act.titulo||'',
    desc:act.desc||'',
    createdAt:act.createdAt||act.fechaCreacion||new Date().toISOString(),
    updatedAt:act.updatedAt||act.fechaEdicion||act.createdAt||new Date().toISOString(),
    userName:act.userName||act.usuario||_currentUser||'Sistema'
  };
}

function normalizeActividades(){
  if(!Array.isArray(actividades)) actividades=[];
  actividades=actividades.map(normalizeActividad);
}

async function saveActividadesStore(){
  normalizeActividades();
  await fbSet('actividades/list',{lista:actividades});
  saveCache();
}

window.countActividadesObra=function(obraId){
  normalizeActividades();
  return actividades.filter(a=>a.obraId===obraId).length;
};

window.__thActividadesPopupApi={
  getContext(obraId,fecha){
    normalizeActividades();
    const safeFecha=fecha||today();
    return {
      obra:obras[obraId]||null,
      fecha:safeFecha,
      totalObra:actividades.filter(a=>a.obraId===obraId).length,
      user:_currentUser||'usuario',
      actividades:actividades
        .filter(a=>a.obraId===obraId&&a.fecha===safeFecha)
        .sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''))
    };
  },
  async saveActividad(payload){
    normalizeActividades();
    const obraId=payload?.obraId||'';
    const obra=obras[obraId];
    if(!obra) throw new Error('Obra no encontrada');
    const titulo=(payload?.titulo||'').trim();
    const desc=(payload?.desc||'').trim();
    if(!titulo&&!desc) throw new Error('Completá el título o el detalle');
    const now=new Date().toISOString();
    actividades.unshift({
      id:uid(),
      obraId,
      fecha:payload?.fecha||today(),
      titulo:titulo||'Actividad del día',
      desc,
      createdAt:now,
      updatedAt:now,
      userName:_currentUser||'usuario'
    });
    await saveActividadesStore();
    obra.lastModified=Date.now();
    await fbSet('obras/'+obraId,obra);
    renderObrasGrid();
    return this.getContext(obraId,payload?.fecha||today());
  },
  async deleteActividad(id){
    normalizeActividades();
    const act=actividades.find(a=>a.id===id);
    if(!act) throw new Error('Actividad no encontrada');
    actividades=actividades.filter(a=>a.id!==id);
    await saveActividadesStore();
    renderObrasGrid();
    return this.getContext(act.obraId,act.fecha);
  }
};

function actividadWindowHtml(obraId){
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Libro diario</title>
<style>
:root{
  --bg:#0b1220;--bg2:#121d30;--card:#172438;--line:#273752;--text:#eef3fb;--muted:#93a2bb;
  --accent:#d2a23d;--accent2:#f2c766;--ok:#63d28f;--danger:#ff7d74;--shadow:0 18px 40px rgba(0,0,0,.32);
}
*{box-sizing:border-box}
body{margin:0;font-family:Segoe UI,Tahoma,sans-serif;background:linear-gradient(180deg,var(--bg),#111a2b);color:var(--text)}
.wrap{max-width:1120px;margin:0 auto;padding:24px}
.hero,.panel{background:rgba(23,36,56,.95);border:1px solid var(--line);border-radius:18px;box-shadow:var(--shadow)}
.hero{padding:20px;margin-bottom:18px}
.kicker{font-size:12px;text-transform:uppercase;letter-spacing:.14em;color:var(--accent2);font-weight:800}
.title{margin-top:8px;font-size:28px;font-weight:800}
.sub{margin-top:6px;color:var(--muted);font-size:14px}
.stats{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
.pill{padding:8px 12px;border:1px solid var(--line);border-radius:999px;background:#0f192a;color:var(--muted);font-size:13px}
.grid{display:grid;grid-template-columns:minmax(320px,390px) minmax(0,1fr);gap:18px}
.panel{padding:18px}
label{display:block;margin-bottom:6px;font-size:13px;color:var(--muted)}
input,textarea{width:100%;border:1px solid var(--line);background:#0f192a;color:var(--text);border-radius:12px;padding:12px 13px;font:inherit}
textarea{min-height:180px;resize:vertical}
.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.actions{display:flex;gap:10px;align-items:center;margin-top:14px}
button{border:0;border-radius:12px;padding:11px 16px;font:inherit;font-weight:700;cursor:pointer}
.btn-primary{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#19150c}
.btn-secondary{background:#111b2d;color:var(--text);border:1px solid var(--line)}
.btn-danger{background:rgba(255,125,116,.12);color:var(--danger);border:1px solid rgba(255,125,116,.24)}
.msg{margin-top:12px;font-size:13px;color:var(--muted)}
.list{display:flex;flex-direction:column;gap:12px;max-height:70vh;overflow:auto;padding-right:4px}
.item{padding:16px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(180deg,rgba(255,255,255,.02),rgba(255,255,255,.01))}
.item-head,.item-foot{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
.item-title{font-size:16px;font-weight:800}
.item-date,.item-user{font-size:12px;color:var(--muted)}
.item-desc{margin-top:10px;white-space:pre-wrap;line-height:1.55;color:#d8e1ee}
.empty{padding:28px;text-align:center;color:var(--muted);border:1px dashed var(--line);border-radius:18px}
@media (max-width:880px){.wrap{padding:16px}.grid,.row{grid-template-columns:1fr}.title{font-size:24px}}
</style>
</head>
<body>
<div class="wrap">
  <div class="hero">
    <div class="kicker">Libro diario de obra</div>
    <div class="title" id="obra-title">Cargando...</div>
    <div class="sub" id="obra-sub">Preparando registro diario</div>
    <div class="stats">
      <div class="pill" id="pill-fecha">Fecha: --</div>
      <div class="pill" id="pill-total">Actividades totales: 0</div>
      <div class="pill" id="pill-user">Usuario: --</div>
    </div>
  </div>
  <div class="grid">
    <div class="panel">
      <div style="font-size:18px;font-weight:800;margin-bottom:14px">Cargar actividad del día</div>
      <div class="row">
        <div>
          <label for="act-fecha">Fecha</label>
          <input id="act-fecha" type="date">
        </div>
        <div>
          <label for="act-titulo">Título</label>
          <input id="act-titulo" type="text" placeholder="Ej: Avance en encofrado">
        </div>
      </div>
      <div style="margin-top:12px">
        <label for="act-desc">Detalle</label>
        <textarea id="act-desc" placeholder="Describí lo realizado hoy, observaciones, personal, clima o incidencias."></textarea>
      </div>
      <div class="actions">
        <button class="btn-primary" id="save-btn">Guardar actividad</button>
        <button class="btn-secondary" id="clear-btn">Limpiar</button>
      </div>
      <div class="msg" id="form-msg"></div>
    </div>
    <div class="panel">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:14px">
        <div style="font-size:18px;font-weight:800">Actividades de la fecha</div>
        <button class="btn-secondary" id="refresh-btn">Actualizar</button>
      </div>
      <div class="list" id="act-list"></div>
    </div>
  </div>
</div>
<script>
const obraId=${JSON.stringify(obraId)};
const api=window.opener&&window.opener.__thActividadesPopupApi;
const qs=id=>document.getElementById(id);
const esc=s=>String(s||'').replace(/[&<>"]/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[m]));
if(!api){
  document.body.innerHTML='<div style="padding:24px;color:#fff;font-family:Segoe UI,Tahoma,sans-serif">No se pudo conectar con la ventana principal. Cerrá esta ventana y abrí el clip otra vez.</div>';
}else{
  function currentFecha(){ return qs('act-fecha').value || new Date().toISOString().split('T')[0]; }
  function clearForm(){ qs('act-titulo').value=''; qs('act-desc').value=''; qs('act-titulo').focus(); }
  function setMsg(msg,ok){
    const el=qs('form-msg');
    el.textContent=msg||'';
    el.style.color=ok ? 'var(--ok)' : 'var(--muted)';
  }
  function render(ctx){
    qs('obra-title').textContent=ctx.obra ? ((ctx.obra.num ? 'Nº'+ctx.obra.num+' - ' : '') + (ctx.obra.nombre||'Obra')) : 'Obra no encontrada';
    qs('obra-sub').textContent=ctx.obra ? 'Ventana lista para registrar y consultar las actividades de este día.' : 'No se encontró la obra seleccionada.';
    qs('pill-fecha').textContent='Fecha: '+ctx.fecha;
    qs('pill-total').textContent='Actividades totales: '+(ctx.totalObra||0);
    qs('pill-user').textContent='Usuario: '+(ctx.user||'usuario');
    qs('act-fecha').value=ctx.fecha;
    const list=qs('act-list');
    if(!ctx.actividades||!ctx.actividades.length){
      list.innerHTML='<div class="empty">Todavía no hay actividades cargadas para esta fecha.</div>';
      return;
    }
    list.innerHTML=ctx.actividades.map(act=>\`
      <div class="item">
        <div class="item-head">
          <div class="item-title">\${esc(act.titulo||'Actividad del día')}</div>
          <div class="item-date">\${esc(act.updatedAt ? new Date(act.updatedAt).toLocaleString('es-PY') : '')}</div>
        </div>
        <div class="item-desc">\${esc(act.desc||'Sin detalle')}</div>
        <div class="item-foot">
          <div class="item-user">Registrado por: \${esc(act.userName||'usuario')}</div>
          <button class="btn-danger" data-del="\${esc(act.id)}">Eliminar</button>
        </div>
      </div>\`).join('');
    list.querySelectorAll('[data-del]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        if(!confirm('¿Eliminar esta actividad?')) return;
        try{
          render(await api.deleteActividad(btn.getAttribute('data-del')));
          setMsg('Actividad eliminada.', true);
        }catch(err){
          setMsg(err.message||String(err), false);
        }
      });
    });
  }
  async function reload(){ render(api.getContext(obraId,currentFecha())); }
  qs('save-btn').addEventListener('click', async ()=>{
    try{
      setMsg('Guardando...', true);
      const ctx=await api.saveActividad({
        obraId,
        fecha:currentFecha(),
        titulo:qs('act-titulo').value,
        desc:qs('act-desc').value
      });
      render(ctx);
      clearForm();
      setMsg('Actividad guardada correctamente.', true);
    }catch(err){
      setMsg(err.message||String(err), false);
    }
  });
  qs('clear-btn').addEventListener('click', clearForm);
  qs('refresh-btn').addEventListener('click', reload);
  qs('act-fecha').addEventListener('change', reload);
  reload();
  qs('act-titulo').focus();
}
</script>
</body>
</html>`;
}

window.openActividadWindow=function(obraId){
  if(!obras[obraId]){toast('Obra no encontrada','err');return;}
  normalizeActividades();
  const popup=window.open('', 'th_actividad_'+obraId, 'width=1180,height=860,resizable=yes,scrollbars=yes');
  if(!popup){toast('Tu navegador bloqueó la ventana emergente','err');return;}
  popup.document.open();
  popup.document.write(actividadWindowHtml(obraId));
  popup.document.close();
};

normalizeActividades();
