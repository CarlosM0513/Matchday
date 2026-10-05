// API REST de MATCHDAY: Supabase PostgREST con JWT de la sesión.
const API_BASE = 'https://owqvdjjfznrwuonatqbd.supabase.co/rest/v1';
async function api(path, method='GET', body) {
 const {data:{session}}=await window.supabaseClient.auth.getSession();
 if(!session) throw new Error('Debes iniciar sesión.');
 const res=await fetch(API_BASE+path,{method,headers:{apikey:'sb_publishable_bGeaHkAmyBDUBugPX8ZIjQ_gqoly8zZ',Authorization:'Bearer '+session.access_token,'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body)});
 const raw=await res.text(); let data; try{data=raw?JSON.parse(raw):null}catch{data=raw}
 if(!res.ok) throw new Error(data?.message||data?.hint||'Error API '+res.status);
 return data;
}
window.MatchdayAPI={
 players:()=>api('/profiles?select=*&order=created_at.asc'),
 createPlayer:p=>api('/profiles','POST',p),
 updatePlayer:(id,p)=>api('/profiles?id=eq.'+encodeURIComponent(id),'PATCH',p),
 matches:()=>api('/matches?select=*&order=fecha.asc,hora.asc'),
 createMatch:m=>api('/matches','POST',m),
 updateMatch:(id,m)=>api('/matches?id=eq.'+encodeURIComponent(id),'PATCH',m),
 deleteMatch:id=>api('/matches?id=eq.'+encodeURIComponent(id),'DELETE'),
 requests:()=>api('/match_requests?select=*'),
 createRequest:r=>api('/match_requests','POST',r),
 notifications:()=>api('/notifications?select=*&order=created_at.desc')
};
