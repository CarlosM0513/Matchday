// ---------- storage ----------
const DB={
 get(k,d){try{const v=localStorage.getItem('md_'+k);return v?JSON.parse(v):d}catch(e){return d}},
 set(k,v){try{localStorage.setItem('md_'+k,JSON.stringify(v))}catch(e){}return v},
 add(k,o){const a=DB.get(k,[]);a.unshift(o);DB.set(k,a);return o},
 upd(k,id,fn){const a=DB.get(k,[]);const o=a.find(x=>x.id===id);if(o){fn(o);DB.set(k,a)}return o},
 del(k,id){DB.set(k,DB.get(k,[]).filter(x=>x.id!==id))}
};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
// ---------- stats por posición ----------
const GEN=['partidos','goles','asistencias','mvp','victorias','empates','derrotas'];
const POS={
Portero:['atajadas','atajadas_dificiles','penaltis_atajados','goles_recibidos','porterias_cero','salidas_exitosas','errores_gol'],
Defensa:['intercepciones','entradas_exitosas','despejes','bloqueos','duelos_ganados','duelos_perdidos','recuperaciones','faltas'],
Lateral:['intercepciones','entradas','recuperaciones','centros','centros_acertados','duelos_ganados','despejes'],
Mediocampista:['pases','pases_acertados','pases_clave','recuperaciones','intercepciones','duelos_ganados','ocasiones_creadas'],
Extremo:['regates_intentados','regates_exitosos','centros','centros_acertados','ocasiones_creadas','pases_clave','tiros','tiros_arco'],
Delantero:['tiros','tiros_arco','ocasiones_creadas','regates','regates_exitosos','duelos_ganados','penaltis_convertidos']};
const nm=s=>s.replace(/_/g,' ');
const pct=(a,b)=>b?Math.round(a/b*100):0;
function derived(p){const s=p.stats,o=[];
 if(p.pos==='Portero'){o.push(['% atajadas',pct(s.atajadas,s.atajadas+s.goles_recibidos)]);o.push(['Porterías en cero',s.porterias_cero,Math.max(s.partidos,1)]);o.push(['Goles recibidos / partido',(s.goles_recibidos/Math.max(s.partidos,1)).toFixed(1),null])}
 if(p.pos==='Delantero'||p.pos==='Extremo')o.push(['% tiros al arco',pct(s.tiros_arco,s.tiros)]);
 if(p.pos==='Extremo'||p.pos==='Delantero')o.push(['% regates',pct(s.regates_exitosos,s.regates_intentados||s.regates)]);
 if(p.pos==='Mediocampista')o.push(['% pases',pct(s.pases_acertados,s.pases)]);
 if(p.pos==='Defensa')o.push(['% duelos',pct(s.duelos_ganados,s.duelos_ganados+s.duelos_perdidos)]);
 if(p.pos==='Lateral')o.push(['% centros',pct(s.centros_acertados,s.centros)]);
 o.push(['Goles / partido',(s.goles/Math.max(s.partidos,1)).toFixed(2),null]);return o}
// ---------- seed ----------
function seed(){if(DB.get('seeded'))return;
 const mk=(n,ap,num,pos,eq,st)=>({id:uid(),nombre:n,apodo:ap,num,pos,equipo:eq,pie:'Derecho',nivel:'Intermedio',stats:Object.assign(Object.fromEntries([...GEN,...POS[pos]].map(k=>[k,0])),st)});
 DB.set('players',[mk('Carlos Pérez','Charly',9,'Delantero','Black Storm',{partidos:24,goles:31,asistencias:18,mvp:4,victorias:15,empates:4,derrotas:5,tiros:96,tiros_arco:54,regates:40,regates_exitosos:26}),
  mk('Andrés Ruiz','Muro',1,'Portero','White FC',{partidos:20,goles:0,asistencias:1,mvp:3,victorias:11,empates:3,derrotas:6,atajadas:88,goles_recibidos:27,porterias_cero:6})]);
 DB.set('me',DB.get('players')[0].id);
 const d=n=>{const x=new Date(Date.now()+n*864e5);return x.toISOString().slice(0,10)};
 DB.set('matches',[{id:uid(),nombre:'Black Storm vs Amigos',modo:'Fútbol 7',fecha:d(0),hora:'19:00',cancha:'Cancha Sintética',max:12,precio:8000,nivel:'Intermedio',publico:true,desc:'',conf:9,faltan:['Portero','Defensa'],reqs:[]},
  {id:uid(),nombre:'Micro del sábado',modo:'Fútbol 5',fecha:d(3),hora:'10:00',cancha:'La Bombonera',max:10,precio:5000,nivel:'Casual',publico:true,desc:'',conf:7,faltan:['Delantero','Libre'],reqs:[]}]);
 DB.set('notifs',[{id:uid(),t:'Bienvenido a MATCHDAY. Crea o busca un partido.',leida:false,f:Date.now()}]);
 DB.set('seeded',1)}
// ---------- ui helpers ----------
const $=s=>document.querySelector(s),dlg=$('#dlg');
function toast(m,err){const t=$('#toast');t.textContent=m;t.className='show'+(err?' err':'');setTimeout(()=>t.className='',2200)}
function notify(t){DB.add('notifs',{id:uid(),t,leida:false,f:Date.now()});badge()}
function badge(){const n=DB.get('notifs',[]).filter(x=>!x.leida).length;$('#cnt').hidden=!n;$('#cnt').textContent=n}
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fdate=f=>{const t=new Date().toISOString().slice(0,10);return f===t?'Hoy':f};
const empty=t=>`<div class="empty">${t}</div>`;
function openM(h){dlg.innerHTML=h;dlg.showModal()}
dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});
// ---------- vistas ----------
let cur='dash';
const V={
dash(){const ps=DB.get('players',[]),me=ps.find(p=>p.id===DB.get('me'))||ps[0],ms=DB.get('matches',[]);
 const next=[...ms].sort((a,b)=>(a.fecha+a.hora).localeCompare(b.fecha+b.hora))[0];
 let h='<h1>Inicio</h1><p class="sub">Crear → Encontrar → Jugar → Registrar → Analizar</p>';
 h+='<div class="row"><button class="btn" data-a="newMatch">Crear partido</button><button class="btn g" data-a="go" data-v="matches">Buscar partido</button><button class="btn g" data-a="newPlayer">Registrar jugador</button></div>';
 if(me){const s=me.stats;h+=`<h2>Mi resumen · ${esc(me.nombre)} (${me.pos})</h2><div class="grid">`+[['Partidos',s.partidos],['Victorias',s.victorias],['Empates',s.empates],['Derrotas',s.derrotas],['Goles',s.goles],['Asistencias',s.asistencias]].map(x=>`<div class="card"><div class="stat">${x[1]}</div><div class="lbl">${x[0]}</div></div>`).join('')+'</div>'}
 else h+=empty('Registra tu primer jugador para ver tu resumen.');
 h+='<h2>Próximo partido</h2>';
 h+=next?matchCard(next):empty('No hay partidos programados.');
 return h},
matches(){const ms=DB.get('matches',[]);
 let h='<h1>Partidos</h1><p class="sub">Partidos públicos que necesitan jugadores</p><div class="row" style="margin-bottom:14px"><button class="btn" data-a="newMatch">+ Crear partido</button><select id="fm" style="width:auto"><option value="">Todas las modalidades</option>'+['Fútbol 5','Fútbol 7','Fútbol 8','Fútbol 11'].map(m=>`<option>${m}</option>`).join('')+'</select><input id="fq" placeholder="Buscar..." style="width:180px"></div><div class="grid" id="mlist"></div>';
 setTimeout(()=>{const f=()=>{const q=$('#fq').value.toLowerCase(),m=$('#fm').value;const r=DB.get('matches',[]).filter(x=>(!m||x.modo===m)&&(x.nombre+x.cancha).toLowerCase().includes(q));$('#mlist').innerHTML=r.length?r.map(matchCard).join(''):empty('Sin resultados.')};$('#fq').oninput=f;$('#fm').onchange=f;f()});
 return h},
players(){const ps=DB.get('players',[]);
 return '<h1>Jugadores</h1><p class="sub">Cada posición tiene sus propias estadísticas</p><button class="btn" data-a="newPlayer" style="margin-bottom:14px">+ Registrar jugador</button><div class="grid">'+(ps.length?ps.map(p=>`<div class="card"><div class="lbl">#${p.num} · ${p.pos}</div><h3 style="margin:4px 0">${esc(p.nombre)}</h3><div class="lbl">${esc(p.equipo||'Sin equipo')}</div><div class="row" style="margin-top:12px"><button class="btn s" data-a="profile" data-id="${p.id}">Ver perfil</button><button class="btn s g" data-a="delPlayer" data-id="${p.id}">Eliminar</button></div></div>`).join(''):empty('Aún no hay jugadores.'))+'</div>'},
notifs(){const ns=DB.get('notifs',[]);DB.set('notifs',ns.map(n=>({...n,leida:true})));setTimeout(badge);
 return '<h1>Notificaciones</h1><p class="sub">Tu actividad reciente</p>'+(ns.length?ns.map(n=>`<div class="card ${n.leida?'':'unread'}" style="margin-bottom:8px">${esc(n.t)}<div class="lbl">${new Date(n.f).toLocaleString('es')}</div></div>`).join(''):empty('Sin notificaciones.'))}
};
function matchCard(m){const pend=m.reqs.filter(r=>r.estado==='pendiente');
 return `<div class="card"><span class="badge">${m.modo}</span><span class="badge">${m.nivel}</span><h3 style="margin:6px 0">${esc(m.nombre)}</h3><div class="lbl">${fdate(m.fecha)} · ${m.hora} · ${esc(m.cancha)}</div>
 <div style="margin-top:10px;font-weight:700">${m.conf} / ${m.max} jugadores</div><div class="bar"><i style="width:${pct(m.conf,m.max)}%"></i></div>
 ${m.faltan.length?'<div class="lbl">Faltan:</div>'+m.faltan.map(f=>`<span class="badge">${f}</span>`).join(''):'<span class="badge">Completo</span>'}
 <div class="lbl" style="margin:6px 0">$${(+m.precio).toLocaleString('es')}</div>
 <div class="row"><button class="btn s" data-a="join" data-id="${m.id}" ${m.conf>=m.max?'disabled':''}>QUIERO JUGAR</button>${pend.length?`<button class="btn s g" data-a="reqs" data-id="${m.id}">Solicitudes (${pend.length})</button>`:''}<button class="btn s g" data-a="delMatch" data-id="${m.id}">✕</button></div></div>`}
// ---------- acciones ----------
const A={
go(e){show(e.dataset.v)},
newMatch(){openM(`<h2 style="margin-top:0">Crear partido</h2><form id="f"><label>Nombre</label><input name="nombre" required>
 <div class="f2"><div><label>Modalidad</label><select name="modo">${['Fútbol 5','Fútbol 7','Fútbol 8','Fútbol 11','Personalizado'].map(x=>`<option>${x}</option>`).join('')}</select></div><div><label>Nivel</label><select name="nivel"><option>Casual</option><option>Intermedio</option><option>Avanzado</option></select></div>
 <div><label>Fecha</label><input type="date" name="fecha" required></div><div><label>Hora</label><input type="time" name="hora" required></div>
 <div><label>Cancha</label><input name="cancha" required></div><div><label>Nº de jugadores</label><input type="number" name="max" min="2" value="10" required></div>
 <div><label>Precio aprox.</label><input type="number" name="precio" min="0" value="0"></div><div><label>Visibilidad</label><select name="publico"><option value="1">Público</option><option value="">Privado</option></select></div></div>
 <label>Posiciones que faltan</label><select name="faltan" multiple size="4">${['Portero','Defensa','Lateral','Mediocampista','Extremo','Delantero','Libre'].map(x=>`<option>${x}</option>`).join('')}</select>
 <div class="row" style="margin-top:14px"><button class="btn">Crear</button><button type="button" class="btn g" onclick="dlg.close()">Cancelar</button></div></form>`);
 $('#f').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);
  DB.add('matches',{id:uid(),nombre:f.get('nombre'),modo:f.get('modo'),fecha:f.get('fecha'),hora:f.get('hora'),cancha:f.get('cancha'),max:+f.get('max'),precio:+f.get('precio'),nivel:f.get('nivel'),publico:!!f.get('publico'),desc:'',conf:1,faltan:f.getAll('faltan'),reqs:[]});
  notify('Creaste el partido "'+f.get('nombre')+'".');dlg.close();toast('Partido creado');show('matches')}},
join(e){const m=DB.get('matches').find(x=>x.id===e.dataset.id);
 openM(`<h2 style="margin-top:0">Solicitar entrar a ${esc(m.nombre)}</h2><form id="f"><label>Tu posición</label><select name="pos">${Object.keys(POS).map(x=>`<option>${x}</option>`).join('')}</select><label>Comentario (opcional)</label><textarea name="c"></textarea>
 <label><input type="checkbox" name="ok" required style="width:auto"> Confirmo mi disponibilidad</label><div class="row" style="margin-top:14px"><button class="btn">Enviar solicitud</button><button type="button" class="btn g" onclick="dlg.close()">Cancelar</button></div></form>`);
 $('#f').onsubmit=ev=>{ev.preventDefault();const f=new FormData(ev.target);
  DB.upd('matches',m.id,o=>o.reqs.push({id:uid(),pos:f.get('pos'),c:f.get('c'),estado:'pendiente'}));
  notify('Enviaste tu solicitud a "'+m.nombre+'".');dlg.close();toast('Solicitud enviada');show(cur)}},
reqs(e){const m=DB.get('matches').find(x=>x.id===e.dataset.id);
 openM(`<h2 style="margin-top:0">Solicitudes · ${esc(m.nombre)}</h2>`+m.reqs.filter(r=>r.estado==='pendiente').map(r=>`<div class="card" style="margin-bottom:8px"><b>${r.pos}</b><div class="lbl">${esc(r.c||'Sin comentario')}</div><div class="row" style="margin-top:8px"><button class="btn s" data-a="resp" data-m="${m.id}" data-id="${r.id}" data-ok="1">Aceptar</button><button class="btn s r" data-a="resp" data-m="${m.id}" data-id="${r.id}">Rechazar</button></div></div>`).join('')||empty('Sin solicitudes.'))},
resp(e){const ok=!!e.dataset.ok;DB.upd('matches',e.dataset.m,m=>{const r=m.reqs.find(x=>x.id===e.dataset.id);r.estado=ok?'aceptada':'rechazada';if(ok){m.conf=Math.min(m.max,m.conf+1);const i=m.faltan.indexOf(r.pos);if(i>-1)m.faltan.splice(i,1);else{const j=m.faltan.indexOf('Libre');if(j>-1)m.faltan.splice(j,1)}}});
 notify(ok?'Fuiste aceptado en el partido.':'Tu solicitud fue rechazada.');dlg.close();toast(ok?'Jugador aceptado':'Solicitud rechazada');show(cur)},
delMatch(e){DB.del('matches',e.dataset.id);toast('Partido eliminado');show(cur)},
delPlayer(e){DB.del('players',e.dataset.id);toast('Jugador eliminado');show('players')},
newPlayer(){openM(`<h2 style="margin-top:0">Registrar jugador</h2><form id="f"><div class="f2"><div><label>Nombre</label><input name="nombre" required></div><div><label>Apodo</label><input name="apodo"></div>
 <div><label>Número</label><input type="number" name="num" min="1" max="99" required></div><div><label>Equipo</label><input name="equipo"></div>
 <div><label>Posición</label><select name="pos" id="pp">${Object.keys(POS).map(x=>`<option>${x}</option>`).join('')}</select></div><div><label>Pie dominante</label><select name="pie"><option>Derecho</option><option>Izquierdo</option><option>Ambos</option></select></div></div>
 <label>Nivel</label><select name="nivel"><option>Casual</option><option>Intermedio</option><option>Avanzado</option></select>
 <h2>Estadísticas iniciales</h2><div class="f2" id="sf"></div><div class="row" style="margin-top:14px"><button class="btn">Guardar</button><button type="button" class="btn g" onclick="dlg.close()">Cancelar</button></div></form>`);
 const draw=()=>{$('#sf').innerHTML=[...GEN.slice(0,7),...POS[$('#pp').value]].map(k=>`<div><label>${nm(k)}</label><input type="number" min="0" name="s_${k}" value="0"></div>`).join('')};
 $('#pp').onchange=draw;draw();
 $('#f').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),pos=f.get('pos'),st={};[...GEN,...POS[pos]].forEach(k=>st[k]=+f.get('s_'+k)||0);
  const p={id:uid(),nombre:f.get('nombre'),apodo:f.get('apodo'),num:+f.get('num'),pos,equipo:f.get('equipo'),pie:f.get('pie'),nivel:f.get('nivel'),stats:st};DB.add('players',p);if(!DB.get('me'))DB.set('me',p.id);
  notify('Registraste a '+p.nombre+' ('+pos+').');dlg.close();toast('Jugador registrado');show('players')}},
profile(e){const p=DB.get('players').find(x=>x.id===e.dataset.id),s=p.stats,mx=Math.max(1,...Object.values(s));
 openM(`<div class="pcard"><div class="n">${p.num}</div><h2 style="margin:0;color:var(--tx)">${esc(p.nombre)}${p.apodo?' "'+esc(p.apodo)+'"':''}</h2><div class="lbl">${p.pos} · ${esc(p.equipo||'Sin equipo')} · Pie ${p.pie}</div>
 <div class="grid" style="margin-top:14px;grid-template-columns:repeat(4,1fr)">${[['Partidos',s.partidos],['Goles',s.goles],['Asist.',s.asistencias],['MVP',s.mvp]].map(x=>`<div><div class="stat" style="font-size:22px">${x[1]}</div><div class="lbl">${x[0]}</div></div>`).join('')}</div></div>
 <h2>Destacadas · ${p.pos}</h2>${derived(p).map(d=>`<div class="lbl">${d[0]}: <b style="color:var(--tx)">${d[1]}${String(d[0]).startsWith('%')?'%':''}</b></div><div class="bar"><i data-w="${d[2]?pct(d[1],d[2]):Math.min(100,+d[1]||0)}"></i></div>`).join('')}
 <h2>Estadísticas de posición</h2>${POS[p.pos].map(k=>`<div class="lbl">${nm(k)} · ${s[k]}</div><div class="bar"><i data-w="${pct(s[k],mx)}"></i></div>`).join('')}
 <button class="btn g" onclick="dlg.close()">Cerrar</button>`);
 setTimeout(()=>dlg.querySelectorAll('.bar i[data-w]').forEach(i=>i.style.width=i.dataset.w+'%'),60)}
};
document.addEventListener('click',e=>{const t=e.target.closest('[data-a]');if(t&&A[t.dataset.a])A[t.dataset.a](t)});
function show(v){cur=v;document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.s===v));$('#main').innerHTML='<section>'+V[v]()+'</section>';badge();
 document.querySelectorAll('#main .bar i').forEach(i=>{const w=i.style.width;i.style.width='0';setTimeout(()=>i.style.width=w,60)})}
$('#nav').onclick=e=>{if(e.target.dataset.s)show(e.target.dataset.s)};
seed();show('dash');