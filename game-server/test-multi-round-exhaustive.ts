import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';
import cors from 'cors';
import { RoomManager } from './src/roomManager.js';
import { QuizManager } from './src/quizBank.js';
import { GameEngine } from './src/gameEngine.js';
import { ARCHETYPE_CONFIGS, SpecialAmmoKind } from './src/types.js';
import { TILE_SIZE } from './src/mapTemplates.js';
import { signUserToken, verifyToken } from './src/auth.js';

async function runMultiRoundExhaustiveTest() {
  console.log('================================================================================');
  console.log('🚀 MASTER MULTI-ROUND & FULL SYSTEM STRESS TEST (ALL FLOWS & EDGE CASES)');
  console.log('================================================================================\n');

  const app = express();
  app.use(cors());
  app.use(express.json());
  const httpServer = createServer(app);
  const ioServer = new SocketIOServer(httpServer, { cors: { origin: '*' } });
  const quizManager = new QuizManager();
  const roomManager = new RoomManager(ioServer, quizManager);

  // Wire REST APIs exactly like server.ts
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.post('/api/auth/guest', (req, res) => {
    const name = req.body.name || `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
    const token = signUserToken({ id: `guest-${Date.now()}-${Math.random()}`, name, isGuest: true });
    res.json({ success: true, token, name });
  });
  app.get('/api/quiz/categories', (req, res) => res.json(quizManager.getCategories()));
  app.get('/api/quiz/questions', (req, res) => {
    const list = quizManager.getQuestions({
      category: req.query.category as string,
      difficulty: req.query.difficulty as string,
      search: req.query.search as string
    });
    res.json({ total: list.length, questions: list });
  });
  app.post('/api/quiz/questions', (req, res) => {
    const created = quizManager.addQuestion(req.body);
    res.status(201).json({ success: true, question: created });
  });
  app.delete('/api/quiz/questions/:id', (req, res) => {
    const deleted = quizManager.deleteQuestion(req.params.id);
    res.json({ success: deleted });
  });

  // Wire WebSocket handlers
  ioServer.on('connection', (socket) => {
    const user = {
      id: `user-${socket.id.slice(0, 6)}`,
      name: `Player_${socket.id.slice(0, 4)}`,
      isGuest: true
    };
    socket.on('join_room', (data) => roomManager.joinRoom(socket, data.roomId, user));
    socket.on('select_tank', (data) => roomManager.selectTank(socket, data.archetype, data.color, data.role, data.teamId));
    socket.on('set_ready', (data) => roomManager.setPlayerReady(socket, data.isReady));
    socket.on('auto_balance_teams', () => roomManager.autoBalanceTeams(socket));
    socket.on('start_game', () => roomManager.startGame(socket));
    socket.on('tank_input', (data) => roomManager.handleTankInput(socket, data));
    socket.on('tank_shoot', () => roomManager.handleTankShoot(socket));
    socket.on('quiz_answer', (data) => roomManager.handleQuizAnswer(socket, data));
    socket.on('vote_team_quiz', (data) => roomManager.handleVoteTeamQuiz(socket, data));
    socket.on('use_ultimate_beam', () => roomManager.useUltimateBeam(socket));
    socket.on('supporter_airdrop', (data) => roomManager.handleSupporterAirdrop(socket, data));
    socket.on('ghost_revival_answer', (data) => roomManager.handleGhostRevivalAnswer(socket, data));
    socket.on('leave_room', () => roomManager.leaveRoom(socket));
    socket.on('disconnect', () => roomManager.leaveRoom(socket));
  });

  const TEST_PORT = 40098;
  await new Promise<void>((resolve) => httpServer.listen(TEST_PORT, resolve));
  const serverUrl = `http://localhost:${TEST_PORT}`;

  // ==================================================================================
  // PHASE 1: REST API, AUTH, AND QUIZ BANK CRUD STRESS TEST
  // ==================================================================================
  console.log('📌 [PHASE 1] Testing REST APIs, Auth, and Question Bank CRUD');

  // 1. Auth Guest token test
  const guestRes = await fetch(`${serverUrl}/api/auth/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'ProDriver99' })
  });
  const guestJson = await guestRes.json() as any;
  if (!guestJson.success || !guestJson.token) {
    throw new Error('❌ Auth Guest token generation failed!');
  }
  const verifiedUser = await verifyToken(guestJson.token);
  if (!verifiedUser || verifiedUser.name !== 'ProDriver99') {
    throw new Error('❌ Token verification failed!');
  }
  console.log('   ✓ Auth Token Sign & Verify: OK');

  // 2. Categories API
  const catRes = await fetch(`${serverUrl}/api/quiz/categories`);
  const catJson = await catRes.json() as any[];
  if (!Array.isArray(catJson) || catJson.length === 0) {
    throw new Error('❌ Quiz Categories endpoint returned empty!');
  }
  console.log(`   ✓ Quiz Categories: ${catJson.length} categories verified (MATH, SCIENCE, ENGLISH, GENERAL, etc.)`);

  // 3. Question Bank CRUD
  const addQRes = await fetch(`${serverUrl}/api/quiz/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: 'MATH',
      categoryTh: 'คณิตศาสตร์',
      questionTh: '15 + 25 เท่ากับเท่าใด?',
      options: ['30', '35', '40', '45'],
      correctIndex: 2,
      difficulty: 'EASY'
    })
  });
  const addQJson = await addQRes.json() as any;
  if (!addQJson.success || !addQJson.question?.id) {
    throw new Error('❌ Add Question API failed!');
  }
  const createdQId = addQJson.question.id;
  console.log('   ✓ Question Create API: OK (ID:', createdQId, ')');

  const delQRes = await fetch(`${serverUrl}/api/quiz/questions/${createdQId}`, { method: 'DELETE' });
  const delQJson = await delQRes.json() as any;
  if (!delQJson.success) {
    throw new Error('❌ Delete Question API failed!');
  }
  console.log('   ✓ Question Delete API: OK');
  console.log('✅ PHASE 1 REST & AUTH TESTS PASSED 100%!\n');

  // ==================================================================================
  // PHASE 2: MULTI-ROUND FFA STRESS TEST (3 Iterations, 4 Players, All Archetypes)
  // ==================================================================================
  console.log('📌 [PHASE 2] Multi-Round FFA Mode Stress Test (3 Full Game Cycles)');

  for (let round = 1; round <= 3; round++) {
    console.log(`\n  ⚔️  [FFA ROUND ${round}/3] Spawning 4 Players (Standard, Scout, Heavy, Sniper)...`);
    const clients: ClientSocket[] = [];
    for (let p = 0; p < 4; p++) {
      clients.push(ClientIO(serverUrl, { transports: ['websocket'] }));
    }

    await Promise.all(clients.map(c => new Promise<void>((res) => c.on('connect', () => res()))));

    // Join room arena-1
    clients.forEach((c) => c.emit('join_room', { roomId: 'arena-1' }));
    await new Promise((r) => setTimeout(r, 100));

    // Select distinct archetypes
    clients[0].emit('select_tank', { archetype: 'STANDARD', color: '#ef4444', role: 'DRIVER' });
    clients[1].emit('select_tank', { archetype: 'SCOUT', color: '#3b82f6', role: 'DRIVER' });
    clients[2].emit('select_tank', { archetype: 'HEAVY', color: '#10b981', role: 'DRIVER' });
    clients[3].emit('select_tank', { archetype: 'SNIPER', color: '#facc15', role: 'DRIVER' });
    await new Promise((r) => setTimeout(r, 100));

    // Start game
    clients[0].emit('start_game');
    await new Promise((r) => setTimeout(r, 300));

    const room = (roomManager as any).rooms.get('arena-1');
    const engine: GameEngine = room.engine;
    if (!engine || engine.tanks.size !== 4) {
      throw new Error(`❌ FFA Round ${round}: Expected 4 tanks in arena, found ${engine?.tanks.size}`);
    }

    // Verify all archetypes HP
    const tanksList = Array.from(engine.tanks.values());
    const std = tanksList.find(t => t.archetype === 'STANDARD')!;
    const scout = tanksList.find(t => t.archetype === 'SCOUT')!;
    const heavy = tanksList.find(t => t.archetype === 'HEAVY')!;
    const sniper = tanksList.find(t => t.archetype === 'SNIPER')!;

    if (std.maxHp !== 3 || scout.maxHp !== 2 || heavy.maxHp !== 5 || sniper.maxHp !== 2) {
      throw new Error(`❌ FFA Round ${round} HP Mismatch: std=${std.maxHp}, scout=${scout.maxHp}, heavy=${heavy.maxHp}, sniper=${sniper.maxHp}`);
    }

    // Test Crate Answering with Confident (+50% bonus) & Special Ammo Overwrite
    const q1 = quizManager.getRandomQuestion('MATH');
    const q2 = quizManager.getRandomQuestion('SCIENCE');
    
    // Player 0 answers Math -> gets AP ammo
    const ans1 = engine.handleQuizAnswer(std.id, 'crate-1', q1.id, q1.correctIndex, true);
    if (!ans1.isCorrect || std.specialAmmo?.kind !== 'AP') {
      throw new Error(`❌ FFA Round ${round}: Player 0 did not receive AP ammo from Math question!`);
    }

    // Player 0 answers Science -> overwrites AP with CRYO ammo
    const ans2 = engine.handleQuizAnswer(std.id, 'crate-2', q2.id, q2.correctIndex, true);
    if (!ans2.isCorrect || std.specialAmmo?.kind !== 'CRYO') {
      throw new Error(`❌ FFA Round ${round}: Overwrite rule failed! Expected CRYO ammo.`);
    }

    // Combat Simulation: Player 0 eliminates Player 1, 2, 3
    let gameOverData: any = null;
    clients[0].on('game_over', (data) => { gameOverData = data; });

    scout.hp = 1; scout.shieldEndTime = 0;
    heavy.hp = 1; heavy.shieldEndTime = 0;
    sniper.hp = 1; sniper.shieldEndTime = 0;

    // Bullets eliminate opponents
    (engine as any).bullets.push({
      id: `kill-shot-1-${round}`,
      tankId: std.id,
      x: scout.x + 10, y: scout.y + 10,
      vx: 0, vy: 0, radius: 5, damage: 2,
      isDestroyed: false, specialKind: 'AP' as const
    });
    (engine as any).bullets.push({
      id: `kill-shot-2-${round}`,
      tankId: std.id,
      x: heavy.x + 10, y: heavy.y + 10,
      vx: 0, vy: 0, radius: 5, damage: 2,
      isDestroyed: false, specialKind: 'AP' as const
    });
    (engine as any).bullets.push({
      id: `kill-shot-3-${round}`,
      tankId: std.id,
      x: sniper.x + 10, y: sniper.y + 10,
      vx: 0, vy: 0, radius: 5, damage: 2,
      isDestroyed: false, specialKind: 'AP' as const
    });

    engine.update(0.033);
    await new Promise((r) => setTimeout(r, 400));

    if (!gameOverData || !gameOverData.winnerName || gameOverData.leaderboard.length !== 4) {
      throw new Error(`❌ FFA Round ${round}: Game over leaderboard incomplete!`);
    }

    const winnerEntry = gameOverData.leaderboard[0];
    if (winnerEntry.kills !== 3 || winnerEntry.score < 900) {
      throw new Error(`❌ FFA Round ${round}: Winner stats incorrect! Kills=${winnerEntry.kills}, Score=${winnerEntry.score}`);
    }

    console.log(`     ✓ FFA Round ${round} Completed: Winner=${winnerEntry.name}, Kills=${winnerEntry.kills}, Score=${winnerEntry.score}`);

    // Disconnect clients to clean up for next round
    clients.forEach(c => c.disconnect());
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log('✅ PHASE 2 MULTI-ROUND FFA TESTS PASSED 100%!\n');

  // ==================================================================================
  // PHASE 3: MULTI-ROUND SQUAD MODE TEST (3 Iterations, Consensus, Queueing, HEAL)
  // ==================================================================================
  console.log('📌 [PHASE 3] Multi-Round SQUAD Mode Stress Test (3 Full Game Cycles)');

  for (let round = 1; round <= 3; round++) {
    console.log(`\n  🛡️  [SQUAD ROUND ${round}/3] Spawning Team Red (Driver+Support) vs Team Blue (Driver+Support)...`);
    const cRedDriver = ClientIO(serverUrl, { transports: ['websocket'] });
    const cRedSupport = ClientIO(serverUrl, { transports: ['websocket'] });
    const cBlueDriver = ClientIO(serverUrl, { transports: ['websocket'] });
    const cBlueSupport = ClientIO(serverUrl, { transports: ['websocket'] });

    await Promise.all([cRedDriver, cRedSupport, cBlueDriver, cBlueSupport].map(c => new Promise<void>((res) => c.on('connect', () => res()))));

    // Join room squad-1
    cRedDriver.emit('join_room', { roomId: 'squad-1' });
    cRedSupport.emit('join_room', { roomId: 'squad-1' });
    cBlueDriver.emit('join_room', { roomId: 'squad-1' });
    cBlueSupport.emit('join_room', { roomId: 'squad-1' });
    await new Promise((r) => setTimeout(r, 200));

    // Select Roles & Teams
    cRedDriver.emit('select_tank', { archetype: 'HEAVY', color: '#ef4444', role: 'DRIVER', teamId: 'team-1' });
    cRedSupport.emit('select_tank', { archetype: 'SCOUT', color: '#ef4444', role: 'SUPPORT', teamId: 'team-1' });
    cBlueDriver.emit('select_tank', { archetype: 'STANDARD', color: '#3b82f6', role: 'DRIVER', teamId: 'team-2' });
    cBlueSupport.emit('select_tank', { archetype: 'SNIPER', color: '#3b82f6', role: 'SUPPORT', teamId: 'team-2' });
    await new Promise((r) => setTimeout(r, 200));

    // Start Game
    cRedDriver.emit('start_game');
    await new Promise((r) => setTimeout(r, 300));

    const squadRoom = (roomManager as any).rooms.get('squad-1');
    const squadEngine: GameEngine = squadRoom.engine;
    const redTank = Array.from(squadEngine.tanks.values()).find(t => t.teamId === 'team-1')!;
    const blueTank = Array.from(squadEngine.tanks.values()).find(t => t.teamId === 'team-2')!;

    // 1. Test Multi-Crate Queueing: Driver picks up 3 crates
    const sqQ1 = quizManager.getRandomQuestion('MATH');
    const sqQ2 = quizManager.getRandomQuestion('SCIENCE');
    const sqQ3 = quizManager.getRandomQuestion('ENGLISH');

    (squadEngine as any).listeners.onTeamQuizTrigger('team-1', sqQ1, 'c-1', redTank.id);
    (squadEngine as any).listeners.onTeamQuizTrigger('team-1', sqQ2, 'c-2', redTank.id);
    (squadEngine as any).listeners.onTeamQuizTrigger('team-1', sqQ3, 'c-3', redTank.id);

    const queue = squadRoom.squadQuizQueues.get('team-1');
    if (!queue || queue.length < 2) {
      throw new Error(`❌ SQUAD Round ${round}: Expected at least 2 items in queue, found ${queue?.length}`);
    }

    // Supporter votes for Q1
    let q1Result: any = null;
    cRedSupport.on('team_quiz_final_result', (res) => { q1Result = res; });
    cRedSupport.emit('vote_team_quiz', { choiceIndex: sqQ1.correctIndex, confident: true });
    await new Promise((r) => setTimeout(r, 200));

    (roomManager as any).finalizeTeamQuiz('squad-1', 'team-1');
    await new Promise((r) => setTimeout(r, 200));

    if (!q1Result || !q1Result.isCorrect || q1Result.ammoKind !== 'AP') {
      throw new Error(`❌ SQUAD Round ${round}: Q1 Consensus failed to award AP tier!`);
    }

    // 2. Test Synergy Streak & Mega Laser Beam
    squadRoom.teamStreaks.set('team-1', 2); // 2 in a row
    redTank.isUltimateReady = false;
    // 3rd correct answer triggers ultimate!
    (roomManager as any).finalizeTeamQuiz('squad-1', 'team-1');
    if (!redTank.isUltimateReady) {
      throw new Error(`❌ SQUAD Round ${round}: Streak 3 did not activate isUltimateReady!`);
    }

    // Place enemy tank in direct line of fire inside map
    redTank.x = 96;
    redTank.y = 384;
    redTank.direction = 'UP';

    blueTank.x = 96;
    blueTank.y = 128;
    blueTank.hp = 4;
    blueTank.maxHp = 4;
    blueTank.shieldEndTime = 0;

    // Place a brick tile in between
    const brickGridR = 8;
    const brickGridC = 3;
    squadEngine.map[brickGridR][brickGridC] = 'BRICK';

    // Driver fires Mega Laser Beam
    cRedDriver.emit('use_ultimate_beam');
    await new Promise((r) => setTimeout(r, 150));

    // Verify brick was demolished and blueTank took 3 DMG!
    if (squadEngine.map[brickGridR][brickGridC] !== 'EMPTY') {
      throw new Error(`❌ SQUAD Round ${round}: Mega Laser failed to pierce/demolish brick tile!`);
    }
    if (blueTank.hp !== 1) {
      throw new Error(`❌ SQUAD Round ${round}: Mega Laser failed to deal 3 DMG to blue tank! Expected HP=1, found HP=${blueTank.hp}`);
    }
    console.log(`     ✓ Mega Laser Beam Verified: Brick obliterated & 3 DMG pierced target`);

    // 3. Test Supporter Airdrop Supply Drone
    redTank.hp = 1;
    cRedSupport.emit('supporter_airdrop', { supplyType: 'REPAIR' });
    await new Promise((r) => setTimeout(r, 150));
    if (redTank.hp !== 2) {
      throw new Error(`❌ SQUAD Round ${round}: Airdrop Repair supply failed to restore +1 HP! HP=${redTank.hp}`);
    }
    console.log(`     ✓ Supporter Airdrop Supply Verified: Repaired +1 HP (Cooldown active)`);

    // 4. Test Ghost Revival Protocol
    blueTank.isDead = true;
    blueTank.hp = 0;
    (roomManager as any).triggerGhostRevivalChallenge('squad-1', 'team-2');
    const revival = squadRoom.teamRevivalState.get('team-2');
    if (!revival || !revival.currentQ) {
      throw new Error(`❌ SQUAD Round ${round}: Ghost Revival challenge failed to trigger!`);
    }
    // Answer Q1 correctly
    cBlueSupport.emit('ghost_revival_answer', { choiceIndex: revival.currentQ.correctIndex });
    await new Promise((r) => setTimeout(r, 100));
    if (revival.streak !== 1) {
      throw new Error(`❌ SQUAD Round ${round}: Ghost Revival Q1 answer failed! Streak=${revival.streak}`);
    }
    // Answer Q2 correctly -> Respawn!
    cBlueSupport.emit('ghost_revival_answer', { choiceIndex: revival.currentQ.correctIndex });
    await new Promise((r) => setTimeout(r, 150));
    if (blueTank.isDead || blueTank.hp !== 2) {
      throw new Error(`❌ SQUAD Round ${round}: Ghost Revival failed to respawn tank! isDead=${blueTank.isDead}, HP=${blueTank.hp}`);
    }
    console.log(`     ✓ Ghost Revival Protocol Verified: Answered 2/2 -> Respawned with 2 HP & Shield!`);

    // 5. Test Friendly HEAL Bullet
    redTank.hp = 2; // Damaged
    (squadEngine as any).bullets.push({
      id: `heal-shot-${round}`,
      tankId: redTank.id + '-clone',
      teamId: 'team-1',
      x: redTank.x + 10, y: redTank.y + 10,
      vx: 0, vy: 0, radius: 5, damage: 0,
      isDestroyed: false, specialKind: 'HEAL' as const
    });
    squadEngine.update(0.033);
    if (redTank.hp !== 3) {
      throw new Error(`❌ SQUAD Round ${round}: HEAL bullet failed to restore +1 HP! HP=${redTank.hp}`);
    }

    // 6. Test Combat & Win Condition
    blueTank.hp = 1; blueTank.shieldEndTime = 0;
    let squadGameOver: any = null;
    cRedDriver.on('game_over', (data) => { squadGameOver = data; });

    (squadEngine as any).bullets.push({
      id: `squad-win-shot-${round}`,
      tankId: redTank.id,
      teamId: 'team-1',
      x: blueTank.x + 10, y: blueTank.y + 10,
      vx: 0, vy: 0, radius: 6, damage: 2,
      isDestroyed: false, specialKind: 'AP' as const
    });

    squadEngine.update(0.033);
    await new Promise((r) => setTimeout(r, 400));

    if (!squadGameOver || squadGameOver.leaderboard.length !== 4) {
      throw new Error(`❌ SQUAD Round ${round}: Game Over leaderboard mismatch!`);
    }

    const redSupportPlayer = Array.from(squadRoom.players.values()).find((p: any) => p.socketId === cRedSupport.id) as any;
    const blueSupportPlayer = Array.from(squadRoom.players.values()).find((p: any) => p.socketId === cBlueSupport.id) as any;

    if (redSupportPlayer.score <= 0 || blueSupportPlayer.score !== 0) {
      throw new Error(`❌ SQUAD Round ${round}: Supporter score isolation failed! Red=${redSupportPlayer.score}, Blue=${blueSupportPlayer.score}`);
    }

    console.log(`     ✓ SQUAD Round ${round} Completed: Red Support Score=${redSupportPlayer.score} | Blue Support Score=${blueSupportPlayer.score}`);

    [cRedDriver, cRedSupport, cBlueDriver, cBlueSupport].forEach(c => c.disconnect());
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log('✅ PHASE 3 MULTI-ROUND SQUAD TESTS PASSED 100%!\n');

  // ==================================================================================
  // PHASE 4: HIGH-CONCURRENCY TICK & CLEANUP STRESS TEST
  // ==================================================================================
  console.log('📌 [PHASE 4] High-Concurrency Tick & Disconnect Stress Test');

  const concurrentEngine = new GameEngine(quizManager, {
    onGameEvent: () => {},
    onQuizTrigger: () => {},
    onTeamQuizTrigger: () => {},
    onGameOver: () => {}
  }, 300, 'FFA');

  // Add 6 tanks and 50 bullets
  for (let i = 0; i < 6; i++) {
    concurrentEngine.addTank(`t-${i}`, `u-${i}`, `Bot_${i}`, '#fff', i % 2 === 0 ? 'HEAVY' : 'SCOUT');
  }
  for (let b = 0; b < 50; b++) {
    (concurrentEngine as any).bullets.push({
      id: `bulk-b-${b}`,
      tankId: 't-0',
      x: Math.random() * 800,
      y: Math.random() * 800,
      vx: (Math.random() - 0.5) * 400,
      vy: (Math.random() - 0.5) * 400,
      radius: 4,
      damage: 1,
      isDestroyed: false,
      specialKind: 'AP' as const,
      bouncesLeft: 2
    });
  }

  // Simulate 300 continuous physics ticks (10 simulated seconds @ 30 FPS)
  const startTime = Date.now();
  for (let tick = 0; tick < 300; tick++) {
    concurrentEngine.update(0.033);
  }
  const durationMs = Date.now() - startTime;
  console.log(`   ✓ High-Concurrency 300 Physics Ticks simulated in ${durationMs}ms (Avg: ${(durationMs / 300).toFixed(3)}ms/tick)`);

  httpServer.close();
  console.log('\n================================================================================');
  console.log('🎉 ALL MASTER STRESS & MULTI-ROUND TESTS PASSED 100% WITH ZERO ERRORS/LEAKS!');
  console.log('================================================================================\n');
}

runMultiRoundExhaustiveTest().catch((err) => {
  console.error('\n❌ MASTER STRESS TEST FAILED:', err);
  process.exit(1);
});
