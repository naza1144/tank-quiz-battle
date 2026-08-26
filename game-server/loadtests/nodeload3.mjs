import { io } from 'socket.io-client';
const GW = process.env.GW || 'http://192.168.50.96:30080';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function tok(n){const r=await fetch(GW+'/api/auth/guest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:n})});return (await r.json()).token;}
async function mkRoom(name,mode,maxTanks,t){const r=await fetch(GW+'/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,mode,maxTanks,roundTimeSeconds:t})});return (await r.json()).roomId;}
async function delRoom(id){await fetch(GW+`/api/admin/rooms/${id}`,{method:'DELETE'});}
async function adminRooms(){return (await (await fetch(GW+'/api/admin/rooms')).json()).rooms;}

function mkClient(token, label){
  const s = io(GW,{auth:{token},transports:['websocket'],reconnection:false});
  const c={s,label,snap:null,ticks:0,players:[],state:null,started:false,errors:[],over:null,sid:null};
  s.on('connect',()=>{c.sid=s.id;});
  s.on('room_state',d=>{c.players=d.players;c.state=d.state;});
  s.on('game_start',()=>{c.started=true;});
  s.on('game_tick',d=>{c.snap=d;c.ticks++;});
  s.on('error_message',m=>{c.errors.push(m);});
  s.on('game_over',d=>{c.over=d;});
  return c;
}
const waitConnect = c => new Promise(r=>{ if(c.s.connected) return r(); c.s.on('connect',()=>r()); });

console.log('########## B2. WIFI DROP MID-MATCH (correct sequencing) ##########');
{
  const roomId = await mkRoom('RECONNECT2','SQUAD',2,300);
  const d = mkClient(await tok('DriverBob'),'driver');
  await waitConnect(d); d.s.emit('join_room',{roomId,role:'DRIVER',teamId:'team-1'});
  await sleep(600);
  const sup = mkClient(await tok('SupportAnn'),'support');
  await waitConnect(sup); sup.s.emit('join_room',{roomId,role:'SUPPORT',teamId:'team-1'});
  await sleep(600);
  console.log(`  lobby: ${d.players.map(p=>`${p.name}(${p.role}${p.isHost?',HOST':''})`).join(' ')}`);
  d.s.emit('start_game'); await sleep(2000);
  console.log(`  started=${d.started} tanks=${d.snap?.tanks?.length} errors=${JSON.stringify(d.errors)}`);
  const tankId = d.snap?.tanks?.[0]?.id;
  console.log(`  driver tank id=${tankId} hp=${d.snap?.tanks?.[0]?.hp}`);

  d.s.close();                       // <-- wifi drops
  await sleep(3000);
  console.log(`  [after driver drops] tanks on map = ${sup.snap?.tanks?.length}  (support still receiving ticks: ${sup.ticks>10})`);
  let rooms = await adminRooms(); let R = rooms.find(r=>r.id===roomId);
  console.log(`  room state=${R.state} players=${R.playerCount} engineAlive=${R.hasActiveEngine}`);
  console.log(`  match ended? game_over=${!!sup.over}  <-- squad with zero tanks left`);

  const d2 = mkClient(await tok('DriverBob'),'driver-reconnect');   // same human, new socket
  await waitConnect(d2); d2.s.emit('join_room',{roomId,role:'DRIVER',teamId:'team-1'});
  await sleep(2500);
  console.log(`  [reconnected] got game_start=${d2.started} ticks=${d2.ticks} tanks=${d2.snap?.tanks?.length}`);
  console.log(`  players now: ${d2.players.map(p=>p.name+':'+p.role).join(', ')}`);
  console.log(`  => driver is back in the room but has NO tank and NO game view for the rest of the match`);
  d2.s.close(); sup.s.close(); await sleep(300); await delRoom(roomId);
}

console.log('\n########## D. FFA: LAST PLAYER ALONE ##########');
{
  const roomId = await mkRoom('FFA-ALONE','FFA',4,300);
  const a = mkClient(await tok('Alpha'),'a'); await waitConnect(a); a.s.emit('join_room',{roomId});
  await sleep(400);
  const b = mkClient(await tok('Bravo'),'b'); await waitConnect(b); b.s.emit('join_room',{roomId});
  await sleep(600);
  a.s.emit('start_game'); await sleep(2000);
  console.log(`  started tanks=${a.snap?.tanks?.length}`);
  b.s.close(); await sleep(3000);
  console.log(`  opponent left -> tanks=${a.snap?.tanks?.length} game_over=${!!a.over}`);
  console.log(`  => expected "last survivor wins", actual: match keeps running (must wait ${300}s timer)`);
  a.s.close(); await sleep(300); await delRoom(roomId);
}

console.log('\n########## E. ORPHAN GAME LOOPS (everyone leaves) ##########');
{
  const ids=[];
  for(let i=0;i<3;i++){
    const roomId = await mkRoom(`ORPHAN-${i}`,'FFA',2,600); ids.push(roomId);
    const a = mkClient(await tok(`orph${i}`),'a'); await waitConnect(a);
    a.s.emit('join_room',{roomId}); await sleep(500);
    a.s.emit('start_game'); await sleep(1200);
    a.s.close(); await sleep(200);
  }
  await sleep(3000);
  const rooms = await adminRooms();
  const mine = rooms.filter(r=>ids.includes(r.id));
  console.log('  ' + mine.map(r=>`${r.id}: state=${r.state} players=${r.playerCount} engine=${r.hasActiveEngine}`).join('\n  '));
  const st = await (await fetch(GW+'/api/admin/stats')).json();
  console.log('  server:', JSON.stringify(st.stats), '<- activeGames counts empty matches still ticking at 30Hz');
  for(const id of ids) await delRoom(id);
}
process.exit(0);
