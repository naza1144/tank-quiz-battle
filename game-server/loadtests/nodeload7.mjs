/**
 * nodeload7 — เน็ตหลุดกลางแมตช์แล้วต่อกลับด้วย "ตัวตนเดิม" ต้องได้รถถังคันเดิมคืน
 *
 * ต่างจาก nodeload3 ตรงที่ตัวนี้ใช้ token เดิมตอนต่อกลับ (เหมือน client จริงที่เก็บ
 * token ไว้ใน localStorage) แทนที่จะขอ token ใหม่ซึ่งกลายเป็นคนละคน
 *
 * ใช้: GW=http://192.168.50.96:30080 node loadtests/nodeload7.mjs
 */
import { io } from 'socket.io-client';

const GW = process.env.GW || 'http://localhost:4000';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function guestToken(name) {
  const res = await fetch(`${GW}/api/auth/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  return (await res.json()).token;
}

async function mkRoom(name, mode, maxTanks, roundTimeSeconds) {
  const res = await fetch(`${GW}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mode, maxTanks, roundTimeSeconds })
  });
  return (await res.json()).roomId;
}

function mkClient(token) {
  const s = io(GW, { auth: { token }, transports: ['websocket'], reconnection: false });
  const c = { s, snap: null, ticks: 0, players: [], started: false, reclaimed: null, errors: [] };
  s.on('room_state', (d) => { c.players = d.players; });
  s.on('game_start', () => { c.started = true; });
  s.on('game_tick', (d) => { c.snap = d; c.ticks++; });
  s.on('reclaimed', (d) => { c.reclaimed = d; });
  s.on('error_message', (m) => { c.errors.push(m); });
  c.seen = {};
  s.onAny((ev) => { c.seen[ev] = (c.seen[ev] || 0) + 1; });
  s.on('disconnect', (reason) => { c.disconnectedBecause = reason; });
  return c;
}

const waitConnect = (c) => new Promise((resolve) => {
  if (c.s.connected) return resolve();
  c.s.on('connect', resolve);
});

let failures = 0;
const check = (label, ok, detail) => {
  console.log(`  ${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

async function main() {
  console.log('########## RECLAIM: ต่อกลับด้วย token เดิมภายใน 60 วินาที ##########');

  const roomId = await mkRoom('RECLAIM-SAME-TOKEN', 'SQUAD', 2, 300);
  const driverToken = await guestToken('DriverBob');
  const supportToken = await guestToken('SupportAnn');

  const driver = mkClient(driverToken);
  await waitConnect(driver);
  driver.s.emit('join_room', { roomId, role: 'DRIVER', teamId: 'team-1' });
  await sleep(600);

  const support = mkClient(supportToken);
  await waitConnect(support);
  support.s.emit('join_room', { roomId, role: 'SUPPORT', teamId: 'team-1' });
  await sleep(600);

  driver.s.emit('start_game');
  await sleep(2000);

  const tankBefore = driver.snap?.tanks?.[0];
  check('แมตช์เริ่มและมีรถถังของทีม', !!tankBefore, `tankId=${tankBefore?.id} hp=${tankBefore?.hp}`);

  driver.s.close(); // เน็ตหลุด
  await sleep(3000);

  const tanksWhileAway = support.snap?.tanks?.length ?? 0;
  check('รถถังยังอยู่บนแผนที่ระหว่างรอเจ้าของกลับ', tanksWhileAway === 1, `tanks=${tanksWhileAway}`);

  // ต่อกลับด้วย token เดิม
  const back = mkClient(driverToken);
  await waitConnect(back);
  back.s.emit('join_room', { roomId });
  await sleep(2000);

  check('ได้ event reclaimed', !!back.reclaimed, JSON.stringify(back.reclaimed));
  check('ได้รถถังคันเดิมคืน', back.reclaimed?.tankRestored === true);
  check('ได้ role เดิม (DRIVER)', back.reclaimed?.role === 'DRIVER', `role=${back.reclaimed?.role}`);
  check('ได้ game_start ย้อนหลัง', back.started === true);
  check('รับ snapshot ต่อเนื่อง', back.ticks > 10,
    `ticks=${back.ticks} (ฝ่ายสนับสนุนได้ ${support.ticks}) events=${JSON.stringify(back.seen)} disconnect=${back.disconnectedBecause}`);

  const myTank = back.snap?.tanks?.find((t) => t.id === back.s.id);
  check('รถถังผูกกับ socket ใหม่แล้ว', !!myTank, `hp=${myTank?.hp}`);

  back.s.close();
  support.s.close();
  await fetch(`${GW}/api/admin/rooms/${roomId}`, { method: 'DELETE' });

  console.log(`\n===== ${failures === 0 ? 'ALL PASS' : `${failures} FAILED`} =====`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('ERROR', err);
  process.exit(1);
});
