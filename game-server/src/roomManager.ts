import { Server, Socket } from 'socket.io';
import { 
  Player, 
  GameMode, 
  PlayerRole, 
  TankArchetype, 
  QuizQuestion, 
  GameEvent,
  RoomConfig 
} from './types.js';
import { GameEngine } from './gameEngine.js';
import { QuizManager } from './quizBank.js';

interface SquadQuizSession {
  teamId: string;
  tankId: string;
  crateId: string;
  question: QuizQuestion;
  timeLimitSeconds: number;
  startTime: number;
  endTime: number;
  votes: Map<string, number>; // socketId -> choiceIndex
  voterNames: Map<string, string>; // socketId -> playerName
  timer?: NodeJS.Timeout;
}

export class RoomManager {
  private io: Server;
  private quizManager: QuizManager;
  private rooms: Map<string, {
    config: RoomConfig;
    players: Map<string, Player>;
    activeSquadQuizzes: Map<string, SquadQuizSession>;
    engine?: GameEngine;
    intervalId?: NodeJS.Timeout;
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
      state: 'LOBBY'
    });
    return roomId;
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

    const isFirst = room.players.size === 0;
    
    // In SQUAD mode, auto-assign to the team with lowest count for balance
    let assignedTeam = playerInfo.teamId;
    let assignedRole = playerInfo.role || 'SUPPORT';
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

    const player: Player = {
      id: playerInfo.id,
      socketId: socket.id,
      name: playerInfo.name || `Player-${socket.id.slice(0, 4)}`,
      email: playerInfo.email,
      avatar: playerInfo.avatar,
      role: assignedRole,
      teamId: assignedTeam || `team-${(room.players.size % numTeams) + 1}`,
      tankArchetype: playerInfo.tankArchetype || 'STANDARD',
      tankColor: playerInfo.tankColor || (assignedTeam ? teamColorMap[assignedTeam] : this.getRandomColor(room.players.size)),
      isHost: isFirst,
      isReady: isFirst // Host is automatically ready
    };

    room.players.set(socket.id, player);
    this.playerRooms.set(socket.id, roomId);
    socket.join(roomId);

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

      // If game running, remove tank
      if (room.engine && leavingPlayer) {
        room.engine.removeTank(socket.id);
      }

      this.broadcastRoomState(roomId);
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
        const teamCounts: Record<string, number> = { 'team-1': 0, 'team-2': 0, 'team-3': 0, 'team-4': 0 };
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
    const engine = new GameEngine(
      this.quizManager,
      {
        onGameEvent: (event: GameEvent) => {
          this.io.to(roomId).emit('game_event', event);
        },
        onQuizTrigger: (tankId: string, playerId: string, question: QuizQuestion, crateId: string) => {
          // Send quiz modal to specific player
          const targetPlayer = Array.from(room.players.values()).find(p => p.id === playerId || p.socketId === tankId);
          if (targetPlayer) {
            this.io.to(targetPlayer.socketId).emit('quiz_popup', {
              tankId,
              crateId,
              question
            });
          }
        },
        onTeamQuizTrigger: (teamId: string, question: QuizQuestion, crateId: string, tankId: string) => {
          const teamSupporters = Array.from(room.players.values()).filter(p => p.teamId === teamId && p.role === 'SUPPORT');
          if (teamSupporters.length > 0) {
            const timeLimitSeconds = question.timeLimitSeconds || (question.difficulty === 'HARD' ? 5 : (question.difficulty === 'MEDIUM' ? 4 : 3));
            const now = Date.now();
            const session: SquadQuizSession = {
              teamId,
              tankId,
              crateId,
              question,
              timeLimitSeconds,
              startTime: now,
              endTime: now + timeLimitSeconds * 1000,
              votes: new Map(),
              voterNames: new Map()
            };

            // Set auto-finalize timer when countdown completes
            session.timer = setTimeout(() => {
              this.finalizeTeamQuiz(roomId, teamId);
            }, (timeLimitSeconds + 0.2) * 1000);

            room.activeSquadQuizzes.set(teamId, session);

            // Send popup with timer ONLY to support teammates! Driver does NOT get popup!
            teamSupporters.forEach(p => {
              this.io.to(p.socketId).emit('team_quiz_popup', {
                teamId,
                question,
                crateId,
                tankId,
                timeLimitSeconds,
                startTime: now,
                endTime: now + timeLimitSeconds * 1000
              });
            });

            // Notify the driver
            const driver = Array.from(room.players.values()).find(p => p.teamId === teamId && p.role === 'DRIVER');
            if (driver) {
              this.io.to(driver.socketId).emit('game_event', {
                type: 'QUIZ_TRIGGERED',
                message: `📦 เก็บกล่องคำถาม! ทีมกำลังโหวตคำตอบ (${timeLimitSeconds} วิ)...`,
                sound: 'CRATE_PICKUP',
                tankId,
                teamId,
                timestamp: now
              });
            }
          } else {
            // If no support player on this team, driver answers as fallback
            const driver = Array.from(room.players.values()).find(p => p.teamId === teamId && p.role === 'DRIVER');
            if (driver) {
              this.io.to(driver.socketId).emit('quiz_popup', {
                tankId,
                crateId,
                question
              });
            }
          }
        },
        onGameOver: (winnerTankId, winnerTeamId, winnerName) => {
          room.state = 'GAME_OVER';
          this.io.to(roomId).emit('game_over', {
            winnerTankId,
            winnerTeamId,
            winnerName,
            leaderboard: Array.from(engine.tanks.values()).map(t => ({
              name: t.playerName,
              kills: t.kills,
              score: t.score,
              correctAnswers: t.correctAnswers,
              isDead: t.isDead
            })).sort((a, b) => b.score - a.score)
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
      if (p.role === 'DRIVER' || room.config.mode === 'FFA') {
        const tank = engine.addTank(
          p.socketId,
          p.id,
          p.name,
          p.tankColor,
          p.tankArchetype,
          p.teamId
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

    room.engine.setTankInput(socket.id, data.direction, data.isMoving);
  }

  public handleTankShoot(socket: Socket) {
    const roomId = this.playerRooms.get(socket.id);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room?.engine) return;

    room.engine.tankShoot(socket.id);
  }

  public handleQuizAnswer(socket: Socket, data: {
    tankId: string;
    crateId: string;
    questionId: string;
    selectedIndex: number;
  }) {
    const roomId = this.playerRooms.get(socket.id);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room?.engine) return;

    const result = room.engine.handleQuizAnswer(
      data.tankId,
      data.crateId,
      data.questionId,
      data.selectedIndex
    );

    socket.emit('quiz_result', result);
  }

  public handleVoteTeamQuiz(socket: Socket, data: { choiceIndex: number }) {
    const roomId = this.playerRooms.get(socket.id);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player || player.role !== 'SUPPORT') return;

    const session = room.activeSquadQuizzes.get(player.teamId);
    if (!session || Date.now() > session.endTime) return;

    // Record vote
    session.votes.set(socket.id, data.choiceIndex);
    session.voterNames.set(socket.id, player.name);

    // Compute live tally
    const voteCounts = [0, 0, 0, 0];
    for (const choice of session.votes.values()) {
      if (choice >= 0 && choice < 4) {
        voteCounts[choice]++;
      }
    }
    const totalVotes = session.votes.size;

    // Broadcast live vote counts to all members of this team
    const teamMembers = Array.from(room.players.values()).filter(p => p.teamId === player.teamId);
    teamMembers.forEach(m => {
      this.io.to(m.socketId).emit('team_quiz_vote_update', {
        teamId: player.teamId,
        voteCounts,
        totalVotes
      });
    });
  }

  private finalizeTeamQuiz(roomId: string, teamId: string) {
    const room = this.rooms.get(roomId);
    if (!room || !room.engine) return;
    const session = room.activeSquadQuizzes.get(teamId);
    if (!session) return;
    room.activeSquadQuizzes.delete(teamId);
    if (session.timer) clearTimeout(session.timer);

    // Count votes
    const voteCounts = [0, 0, 0, 0];
    for (const choice of session.votes.values()) {
      if (choice >= 0 && choice < 4) {
        voteCounts[choice]++;
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
    const supportName = totalVotes > 0 ? `เสียงส่วนใหญ่ (${maxVotes}/${totalVotes} โหวต)` : 'หมดเวลา (ไม่มีผู้โหวต)';

    const result = room.engine.handleTeamSupportAnswer(
      teamId,
      supportName,
      session.question.id,
      majorityChoice
    );

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
        explanationTh: result.explanationTh
      });
    });
  }

  public handleTeamSupportAnswer(socket: Socket, data: {
    questionId: string;
    selectedIndex: number;
  }) {
    // Forward single answers directly as a vote
    this.handleVoteTeamQuiz(socket, { choiceIndex: data.selectedIndex });
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

  private broadcastRoomState(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    this.io.to(roomId).emit('room_state', {
      config: room.config,
      state: room.state,
      players: Array.from(room.players.values())
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
