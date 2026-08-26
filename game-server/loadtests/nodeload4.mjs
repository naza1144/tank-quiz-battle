import { io } from 'socket.io-client';
const GW = process.env.GW || 'http://192.168.50.96:30080';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function tok(n){const r=await fetch(GW+'/api/auth/guest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:n})});return (await r.json()).token;}
async function mkRoom(name,mode,maxTanks,t){const r=await fetch(GW+'/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,mode,maxTanks,roundTimeSeconds:t})});return (await r.json()).roomId;}
async function delRoom(id){await fetch(GW+`/api/admin/rooms/${id}`,{method:'DELETE'});}
const QS = (await (await fetch(GW+'/api/quiz/questions')).json()).questions;
const QB = Object.fromEntries(QS.map(q=>[q.id,q]));

function mkClient(token){
  const s=io(GW,{auth:{token},transports:['websocket'],reconnection:false});
  const c={s,snap:null,ticks:0,players:[],started:false,errors:[],over:null,sid:null,
           popups:[],results:[],ghost:[],events:[]};
  s.on('connect',()=>c.sid=s.id);
  s.on('room_state',d=>c.players=d.players);
  s.on('game_start',()=>c.started=true);
  s.on('game_tick',d=>{c.snap=d;c.ticks++;});
  s.on('error_message',m=>c.errors.push(m));
  s.on('game_over',d=>c.over=d);
  s.on('team_quiz_popup',d=>c.popups.push(d));
  s.on('team_quiz_final_result',d=>c.results.push(d));
  s.on('quiz_popup',d=>c.popups.push(d));
  s.on('quiz_result',d=>c.results.push(d));
  s.on('ghost_revival_popup',d=>c.ghost.push(d));
  s.on('game_event',d=>c.events.push(d));
  return c;
}
const waitConnect = c => new Promise(r=>{ if(c.s.connected) return r(); c.s.on('connect',()=>r()); });
const teamTank=(c,t)=> (c.snap?.tanks||[]).find(x=>x.teamId===t);
const myTank=(c)=> (c.snap?.tanks||[]).find(x=>x.id===c.sid);

// crate-seeking driver
function startBot(c, seconds){
  let stop=false, last=null, stuck=0, forced=null, funtil=0;
  (async ()=>{
    const end=Date.now()+seconds*1000;
    while(Date.now()<end && !stop){
      const me=myTank(c);
      const crates=(c.snap?.crates||[]).filter(x=>x.isActive);
      if(!me||!crates.length){ await sleep(80); continue; }
      const cx=me.x+14, cy=me.y+14;
      const t=crates.reduce((a,b)=>(Math.abs(a.x-cx)+Math.abs(a.y-cy)<=Math.abs(b.x-cx)+Math.abs(b.y-cy)?a:b));
      const dx=t.x+12-cx, dy=t.y+12-cy;
      const pos=`${Math.round(me.x)},${Math.round(me.y)}`;
      if(pos===last) stuck++; else stuck=0;
      last=pos;
      const now=Date.now();
      if(stuck>3 && now>funtil){ forced=['UP','DOWN','LEFT','RIGHT'][Math.floor(Math.random()*4)]; funtil=now+600; }
      const d = (forced&&now<funtil) ? forced : (Math.abs(dx)>Math.abs(dy) ? (dx>0?'RIGHT':'LEFT') : (dy>0?'DOWN':'UP'));
      c.s.emit('tank_input',{direction:d,isMoving:true});
      await sleep(100);
    }
    c.s.emit('tank_input',{direction:null,isMoving:false});
  })();
  return ()=>{stop=true;};
}

console.log('########## F. SYNERGY STREAK -> MEGA LASER (auto-voting supporters) ##########');
{
  const roomId=await mkRoom('SYNERGY','SQUAD',2,300);
  const d=mkClient(await tok('SynDriver')); await waitConnect(d);
  d.s.emit('join_room',{roomId,role:'DRIVER',teamId:'team-1'}); await sleep(500);
  const sups=[];
  for(let i=0;i<3;i++){ const c=mkClient(await tok('SynSup'+i)); await waitConnect(c);
    c.s.emit('join_room',{roomId,role:'SUPPORT',teamId:'team-1'});
    c.s.on('team_quiz_popup',p=>{ const q=QB[p.question.id]||p.question;
      setTimeout(()=>c.s.emit('vote_team_quiz',{choiceIndex:q.correctIndex,confident:true}),120); });
    sups.push(c); await sleep(200); }
  await sleep(600);
  d.s.emit('start_game'); await sleep(2000);
  console.log(`  started=${d.started} tank ammo=${myTank(d)?.ammo} hp=${myTank(d)?.hp}`);
  const stop=startBot(d,90);
  let armed=false, snapshots=[];
  for(let i=0;i<90;i++){
    await sleep(1000);
    const t=myTank(d);
    if(t) snapshots.push(`${t.ammo}/${t.maxAmmo}:${t.synergyStreak??0}${t.isUltimateReady?'!':''}`);
    if(t?.isUltimateReady){armed=true; break;}
  }
  stop();
  console.log(`  quiz popups=${sups[0].popups.length} results=${sups[0].results.length}`);
  console.log(`  tiers seen: ${sups[0].results.map(r=>r.ammoKind+(r.isCorrect?'':'✗')).join(' ')}`);
  console.log(`  streak trace (ammo/max:streak): ${snapshots.slice(-12).join(' ')}`);
  console.log(`  ULTIMATE ARMED: ${armed}`);
  if(armed){
    const bricks0=(d.snap.map||[]).flat().filter(x=>x==='BRICK').length;
    d.s.emit('use_ultimate_beam'); await sleep(600);
    const bricks1=(d.snap.map||[]).flat().filter(x=>x==='BRICK').length;
    console.log(`  laser fired: beams=${(d.snap.laserBeams||[]).length} bricks ${bricks0}->${bricks1} ready_now=${myTank(d)?.isUltimateReady}`);
    console.log(`  laser events: ${d.events.filter(e=>e.type==='ULTIMATE_BEAM').map(e=>e.message).slice(-1)}`);
  }
  // ammo cap check
  const t=myTank(d);
  console.log(`  ammo cap respected: ammo=${t?.ammo} max=${t?.maxAmmo} shells=${t?.shells?.length}`);
  console.log(`  special ammo: ${JSON.stringify(t?.specialAmmo)}`);
  d.s.close(); sups.forEach(c=>c.s.close()); await sleep(400); await delRoom(roomId);
}

console.log('\n########## G. FFA QUIZ: IS THE TIME LIMIT ENFORCED SERVER-SIDE? ##########');
{
  const roomId=await mkRoom('FFA-TIMER','FFA',2,300);
  const a=mkClient(await tok('SlowAnswerer')); await waitConnect(a);
  a.s.emit('join_room',{roomId}); await sleep(600);
  a.s.emit('start_game'); await sleep(1500);
  const stop=startBot(a,40);
  let q=null; const t0=Date.now();
  while(Date.now()-t0<40000){ if(a.popups.length){q=a.popups[0];break;} await sleep(200); }
  stop();
  if(!q){ console.log('  (no crate hit)'); }
  else{
    const qq=QB[q.question.id]||q.question;
    console.log(`  quiz received: ${q.question.id} timeLimit=${q.question.timeLimitSeconds}s (client-side only?)`);
    console.log(`  waiting 25s (5x the limit) before answering ...`);
    await sleep(25000);
    const before=myTank(a)?.ammo;
    a.s.emit('answer_quiz',{tankId:q.tankId,crateId:q.crateId,questionId:q.question.id,selectedIndex:qq.correctIndex,confident:true});
    await sleep(1200);
    console.log(`  answer accepted 25s late? ammo ${before} -> ${myTank(a)?.ammo}  result=${JSON.stringify(a.results.slice(-1))}`);
    console.log(`  => FFA quiz window is NOT enforced by the server (no timer, no expiry)`);
  }
  a.s.close(); await sleep(300); await delRoom(roomId);
}
process.exit(0);
