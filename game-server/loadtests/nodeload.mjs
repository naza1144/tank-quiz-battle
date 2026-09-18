import { io } from 'socket.io-client';

const GW = process.env.GW || 'http://192.168.50.96:30080';
const N = parseInt(process.env.N || '60', 10);
const SECONDS = parseInt(process.env.SECS || '20', 10);
const TEAMS = 6;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function guestToken(name) {
  const r = await fetch(GW + '/api/auth/guest', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  return (await r.json()).token;
}

async function main() {
  const rr = await fetch(GW + '/api/rooms', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `NODELOAD-${N}`, mode: 'SQUAD', maxTanks: 6, roundTimeSeconds: 300 })
  });
  const roomId = (await rr.json()).roomId;
  console.log(`room=${roomId} clients=${N}`);

  const clients = [];
  for (let i = 0; i < N; i++) {
    const team = `team-${(i % TEAMS) + 1}`;
    const role = i < TEAMS ? 'DRIVER' : 'SUPPORT';
    const token = await guestToken(`nl-${i}`);
    const s = io(GW, { auth: { token }, transports: ['websocket'], reconnection: false });
    const c = { s, i, team, role, ticks: 0, bytes: 0, sampled: 0, gaps: [], last: 0,
                started: false, snap: null, connectedAt: 0, popups: 0, results: 0, sid: null };
    s.on('connect', () => { c.connectedAt = Date.now(); c.sid = s.id; s.emit('join_room', { roomId, role, teamId: team }); });
    s.on('game_start', () => { c.started = true; });
    s.on('team_quiz_popup', () => { c.popups++; });
    s.on('team_quiz_final_result', () => { c.results++; });
    s.on('game_tick', (snap) => {
      const now = Date.now();
      if (c.last) c.gaps.push(now - c.last);
      c.last = now; c.ticks++;
      c.snap = snap;
      if (c.ticks % 10 === 0) { c.bytes += JSON.stringify(snap).length; c.sampled++; }
    });
    clients.push(c);
    if (i % 10 === 9) await sleep(120);
  }
  await sleep(2500);
  console.log(`connected=${clients.filter(c => c.s.connected).length}/${N}`);

  for (const c of clients) c.s.emit('select_tank', { archetype: 'STANDARD', color: '#ef4444', role: c.role, teamId: c.team });
  await sleep(1500);

  clients[0].s.emit('start_game');
  await sleep(2500);
  console.log(`game_start received by ${clients.filter(c => c.started).length}/${N}`);

  // drivers move continuously; supporters idle (like real students)
  const drivers = clients.filter(c => c.role === 'DRIVER');
  const dirs = ['UP','DOWN','LEFT','RIGHT'];
  const mover = setInterval(() => {
    for (const d of drivers) d.s.emit('tank_input', { direction: dirs[Math.floor(Math.random()*4)], isMoving: true });
  }, 250);

  // reset counters, measure window
  for (const c of clients) { c.ticks = 0; c.gaps = []; c.bytes = 0; c.sampled = 0; c.last = 0; }
  const t0 = Date.now();
  await sleep(SECONDS * 1000);
  const wall = (Date.now() - t0) / 1000;
  clearInterval(mover);

  const live = clients.filter(c => c.s.connected);
  const hz = live.map(c => c.ticks / wall).sort((a,b)=>a-b);
  const allGaps = live.flatMap(c => c.gaps).sort((a,b)=>a-b);
  const avgSnap = live.reduce((a,c) => a + (c.sampled ? c.bytes/c.sampled : 0), 0) / Math.max(1, live.length);
  const p = (arr, q) => arr.length ? arr[Math.min(arr.length-1, Math.floor(arr.length*q))] : 0;

  console.log(`\n--- ${live.length} live clients, ${wall.toFixed(1)}s window ---`);
  console.log(`tick Hz     : min=${hz[0].toFixed(1)} p50=${p(hz,0.5).toFixed(1)} avg=${(hz.reduce((a,b)=>a+b,0)/hz.length).toFixed(1)} max=${hz[hz.length-1].toFixed(1)}  (server target 30)`);
  console.log(`frame gaps  : p50=${p(allGaps,0.5)}ms p95=${p(allGaps,0.95)}ms p99=${p(allGaps,0.99)}ms max=${allGaps[allGaps.length-1]}ms`);
  console.log(`stalls      : >150ms=${allGaps.filter(g=>g>150).length}  >500ms=${allGaps.filter(g=>g>500).length}  >1s=${allGaps.filter(g=>g>1000).length}`);
  console.log(`snapshot    : ${(avgSnap/1024).toFixed(1)} KB -> ${(avgSnap*30/1024).toFixed(0)} KB/s per client`);
  console.log(`total egress: ${(avgSnap*30*live.length/1024/1024).toFixed(1)} MB/s (${(avgSnap*30*live.length*8/1e6).toFixed(0)} Mbit/s) for ${live.length} clients`);
  console.log(`measured rx : ${(live.reduce((a,c)=>a+(c.sampled?c.bytes/c.sampled*c.ticks:0),0)/1024/1024/wall).toFixed(1)} MB/s actually delivered`);
  const noMap = live[0]?.snap ? JSON.stringify({ ...live[0].snap, map: undefined }).length : 0;
  console.log(`map share   : ${(100*(avgSnap-noMap)/avgSnap).toFixed(0)}% of every packet is the static 28x28 map`);

  // input -> state latency
  const d = drivers[0];
  const lat = [];
  for (let k = 0; k < 15; k++) {
    const tank = d.snap?.tanks?.find(t => t.id === d.sid);
    if (!tank) break;
    const before = `${tank.x},${tank.y}`;
    const t = Date.now();
    d.s.emit('tank_input', { direction: 'UP', isMoving: true });
    while (Date.now() - t < 1500) {
      const now = d.snap?.tanks?.find(t2 => t2.id === d.sid);
      if (now && `${now.x},${now.y}` !== before) { lat.push(Date.now() - t); break; }
      await sleep(2);
    }
    d.s.emit('tank_input', { direction: null, isMoving: false });
    await sleep(150);
  }
  if (lat.length) {
    lat.sort((a,b)=>a-b);
    console.log(`input->state: p50=${p(lat,0.5)}ms p95=${p(lat,0.95)}ms max=${lat[lat.length-1]}ms (n=${lat.length})`);
  }
  const st = await (await fetch(GW + '/api/admin/stats')).json();
  console.log('server stats:', JSON.stringify(st.stats));

  for (const c of clients) c.s.close();
  await sleep(1000);
  await fetch(GW + `/api/admin/rooms/${roomId}`, { method: 'DELETE' });
  console.log('room deleted, done');
  process.exit(0);
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
