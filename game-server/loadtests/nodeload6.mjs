/**
 * nodeload6 — ยิง payload ผิดรูปใส่ทุก socket event แล้วดูว่าเซิร์ฟเวอร์ยังอยู่
 *
 * เกณฑ์ผ่าน: uptimeSeconds ของ /api/admin/stats ต้องไม่รีเซ็ต หลังยิงครบทุกเคส
 * (เดิม `socket.emit('tank_input')` เปล่า ๆ ทำให้ pod ตายทั้งเครื่อง)
 *
 * ใช้: GW=http://192.168.50.96:30080 node loadtests/nodeload6.mjs
 */
import { io } from 'socket.io-client';

const GW = process.env.GW || 'http://localhost:4000';

const EVENTS = [
  'join_room', 'leave_room', 'set_ready', 'select_tank', 'start_game',
  'tank_input', 'tank_shoot', 'answer_quiz', 'team_support_answer',
  'vote_team_quiz', 'tactical_ping', 'auto_balance_teams',
  'use_ultimate_beam', 'supporter_airdrop', 'ghost_revival_answer'
];

const JUNK = [
  undefined,
  null,
  0,
  '',
  'not-an-object',
  [],
  true,
  { direction: 'SIDEWAYS', isMoving: 'yes' },
  { roomId: 12345 },
  { choiceIndex: -1 },
  { choiceIndex: 999 },
  { choiceIndex: 1.5 },
  { selectedIndex: 'a' },
  { supplyType: 'NUKE' },
  { x: NaN, y: Infinity },
  { archetype: '__proto__', color: 1, role: 'ADMIN' },
  { tankId: 'someone-else', crateId: null, questionId: {}, selectedIndex: 0 }
];

const stats = async () => {
  const res = await fetch(`${GW}/api/admin/stats`);
  const body = await res.json();
  return body.stats;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const before = await stats();
  console.log(`[baseline] uptimeSeconds=${before.uptimeSeconds} rooms=${before.totalRooms}`);

  const socket = io(GW, { transports: ['websocket'], reconnection: false });
  await new Promise((resolve, reject) => {
    socket.on('connect', resolve);
    socket.on('connect_error', reject);
    setTimeout(() => reject(new Error('connect timeout')), 10000);
  });
  console.log(`[connected] ${socket.id}`);

  let sent = 0;
  for (const event of EVENTS) {
    for (const payload of JUNK) {
      socket.emit(event, payload);
      sent++;
    }
  }
  // เข้าห้องจริงก่อน แล้วยิงซ้ำอีกรอบ เพื่อให้เดินเข้า code path ที่ลึกกว่าเดิม
  socket.emit('join_room', { roomId: 'arena-1' });
  await sleep(400);
  for (const event of EVENTS) {
    for (const payload of JUNK) {
      socket.emit(event, payload);
      sent++;
    }
  }
  await sleep(1500);
  socket.close();

  const after = await stats();
  console.log(`[after] sent=${sent} malformed payloads · uptimeSeconds=${after.uptimeSeconds}`);

  if (after.uptimeSeconds < before.uptimeSeconds) {
    console.log('❌ FAIL: เซิร์ฟเวอร์รีสตาร์ต (uptime ถอยหลัง)');
    process.exit(1);
  }
  console.log('✅ PASS: เซิร์ฟเวอร์ยังอยู่ครบ ไม่มีการรีสตาร์ต');
}

main().catch((err) => {
  console.error('ERROR', err);
  process.exit(1);
});
