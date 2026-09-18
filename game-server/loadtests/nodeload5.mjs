import { io } from 'socket.io-client';
const GW = process.env.GW || 'http://192.168.50.96:30080';
const sleep = ms => new Promise(r=>setTimeout(r,ms));
async function tok(n){const r=await fetch(GW+'/api/auth/guest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:n})});return (await r.json()).token;}
async function mkRoom(name,mode,maxTanks,t){const r=await fetch(GW+'/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,mode,maxTanks,roundTimeSeconds:t})});return (await r.json()).roomId;}
async function delRoom(id){await fetch(GW+`/api/admin/rooms/${id}`,{method:'DELETE'});}
const QS=(await (await fetch(GW+'/api/quiz/questions')).json()).questions;
const QB=Object.fromEntries(QS.map(q=>[q.id,q]));
const MATH=QS.find(q=>q.category==='MATH');

function mkClient(t){const s=io(GW,{auth:{token:t},transports:['websocket'],reconnection:false});
  const c={s,snap:null,sid:null,popups:[],results:[],events:[],errors:[]};
  s.on('connect',()=>c.sid=s.id); s.on('game_tick',d=>c.snap=d);
  s.on('quiz_popup',d=>c.popups.push(d)); s.on('quiz_result',d=>c.results.push(d));
  s.on('game_event',d=>c.events.push(d)); s.on('error_message',m=>c.errors.push(m));
  return c;}
const wc=c=>new Promise(r=>{if(c.s.connected)return r(); c.s.on('connect',()=>r());});
const me=c=>(c.snap?.tanks||[]).find(t=>t.id===c.sid);

console.log('########## H. FFA QUIZ TIMING + AMMO/SHELLS BOOKKEEPING ##########');
const roomId=await mkRoom('FFA-DETAIL','FFA',2,300);
const a=mkClient(await tok('Detail')); await wc(a);
a.s.emit('join_room',{roomId}); await sleep(600);
a.s.emit('start_game'); await sleep(1800);
console.log(`  tank: hp=${me(a)?.hp} ammo=${me(a)?.ammo} max=${me(a)?.maxAmmo} shells=${me(a)?.shells?.length}`);

// 1. immediate unsolicited answer (no crate at all)
const b0=me(a)?.ammo;
a.s.emit('answer_quiz',{tankId:a.sid,crateId:'nope',questionId:MATH.id,selectedIndex:MATH.correctIndex,confident:true});
await sleep(1000);
console.log(`  unsolicited correct answer: ammo ${b0} -> ${me(a)?.ammo}, result=${JSON.stringify(a.results.slice(-1))}`);

// 2. spam past the cap to see shells vs ammo drift
for(let i=0;i<6;i++){ a.s.emit('answer_quiz',{tankId:a.sid,crateId:'nope',questionId:MATH.id,selectedIndex:MATH.correctIndex,confident:true}); await sleep(200);}
await sleep(1000);
let t=me(a);
console.log(`  after 6 more grants: ammo=${t.ammo}/${t.maxAmmo}  shells=${t.shells?.length}  <-- shells array is NOT capped`);
console.log(`  shell kinds (LIFO order, last fires first): ${(t.shells||[]).map(s=>s.kind).join(',')}`);

// 3. fire everything and watch the counters
let fired=0;
for(let i=0;i<12;i++){ a.s.emit('tank_shoot'); fired++; await sleep(120);}
await sleep(800);
t=me(a);
console.log(`  after ${fired} shots: ammo=${t.ammo} shells=${t.shells?.length} (orphan shells left behind: ${t.shells?.length})`);
const noAmmo=a.events.filter(e=>e.sound==='NO_AMMO').length;
console.log(`  NO_AMMO events=${noAmmo}, shots that actually spawned bullets are limited by ammo counter only`);

// 4. rate of fire
t=me(a);
if(t.ammo===0){ a.s.emit('answer_quiz',{tankId:a.sid,crateId:'x',questionId:MATH.id,selectedIndex:MATH.correctIndex,confident:false}); await sleep(800);}
const before=me(a)?.ammo, t0=Date.now();
for(let i=0;i<10;i++) a.s.emit('tank_shoot');
await sleep(600);
console.log(`  10 instant shoot spams: ammo ${before} -> ${me(a)?.ammo} in ${Date.now()-t0}ms (no fire cooldown server-side)`);

// 5. real crate + late answer
const stopBot=(()=>{let stop=false;(async()=>{
  const end=Date.now()+45000; let last=null,stuck=0,forced=null,funtil=0;
  while(Date.now()<end&&!stop){ const m=me(a); const cr=(a.snap?.crates||[]).filter(x=>x.isActive);
    if(!m||!cr.length){await sleep(80);continue;}
    const cx=m.x+14,cy=m.y+14;
    const tg=cr.reduce((p,q)=>(Math.abs(p.x-cx)+Math.abs(p.y-cy)<=Math.abs(q.x-cx)+Math.abs(q.y-cy)?p:q));
    const dx=tg.x+12-cx,dy=tg.y+12-cy,pos=`${Math.round(m.x)},${Math.round(m.y)}`;
    if(pos===last)stuck++;else stuck=0; last=pos;
    const now=Date.now(); if(stuck>3&&now>funtil){forced=['UP','DOWN','LEFT','RIGHT'][Math.floor(Math.random()*4)];funtil=now+600;}
    a.s.emit('tank_input',{direction:(forced&&now<funtil)?forced:(Math.abs(dx)>Math.abs(dy)?(dx>0?'RIGHT':'LEFT'):(dy>0?'DOWN':'UP')),isMoving:true});
    await sleep(100);}
  a.s.emit('tank_input',{direction:null,isMoving:false});})();return ()=>stop=true;})();
const p0=a.popups.length; const tw=Date.now(); let q=null;
while(Date.now()-tw<45000){ if(a.popups.length>p0){q=a.popups[a.popups.length-1];break;} await sleep(150);}
stopBot();
if(!q){ console.log('  (no crate reached in 45s)'); }
else {
  const qq=QB[q.question.id]||q.question;
  console.log(`  crate quiz: ${q.question.id} limit=${q.question.timeLimitSeconds}s crateId=${q.crateId}`);
  const r0=a.results.length, am0=me(a)?.ammo;
  await sleep(20000);
  a.s.emit('answer_quiz',{tankId:q.tankId,crateId:q.crateId,questionId:q.question.id,selectedIndex:qq.correctIndex,confident:false});
  await sleep(1500);
  console.log(`  answered 20s AFTER the ${q.question.timeLimitSeconds}s limit: newResults=${a.results.length-r0} ammo ${am0} -> ${me(a)?.ammo}`);
  console.log(`  result=${JSON.stringify(a.results.slice(-1))}`);
}
a.s.close(); await sleep(300); await delRoom(roomId);
process.exit(0);
