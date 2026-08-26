import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { QuizManager } from './quizBank.js';
import {
  RoomManager,
  VALID_DIRECTIONS,
  VALID_ARCHETYPES,
  VALID_ROLES,
  VALID_TEAM_IDS,
  VALID_SUPPLY_TYPES
} from './roomManager.js';
import { verifyToken, signUserToken } from './auth.js';
import { handleGoogleAuthLogin, handleGoogleAuthCallback, handleGoogleDirectLogin } from './googleAuth.js';

dotenv.config();

const PORT = process.env.PORT || 4000;
const app = express();
const httpServer = createServer(app);

app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const quizManager = new QuizManager();
const roomManager = new RoomManager(io, quizManager);

// ── Payload guards ────────────────────────────────────────────────────────
// client ที่ส่ง payload เปล่า/ชนิดผิดเคยทำให้ pod ตายทั้งเครื่อง (RESTARTS 0→1)
// ทุกอย่างที่มาจาก socket ถือว่าไม่น่าเชื่อถือ ต้องผ่านตัวกรองพวกนี้ก่อนเสมอ

/** แปลงเป็นจำนวนเต็มในช่วงที่กำหนด ถ้าแปลงไม่ได้คืนค่า fallback */
function clampInt(value: any, min: number, max: number, fallback: number): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** true เมื่อเป็นจำนวนเต็มจริงในช่วง [min,max] — ไม่ใช่การ clamp */
function isIntInRange(value: any, min: number, max: number): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

/** true เมื่อเป็นตัวเลขจริง (ไม่ใช่ NaN/Infinity/string) */
function isFiniteNumber(value: any): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

function asString(value: any): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

// อยู่ต่อแม้เจอ error ที่หลุดมาถึง process — ห้ามให้ทั้งเซิร์ฟเวอร์ล่มเพราะห้องเดียว
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException] เซิร์ฟเวอร์ยังทำงานต่อ:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection] เซิร์ฟเวอร์ยังทำงานต่อ:', reason);
});

// REST API Endpoints
app.get(['/api/health', '/health'], (req, res) => {
  res.json({ status: 'ok', service: 'tank-quiz-game-server', standalone: true, timestamp: new Date().toISOString() });
});

// ── Google OAuth & Account Authentication Endpoints ──────────────────────
app.get(['/api/auth/login', '/auth/login'], handleGoogleAuthLogin);
app.get(['/api/auth/callback', '/auth/callback'], handleGoogleAuthCallback);
app.post(['/api/auth/google', '/auth/google'], handleGoogleDirectLogin);

// ── Standalone & Student Auth Endpoints ─────────────────────────────────
app.post(['/api/auth/login', '/auth/login'], (req, res) => {
  const { name, email, studentId } = req.body;
  const displayName = name || studentId || 'TankPlayer';
  const token = signUserToken({
    id: `std-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    name: displayName,
    email: email || `${displayName.toLowerCase().replace(/\s+/g, '')}@ubu.ac.th`,
    isGuest: false
  });
  res.json({ success: true, token, name: displayName });
});

app.post(['/api/auth/guest', '/auth/guest'], (req, res) => {
  const { name } = req.body;
  const displayName = name || `พลขับ_${Math.floor(1000 + Math.random() * 9000)}`;
  const token = signUserToken({
    id: `guest-${Date.now().toString(36)}`,
    name: displayName,
    email: `${displayName.toLowerCase().replace(/\s+/g, '')}@guest.local`,
    isGuest: true
  });
  res.json({ success: true, token, name: displayName });
});

app.get('/api/rooms', (req, res) => {
  res.json(roomManager.getRoomList());
});

app.post('/api/rooms', (req, res) => {
  const { name, mode, maxTanks, roundTimeSeconds, isPrivate, password, selectedSubject } = req.body;
  const roomId = roomManager.createRoom({
    id: `room-${Date.now().toString(36)}`,
    name: name || 'สนามรบรถถังใหม่',
    mode: mode || 'FFA',
    maxTanks: clampInt(maxTanks, 2, 6, 6),
    roundTimeSeconds: clampInt(roundTimeSeconds, 60, 900, 240),
    isPrivate: !!isPrivate,
    password,
    selectedSubject: selectedSubject || 'ALL'
  });
  res.json({ success: true, roomId });
});

// ══════════════════════════════════════════════════════════════════════════════
// 📚 OPEN QUIZ REST APIS (สำหรับอาจารย์/ผู้ดูแลระบบ ในการดึงและจัดการโจทย์คำถาม)
// ══════════════════════════════════════════════════════════════════════════════

// 1. ดึงรายการโจทย์คำถามทั้งหมด (รองรับ filter category, difficulty, search)
app.get(['/api/quiz/questions', '/api/quizzes'], (req, res) => {
  const { category, difficulty, search } = req.query;
  const questions = quizManager.getAllQuestions({
    category: category ? String(category) : undefined,
    difficulty: difficulty ? String(difficulty) : undefined,
    search: search ? String(search) : undefined
  });
  res.json({
    success: true,
    total: questions.length,
    questions
  });
});

// 2. ดึงหมวดหมู่และรายวิชาที่มีทั้งหมดพร้อมจำนวนข้อ
app.get('/api/quiz/categories', (req, res) => {
  const categories = quizManager.getCategories();
  res.json({
    success: true,
    categories
  });
});

// 3. ดึงโจทย์คำถามรายข้อตาม ID
app.get('/api/quiz/questions/:id', (req, res) => {
  const question = quizManager.getQuestionById(req.params.id);
  if (!question) {
    return res.status(404).json({ success: false, error: 'ไม่พบโจทย์คำถามที่ระบุ' });
  }
  res.json({ success: true, question });
});

// 4. เพิ่มโจทย์คำถามใหม่
app.post(['/api/quiz/questions', '/api/quizzes'], (req, res) => {
  const q = req.body;
  if (!q.questionTh || !Array.isArray(q.options) || q.options.length < 2) {
    return res.status(400).json({ 
      success: false, 
      error: 'กรุณาระบุคำถาม (questionTh) และตัวเลือก (options) อย่างน้อย 2 ตัวเลือก' 
    });
  }

  const correctIndex = Number(q.correctIndex);
  if (isNaN(correctIndex) || correctIndex < 0 || correctIndex >= q.options.length) {
    return res.status(400).json({ 
      success: false, 
      error: 'ตำแหน่งตัวเลือกที่ถูกต้อง (correctIndex) ไม่ถูกต้อง' 
    });
  }

  const newQuestion = quizManager.addQuestion({
    id: q.id || `quiz-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    category: q.category ? String(q.category).toUpperCase() : 'GENERAL',
    categoryTh: q.categoryTh || 'ความรู้ทั่วไป',
    questionTh: q.questionTh.trim(),
    questionEn: q.questionEn?.trim(),
    options: q.options.map((opt: any) => String(opt).trim()),
    correctIndex,
    explanationTh: q.explanationTh ? q.explanationTh.trim() : 'คำตอบถูกต้อง!',
    timeLimitSeconds: Number(q.timeLimitSeconds) || 5,
    rewardAmmo: Number(q.rewardAmmo) || 3,
    bonusPoints: Number(q.bonusPoints) || 100,
    difficulty: q.difficulty || 'MEDIUM',
    subjectCode: q.subjectCode
  });

  res.status(201).json({ 
    success: true, 
    message: 'เพิ่มโจทย์คำถามสำเร็จ', 
    question: newQuestion 
  });
});

// 5. แก้ไขโจทย์คำถาม
app.put('/api/quiz/questions/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const updated = quizManager.updateQuestion(id, updates);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'ไม่พบโจทย์คำถามที่ต้องการแก้ไข' });
  }
  res.json({ success: true, message: 'แก้ไขคำถามเรียบร้อย', question: updated });
});

// 6. ลบโจทย์คำถาม
app.delete('/api/quiz/questions/:id', (req, res) => {
  const { id } = req.params;
  const isDeleted = quizManager.deleteQuestion(id);
  if (!isDeleted) {
    return res.status(404).json({ success: false, error: 'ไม่พบโจทย์คำถามที่ต้องการลบ' });
  }
  res.json({ success: true, message: 'ลบโจทย์คำถามเรียบร้อย', deletedId: id });
});

// 7. นำเข้าโจทย์คำถามแบบกลุ่ม (Bulk Import JSON สำหรับอาจารย์)
app.post('/api/quiz/import', (req, res) => {
  const { questions, mode } = req.body;
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ success: false, error: 'กรุณาส่งอาร์เรย์ของโจทย์คำถาม (questions: [])' });
  }

  const result = quizManager.bulkImport(questions, mode === 'replace' ? 'replace' : 'append');
  res.json({
    success: true,
    message: `นำเข้าโจทย์สำเร็จ ${result.added} ข้อ (มีโจทย์ในระบบรวม ${result.total} ข้อ)`,
    ...result
  });
});

// 8. รีเซ็ตโจทย์คำถามกลับเป็นโจทย์มาตรฐาน
app.post('/api/quiz/reset', (req, res) => {
  quizManager.resetToDefault();
  res.json({
    success: true,
    message: 'รีเซ็ตคลังคำถามกลับเป็นโจทย์ตั้งต้นเรียบร้อย',
    total: 15
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 🏰 ADMIN & ROOM MANAGEMENT REST APIS (จัดการและควบคุมห้องแข่งขันสำหรับอาจารย์)
// ══════════════════════════════════════════════════════════════════════════════

// 1. ดึงรายละเอียดห้องทั้งหมดแบบเรียลไทม์ (Live Active Rooms)
app.get('/api/admin/rooms', (req, res) => {
  res.json({
    success: true,
    rooms: roomManager.getAllRoomsDetailed()
  });
});

// 2. ลบ / บังคับปิดห้องแข่งขันทันที (Force Delete Room)
app.delete('/api/admin/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const success = roomManager.deleteRoom(roomId);
  if (success) {
    res.json({ success: true, message: `ปิดและลบห้อง [${roomId}] สำเร็จแล้ว` });
  } else {
    res.status(404).json({ success: false, error: `ไม่พบห้อง [${roomId}] ในระบบ` });
  }
});

// 3. บังคับรีเซ็ตห้องแข่งขันกลับสู่ล็อบบี้ (Force Reset Room)
app.post('/api/admin/rooms/:roomId/reset', (req, res) => {
  const { roomId } = req.params;
  const success = roomManager.resetRoom(roomId);
  if (success) {
    res.json({ success: true, message: `รีเซ็ตห้อง [${roomId}] กลับสู่ล็อบบี้แล้ว` });
  } else {
    res.status(404).json({ success: false, error: `ไม่พบห้อง [${roomId}]` });
  }
});

// 4. เตะผู้เล่นออกจากห้อง (Kick Player from Room)
app.post('/api/admin/rooms/:roomId/kick/:playerId', (req, res) => {
  const { roomId, playerId } = req.params;
  const success = roomManager.kickPlayer(roomId, playerId);
  if (success) {
    res.json({ success: true, message: `เตะผู้เล่นออกจากห้อง [${roomId}] สำเร็จ` });
  } else {
    res.status(404).json({ success: false, error: `ไม่พบผู้เล่นหรือห้อง` });
  }
});

// 5. สถิติภาพรวมระบบ (Cluster & Game Server Stats)
app.get('/api/admin/stats', (req, res) => {
  res.json({
    success: true,
    stats: {
      ...roomManager.getSystemStats(),
      totalQuestionsInBank: quizManager.getAllQuestions().length
    }
  });
});

// Socket.io Middleware for Auth
/**
 * id ของผู้เล่นแบบ guest ต้องคงที่ข้ามการเชื่อมต่อ ไม่งั้นคนที่เน็ตหลุดจะกลายเป็น
 * คนใหม่ทุกครั้ง แล้ว reclaim หารถถังคันเดิมไม่เจอ — client เก็บค่านี้ไว้ใน
 * localStorage แล้วส่งมาทาง handshake (ยอมรับเฉพาะรูปแบบที่เรากำหนดเท่านั้น)
 */
function guestSession(socket: Socket) {
  const claimed = socket.handshake.auth?.guestId;
  const id = typeof claimed === 'string' && /^guest-[a-z0-9-]{4,40}$/i.test(claimed)
    ? claimed
    : `guest-${socket.id.slice(0, 6)}`;
  return {
    id,
    name: `พลขับ_${id.slice(6, 10)}`,
    isGuest: true
  };
}

io.use(async (socket: Socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  if (!token) {
    (socket as any).user = guestSession(socket);
    return next();
  }

  const session = await verifyToken(token as string);
  (socket as any).user = session || guestSession(socket);
  next();
});

// Socket.io Connection & Event Handling
io.on('connection', (socket: Socket) => {
  const user = (socket as any).user;
  console.log(`[Socket Connected] ID: ${socket.id}, User: ${user?.name}`);

  // Send current room list
  socket.emit('room_list', roomManager.getRoomList());

  /**
   * ลงทะเบียน handler แบบกันพัง: payload ที่เป็น null/undefined กลายเป็น {} เสมอ
   * และถ้า handler โยน error ก็ log ไว้เฉย ๆ ไม่ให้หลุดไปฆ่า process
   */
  const on = (event: string, fn: (data: any) => void) => {
    socket.on(event, (data: any) => {
      try {
        fn(data ?? {});
      } catch (err) {
        console.error(`[handler:${event}] socket=${socket.id}`, err);
      }
    });
  };

  on('join_room', (data) => {
    const roomId = asString(data.roomId);
    if (!roomId) return;
    roomManager.joinRoom(socket, roomId, {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: VALID_ROLES.has(data.role) ? data.role : undefined,
      teamId: VALID_TEAM_IDS.has(data.teamId) ? data.teamId : undefined,
      tankArchetype: VALID_ARCHETYPES.has(data.tankArchetype) ? data.tankArchetype : undefined,
      tankColor: asString(data.tankColor)
    });
  });

  on('leave_room', () => {
    roomManager.leaveRoom(socket);
  });

  on('set_ready', (isReady) => {
    roomManager.setPlayerReady(socket, isReady === true);
  });

  on('select_tank', (data) => {
    if (!VALID_ARCHETYPES.has(data.archetype)) return;
    if (!VALID_ROLES.has(data.role)) return;
    roomManager.selectTank(
      socket,
      data.archetype,
      asString(data.color) ?? '#4ade80',
      data.role,
      VALID_TEAM_IDS.has(data.teamId) ? data.teamId : undefined
    );
  });

  on('start_game', () => {
    roomManager.startGame(socket);
  });

  on('tank_input', (data) => {
    if (!VALID_DIRECTIONS.has(data.direction)) return;
    roomManager.handleTankInput(socket, { direction: data.direction, isMoving: data.isMoving === true });
  });

  on('tank_shoot', () => {
    roomManager.handleTankShoot(socket);
  });

  on('answer_quiz', (data) => {
    if (!isIntInRange(data.selectedIndex, 0, 3)) return;
    roomManager.handleQuizAnswer(socket, {
      tankId: socket.id, // ห้ามเชื่อ tankId จาก client — เคยใช้ยิงควิซใส่ศัตรูได้
      crateId: asString(data.crateId) ?? '',
      questionId: asString(data.questionId) ?? '',
      selectedIndex: data.selectedIndex,
      confident: data.confident === true
    });
  });

  on('team_support_answer', (data) => {
    if (!isIntInRange(data.selectedIndex, 0, 3)) return;
    roomManager.handleTeamSupportAnswer(socket, {
      questionId: asString(data.questionId) ?? '',
      selectedIndex: data.selectedIndex,
      confident: data.confident === true
    });
  });

  on('vote_team_quiz', (data) => {
    if (!isIntInRange(data.choiceIndex, 0, 3)) return;
    roomManager.handleVoteTeamQuiz(socket, {
      choiceIndex: data.choiceIndex,
      confident: data.confident === true
    });
  });

  on('tactical_ping', (data) => {
    if (!isFiniteNumber(data.x) || !isFiniteNumber(data.y)) return;
    roomManager.handleTacticalPing(socket, { x: data.x, y: data.y });
  });

  on('auto_balance_teams', () => {
    roomManager.autoBalanceTeams(socket);
  });

  on('use_ultimate_beam', () => {
    roomManager.useUltimateBeam(socket);
  });

  on('supporter_airdrop', (data) => {
    if (!VALID_SUPPLY_TYPES.has(data.supplyType)) return;
    roomManager.handleSupporterAirdrop(socket, { supplyType: data.supplyType });
  });

  on('ghost_revival_answer', (data) => {
    if (!isIntInRange(data.choiceIndex, 0, 3)) return;
    roomManager.handleGhostRevivalAnswer(socket, { choiceIndex: data.choiceIndex });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected] ID: ${socket.id}`);
    try {
      roomManager.leaveRoom(socket);
    } catch (err) {
      console.error(`[handler:disconnect] socket=${socket.id}`, err);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`🎮 Tank Quiz Game Server running on port ${PORT}`);
  console.log(`📡 WebSocket ready on ws://localhost:${PORT}`);
});
