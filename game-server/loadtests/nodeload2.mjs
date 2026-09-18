import { io } from 'socket.io-client';
const GW = process.env.GW || 'http://192.168.50.96:30080';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const p = (a,q) => a.length ? a.sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor(a.length*q))] : 0;

async function tok(n){ const r=await fetch(GW+'/api/auth/guest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:n})}); return (await r.json()).token; }
async function mkRoom(name, mode='SQUAD', maxTanks=6, t=300){
  const r=await fetch(GW+'/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,mode,maxTanks,roundTimeSeconds:t})});
  return (await r.json()).roomId; }
async function delRoom(id){ await fetch(GW+`/api/admin/rooms/${id}`,{method:'DELETE'}); }

// ─────────────────────────────────────────────────────────────
// TEST A: lobby fan-out amplification while 60 students join
// ─────────────────────────────────────────────────────────────
async function testLobbyFanout(N=60){
  console.log(`\n########## A. LOBBY FAN-OUT with ${N} players joining ##########`);
  const roomId = await mkRoom(`FANOUT-${N}`);
  const cs=[];
  for(let i=0;i<N;i++){
    const t=await tok(`fo-${i}`);
    const s=io(GW,{auth:{token:t},transports:['websocket'],reconnection:false});
    const c={s,i,lobbyBytes:0,roomStates:0,startAt:0,joinedAt:0,ticks:0};
    s.on('room_state', d=>{ c.roomStates++; c.lobbyBytes += JSON.stringify(d).length; });
    s.on('room_list', d=>{ c.lobbyBytes += JSON.stringify(d).length; });
    s.on('game_start', ()=>{ c.startAt = Date.now(); });
    s.on('game_tick', ()=>{ c.ticks++; });
    s.on('connect', ()=>{ c.joinedAt=Date.now(); s.emit('join_room',{roomId,role: i<6?'DRIVER':'SUPPORT',teamId:`team-${(i%6)+1}`}); });
    cs.push(c);
    await sleep(60);              // students tap "join" ~16/s
  }
  await sleep(3000);
  const totalLobby = cs.reduce((a,c)=>a+c.lobbyBytes,0);
  console.log(`  room_state msgs per client : ${Math.round(cs.reduce((a,c)=>a+c.roomStates,0)/N)} (avg)`);
  console.log(`  lobby traffic per client   : ${(cs.reduce((a,c)=>a+c.lobbyBytes,0)/N/1024).toFixed(0)} KB`);
  console.log(`  TOTAL lobby traffic        : ${(totalLobby/1024/1024).toFixed(1)} MB just to fill the lobby (O(n^2) fan-out)`);

  // now everyone taps "ready"/select_tank at once, like a class told to pick a tank
  const t0=Date.now();
  for(const c of cs) c.s.emit('select_tank',{archetype:'STANDARD',color:'#ef4444',role:c.i<6?'DRIVER':'SUPPORT',teamId:`team-${(c.i%6)+1}`});
  await sleep(4000);
  const burst = cs.reduce((a,c)=>a+c.lobbyBytes,0) - totalLobby;
  console.log(`  simultaneous select_tank    : +${(burst/1024/1024).toFixed(1)} MB in ${((Date.now()-t0)/1000).toFixed(1)}s`);

  const tStart=Date.now();
  cs[0].s.emit('start_game');
  await sleep(12000);
  const got = cs.filter(c=>c.startAt);
  const delays = got.map(c=>c.startAt-tStart);
  console.log(`  game_start delivered        : ${got.length}/${N} clients`);
  console.log(`  game_start delay            : p50=${p(delays,0.5)}ms p95=${p(delays,0.95)}ms max=${Math.max(...delays,0)}ms`);
  console.log(`  clients receiving ticks     : ${cs.filter(c=>c.ticks>10).length}/${N}`);
  for(const c of cs) c.s.close();
  await sleep(500); await delRoom(roomId);
}

// ─────────────────────────────────────────────────────────────
// TEST B: what happens when a phone loses wifi and reconnects
// ─────────────────────────────────────────────────────────────
async function testReconnect(){
  console.log(`\n########## B. WIFI DROP / RECONNECT (same player, new socket) ##########`);
  const roomId = await mkRoom('RECONNECT','SQUAD',2,300);
  const t1=await tok('DriverBob'), t2=await tok('SupportAnn');
  const d=io(GW,{auth:{token:t1},transports:['websocket'],reconnection:false});
  const s=io(GW,{auth:{token:t2},transports:['websocket'],reconnection:false});
  let snap=null, players=[];
  d.on('game_tick', x=>snap=x);
  d.on('room_state', x=>players=x.players);
  await sleep(700);
  d.emit('join_room',{roomId,role:'DRIVER',teamId:'team-1'});
  s.emit('join_room',{roomId,role:'SUPPORT',teamId:'team-1'});
  await sleep(1200);
  d.emit('start_game');
  await sleep(2000);
  const tanksBefore = snap?.tanks?.length ?? 0;
  console.log(`  in-game: tanks=${tanksBefore} players=${players.length}`);

  // simulate wifi loss of the DRIVER
  d.close();
  await sleep(2500);
  const t1b = t1;                       // same auth token, same human
  const d2=io(GW,{auth:{token:t1b},transports:['websocket'],reconnection:false});
  let snap2=null, players2=[], gotStart=false, gotTicks=0;
  d2.on('game_tick', x=>{snap2=x; gotTicks++;});
  d2.on('room_state', x=>players2=x.players);
  d2.on('game_start', ()=>gotStart=true);
  await sleep(700);
  d2.emit('join_room',{roomId,role:'DRIVER',teamId:'team-1'});
  await sleep(2500);
  console.log(`  after reconnect: tanks on map=${snap2?.tanks?.length ?? 0} (was ${tanksBefore})`);
  console.log(`  driver's tank still exists? ${(snap2?.tanks||[]).some(t=>t.teamId==='team-1') ? 'YES' : 'NO — team has no tank for the rest of the match'}`);
  console.log(`  reconnected player gets game_start? ${gotStart}  (needs it to see the arena; ticks=${gotTicks})`);
  console.log(`  players in room now: ${players2.map(x=>x.name+':'+x.role).join(', ')}`);
  const st = await (await fetch(GW+'/api/admin/rooms')).json();
  const room = st.rooms.find(r=>r.id===roomId);
  console.log(`  room state=${room?.state} playerCount=${room?.playerCount}`);
  d2.close(); s.close(); await sleep(400); await delRoom(roomId);
}

// ─────────────────────────────────────────────────────────────
// TEST C: several classrooms at once (4 rooms x 15 players)
// ─────────────────────────────────────────────────────────────
async function testMultiRoom(rooms=4, per=15, secs=20){
  console.log(`\n########## C. ${rooms} SIMULTANEOUS MATCHES x ${per} players ##########`);
  const ids=[]; const cs=[];
  for(let r=0;r<rooms;r++) ids.push(await mkRoom(`MULTI-${r}`));
  for(let r=0;r<rooms;r++){
    for(let i=0;i<per;i++){
      const t=await tok(`m${r}-${i}`);
      const s=io(GW,{auth:{token:t},transports:['websocket'],reconnection:false});
      const c={s,room:r,ticks:0,gaps:[],last:0,bytes:0,sampled:0,started:false,sid:null,snap:null};
      s.on('connect',()=>{c.sid=s.id; s.emit('join_room',{roomId:ids[r],role:i<6?'DRIVER':'SUPPORT',teamId:`team-${(i%6)+1}`});});
      s.on('game_start',()=>c.started=true);
      s.on('game_tick',x=>{const n=Date.now(); if(c.last)c.gaps.push(n-c.last); c.last=n; c.ticks++; c.snap=x; if(c.ticks%10===0){c.bytes+=JSON.stringify(x).length;c.sampled++;}});
      cs.push(c);
      await sleep(40);
    }
  }
  await sleep(2500);
  for(let r=0;r<rooms;r++) cs.find(c=>c.room===r).s.emit('start_game');
  await sleep(3000);
  console.log(`  matches started: ${new Set(cs.filter(c=>c.started).map(c=>c.room)).size}/${rooms}, clients in-game ${cs.filter(c=>c.started).length}/${cs.length}`);
  for(const c of cs){c.ticks=0;c.gaps=[];c.bytes=0;c.sampled=0;c.last=0;}
  const t0=Date.now(); await sleep(secs*1000); const wall=(Date.now()-t0)/1000;
  const hz=cs.filter(c=>c.s.connected).map(c=>c.ticks/wall);
  const gaps=cs.flatMap(c=>c.gaps);
  const avgSnap=cs.reduce((a,c)=>a+(c.sampled?c.bytes/c.sampled:0),0)/cs.length;
  console.log(`  tick Hz: min=${Math.min(...hz).toFixed(1)} p50=${p(hz,0.5).toFixed(1)} avg=${(hz.reduce((a,b)=>a+b,0)/hz.length).toFixed(1)}`);
  console.log(`  gaps: p95=${p(gaps,0.95)}ms p99=${p(gaps,0.99)}ms max=${Math.max(...gaps)}ms  (>500ms: ${gaps.filter(g=>g>500).length})`);
  console.log(`  egress: ${(avgSnap*30*cs.length/1024/1024).toFixed(1)} MB/s across ${rooms} concurrent 30Hz loops`);
  const st=await (await fetch(GW+'/api/admin/stats')).json();
  console.log('  server:', JSON.stringify(st.stats));
  for(const c of cs) c.s.close();
  await sleep(800);
  for(const id of ids) await delRoom(id);
}

const which = process.env.WHICH || 'ABC';
if (which.includes('A')) await testLobbyFanout(parseInt(process.env.N||'60',10));
if (which.includes('B')) await testReconnect();
if (which.includes('C')) await testMultiRoom(4,15,20);
process.exit(0);
