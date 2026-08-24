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
  const { name, mode, maxTanks, roundTimeSeconds, isPrivate, password } = req.body;
  const roomId = roomManager.createRoom({
    id: `room-${Date.now().toString(36)}`,
    name: name || 'สนามรบรถถังใหม่',
    mode: mode || 'FFA',
    maxTanks: Math.min(6, Math.max(2, maxTanks || 6)),
    roundTimeSeconds: roundTimeSeconds || 240,
    isPrivate: !!isPrivate,
    password
  });
  res.json({ success: true, roomId });
});

app.get('/api/quizzes', (req, res) => {
  res.json(quizManager.getAllQuestions());
});

app.post('/api/quizzes', (req, res) => {
  const q = req.body;
  if (!q.questionTh || !q.options || q.options.length < 2) {
    return res.status(400).json({ error: 'ข้อมูลคำถามไม่ครบถ้วน' });
  }
  quizManager.addQuestion({
    id: `custom-${Date.now()}`,
    category: q.category || 'GENERAL',
    categoryTh: q.categoryTh || 'คำถามทั่วไป',
    questionTh: q.questionTh,
    questionEn: q.questionEn,
    options: q.options,
    correctIndex: q.correctIndex || 0,
    explanationTh: q.explanationTh || 'ตอบถูกต้อง!',
    timeLimitSeconds: q.timeLimitSeconds || 15,
    rewardAmmo: q.rewardAmmo || 3,
    bonusPoints: q.bonusPoints || 100
  });
  res.json({ success: true, message: 'เพิ่มคำถามสำเร็จ' });
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
