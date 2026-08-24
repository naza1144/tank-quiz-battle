import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { QuizManager } from './quizBank.js';
import { RoomManager } from './roomManager.js';
import { verifyToken, signUserToken } from './auth.js';

dotenv.config();

const PORT = process.env.PORT || 4000;
const app = express();
const httpServer = createServer(app);

app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const quizManager = new QuizManager();
const roomManager = new RoomManager(io, quizManager);

// REST API Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'tank-quiz-game-server', standalone: true, timestamp: new Date().toISOString() });
});

// Standalone Auth Endpoints
app.post('/api/auth/login', (req, res) => {
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

app.post('/api/auth/guest', (req, res) => {
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
    maxTanks: Math.min(6, Math.max(2, maxTanks || 6)),
    roundTimeSeconds: roundTimeSeconds || 240,
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
  const total = quizManager.resetToDefault();
  res.json({
    success: true,
    message: 'รีเซ็ตคลังคำถามกลับเป็นโจทย์ตั้งต้นเรียบร้อย',
    total
  });
});

// Socket.io Middleware for Auth
io.use(async (socket: Socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  if (!token) {
    // Generate guest session if no token provided
    (socket as any).user = {
      id: `guest-${socket.id.slice(0, 6)}`,
      name: `พลขับ_${socket.id.slice(0, 4)}`,
      isGuest: true
    };
    return next();
  }

  const session = await verifyToken(token as string);
  if (session) {
    (socket as any).user = session;
  } else {
    (socket as any).user = {
      id: `guest-${socket.id.slice(0, 6)}`,
      name: `พลขับ_${socket.id.slice(0, 4)}`,
      isGuest: true
    };
  }
  next();
});

// Socket.io Connection & Event Handling
io.on('connection', (socket: Socket) => {
  const user = (socket as any).user;
  console.log(`[Socket Connected] ID: ${socket.id}, User: ${user?.name}`);

  // Send current room list
  socket.emit('room_list', roomManager.getRoomList());

  socket.on('join_room', (data: { roomId: string; role?: any; teamId?: string; tankArchetype?: any; tankColor?: string }) => {
    roomManager.joinRoom(socket, data.roomId, {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: data.role,
      teamId: data.teamId,
      tankArchetype: data.tankArchetype,
      tankColor: data.tankColor
    });
  });

  socket.on('leave_room', () => {
    roomManager.leaveRoom(socket);
  });

  socket.on('set_ready', (isReady: boolean) => {
    roomManager.setPlayerReady(socket, isReady);
  });

  socket.on('select_tank', (data: { archetype: any; color: string; role: any; teamId?: string }) => {
    roomManager.selectTank(socket, data.archetype, data.color, data.role, data.teamId);
  });

  socket.on('start_game', () => {
    roomManager.startGame(socket);
  });

  socket.on('tank_input', (data: { direction: any; isMoving: boolean }) => {
    roomManager.handleTankInput(socket, data);
  });

  socket.on('tank_shoot', () => {
    roomManager.handleTankShoot(socket);
  });

  socket.on('answer_quiz', (data: { tankId: string; crateId: string; questionId: string; selectedIndex: number }) => {
    roomManager.handleQuizAnswer(socket, data);
  });

  socket.on('team_support_answer', (data: { questionId: string; selectedIndex: number }) => {
    roomManager.handleTeamSupportAnswer(socket, data);
  });

  socket.on('vote_team_quiz', (data: { choiceIndex: number }) => {
    roomManager.handleVoteTeamQuiz(socket, data);
  });

  socket.on('auto_balance_teams', () => {
    roomManager.autoBalanceTeams(socket);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected] ID: ${socket.id}`);
    roomManager.leaveRoom(socket);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🎮 Tank Quiz Game Server running on port ${PORT}`);
  console.log(`📡 WebSocket ready on ws://localhost:${PORT}`);
});
