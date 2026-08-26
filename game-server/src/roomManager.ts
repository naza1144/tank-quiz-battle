import { Server, Socket } from 'socket.io';
import { 
  Player, 
  GameMode, 
  PlayerRole, 
  TankArchetype, 
  QuizQuestion, 
  GameEvent,
  RoomConfig,
  TacticalPing,
  AmmoKind,
  AirdropSupplyType
} from './types.js';
import { GameEngine } from './gameEngine.js';
import { QuizManager, getTimeLimitForDifficulty } from './quizBank.js';

interface VoteRecord {
  choice: number;
  confident: boolean;
  timestamp: number;
  playerName: string;
}

interface SquadQuizSession {
  teamId: string;
  tankId: string;
  crateId: string;
  question: QuizQuestion;
  timeLimitSeconds: number;
  startTime: number;
  endTime: number;
  votes: Map<string, VoteRecord>; // socketId -> VoteRecord
  timer?: NodeJS.Timeout;
}

interface GhostRevivalSession {
  teamId: string;
  hasUsed: boolean;
  streak: number;
  currentQ?: QuizQuestion;
  /** หมดเวลาแล้วต้องปลดล็อกให้แมตช์จบได้ ไม่ปล่อยค้าง */
  timer?: NodeJS.Timeout;
}

/** ให้ทีมที่รถถังพังมีเวลาเท่านี้ในการตอบให้ครบ 2 ข้อติด */
const GHOST_REVIVAL_WINDOW_MS = 30_000;

/** A quiz handed to one FFA driver. Answers are only accepted against this. */
interface FfaQuizSession {
  questionId: string;
  crateId: string;
  tankId: string;
  expiresAt: number;
  timer?: NodeJS.Timeout;
}

/** A player who dropped out mid-match and may still reclaim their tank. */
interface PendingReclaim {
  player: Player;
  tankId?: string;
  expiresAt: number;
  timer?: NodeJS.Timeout;
}

const RECLAIM_GRACE_MS = 60_000;
const EMPTY_ROOM_TTL_MS = 120_000;
const ROOM_STATE_THROTTLE_MS = 250;
const PING_COOLDOWN_MS = 5_000;
const PING_MAX_PER_MATCH = 6;
export const VALID_DIRECTIONS = new Set(['UP', 'DOWN', 'LEFT', 'RIGHT']);
export const VALID_ARCHETYPES = new Set(['STANDARD', 'SCOUT', 'HEAVY', 'SNIPER']);
export const VALID_ROLES = new Set(['DRIVER', 'SUPPORT', 'GHOST']);
export const VALID_TEAM_IDS = new Set(['team-1', 'team-2', 'team-3', 'team-4', 'team-5', 'team-6']);
export const VALID_SUPPLY_TYPES = new Set(['SHIELD', 'REPAIR']);

export class RoomManager {
  private io: Server;
  private quizManager: QuizManager;
  private rooms: Map<string, {
    config: RoomConfig;
    players: Map<string, Player>;
    activeSquadQuizzes: Map<string, SquadQuizSession>;
    squadQuizQueues: Map<string, { question: QuizQuestion; crateId: string; tankId: string; timeLimitSeconds: number }[]>;
    teamStreaks: Map<string, number>;
    teamAirdropCooldowns: Map<string, number>;
    teamRevivalState: Map<string, GhostRevivalSession>;
    activeFfaQuizzes: Map<string, FfaQuizSession>;   // socketId -> open quiz
    pendingReclaims: Map<string, PendingReclaim>;    // user id -> dropped player
    pingUsage: Map<string, { count: number; lastAt: number }>;
    engine?: GameEngine;
    intervalId?: NodeJS.Timeout;
    stateTimer?: NodeJS.Timeout;
    emptyTimer?: NodeJS.Timeout;
    state: 'LOBBY' | 'STARTING' | 'IN_GAME' | 'GAME_OVER';
  }> = new Map();

  private playerRooms: Map<string, string> = new Map(); // socketId -> roomId

  constructor(io: Server, quizManager: QuizManager) {
    this.io = io;
    this.quizManager = quizManager;

    // Create default public rooms
    this.createRoom({
      id: 'arena-1',
      name: 'ห้องประลอง รถถังสายฟ้า (FFA 4-6 คัน)',
      mode: 'FFA',
      maxTanks: 6,
      roundTimeSeconds: 240,
      isPrivate: false
    });

    this.createRoom({
      id: 'squad-1',
      name: 'ห้องทีมเวิร์ก คนขับ & หน่วยตอบโจทย์ (Squad)',
      mode: 'SQUAD',
      maxTanks: 4,
      roundTimeSeconds: 300,
      isPrivate: false
    });
  }

  public createRoom(config: RoomConfig): string {
    const roomId = config.id || `room-${Date.now().toString(36)}`;
    this.rooms.set(roomId, {
      config: { ...config, id: roomId },
      players: new Map(),
      activeSquadQuizzes: new Map(),
      squadQuizQueues: new Map(),
      teamStreaks: new Map(),
      teamAirdropCooldowns: new Map(),
      teamRevivalState: new Map(),
      activeFfaQuizzes: new Map(),
      pendingReclaims: new Map(),
      pingUsage: new Map(),
      state: 'LOBBY'
    });
    return roomId;
  }

  /** Stops the physics loop and every timer a match may have left behind. */
  private disposeEngine(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    if (room.intervalId) {
      clearInterval(room.intervalId);
      room.intervalId = undefined;
    }
    for (const session of room.activeSquadQuizzes.values()) {
      if (session.timer) clearTimeout(session.timer);
    }
    for (const q of room.activeFfaQuizzes.values()) {
      if (q.timer) clearTimeout(q.timer);
    }
    for (const r of room.pendingReclaims.values()) {
      if (r.timer) clearTimeout(r.timer);
    }
    for (const rev of room.teamRevivalState.values()) {
      if (rev.timer) clearTimeout(rev.timer);
    }
    room.activeSquadQuizzes.clear();
    room.squadQuizQueues.clear();
    room.activeFfaQuizzes.clear();
    room.pendingReclaims.clear();
    room.pingUsage.clear();
    room.teamStreaks.clear();
    room.teamAirdropCooldowns.clear();
    room.teamRevivalState.clear();
    room.engine = undefined;
  }

  /**
   * Called whenever a room loses its last player. An abandoned match used to
   * keep a 30Hz loop running forever until a teacher deleted the room by hand.
   */
  private handleRoomEmpty(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.players.size > 0) return;

    if (room.engine || room.intervalId) {
      console.log(`[Room ${roomId}] last player left — stopping game loop`);
      this.disposeEngine(roomId);
    }
    room.state = 'LOBBY';

    // Auto-created default rooms stay; ad-hoc rooms are collected after a TTL
    if (room.emptyTimer) clearTimeout(room.emptyTimer);
    if (roomId !== 'arena-1' && roomId !== 'squad-1') {
      room.emptyTimer = setTimeout(() => {
        const r = this.rooms.get(roomId);
        if (r && r.players.size === 0) {
          this.disposeEngine(roomId);
          this.rooms.delete(roomId);
          this.io.emit('room_list', this.getRoomList());
          console.log(`[Room ${roomId}] removed after being empty for 2 minutes`);
        }
      }, EMPTY_ROOM_TTL_MS);
    }
    this.io.emit('room_list', this.getRoomList());
  }

  public getRoomList() {
    return Array.from(this.rooms.values()).map(r => ({
      id: r.config.id,
      name: r.config.name,
      mode: r.config.mode,
      maxTanks: r.config.maxTanks,
      playerCount: r.players.size,
      state: r.state,
      isPrivate: r.config.isPrivate,
      selectedSubject: r.config.selectedSubject || 'ALL'
    }));
  }

  public joinRoom(socket: Socket, roomId: string, playerInfo: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    role?: PlayerRole;
    teamId?: string;
    tankArchetype?: TankArchetype;
    tankColor?: string;
  }) {
    const room = this.rooms.get(roomId);
    if (!room) {
      socket.emit('error_message', 'ไม่พบห้องที่ต้องการ');
      return;
    }

    if (room.players.size >= 100) {
      socket.emit('error_message', 'ห้องเต็มแล้ว (จำกัด 100 คน)');
      return;
    }

    // Leave any prior room
    this.leaveRoom(socket);

    if (room.emptyTimer) {
      clearTimeout(room.emptyTimer);
      room.emptyTimer = undefined;
    }

    // ── Reconnect: the same human coming back after a dropped connection ──
    const pending = room.pendingReclaims.get(playerInfo.id);
    if (pending) {
      if (pending.timer) clearTimeout(pending.timer);
      room.pendingReclaims.delete(playerInfo.id);

      const restored: Player = { ...pending.player, socketId: socket.id, name: playerInfo.name || pending.player.name };
      room.players.set(socket.id, restored);
      this.playerRooms.set(socket.id, roomId);
      socket.join(roomId);

      if (room.engine && pending.tankId) {
        const tank = room.engine.rekeyTank(pending.tankId, socket.id);
        if (tank) {
          restored.tankId = tank.id;
          room.engine.setTankDisconnected(tank.id, false);
        }
      }

      // Hand them the running match so they aren't stranded on the lobby screen
      if (room.engine && room.state === 'IN_GAME') {
        socket.emit('game_start', {
          mode: room.config.mode,
          map: room.engine.map,
          initialState: room.engine.getFullState(),
          rejoined: true
        });
      }

      socket.emit('reclaimed', {
        role: restored.role,
        teamId: restored.teamId,
        tankRestored: !!restored.tankId
      });
      this.io.to(roomId).emit('game_event', {
        type: 'PLAYER_RECONNECTED',
        message: `🔌 ${restored.name} กลับเข้าสู่สนามรบแล้ว${restored.tankId ? ' (ได้รถถังคันเดิมคืน)' : ''}`,
        sound: 'START',
        teamId: restored.teamId,
        timestamp: Date.now()
      });
      this.broadcastRoomState(roomId);
      return;
    }

    const isFirst = room.players.size === 0;
    
    // In SQUAD mode, auto-assign to the team with lowest count for balance
    let assignedTeam = playerInfo.teamId && VALID_TEAM_IDS.has(playerInfo.teamId) ? playerInfo.teamId : undefined;
    let assignedRole: PlayerRole = playerInfo.role && VALID_ROLES.has(playerInfo.role) ? playerInfo.role : 'SUPPORT';
    const numTeams = Math.min(6, Math.max(2, room.config.maxTanks || 4));
    
    if (room.config.mode === 'SQUAD' && !assignedTeam) {
      const allTeams = ['team-1', 'team-2', 'team-3', 'team-4', 'team-5', 'team-6'].slice(0, numTeams);
      const teamCounts: Record<string, number> = {};
      allTeams.forEach(t => { teamCounts[t] = 0; });

      for (const p of room.players.values()) {
        if (teamCounts[p.teamId] !== undefined) teamCounts[p.teamId]++;
      }
      let minTeam = allTeams[0];
      let minCount = Infinity;
      for (const [tid, cnt] of Object.entries(teamCounts)) {
        if (cnt < minCount) {
          minCount = cnt;
          minTeam = tid;
        }
      }
      assignedTeam = minTeam;

      // If team doesn't have a driver yet, assign as driver
      const hasDriver = Array.from(room.players.values()).some(p => p.teamId === assignedTeam && p.role === 'DRIVER');
      if (!hasDriver) {
        assignedRole = 'DRIVER';
      }
    }

    const teamColorMap: Record<string, string> = {
      'team-1': '#ef4444',
      'team-2': '#3b82f6',
      'team-3': '#22c55e',
      'team-4': '#eab308',
      'team-5': '#a855f7',
      'team-6': '#06b6d4'
    };

    const isSquad = room.config.mode === 'SQUAD';
    const player: Player = {
      id: playerInfo.id,
      socketId: socket.id,
      name: playerInfo.name || `Player-${socket.id.slice(0, 4)}`,
      email: playerInfo.email,
      avatar: playerInfo.avatar,
      role: assignedRole,
      teamId: isSquad ? (assignedTeam || `team-${(room.players.size % numTeams) + 1}`) : '',
      tankArchetype: playerInfo.tankArchetype && VALID_ARCHETYPES.has(playerInfo.tankArchetype)
        ? playerInfo.tankArchetype
        : 'STANDARD',
      tankColor: playerInfo.tankColor || (assignedTeam ? teamColorMap[assignedTeam] : this.getRandomColor(room.players.size)),
      isHost: isFirst,
      isReady: isFirst, // Host is automatically ready
      score: 0,
      kills: 0,
      correctAnswers: 0
    };

    room.players.set(socket.id, player);
    this.playerRooms.set(socket.id, roomId);
    socket.join(roomId);

    // เข้ามากลางแมตช์ (ไม่ใช่เคส reclaim): เข้าเป็นฝ่ายสนับสนุน ไม่แจกรถถังกลางคัน
    // เดิมค้างอยู่หน้าล็อบบี้ทั้งที่รับ snapshot 30 Hz อยู่แล้ว
    if (room.engine && room.state === 'IN_GAME') {
      player.role = 'SUPPORT';
      socket.emit('game_start', {
        mode: room.config.mode,
        map: room.engine.map,
        initialState: room.engine.getFullState(),
        joinedMidMatch: true
      });
      socket.emit('error_message', 'แมตช์เริ่มไปแล้ว — เข้าร่วมในบทบาทฝ่ายสนับสนุน');
    }

    this.broadcastRoomState(roomId);
  }

  public leaveRoom(socket: Socket) {
    const roomId = this.playerRooms.get(socket.id);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (room) {
      const leavingPlayer = room.players.get(socket.id);
      room.players.delete(socket.id);
      socket.leave(roomId);

      // If host left, pass host to next player
      if (leavingPlayer?.isHost && room.players.size > 0) {
        const nextHost = room.players.values().next().value;
        if (nextHost) nextHost.isHost = true;
      }

      // เคลียร์โจทย์ที่ค้างอยู่ของ socket นี้ ไม่งั้น timer ค้างจนจบแมตช์
      const openQuiz = room.activeFfaQuizzes.get(socket.id);
      if (openQuiz) {
        if (openQuiz.timer) clearTimeout(openQuiz.timer);
        room.activeFfaQuizzes.delete(socket.id);
      }

      if (room.engine && leavingPlayer) {
        if (room.state === 'IN_GAME') {
          // เน็ตหลุดกลางแมตช์: จอดรถไว้เฉย ๆ ให้เจ้าของกลับมาเอาคืนได้ใน 60 วิ
          // (ถ้าลบทันทีแบบเดิม ฝั่ง joinRoom จะไม่เหลืออะไรให้ reclaim)
          room.engine.setTankInput(socket.id, null, false);
          room.engine.setTankDisconnected(socket.id, true);
          room.engine.checkWinCondition(); // FFA: คนที่เหลือคนเดียวต้องชนะทันที
          const existing = room.pendingReclaims.get(leavingPlayer.id);
          if (existing?.timer) clearTimeout(existing.timer);

          const timer = setTimeout(() => {
            const r = this.rooms.get(roomId);
            const entry = r?.pendingReclaims.get(leavingPlayer.id);
            if (!r || !entry) return;
            r.pendingReclaims.delete(leavingPlayer.id);
            if (entry.tankId && r.engine) {
              r.engine.removeTank(entry.tankId);
              r.engine.checkWinCondition();
            }
          }, RECLAIM_GRACE_MS);

          room.pendingReclaims.set(leavingPlayer.id, {
            player: leavingPlayer,
            tankId: leavingPlayer.tankId ?? socket.id,
            expiresAt: Date.now() + RECLAIM_GRACE_MS,
            timer
          });

          this.io.to(roomId).emit('game_event', {
            type: 'PLAYER_DISCONNECTED',
            message: `📴 ${leavingPlayer.name} หลุดการเชื่อมต่อ — รอกลับมาได้อีก ${RECLAIM_GRACE_MS / 1000} วินาที`,
            sound: 'ALERT',
            teamId: leavingPlayer.teamId,
            timestamp: Date.now()
          });
        } else {
          room.engine.removeTank(socket.id);
          room.engine.checkWinCondition();
        }
      }

      this.broadcastRoomState(roomId);

      if (room.players.size === 0) {
        this.handleRoomEmpty(roomId);
      }
    }

    this.playerRooms.delete(socket.id);
  }

  public setPlayerReady(socket: Socket, isReady: boolean) {
    const roomId = this.playerRooms.get(socket.id);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (player) {
      player.isReady = isReady;
      this.broadcastRoomState(roomId);
    }
  }

  public selectTank(socket: Socket, archetype: TankArchetype, color: string, role: PlayerRole, teamId?: string) {
    const roomId = this.playerRooms.get(socket.id);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player) return;

    const targetTeamId = teamId || player.teamId;

    // In SQUAD mode, perform balance and driver slot check
    if (room.config.mode === 'SQUAD') {
      // 1. Check if driver slot is already taken by another player
      if (role === 'DRIVER') {
        const existingDriver = Array.from(room.players.values()).find(
          p => p.teamId === targetTeamId && p.role === 'DRIVER' && p.socketId !== socket.id
        );
        if (existingDriver) {
          socket.emit('error_message', `ทีมนี้มีคนขับรถถังแล้ว (${existingDriver.name}) คุณได้รับการตั้งค่าเป็นหน่วยตอบคำถาม (Support)`);
          role = 'SUPPORT';
        }
      }

      // 2. Check team balance (prevent extreme skew, max delta 3)
      if (targetTeamId !== player.teamId) {
        const numTeams = Math.min(6, Math.max(2, room.config.maxTanks || 4));
        const allTeams = ['team-1', 'team-2', 'team-3', 'team-4', 'team-5', 'team-6'].slice(0, numTeams);
        const teamCounts: Record<string, number> = {};
        allTeams.forEach(t => { teamCounts[t] = 0; });
        for (const p of room.players.values()) {
          if (p.socketId !== socket.id && teamCounts[p.teamId] !== undefined) {
            teamCounts[p.teamId]++;
          }
        }
        const minCount = Math.min(...Object.values(teamCounts));
        const targetCount = teamCounts[targetTeamId] || 0;

        if (room.players.size >= 8 && targetCount > minCount + 3) {
          socket.emit('error_message', 'ทีมนี้มีสมาชิกมากกว่าทีมอื่นเกินไป กรุณาเลือกทีมที่มีคนน้อยกว่าเพื่อความสมดุล');
          return;
        }
      }
    }

    player.tankArchetype = archetype;
    player.tankColor = color;
    player.role = role;
    if (teamId) player.teamId = teamId;
    this.broadcastRoomState(roomId);
  }

  public autoBalanceTeams(socket: Socket) {
    const roomId = this.playerRooms.get(socket.id);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room || room.state !== 'LOBBY') return;

    const host = room.players.get(socket.id);
    if (!host?.isHost) {
      socket.emit('error_message', 'เฉพาะหัวหน้าห้องเท่านั้นที่สามารถจัดทีมสมดุลได้');
      return;
    }

    const numTeams = Math.min(6, Math.max(2, room.config.maxTanks || 4));
    const allTeamIds = ['team-1', 'team-2', 'team-3', 'team-4', 'team-5', 'team-6'];
    const allTeamColors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#06b6d4'];
    const teamIds = allTeamIds.slice(0, numTeams);
    const teamColors = allTeamColors.slice(0, numTeams);
    const playersList = Array.from(room.players.values());

    // 1. Separate existing drivers and non-drivers
    const drivers: Player[] = [];
    const nonDrivers: Player[] = [];

    playersList.forEach(p => {
      if (p.role === 'DRIVER') {
        drivers.push(p);
      } else {
        nonDrivers.push(p);
      }
    });

    // 2. Assign exactly 1 driver per active team (up to numTeams)
    teamIds.forEach((tId, idx) => {
      let driver = drivers[idx];
      if (!driver && nonDrivers.length > 0) {
        driver = nonDrivers.shift()!;
        driver.role = 'DRIVER';
      }
      if (driver) {
        driver.teamId = tId;
        driver.tankColor = teamColors[idx];
      }
    });

    // Convert any surplus drivers into support
    for (let i = numTeams; i < drivers.length; i++) {
      drivers[i].role = 'SUPPORT';
      nonDrivers.push(drivers[i]);
    }

    // 3. Evenly distribute all remaining support players across teams (round-robin)
    let teamIdx = 0;
    nonDrivers.forEach(p => {
      p.role = 'SUPPORT';
      p.teamId = teamIds[teamIdx % numTeams];
      p.tankColor = teamColors[teamIdx % numTeams];
      teamIdx++;
    });

    this.broadcastRoomState(roomId);
  }

  public startGame(socket: Socket) {
    const roomId = this.playerRooms.get(socket.id);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player?.isHost) {
      socket.emit('error_message', 'เฉพาะหัวหน้าห้อง (Host) เท่านั้นที่เริ่มเกมได้');
      return;
    }

    if (room.players.size < 1) {
      socket.emit('error_message', 'ต้องมีผู้เล่นอย่างน้อย 1 คน');
      return;
    }

    // Initialize Game Engine
    room.state = 'IN_GAME';
    room.activeSquadQuizzes.clear();
    room.squadQuizQueues.clear();
    room.teamStreaks.clear();
    room.teamAirdropCooldowns.clear();
    room.teamRevivalState.clear();
    const engine = new GameEngine(
      this.quizManager,
      {
        onGameEvent: (event: GameEvent) => {
          this.io.to(roomId).emit('game_event', event);

          // รถถังทีมไหนพัง = เปิด Ghost Revival ให้ทีมนั้น
          // (เดิม triggerGhostRevivalChallenge() ไม่เคยถูกเรียกจากโค้ดจริงเลย)
          if (event.type === 'TANK_DESTROYED' && room.config.mode === 'SQUAD' && event.teamId) {
            this.beginGhostRevival(roomId, event.teamId);
          }
        },
        onQuizTrigger: (tankId: string, playerId: string, question: QuizQuestion, crateId: string) => {
          // Send quiz modal to specific player
          const targetPlayer = Array.from(room.players.values()).find(p => p.id === playerId || p.socketId === tankId);
          if (targetPlayer) {
            this.openFfaQuizSession(roomId, targetPlayer.socketId, tankId, crateId, question);
          }
        },
        onTeamQuizTrigger: (teamId: string, question: QuizQuestion, crateId: string, tankId: string) => {
          const teamSupporters = Array.from(room.players.values()).filter(p => p.teamId === teamId && p.role === 'SUPPORT');
          if (teamSupporters.length > 0) {
            const timeLimitSeconds = getTimeLimitForDifficulty(question.difficulty, question.timeLimitSeconds);
            const item = { question, crateId, tankId, timeLimitSeconds };
            
            if (!room.squadQuizQueues.has(teamId)) {
              room.squadQuizQueues.set(teamId, []);
            }

            // If a quiz session is currently running for this team: Queue it! Do NOT overwrite or jump!
            if (room.activeSquadQuizzes.has(teamId)) {
              room.squadQuizQueues.get(teamId)!.push(item);
              const qLen = room.squadQuizQueues.get(teamId)!.length;

              const teamMembers = Array.from(room.players.values()).filter(p => p.teamId === teamId);
              teamMembers.forEach(p => {
                this.io.to(p.socketId).emit('game_event', {
                  type: 'QUIZ_QUEUED',
                  message: `📦 ชนกล่องคำถามเพิ่ม! (+${qLen} คำถามรออยู่ในคิว)`,
                  sound: 'CRATE_PICKUP',
                  tankId,
                  teamId,
                  timestamp: Date.now()
                });
              });
              return;
            }

            // Start quiz session immediately
            this.startTeamQuizSession(roomId, teamId, item);
          } else {
            // If no support player on this team, driver answers as fallback
            const driver = Array.from(room.players.values()).find(p => p.teamId === teamId && p.role === 'DRIVER');
            if (driver) {
              this.openFfaQuizSession(roomId, driver.socketId, tankId, crateId, question);
            }
          }
        },
        onGameOver: (winnerTankId, winnerTeamId, winnerName) => {
          room.state = 'GAME_OVER';

          // Build accurate leaderboard separating Driver vs Supporters and Teams!
          const leaderboard = Array.from(room.players.values()).map(p => {
            if (room.config.mode === 'FFA') {
              const tank = engine.tanks.get(p.socketId) || Array.from(engine.tanks.values()).find(t => t.playerId === p.id);
              return {
                name: p.name,
                kills: tank ? tank.kills : p.kills,
                score: tank ? tank.score : p.score,
                correctAnswers: tank ? tank.correctAnswers : p.correctAnswers,
                isDead: tank ? tank.hp <= 0 : false
              };
            } else {
              // SQUAD Mode: Driver gets team tank stats, Supporters get their own individual quiz score
              const teamTank = Array.from(engine.tanks.values()).find(t => t.teamId === p.teamId);
              if (p.role === 'DRIVER') {
                return {
                  name: `${p.name} [พลขับ]`,
                  kills: teamTank ? teamTank.kills : 0,
                  score: teamTank ? teamTank.score : 0,
                  correctAnswers: teamTank ? teamTank.correctAnswers : 0,
                  isDead: teamTank ? teamTank.hp <= 0 : false
                };
              } else {
                return {
                  name: `${p.name} [ผู้ช่วย]`,
                  kills: 0,
                  score: p.score || 0,
                  correctAnswers: p.correctAnswers || 0,
                  isDead: teamTank ? teamTank.hp <= 0 : false
                };
              }
            }
          }).sort((a, b) => b.score - a.score);

          this.io.to(roomId).emit('game_over', {
            winnerTankId,
            winnerTeamId,
            winnerName,
            leaderboard
          });

          if (room.intervalId) {
            clearInterval(room.intervalId);
            room.intervalId = undefined;
          }
        }
      },
      room.config.roundTimeSeconds,
      room.config.mode,
      room.config.selectedSubject || 'ALL'
    );

    // Add Tanks for DRIVER players
    for (const p of room.players.values()) {
      p.score = 0;
      p.kills = 0;
      p.correctAnswers = 0;
      if (p.role === 'DRIVER' || room.config.mode === 'FFA') {
        const tank = engine.addTank(
          p.socketId,
          p.id,
          p.name,
          p.tankColor,
          p.tankArchetype,
          room.config.mode === 'SQUAD' ? p.teamId : undefined
        );
        p.tankId = tank.id;
      }
    }

    room.engine = engine;

    // Start 30 FPS Game Loop
    let lastTime = Date.now();
    room.intervalId = setInterval(() => {
      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      engine.update(dt);
      this.io.to(roomId).emit('game_tick', engine.getSnapshot());
    }, 1000 / 30);

    this.io.to(roomId).emit('game_start', {
      mode: room.config.mode,
      map: engine.map,
      initialState: engine.getSnapshot()
    });
  }

  public handleTankInput(socket: Socket, data: { direction: any; isMoving: boolean }) {
    const roomId = this.playerRooms.get(socket.id);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room?.engine) return;

    // payload อาจเป็น undefined/ชนิดผิดได้ (client ปลอม) — เคยทำ pod ตายทั้งเครื่อง
    const direction = data && VALID_DIRECTIONS.has(data.direction) ? data.direction : null;
    room.engine.setTankInput(socket.id, direction, !!data?.isMoving && direction !== null);
  }

  public handleTankShoot(socket: Socket) {
    const roomId = this.playerRooms.get(socket.id);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room?.engine) return;

    room.engine.tankShoot(socket.id);
  }

  /**
   * เปิดคำถามให้ผู้เล่นคนเดียว แล้วจดไว้ว่ากำลังเปิดโจทย์ข้อไหนอยู่
   * `handleQuizAnswer()` จะรับคำตอบเฉพาะที่ตรงกับ session นี้เท่านั้น —
   * เดิมไม่มีการจดเลย ทำให้ยิง `answer_quiz` รัว ๆ โดยไม่แตะกล่องก็ได้กระสุนเต็ม
   */
  private openFfaQuizSession(
    roomId: string,
    socketId: string,
    tankId: string,
    crateId: string,
    question: QuizQuestion
  ) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const previous = room.activeFfaQuizzes.get(socketId);
    if (previous?.timer) clearTimeout(previous.timer);

    const timeLimitSeconds = getTimeLimitForDifficulty(question.difficulty, question.timeLimitSeconds);
    // เผื่อ latency 1.5 วิ ตอบเลยจากนี้ถือว่าหมดเวลา
    const graceMs = timeLimitSeconds * 1000 + 1500;

    const timer = setTimeout(() => {
      const current = room.activeFfaQuizzes.get(socketId);
      if (!current || current.crateId !== crateId) return;
      room.activeFfaQuizzes.delete(socketId);
      room.engine?.expireQuiz(tankId, crateId);
      this.io.to(socketId).emit('quiz_expired', { crateId, questionId: question.id });
    }, graceMs);

    room.activeFfaQuizzes.set(socketId, {
      questionId: question.id,
      crateId,
      tankId,
      expiresAt: Date.now() + graceMs,
      timer
    });

    this.io.to(socketId).emit('quiz_popup', { tankId, crateId, question });
  }

  public handleQuizAnswer(socket: Socket, data: {
    tankId: string;
    crateId: string;
    questionId: string;
    selectedIndex: number;
    confident?: boolean;
  }) {
    const roomId = this.playerRooms.get(socket.id);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room?.engine) return;

    const session = room.activeFfaQuizzes.get(socket.id);
    if (
      !session ||
      session.questionId !== data.questionId ||
      session.crateId !== data.crateId ||
      Date.now() > session.expiresAt
    ) {
      // ไม่มีโจทย์ที่เปิดค้างอยู่ / ตอบผิดข้อ / ตอบช้าเกินกำหนด → ไม่ให้รางวัลใด ๆ
      if (session?.timer) clearTimeout(session.timer);
      room.activeFfaQuizzes.delete(socket.id);
      if (session) room.engine.expireQuiz(session.tankId, session.crateId);
      socket.emit('quiz_expired', { crateId: data.crateId, questionId: data.questionId });
      return;
    }

    // ตอบได้ครั้งเดียวต่อกล่อง — ลบ session ทิ้งก่อนคิดรางวัลเพื่อกันตอบซ้ำ
    if (session.timer) clearTimeout(session.timer);
    room.activeFfaQuizzes.delete(socket.id);

    const result = room.engine.handleQuizAnswer(
      session.tankId, // ใช้รถถังจาก session เสมอ ไม่เชื่อ tankId ที่ client ส่งมา
      session.crateId,
      session.questionId,
      data.selectedIndex,
      data.confident
    );

    socket.emit('quiz_result', result);
  }

  public handleVoteTeamQuiz(socket: Socket, data: { choiceIndex: number; confident?: boolean }) {
    const roomId = this.playerRooms.get(socket.id);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player || (player.role !== 'SUPPORT' && player.role !== 'GHOST')) return;

    const session = room.activeSquadQuizzes.get(player.teamId);
    if (!session || Date.now() > session.endTime) return;

    // Record vote with confident flag and timestamp
    session.votes.set(socket.id, {
      choice: data.choiceIndex,
      confident: !!data.confident,
      timestamp: Date.now(),
      playerName: player.name
    });

    // Compute live tally
    const voteCounts = [0, 0, 0, 0];
    let confidentVotes = 0;
    for (const record of session.votes.values()) {
      if (record.choice >= 0 && record.choice < 4) {
        voteCounts[record.choice]++;
      }
      if (record.confident) confidentVotes++;
    }
    const totalVotes = session.votes.size;

    // Broadcast live vote counts to all members of this team
    const teamMembers = Array.from(room.players.values()).filter(p => p.teamId === player.teamId);
    teamMembers.forEach(m => {
      this.io.to(m.socketId).emit('team_quiz_vote_update', {
        teamId: player.teamId,
        voteCounts,
        totalVotes,
        confidentVotes
      });
    });
  }

  public handleTacticalPing(socket: Socket, data: { x: number; y: number }) {
    const roomId = this.playerRooms.get(socket.id);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room || room.state !== 'IN_GAME') return;
    const player = room.players.get(socket.id);
    if (!player || !player.teamId) return;

    // จำกัดโควตาปักหมุด ไม่ให้สแปมใส่เพื่อนร่วมทีม
    const now = Date.now();
    const usage = room.pingUsage.get(socket.id) ?? { count: 0, lastAt: 0 };
    if (usage.count >= PING_MAX_PER_MATCH) {
      socket.emit('error_message', `ปักหมุดได้สูงสุด ${PING_MAX_PER_MATCH} ครั้งต่อแมตช์`);
      return;
    }
    if (now - usage.lastAt < PING_COOLDOWN_MS) return;
    room.pingUsage.set(socket.id, { count: usage.count + 1, lastAt: now });

    const ping: TacticalPing = {
      id: `ping-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      teamId: player.teamId,
      x: data.x,
      y: data.y,
      senderName: player.name,
      timestamp: Date.now()
    };

    // Broadcast ping to all team members
    const teamMembers = Array.from(room.players.values()).filter(p => p.teamId === player.teamId);
    teamMembers.forEach(m => {
      this.io.to(m.socketId).emit('tactical_ping', ping);
    });
  }

  private startTeamQuizSession(
    roomId: string, 
    teamId: string, 
    item: { question: QuizQuestion; crateId: string; tankId: string; timeLimitSeconds: number }
  ) {
    const room = this.rooms.get(roomId);
    if (!room || room.state !== 'IN_GAME') return;

    const teamSupporters = Array.from(room.players.values()).filter(p => p.teamId === teamId && (p.role === 'SUPPORT' || p.role === 'GHOST'));
    const now = Date.now();
    const session: SquadQuizSession = {
      teamId,
      tankId: item.tankId,
      crateId: item.crateId,
      question: item.question,
      timeLimitSeconds: item.timeLimitSeconds,
      startTime: now,
      endTime: now + item.timeLimitSeconds * 1000,
      votes: new Map()
    };

    // Auto-finalize only when countdown completes!
    session.timer = setTimeout(() => {
      this.finalizeTeamQuiz(roomId, teamId);
    }, (item.timeLimitSeconds + 0.2) * 1000);

    room.activeSquadQuizzes.set(teamId, session);

    const queueLength = room.squadQuizQueues.get(teamId)?.length || 0;

    // Send popup with timer ONLY to support teammates & ghosts! Driver does NOT get popup!
    teamSupporters.forEach(p => {
      this.io.to(p.socketId).emit('team_quiz_popup', {
        teamId,
        question: item.question,
        crateId: item.crateId,
        tankId: item.tankId,
        timeLimitSeconds: item.timeLimitSeconds,
        startTime: now,
        endTime: now + item.timeLimitSeconds * 1000,
        queueLength
      });
    });

    // Notify the driver
    const driver = Array.from(room.players.values()).find(p => p.teamId === teamId && p.role === 'DRIVER');
    if (driver) {
      this.io.to(driver.socketId).emit('game_event', {
        type: 'QUIZ_TRIGGERED',
        message: `📦 เก็บกล่องคำถาม! ทีมกำลังโหวตคำตอบ (${item.timeLimitSeconds} วิ)...`,
        sound: 'CRATE_PICKUP',
        tankId: item.tankId,
        teamId,
        timestamp: now
      });
    }
  }

  private finalizeTeamQuiz(roomId: string, teamId: string) {
    const room = this.rooms.get(roomId);
    if (!room || !room.engine) return;
    const session = room.activeSquadQuizzes.get(teamId);
    if (!session) return;
    if (session.timer) clearTimeout(session.timer);

    const voteCounts = [0, 0, 0, 0];
    for (const record of session.votes.values()) {
      if (record.choice >= 0 && record.choice < 4) {
        voteCounts[record.choice]++;
      }
    }

    let majorityChoice = 0;
    let maxVotes = -1;
    for (let i = 0; i < 4; i++) {
      if (voteCounts[i] > maxVotes) {
        maxVotes = voteCounts[i];
        majorityChoice = i;
      }
    }

    if (session.votes.size === 0) {
      majorityChoice = -1;
    }

    const totalVotes = session.votes.size;
    const votes = Array.from(session.votes.values());

    // Consensus Algorithm (SPEC §5)
    // WEIGHT: correct (+1, or +2 if confident), wrong (0, or -1 if confident)
    const WEIGHT = (isCorrect: boolean, confident: boolean) =>
      isCorrect ? (confident ? 2 : 1) : (confident ? -1 : 0);

    let consensusScore = 0;
    for (const v of votes) {
      const isC = v.choice === session.question.correctIndex;
      consensusScore += WEIGHT(isC, v.confident);
    }

    const N = Math.max(1, votes.length);
    const W = Math.max(0, Math.min(1, consensusScore / (1.5 * N)));

    let tier: AmmoKind = 'STD';
    let isJammed = false;
    if (totalVotes === 0) {
      tier = 'DUD';
    } else if (W >= 0.70) {
      tier = 'AP';
    } else if (W >= 0.40) {
      tier = 'STD';
    } else if (W >= 0.15) {
      tier = 'DUD';
    } else {
      isJammed = true;
      tier = 'DUD';
    }

    // Find owner: fastest correct answerer (SPEC INV-3)
    const correctSubmissions = votes
      .filter(v => v.choice === session.question.correctIndex)
      .sort((a, b) => a.timestamp - b.timestamp);
    const ownerName = correctSubmissions[0]?.playerName;

    const supportName = totalVotes > 0 ? `มติทีม (${maxVotes}/${totalVotes} โหวต)` : 'หมดเวลา (ไม่มีผู้โหวต)';

    const result = room.engine.handleTeamSupportAnswer(
      teamId,
      supportName,
      session.question.id,
      majorityChoice,
      tier,
      ownerName,
      isJammed
    );

    // Update Synergy Streak for Ultimate Mega Laser Beam
    let curStreak = 0;
    const teamTank = Array.from(room.engine.tanks.values()).find(t => t.teamId === teamId);

    if (result.isCorrect) {
      curStreak = (room.teamStreaks.get(teamId) || 0) + 1;
      room.teamStreaks.set(teamId, curStreak);
      if (teamTank) {
        teamTank.synergyStreak = curStreak;
        if (curStreak >= 3) {
          teamTank.isUltimateReady = true;
          this.io.to(roomId).emit('game_event', {
            type: 'ULTIMATE_BEAM',
            message: `⚡ พลังความร่วมมือเต็ม 100%! รถถังทีม ${teamId} พร้อมยิง MEGA LASER BEAM (กด [E] หรือแตะปุ่ม)!`,
            sound: 'MEGA_LASER',
            tankId: teamTank.id,
            teamId,
            timestamp: Date.now()
          });
        }
      }
    } else {
      curStreak = 0;
      room.teamStreaks.set(teamId, 0);
      if (teamTank) {
        teamTank.synergyStreak = 0;
        teamTank.isUltimateReady = false;
      }
    }

    // Award individual score strictly to supporters of THIS team who voted correctly!
    for (const [voterSocketId, v] of session.votes.entries()) {
      if (v.choice === session.question.correctIndex) {
        const voter = room.players.get(voterSocketId);
        if (voter && voter.teamId === teamId) {
          const pts = (session.question.bonusPoints || 100) * (v.confident ? 1.5 : 1);
          voter.score = (voter.score || 0) + pts;
          voter.correctAnswers = (voter.correctAnswers || 0) + 1;
        }
      }
    }

    // Emit final result with majority decision to all players in this team
    const teamMembers = Array.from(room.players.values()).filter(p => p.teamId === teamId);
    teamMembers.forEach(m => {
      this.io.to(m.socketId).emit('team_quiz_final_result', {
        teamId,
        questionId: session.question.id,
        majorityChoice,
        correctIndex: session.question.correctIndex,
        voteCounts,
        totalVotes,
        isCorrect: result.isCorrect,
        rewardAmmo: result.rewardAmmo,
        explanationTh: result.explanationTh,
        ammoKind: tier,
        ownerName,
        isJammed,
        synergyStreak: curStreak,
        isUltimateReady: teamTank?.isUltimateReady || false
      });
    });

    // Hold result banner on screen for 2.8s, then transition to next queued question or close
    setTimeout(() => {
      const currentRoom = this.rooms.get(roomId);
      if (!currentRoom || currentRoom.state !== 'IN_GAME') return;

      currentRoom.activeSquadQuizzes.delete(teamId);

      const queue = currentRoom.squadQuizQueues.get(teamId);
      if (queue && queue.length > 0) {
        const nextItem = queue.shift()!;
        this.startTeamQuizSession(roomId, teamId, nextItem);
      } else {
        // Broadcast quiz closed to team supporters
        const supporters = Array.from(currentRoom.players.values()).filter(p => p.teamId === teamId && (p.role === 'SUPPORT' || p.role === 'GHOST'));
        supporters.forEach(s => {
          this.io.to(s.socketId).emit('team_quiz_closed', { teamId });
        });
      }
    }, 2800);
  }

  public useUltimateBeam(socket: Socket) {
    const roomId = this.playerRooms.get(socket.id);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room || !room.engine || room.state !== 'IN_GAME') return;

    const player = room.players.get(socket.id);
    if (!player) return;

    const tank = Array.from(room.engine.tanks.values()).find(t => t.id === socket.id || t.playerId === player.id || (player.role === 'DRIVER' && t.teamId === player.teamId));
    if (!tank || !tank.isUltimateReady) return;

    room.engine.fireMegaLaser(tank.id);
  }

  public handleSupporterAirdrop(socket: Socket, data: { supplyType: AirdropSupplyType }) {
    const roomId = this.playerRooms.get(socket.id);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room || !room.engine || room.state !== 'IN_GAME') return;

    const player = room.players.get(socket.id);
    if (!player || !player.teamId || (player.role !== 'SUPPORT' && player.role !== 'GHOST')) return;

    const teamId = player.teamId;
    const now = Date.now();
    const lastAirdrop = room.teamAirdropCooldowns.get(teamId) || 0;
    const COOLDOWN_MS = 25000;

    if (now - lastAirdrop < COOLDOWN_MS) {
      const remainingSec = Math.ceil((COOLDOWN_MS - (now - lastAirdrop)) / 1000);
      socket.emit('error_message', `🛸 โดรนส่งเสบียงกำลังเติมพลังงาน (คูลดาวน์ ${remainingSec} วินาที)`);
      return;
    }

    const applied = room.engine.applyAirdropSupply(teamId, data.supplyType);
    if (applied) {
      room.teamAirdropCooldowns.set(teamId, now);
      // Notify all team supporters of active cooldown
      const teamSupporters = Array.from(room.players.values()).filter(p => p.teamId === teamId && (p.role === 'SUPPORT' || p.role === 'GHOST'));
      teamSupporters.forEach(s => {
        this.io.to(s.socketId).emit('airdrop_cooldown_started', {
          teamId,
          cooldownSeconds: 25,
          expiresAt: now + COOLDOWN_MS
        });
      });
    }
  }

  /**
   * เปิดโหมด Ghost ให้ทั้งทีมที่รถถังเพิ่งพัง: ทุกคนกลายเป็น GHOST, กันไม่ให้แมตช์
   * ประกาศผู้ชนะจนกว่าจะรู้ผล และตั้งนาฬิกาไว้กันแมตช์ค้างถ้าไม่มีใครตอบ
   */
  private beginGhostRevival(roomId: string, teamId: string) {
    const room = this.rooms.get(roomId);
    if (!room?.engine || room.state !== 'IN_GAME') return;

    const existing = room.teamRevivalState.get(teamId);
    if (existing?.hasUsed) return;       // ทีมนี้ใช้สิทธิ์ไปแล้ว
    if (room.engine.revivalPendingTeams.has(teamId)) return; // เปิดค้างอยู่แล้ว

    // ชุบได้ทีมละครั้งต่อแมตช์ — ถ้าใช้ไปแล้วปล่อยให้ checkWinCondition ประกาศผลได้เลย
    const teamTank = Array.from(room.engine.tanks.values()).find(t => t.teamId === teamId);
    if (!teamTank || teamTank.hasUsedRevival) return;

    for (const p of room.players.values()) {
      if (p.teamId === teamId && p.role !== 'GHOST') {
        p.previousRole = p.role;
        p.role = 'GHOST';
      }
    }

    this.triggerGhostRevivalChallenge(roomId, teamId);
    this.broadcastRoomState(roomId);
  }

  /**
   * ปิดฉาก Ghost Revival ไม่ว่าจะสำเร็จหรือหมดเวลา — ต้องปลด `revivalPendingTeams`
   * เสมอ ไม่งั้น `checkWinCondition()` จะไม่มีวันประกาศผู้ชนะ
   */
  private endGhostRevival(roomId: string, teamId: string, success: boolean) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const session = room.teamRevivalState.get(teamId);
    if (session?.timer) {
      clearTimeout(session.timer);
      session.timer = undefined;
    }
    if (session) {
      session.hasUsed = true;
      session.currentQ = undefined;
    }

    room.engine?.revivalPendingTeams.delete(teamId);

    if (!success) {
      // ชุบไม่สำเร็จ = ทีมนี้ตกรอบ คงสถานะ GHOST ไว้ให้ดูเกมต่อ แล้วแจ้งผล
      const teamMembers = Array.from(room.players.values()).filter(p => p.teamId === teamId);
      teamMembers.forEach(g => {
        this.io.to(g.socketId).emit('ghost_revival_failed', { teamId });
      });
    } else {
      for (const p of room.players.values()) {
        if (p.teamId === teamId && p.role === 'GHOST' && p.previousRole) {
          p.role = p.previousRole;
          p.previousRole = undefined;
        }
      }
    }

    this.broadcastRoomState(roomId);
    room.engine?.checkWinCondition();
  }

  public triggerGhostRevivalChallenge(roomId: string, teamId: string) {
    const room = this.rooms.get(roomId);
    if (!room || !room.engine || room.state !== 'IN_GAME') return;

    let revival = room.teamRevivalState.get(teamId);
    if (!revival) {
      revival = { teamId, hasUsed: false, streak: 0 };
      room.teamRevivalState.set(teamId, revival);
    }
    if (revival.hasUsed) return;

    // กันไม่ให้ checkWinCondition() ประกาศผู้ชนะระหว่างที่ทีมนี้ยังตอบไม่จบ
    // (เดิมแมตช์จบตั้งแต่ตอบข้อแรกเสร็จ คำตอบข้อสองเลยถูกทิ้ง)
    room.engine.revivalPendingTeams.add(teamId);
    if (revival.timer) clearTimeout(revival.timer);
    revival.timer = setTimeout(() => {
      this.endGhostRevival(roomId, teamId, false);
    }, GHOST_REVIVAL_WINDOW_MS);

    const q = this.quizManager.getRandomQuestion('GENERAL');
    revival.currentQ = q;

    const teamGhosts = Array.from(room.players.values()).filter(p => p.teamId === teamId);
    teamGhosts.forEach(g => {
      this.io.to(g.socketId).emit('ghost_revival_popup', {
        teamId,
        question: q,
        streak: revival.streak,
        targetStreak: 2,
        timeLimitSeconds: 15
      });
    });
  }

  public handleGhostRevivalAnswer(socket: Socket, data: { choiceIndex: number }) {
    const roomId = this.playerRooms.get(socket.id);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room || !room.engine || room.state !== 'IN_GAME') return;

    const player = room.players.get(socket.id);
    if (!player || !player.teamId) return;

    const teamId = player.teamId;
    const revival = room.teamRevivalState.get(teamId);
    if (!revival || revival.hasUsed || !revival.currentQ) return;

    const isCorrect = data.choiceIndex === revival.currentQ.correctIndex;
    if (isCorrect) {
      revival.streak++;
      if (revival.streak >= 2) {
        room.engine.reviveTeamTank(teamId);

        const teamGhosts = Array.from(room.players.values()).filter(p => p.teamId === teamId);
        teamGhosts.forEach(g => {
          this.io.to(g.socketId).emit('ghost_revival_success', { teamId });
        });

        // ปลด revivalPendingTeams + คืน role เดิม (hasUsed ถูกตั้งข้างใน)
        this.endGhostRevival(roomId, teamId, true);
      } else {
        // Issue question 2
        const q2 = this.quizManager.getRandomQuestion('SCIENCE');
        revival.currentQ = q2;
        const teamGhosts = Array.from(room.players.values()).filter(p => p.teamId === teamId);
        teamGhosts.forEach(g => {
          this.io.to(g.socketId).emit('ghost_revival_popup', {
            teamId,
            question: q2,
            streak: revival.streak,
            targetStreak: 2,
            timeLimitSeconds: 15
          });
        });
      }
    } else {
      // Wrong answer -> reset streak and provide fresh question to keep trying
      revival.streak = 0;
      const newQ = this.quizManager.getRandomQuestion('MATH');
      revival.currentQ = newQ;
      const teamGhosts = Array.from(room.players.values()).filter(p => p.teamId === teamId);
      teamGhosts.forEach(g => {
        this.io.to(g.socketId).emit('ghost_revival_popup', {
          teamId,
          question: newQ,
          streak: 0,
          targetStreak: 2,
          timeLimitSeconds: 15,
          isRetry: true
        });
      });
    }
  }

  public handleTeamSupportAnswer(socket: Socket, data: {
    questionId: string;
    selectedIndex: number;
    confident?: boolean;
  }) {
    this.handleVoteTeamQuiz(socket, { choiceIndex: data.selectedIndex, confident: data.confident });
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 🏰 ADMIN ROOM MANAGEMENT METHODS
  // ══════════════════════════════════════════════════════════════════════════════

  public getAllRoomsDetailed() {
    return Array.from(this.rooms.values()).map(r => ({
      id: r.config.id,
      name: r.config.name,
      mode: r.config.mode,
      maxTanks: r.config.maxTanks,
      playerCount: r.players.size,
      state: r.state,
      isPrivate: r.config.isPrivate,
      selectedSubject: r.config.selectedSubject || 'ALL',
      hasActiveEngine: !!r.engine,
      players: Array.from(r.players.values()).map(p => ({
        id: p.id,
        socketId: p.socketId,
        name: p.name,
        role: p.role,
        teamId: p.teamId,
        tankArchetype: p.tankArchetype,
        tankColor: p.tankColor,
        isHost: p.isHost,
        isReady: p.isReady
      }))
    }));
  }

  public deleteRoom(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    // Clear game loops and timeouts
    if (room.intervalId) {
      clearInterval(room.intervalId);
      room.intervalId = undefined;
    }
    for (const session of room.activeSquadQuizzes.values()) {
      if (session.timer) clearTimeout(session.timer);
    }
    room.activeSquadQuizzes.clear();
    room.squadQuizQueues.clear();

    // Broadcast room closed notice to all players in that room
    this.io.to(roomId).emit('room_closed', {
      roomId,
      reason: 'ห้องนี้ถูกปิด/ลบโดยอาจารย์หรือผู้ดูแลระบบ (Admin Force Closed Room)'
    });

    // Remove socket mappings
    for (const socketId of room.players.keys()) {
      this.playerRooms.delete(socketId);
      const s = this.io.sockets.sockets.get(socketId);
      if (s) {
        s.leave(roomId);
        s.emit('game_event', {
          type: 'ROOM_DELETED',
          message: 'ห้องแข่งขันถูกลบโดยผู้ดูแลระบบ กำลังนำคุณกลับสู่หน้ารายการห้อง...',
          sound: 'GAME_OVER',
          timestamp: Date.now()
        });
      }
    }

    this.rooms.delete(roomId);
    this.io.emit('room_list', this.getRoomList());
    return true;
  }

  public resetRoom(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    if (room.intervalId) {
      clearInterval(room.intervalId);
      room.intervalId = undefined;
    }
    for (const session of room.activeSquadQuizzes.values()) {
      if (session.timer) clearTimeout(session.timer);
    }
    room.activeSquadQuizzes.clear();
    room.squadQuizQueues.clear();
    room.engine = undefined;
    room.state = 'LOBBY';

    // Reset player states
    for (const player of room.players.values()) {
      player.isReady = player.isHost;
      player.tankId = undefined;
    }

    this.io.to(roomId).emit('game_event', {
      type: 'ROOM_RESET',
      message: 'อาจารย์/ผู้ดูแลระบบได้ทำการรีเซ็ตห้องแข่งขันกลับสู่ล็อบบี้',
      sound: 'START',
      timestamp: Date.now()
    });

    this.broadcastRoomState(roomId);
    this.io.emit('room_list', this.getRoomList());
    return true;
  }

  public kickPlayer(roomId: string, playerIdOrSocketId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    let targetSocketId: string | null = null;
    for (const [sId, p] of room.players.entries()) {
      if (sId === playerIdOrSocketId || p.id === playerIdOrSocketId) {
        targetSocketId = sId;
        break;
      }
    }

    if (!targetSocketId) return false;

    const player = room.players.get(targetSocketId);
    room.players.delete(targetSocketId);
    this.playerRooms.delete(targetSocketId);

    const s = this.io.sockets.sockets.get(targetSocketId);
    if (s) {
      s.leave(roomId);
      s.emit('player_kicked', {
        reason: 'คุณถูกเชิญออกจากห้องโดยอาจารย์/ผู้ดูแลระบบ (Kicked by Admin)'
      });
    }

    // Reassign host if needed
    if (player?.isHost && room.players.size > 0) {
      const nextHost = room.players.values().next().value;
      if (nextHost) {
        nextHost.isHost = true;
        nextHost.isReady = true;
      }
    }

    this.broadcastRoomState(roomId);
    this.io.emit('room_list', this.getRoomList());
    return true;
  }

  public getSystemStats() {
    let totalPlayers = 0;
    let activeGames = 0;
    for (const r of this.rooms.values()) {
      totalPlayers += r.players.size;
      if (r.state === 'IN_GAME') activeGames++;
    }

    return {
      totalRooms: this.rooms.size,
      totalPlayers,
      activeGames,
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * รวบการ broadcast ให้เหลือ 4 ครั้ง/วินาที — ล็อบบี้ 60 คนกดเลือกรถถังพร้อมกัน
   * เคยยิงออกไป 53 MB ใน 4 วินาที (~106 Mbit/s) เพราะทุก action ส่งรายชื่อทั้งห้อง
   */
  private broadcastRoomState(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    if (room.stateTimer) return; // มีคิวรออยู่แล้ว เดี๋ยวรอบนั้นส่งสถานะล่าสุดเอง

    room.stateTimer = setTimeout(() => {
      const r = this.rooms.get(roomId);
      if (!r) return;
      r.stateTimer = undefined;
      this.emitRoomState(roomId);
    }, ROOM_STATE_THROTTLE_MS);

    this.emitRoomState(roomId);
  }

  private emitRoomState(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    this.io.to(roomId).emit('room_state', {
      config: room.config,
      state: room.state,
      // ส่งเฉพาะฟิลด์ที่หน้าล็อบบี้ใช้จริง — คะแนน/กระสุนมากับ game_tick อยู่แล้ว
      players: Array.from(room.players.values()).map(p => ({
        id: p.id,
        socketId: p.socketId,
        name: p.name,
        avatar: p.avatar,
        role: p.role,
        teamId: p.teamId,
        tankArchetype: p.tankArchetype,
        tankColor: p.tankColor,
        isHost: p.isHost,
        isReady: p.isReady
      }))
    });
  }

  private getRandomColor(index: number): string {
    const colors = [
      '#eab308', // Yellow (Classic Player 1)
      '#22c55e', // Green (Classic Player 2)
      '#3b82f6', // Blue
      '#ef4444', // Red
      '#a855f7', // Purple
      '#06b6d4'  // Cyan
    ];
    return colors[index % colors.length];
  }
}
