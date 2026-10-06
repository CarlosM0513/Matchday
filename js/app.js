// MATCHDAY - Supabase app
const sb = window.supabaseClient;
const GEN=['partidos','goles','asistencias','mvp','victorias','empates','derrotas'];
const POS={
  Portero:['atajadas','atajadas_dificiles','penaltis_atajados','goles_recibidos','porterias_cero','salidas_exitosas','errores_gol'],
  Defensa:['intercepciones','entradas_exitosas','despejes','bloqueos','duelos_ganados','duelos_perdidos','recuperaciones','faltas'],
  Lateral:['intercepciones','entradas','recuperaciones','centros','centros_acertados','duelos_ganados','despejes'],
  Mediocampista:['pases','pases_acertados','pases_clave','recuperaciones','intercepciones','duelos_ganados','ocasiones_creadas'],
  Extremo:['regates_intentados','regates_exitosos','centros','centros_acertados','ocasiones_creadas','pases_clave','tiros','tiros_arco'],
  Delantero:['tiros','tiros_arco','ocasiones_creadas','regates','regates_exitosos','duelos_ganados','penaltis_convertidos']
};
const nm=s=>s.replace(/_/g,' ');
const pct=(a,b)=>b?Math.round(a/b*100):0;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fdate=f=>{const t=new Date().toISOString().slice(0,10);return f===t?'Hoy':f};
const empty=t=>`<div class="empty">${t}</div>`;
const $=s=>document.querySelector(s),dlg=$('#dlg');
let cur='dash', session=null, me=null, players=[], matches=[], requests=[], notifs=[];
const SESSION_IDLE_MS=30*60*1000;
let idleTimer=null;
function resetIdleTimer(){if(idleTimer)clearTimeout(idleTimer);if(!session)return;idleTimer=setTimeout(async()=>{await sb.auth.signOut();toast('Sesión cerrada por inactividad.');},SESSION_IDLE_MS)}
['click','keydown','mousemove','touchstart'].forEach(ev=>document.addEventListener(ev,resetIdleTimer,{passive:true}));

function toast(m,err){const t=$('#toast');t.textContent=m;t.className='show'+(err?' err':'');setTimeout(()=>t.className='',2200)}
function openM(h){dlg.innerHTML=h;dlg.showModal()}
dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});
function derived(p){
 const s=p.stats||{},o=[];
 if(p.pos==='Portero'){o.push(['% atajadas',pct(s.atajadas||0,(s.atajadas||0)+(s.goles_recibidos||0))]);o.push(['Porterías en cero',s.porterias_cero||0,Math.max(s.partidos||0,1)]);o.push(['Goles recibidos / partido',((s.goles_recibidos||0)/Math.max(s.partidos||0,1)).toFixed(1),null])}
 if(p.pos==='Delantero'||p.pos==='Extremo')o.push(['% tiros al arco',pct(s.tiros_arco||0,s.tiros||0)]);
 if(p.pos==='Extremo'||p.pos==='Delantero')o.push(['% regates',pct(s.regates_exitosos||0,s.regates_intentados||s.regates||0)]);
 if(p.pos==='Mediocampista')o.push(['% pases',pct(s.pases_acertados||0,s.pases||0)]);
 if(p.pos==='Defensa')o.push(['% duelos',pct(s.duelos_ganados||0,(s.duelos_ganados||0)+(s.duelos_perdidos||0))]);
 if(p.pos==='Lateral')o.push(['% centros',pct(s.centros_acertados||0,s.centros||0)]);
 o.push(['Goles / partido',((s.goles||0)/Math.max(s.partidos||0,1)).toFixed(2),null]);return o
}

async function loadAll(){
 const [pr,ma,no]=await Promise.all([
   sb.from('profiles').select('*').order('created_at',{ascending:true}),
   sb.from('matches').select('*').order('fecha',{ascending:true}).order('hora',{ascending:true}),
   sb.from('notifications').select('*').order('created_at',{ascending:false})
 ]);
 if(pr.error)throw pr.error;if(ma.error)throw ma.error;if(no.error)throw no.error;
 players=pr.data||[];matches=ma.data||[];notifs=no.data||[];
 if(session){
   const {data:reqData,error:reqError}=await sb.from('match_requests').select('*');
   if(reqError)throw reqError;requests=reqData||[];
   me=players.find(p=>p.id===session.user.id)||null;
 } else {requests=[];me=null}
}

async function ensureProfile(){
 if(!session)return;
 me=players.find(p=>p.id===session.user.id)||null;
}

async function editOwnProfile(){
 if(!session||!me){toast('Primero registra tu jugador',true);return}
 const name=prompt('Nombre:',me.nombre);if(name===null)return;
 const nick=prompt('Apodo:',me.apodo||'');if(nick===null)return;
 const team=prompt('Equipo:',me.equipo||'');if(team===null)return;
 const level=prompt('Nivel (Casual, Intermedio o Avanzado):',me.nivel||'Casual');if(level===null)return;
 const stats=Object.assign({},me.stats||{});
 for(const k of Object.keys(stats)){const v=prompt('Estadística '+nm(k)+':',String(stats[k]||0));if(v===null)return;stats[k]=Math.max(0,Number(v)||0)}
 const {error}=await sb.from('profiles').update({nombre:name,apodo:nick,equipo:team,nivel:level,stats:stats}).eq('id',session.user.id);
 if(error){toast(error.message,true);return}
 dlg.close();toast('Perfil y estadísticas actualizados');await refresh()
}

function authScreen(){
 $('#main').innerHTML=`<section>
 <h1>Bienvenido a MATCHDAY</h1>
 <p class="sub">Inicia sesión para crear partidos, registrar tu jugador y jugar con otras personas.</p>
 <div class="card" style="max-width:520px;margin-top:18px">
 <form id="authForm">
  <label>Correo electrónico</label><input type="email" name="email" required autocomplete="email">
  <label>Contraseña</label><input type="password" name="password" required minlength="6" autocomplete="current-password">
  <div class="row" style="margin-top:14px"><button class="btn" type="submit" data-mode="login">Iniciar sesión</button><button class="btn g" type="button" id="signupBtn">Crear cuenta</button></div>
 </form>
 <div class="lbl" style="margin-top:12px">Usa un correo real si tu proyecto tiene activada la confirmación por email.</div>
 </div></section>`;
 $('#authForm').onsubmit=async e=>{
   e.preventDefault();const f=new FormData(e.target);
   const {error}=await sb.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});
   if(error){toast(error.message,true);return}
   await boot();toast('Sesión iniciada');
 };
 $('#signupBtn').onclick=async()=>{
   const f=new FormData($('#authForm'));const email=f.get('email'),password=f.get('password');
   if(!email||!password){toast('Escribe correo y contraseña',true);return}
   const {data,error}=await sb.auth.signUp({email,password});
   if(error){toast(error.message,true);return}
   if(data.session){await boot();toast('Cuenta creada')}else toast('Cuenta creada. Revisa tu correo para confirmar la cuenta.');
 };
}

async function notifySelf(text){
 if(!session)return;
 await sb.from('notifications').insert({user_id:session.user.id,texto:text});
}

function badge(){const n=notifs.filter(x=>!x.leida).length;$('#cnt').hidden=!n;$('#cnt').textContent=n}
async function refresh(){await loadAll();show(cur)}

const V={
 dash(){
  const ms=matches,next=ms[0];
  let h='<h1>Inicio</h1><p class="sub">Crear → Encontrar → Jugar → Registrar → Analizar</p>';
  h+='<div class="row"><button class="btn" data-a="newMatch">Crear partido</button><button class="btn g" data-a="go" data-v="matches">Buscar partido</button>'+(!me?'<button class="btn g" data-a="newPlayer">Registrar jugador</button>':'')+'</div>';
  if(me){const s=me.stats||{};h+=`<h2>Mi resumen · ${esc(me.nombre)} (${me.pos||'Sin posición'})</h2><div class="grid">`+[['Partidos',s.partidos||0],['Victorias',s.victorias||0],['Empates',s.empates||0],['Derrotas',s.derrotas||0],['Goles',s.goles||0],['Asistencias',s.asistencias||0]].map(x=>`<div class="card"><div class="stat">${x[1]}</div><div class="lbl">${x[0]}</div></div>`).join('')+'</div>'}
  else h+=empty('Registra tu jugador para ver tu resumen.');
  h+='<h2>Próximo partido</h2>';h+=next?matchCard(next):empty('No hay partidos programados.');return h
 },
 matches(){
  let h='<h1>Partidos</h1><p class="sub">Partidos públicos que necesitan jugadores</p><div class="row" style="margin-bottom:14px"><button class="btn" data-a="newMatch">+ Crear partido</button><select id="fm" style="width:auto"><option value="">Todas las modalidades</option>'+['Fútbol 5','Fútbol 7','Fútbol 8','Fútbol 11'].map(m=>`<option>${m}</option>`).join('')+'</select><input id="fq" placeholder="Buscar..." style="width:180px"></div><div class="grid" id="mlist"></div>';
  setTimeout(()=>{const f=()=>{const q=$('#fq').value.toLowerCase(),m=$('#fm').value;const r=matches.filter(x=>(!m||x.modo===m)&&(x.nombre+x.cancha).toLowerCase().includes(q));$('#mlist').innerHTML=r.length?r.map(matchCard).join(''):empty('Sin resultados.')};$('#fq').oninput=f;$('#fm').onchange=f;f()});return h
 },
 players(){
  return '<h1>Jugadores</h1><p class="sub">Cada posición tiene sus propias estadísticas</p>'+(!me?'<button class="btn" data-a="newPlayer" style="margin-bottom:14px">+ Registrar jugador</button>':'<div class="row" style="margin-bottom:14px"><div class="lbl">Tu cuenta tiene un perfil de jugador.</div><button class="btn s" data-a="editOwnProfile">Editar mi perfil</button></div>')+'<div class="grid">'+(players.length?players.map(p=>`<div class="card"><div class="lbl">#${p.num||'-'} · ${esc(p.pos||'')}</div><h3 style="margin:4px 0">${esc(p.nombre)}</h3><div class="lbl">${esc(p.equipo||'Sin equipo')}</div><div class="row" style="margin-top:12px"><button class="btn s" data-a="profile" data-id="${p.id}">${p.id===session.user.id?'Mi perfil':'Ver perfil'}</button></div></div>`).join(''):empty('Aún no hay jugadores.'))+'</div>'
 },
 notifs(){
  const ns=notifs;return '<h1>Notificaciones</h1><p class="sub">Tu actividad reciente</p>'+(ns.length?ns.map(n=>`<div class="card ${n.leida?'':'unread'}" style="margin-bottom:8px">${esc(n.texto)}<div class="lbl">${new Date(n.created_at).toLocaleString('es-CO')}</div></div>`).join(''):empty('Sin notificaciones.'))
 }
};

function matchCard(m){
 const pend=requests.filter(r=>r.match_id===m.id&&r.estado==='pendiente');
 const mine=requests.some(r=>r.match_id===m.id&&r.player_id===session.user.id&&r.estado==='pendiente');
 return `<div class="card"><span class="badge">${esc(m.modo)}</span><span class="badge">${esc(m.nivel||'')}</span><h3 style="margin:6px 0">${esc(m.nombre)}</h3><div class="lbl">${fdate(m.fecha)} · ${m.hora?.slice(0,5)} · ${esc(m.cancha)}</div>
 <div style="margin-top:10px;font-weight:700">${m.conf} / ${m.max_players} jugadores</div><div class="bar"><i style="width:${pct(m.conf,m.max_players)}%"></i></div>
 ${m.faltan?.length?'<div class="lbl">Faltan:</div>'+m.faltan.map(f=>`<span class="badge">${esc(f)}</span>`).join(''):'<span class="badge">Completo</span>'}
 <div class="lbl" style="margin:6px 0">$ ${(+m.precio).toLocaleString('es-CO')}</div>
 <div class="row"><button class="btn s" data-a="join" data-id="${m.id}" ${m.conf>=m.max_players||m.owner_id===session.user.id||mine?'disabled':''}>${mine?'SOLICITUD ENVIADA':'QUIERO JUGAR'}</button>${m.owner_id===session.user.id&&pend.length?`<button class="btn s g" data-a="reqs" data-id="${m.id}">Solicitudes (${pend.length})</button>`:''}${m.owner_id===session.user.id?`<button class="btn s g" data-a="editMatch" data-id="${m.id}">Editar</button><button class="btn s g" data-a="delMatch" data-id="${m.id}">✕</button>`:''}</div></div>`
}

const A={
 go(e){show(e.dataset.v)},
 editOwnProfile(){editOwnProfile()},
 async newMatch(){
  if(!session){toast('Inicia sesión primero',true);return}
  openM(`<h2 style="margin-top:0">Crear partido</h2><form id="f"><label>Nombre</label><input name="nombre" required>
  <div class="f2"><div><label>Modalidad</label><select name="modo">${['Fútbol 5','Fútbol 7','Fútbol 8','Fútbol 11','Personalizado'].map(x=>`<option>${x}</option>`).join('')}</select></div><div><label>Nivel</label><select name="nivel"><option>Casual</option><option>Intermedio</option><option>Avanzado</option></select></div>
  <div><label>Fecha</label><input type="date" name="fecha" required></div><div><label>Hora</label><input type="time" name="hora" required></div>
  <div><label>Cancha</label><input name="cancha" required></div><div><label>Nº de jugadores</label><input type="number" name="max" min="2" value="10" required></div>
  <div><label>Precio aprox.</label><input type="number" name="precio" min="0" value="0"></div><div><label>Visibilidad</label><select name="publico"><option value="1">Público</option><option value="">Privado</option></select></div></div>
  <label>Posiciones que faltan</label><select name="faltan" multiple size="4">${['Portero','Defensa','Lateral','Mediocampista','Extremo','Delantero','Libre'].map(x=>`<option>${x}</option>`).join('')}</select>
  <div class="row" style="margin-top:14px"><button class="btn">Crear</button><button type="button" class="btn g" onclick="dlg.close()">Cancelar</button></div></form>`);
  $('#f').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);
   const payload={owner_id:session.user.id,nombre:f.get('nombre'),modo:f.get('modo'),fecha:f.get('fecha'),hora:f.get('hora'),cancha:f.get('cancha'),max_players:+f.get('max'),precio:+f.get('precio'),nivel:f.get('nivel'),publico:!!f.get('publico'),descripcion:'',conf:1,faltan:f.getAll('faltan')};
   const {error}=await sb.from('matches').insert(payload);if(error){toast(error.message,true);return}
   await notifySelf('Creaste el partido "'+f.get('nombre')+'".');dlg.close();toast('Partido creado');await refresh()
  }
 },
 async join(e){
  const m=matches.find(x=>x.id===e.dataset.id);if(!m)return;
  if(!me){toast('Registra tu jugador antes de solicitar entrar',true);return}
  if(m.owner_id===session.user.id){toast('No puedes solicitarte a tu propio partido',true);return}
  if(requests.some(r=>r.match_id===m.id&&r.player_id===session.user.id)){toast('Ya tienes una solicitud para este partido',true);return}
  openM(`<h2 style="margin-top:0">Solicitar entrar a ${esc(m.nombre)}</h2><form id="f"><label>Tu posición</label><select name="pos">${Object.keys(POS).map(x=>`<option>${x}</option>`).join('')}</select><label>Comentario (opcional)</label><textarea name="c"></textarea><label><input type="checkbox" name="ok" required style="width:auto"> Confirmo mi disponibilidad</label><div class="row" style="margin-top:14px"><button class="btn">Enviar solicitud</button><button type="button" class="btn g" onclick="dlg.close()">Cancelar</button></div></form>`);
  $('#f').onsubmit=async ev=>{ev.preventDefault();const f=new FormData(ev.target);const {error}=await sb.from('match_requests').insert({match_id:m.id,player_id:session.user.id,pos:f.get('pos'),comentario:f.get('c'),estado:'pendiente'});if(error){toast(error.message,true);return}dlg.close();toast('Solicitud enviada');await refresh()}
 },
 async reqs(e){
  const m=matches.find(x=>x.id===e.dataset.id);if(!m||m.owner_id!==session.user.id)return;
  const pend=requests.filter(r=>r.match_id===m.id&&r.estado==='pendiente');
  openM(`<h2 style="margin-top:0">Solicitudes · ${esc(m.nombre)}</h2>`+(pend.length?pend.map(r=>`<div class="card" style="margin-bottom:8px"><b>${esc(r.pos)}</b><div class="lbl">${esc(r.comentario||'Sin comentario')}</div><div class="row" style="margin-top:8px"><button class="btn s" data-a="resp" data-m="${m.id}" data-id="${r.id}" data-ok="1">Aceptar</button><button class="btn s r" data-a="resp" data-m="${m.id}" data-id="${r.id}">Rechazar</button></div></div>`).join(''):empty('Sin solicitudes.')));
 },
 async resp(e){
  const m=matches.find(x=>x.id===e.dataset.m);if(!m||m.owner_id!==session.user.id)return;
  const r=requests.find(x=>x.id===e.dataset.id);if(!r)return;
  const ok=!!e.dataset.ok;
  if(ok&&m.conf>=m.max_players){toast('El partido ya está lleno',true);return}
  const {error}=await sb.from('match_requests').update({estado:ok?'aceptada':'rechazada'}).eq('id',r.id);if(error){toast(error.message,true);return}
  if(ok){await sb.from('matches').update({conf:Math.min(m.max_players,m.conf+1),faltan:(m.faltan||[]).filter(x=>x!==r.pos&&x!=='Libre')}).eq('id',m.id)}
  dlg.close();toast(ok?'Jugador aceptado':'Solicitud rechazada');await refresh()
 },
 async editMatch(e){
  const m=matches.find(x=>x.id===e.dataset.id);if(!m||m.owner_id!==session.user.id)return;
  openM(`<h2 style="margin-top:0">Editar partido</h2><form id="f"><label>Nombre</label><input name="nombre" value="${esc(m.nombre)}" required>
  <div class="f2"><div><label>Modalidad</label><select name="modo">${['Fútbol 5','Fútbol 7','Fútbol 8','Fútbol 11','Personalizado'].map(x=>`<option ${x===m.modo?'selected':''}>${x}</option>`).join('')}</select></div><div><label>Nivel</label><select name="nivel">${['Casual','Intermedio','Avanzado'].map(x=>`<option ${x===m.nivel?'selected':''}>${x}</option>`).join('')}</select></div>
  <div><label>Fecha</label><input type="date" name="fecha" value="${m.fecha}" required></div><div><label>Hora</label><input type="time" name="hora" value="${m.hora?.slice(0,5)}" required></div>
  <div><label>Cancha</label><input name="cancha" value="${esc(m.cancha)}" required></div><div><label>Nº de jugadores</label><input type="number" name="max" min="2" value="${m.max_players}" required></div>
  <div><label>Precio aprox.</label><input type="number" name="precio" min="0" value="${m.precio}"></div><div><label>Visibilidad</label><select name="publico"><option value="1" ${m.publico?'selected':''}>Público</option><option value="" ${!m.publico?'selected':''}>Privado</option></select></div></div>
  <label>Posiciones que faltan</label><select name="faltan" multiple size="4">${['Portero','Defensa','Lateral','Mediocampista','Extremo','Delantero','Libre'].map(x=>`<option ${(m.faltan||[]).includes(x)?'selected':''}>${x}</option>`).join('')}</select>
  <div class="row" style="margin-top:14px"><button class="btn">Guardar cambios</button><button type="button" class="btn g" onclick="dlg.close()">Cancelar</button></div></form>`);
  $('#f').onsubmit=async ev=>{ev.preventDefault();const f=new FormData(ev.target);const {error}=await sb.from('matches').update({nombre:f.get('nombre'),modo:f.get('modo'),nivel:f.get('nivel'),fecha:f.get('fecha'),hora:f.get('hora'),cancha:f.get('cancha'),max_players:+f.get('max'),precio:+f.get('precio'),publico:!!f.get('publico'),faltan:f.getAll('faltan')}).eq('id',m.id);if(error){toast(error.message,true);return}dlg.close();toast('Partido actualizado');await refresh()}
 },
 async delMatch(e){const m=matches.find(x=>x.id===e.dataset.id);if(!m||m.owner_id!==session.user.id)return;const {error}=await sb.from('matches').delete().eq('id',m.id);if(error){toast(error.message,true);return}toast('Partido eliminado');await refresh()},
 newPlayer(){
  if(!session){toast('Inicia sesión primero',true);return}
  if(me){toast('Ya tienes un perfil de jugador asociado a esta cuenta',true);return}
  openM(`<h2 style="margin-top:0">Registrar jugador</h2><form id="f"><div class="f2"><div><label>Nombre</label><input name="nombre" required></div><div><label>Apodo</label><input name="apodo"></div><div><label>Número</label><input type="number" name="num" min="1" max="99" required></div><div><label>Equipo</label><input name="equipo"></div><div><label>Posición</label><select name="pos" id="pp">${Object.keys(POS).map(x=>`<option>${x}</option>`).join('')}</select></div><div><label>Pie dominante</label><select name="pie"><option>Derecho</option><option>Izquierdo</option><option>Ambos</option></select></div></div><label>Nivel</label><select name="nivel"><option>Casual</option><option>Intermedio</option><option>Avanzado</option></select><h2>Estadísticas iniciales</h2><div class="f2" id="sf"></div><div class="row" style="margin-top:14px"><button class="btn">Guardar</button><button type="button" class="btn g" onclick="dlg.close()">Cancelar</button></div></form>`);
  const draw=()=>{$('#sf').innerHTML=[...GEN,...POS[$('#pp').value]].filter((v,i,a)=>a.indexOf(v)===i).map(k=>`<div><label>${nm(k)}</label><input type="number" min="0" name="s_${k}" value="0"></div>`).join('')};$('#pp').onchange=draw;draw();
  $('#f').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),pos=f.get('pos'),st={};[...GEN,...POS[pos]].filter((v,i,a)=>a.indexOf(v)===i).forEach(k=>st[k]=+f.get('s_'+k)||0);const p={id:session.user.id,nombre:f.get('nombre'),apodo:f.get('apodo'),num:+f.get('num'),pos,equipo:f.get('equipo'),pie:f.get('pie'),nivel:f.get('nivel'),stats:st};const {error}=await sb.from('profiles').insert(p);if(error){toast(error.message,true);return}dlg.close();toast('Jugador registrado');await refresh()}
 },
 async profile(e){
  const p=players.find(x=>x.id===e.dataset.id);if(!p)return;const s=p.stats||{},mx=Math.max(1,...Object.values(s).map(Number));
  openM(`<div class="pcard"><div class="n">${p.num||'-'}</div><h2 style="margin:0;color:var(--tx)">${esc(p.nombre)}${p.apodo?' "'+esc(p.apodo)+'"':''}</h2><div class="lbl">${esc(p.pos||'')} · ${esc(p.equipo||'Sin equipo')} · Pie ${esc(p.pie||'-')}</div><div class="grid" style="margin-top:14px;grid-template-columns:repeat(4,1fr)">${[['Partidos',s.partidos||0],['Goles',s.goles||0],['Asist.',s.asistencias||0],['MVP',s.mvp||0]].map(x=>`<div><div class="stat" style="font-size:22px">${x[1]}</div><div class="lbl">${x[0]}</div></div>`).join('')}</div></div><h2>Destacadas · ${esc(p.pos||'')}</h2>${derived(p).map(d=>`<div class="lbl">${d[0]}: <b style="color:var(--tx)">${d[1]}${String(d[0]).startsWith('%')?'%':''}</b></div><div class="bar"><i data-w="${d[2]?pct(d[1],d[2]):Math.min(100,+d[1]||0)}"></i></div>`).join('')}<h2>Estadísticas de posición</h2>${(POS[p.pos]||[]).map(k=>`<div class="lbl">${nm(k)} · ${s[k]||0}</div><div class="bar"><i data-w="${pct(s[k]||0,mx)}"></i></div>`).join('')}<button class="btn g" onclick="dlg.close()">Cerrar</button>`);
  setTimeout(()=>dlg.querySelectorAll('.bar i[data-w]').forEach(i=>i.style.width=i.dataset.w+'%'),60)
 },
 async logout(){await sb.auth.signOut();location.reload()}
};

document.addEventListener('click',e=>{const t=e.target.closest('[data-a]');if(t&&A[t.dataset.a])A[t.dataset.a](t)});
$('#nav').onclick=e=>{if(e.target.dataset.s&&session)show(e.target.dataset.s)};
async function markRead(){if(!session)return;const ids=notifs.filter(n=>!n.leida).map(n=>n.id);if(ids.length)await sb.from('notifications').update({leida:true}).in('id',ids);await loadAll();badge()}
async function show(v){
 cur=v;
 if(!session){authScreen();return}
 document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.s===v));
 $('#main').innerHTML='<section>'+V[v]()+'</section>';badge();
 if(v==='notifs')await markRead();
 document.querySelectorAll('#main .bar i').forEach(i=>{const w=i.style.width;i.style.width='0';setTimeout(()=>i.style.width=w,60)})
}
async function boot(){
 const {data,error}=await sb.auth.getSession();if(error){toast(error.message,true);return}
 session=data.session;
 document.querySelector('#nav').style.display=session?'':'none';
 resetIdleTimer();
 if(session){await loadAll();document.querySelector('#main').innerHTML='<section><div class="card">Cargando MATCHDAY…</div></section>';show('dash')}
 else authScreen()
}
sb.auth.onAuthStateChange(async()=>{const {data}=await sb.auth.getSession();session=data.session;if(session){await loadAll();show(cur)}else authScreen()});
boot();
