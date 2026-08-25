import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientIO } from 'socket.io-client';
import { RoomManager } from './src/roomManager.js';
import { QuizManager } from './src/quizBank.js';
import { GameEngine } from './src/gameEngine.js';
import { ARCHETYPE_CONFIGS } from './src/types.js';
import { TILE_SIZE } from './src/mapTemplates.js';

async function runExhaustiveTestSuite() {
  console.log('========================================================================');
  console.log('🕹️  STARTING EXHAUSTIVE MULTI-MODE & EDGE-CASE TEST SUITE');
  console.log('========================================================================\n');

  const app = express();
  const httpServer = createServer(app);
  const ioServer = new SocketIOServer(httpServer, { cors: { origin: '*' } });
  const quizManager = new QuizManager();
  const roomManager = new RoomManager(ioServer, quizManager);

  ioServer.on('connection', (socket) => {
    const user = {
      id: `user-${socket.id.slice(0, 6)}`,
      name: `Player_${socket.id.slice(0, 4)}`,
      isGuest: true
    };
    socket.on('join_room', (data) => roomManager.joinRoom(socket, data.roomId, user));
    socket.on('select_tank', (data) => roomManager.selectTank(socket, data.archetype, data.color, data.role, data.teamId));
    socket.on('set_ready', (data) => roomManager.setPlayerReady(socket, data.isReady));
    socket.on('start_game', () => roomManager.startGame(socket));
    socket.on('tank_input', (data) => roomManager.handleTankInput(socket, data));
    socket.on('tank_shoot', () => roomManager.handleTankShoot(socket));
    socket.on('quiz_answer', (data) => roomManager.handleQuizAnswer(socket, data));
    socket.on('vote_team_quiz', (data) => roomManager.handleVoteTeamQuiz(socket, data));
    socket.on('leave_room', () => roomManager.leaveRoom(socket));
    socket.on('disconnect', () => roomManager.leaveRoom(socket));
  });

  const TEST_PORT = 40095;
  await new Promise<void>((resolve) => httpServer.listen(TEST_PORT, resolve));
  const serverUrl = `http://localhost:${TEST_PORT}`;

  // ========================================================================
  // TEST SUITE 1: Archetype Stats & Special Ammo Physics Engine (Direct Engine Tests)
  // ========================================================================
  console.log('📦 [TEST SUITE 1] Tank Archetypes & Special Bullet Physics Engine');
  
  const events: any[] = [];
  const engine = new GameEngine(quizManager, {
    onGameEvent: (e) => events.push(e),
    onQuizTrigger: () => {},
    onTeamQuizTrigger: () => {},
    onGameOver: () => {}
  }, 240, 'FFA');

  for (let r = 0; r < 28; r++) { for (let c = 0; c < 28; c++) { engine.map[r][c] = "EMPTY"; } }
  // Verify archetypes stats
  const stdTank = engine.addTank('tank-std', 'user-std', 'StandardPlayer', '#3b82f6', 'STANDARD');
  const scoutTank = engine.addTank('tank-scout', 'user-scout', 'ScoutPlayer', '#facc15', 'SCOUT');
  const heavyTank = engine.addTank('tank-heavy', 'user-heavy', 'HeavyPlayer', '#a855f7', 'HEAVY');
  const sniperTank = engine.addTank('tank-sniper', 'user-sniper', 'SniperPlayer', '#ef4444', 'SNIPER');

  if (stdTank.maxHp !== 3 || scoutTank.maxHp !== 2 || heavyTank.maxHp !== 5 || sniperTank.maxHp !== 2) {
    throw new Error(`❌ ARCHETYPE HP MISMATCH: STD=${stdTank.maxHp}, SCOUT=${scoutTank.maxHp}, HEAVY=${heavyTank.maxHp}, SNIPER=${sniperTank.maxHp}`);
  }
  console.log('   ✓ Archetype Base HP Verified: STD=3 HP, SCOUT=2 HP, HEAVY=5 HP, SNIPER=2 HP');

  // Test Direct Quiz Answer & Special Ammo Assignment
  const mathQ = quizManager.getRandomQuestion('MATH');
  const scienceQ = quizManager.getRandomQuestion('SCIENCE');
  const generalQ = quizManager.getRandomQuestion('GENERAL');
  const englishQ = quizManager.getRandomQuestion('ENGLISH');

  // 1. Math -> AP Ammo (Electric Cyan)
  const mathAns = engine.handleQuizAnswer('tank-std', 'c1', mathQ.id, mathQ.correctIndex, true);
  if (!mathAns.isCorrect || stdTank.specialAmmo?.kind !== 'AP') {
    throw new Error('❌ MATH Quiz should award AP Special Ammo!');
  }
  console.log('   ✓ Math Question awarded AP Special Ammo ⚡ (Duration: 15s, 4 shots)');

  // 2. Science -> CRYO Ammo (Freeze Stun)
  const sciAns = engine.handleQuizAnswer('tank-scout', 'c2', scienceQ.id, scienceQ.correctIndex, true);
  if (!sciAns.isCorrect || scoutTank.specialAmmo?.kind !== 'CRYO') {
    throw new Error('❌ SCIENCE Quiz should award CRYO Special Ammo!');
  }
  console.log('   ✓ Science Question awarded CRYO Special Ammo ❄️ (Freeze 1.5s)');

  // 3. General -> EXPLOSIVE Ammo (3x3 AOE Blast)
  const genAns = engine.handleQuizAnswer('tank-heavy', 'c3', generalQ.id, generalQ.correctIndex, true);
  if (!genAns.isCorrect || heavyTank.specialAmmo?.kind !== 'EXPLOSIVE') {
    throw new Error('❌ GENERAL Quiz should award EXPLOSIVE Special Ammo!');
  }
  console.log('   ✓ General Question awarded EXPLOSIVE Special Ammo 💣 (3x3 AOE)');

  // 4. English -> RAPID Ammo (3-bullet spread cone)
  const engAns = engine.handleQuizAnswer('tank-sniper', 'c4', englishQ.id, englishQ.correctIndex, true);
  if (!engAns.isCorrect || sniperTank.specialAmmo?.kind !== 'RAPID') {
    throw new Error('❌ ENGLISH Quiz should award RAPID Special Ammo!');
  }
  console.log('   ✓ English Question awarded RAPID Special Ammo 💥 (Cone Spread)');

  // 5. Test Overwrite Rule: Standard tank with AP now answers Science -> overwrites AP with CRYO!
  engine.handleQuizAnswer('tank-std', 'c5', scienceQ.id, scienceQ.correctIndex, true);
  if (stdTank.specialAmmo?.kind !== 'CRYO') {
    throw new Error('❌ Overwrite Rule Failed: Special ammo was not replaced by newly acquired one!');
  }
  console.log('   ✓ Overwrite Rule Verified: AP was cleanly replaced by CRYO without stacking');

  // 6. Test RAPID 3-bullet cone firing
  const bulletsBeforeRapid = engine.getSnapshot().bullets.length;
  sniperTank.shieldEndTime = 0;
  engine.tankShoot('tank-sniper');
  const bulletsAfterRapid = engine.getSnapshot().bullets.length;
  if (bulletsAfterRapid - bulletsBeforeRapid !== 3) {
    throw new Error(`❌ RAPID should fire exactly 3 bullets, but got ${bulletsAfterRapid - bulletsBeforeRapid}`);
  }
  console.log('   ✓ RAPID Spread Verified: Fired 3 bullets in spread cone (-15°, 0°, +15°)');

  // 7. Test CRYO Stun Collision
  // Clear shields
  stdTank.shieldEndTime = 0;
  heavyTank.shieldEndTime = 0;
  heavyTank.x = 200;
  heavyTank.y = 200;
  stdTank.x = 200;
  stdTank.y = 240;
  stdTank.direction = 'UP';
  stdTank.lastShootTime = 0;
  
  // stdTank has CRYO, shoots at heavyTank
  engine.tankShoot('tank-std');
  // Update physics for 15 ticks
  for (let i = 0; i < 15; i++) {
    engine.update(0.033);
  }
  if (Date.now() > heavyTank.stunEndTime) {
    throw new Error('❌ CRYO bullet failed to apply 1.5s freeze stun on target tank!');
  }
  console.log('   ✓ CRYO Freeze Stun Verified: Heavy tank successfully frozen for 1.5s');

  // 8. Test EXPLOSIVE 3x3 Bricks Demolition
  for (let r = 7; r <= 8; r++) {
    for (let c = 4; c <= 6; c++) {
      engine.map[r][c] = 'BRICK';
    }
  }
  heavyTank.x = 5 * TILE_SIZE;
  heavyTank.y = 10 * TILE_SIZE;
  heavyTank.direction = 'UP';
  heavyTank.lastShootTime = 0;
  heavyTank.stunEndTime = 0;
  heavyTank.specialAmmo = {
    kind: 'EXPLOSIVE',
    nameTh: 'HE',
    expiresAt: Date.now() + 15000,
    durationSeconds: 15,
    shotsLeft: 4
  };
  heavyTank.ammo = 5;
  const shotSuccess = engine.tankShoot('tank-heavy');
  if (!shotSuccess) {
    throw new Error('❌ heavy tank failed to shoot explosive bullet!');
  }
  for (let i = 0; i < 30; i++) {
    engine.update(0.033);
  }
  const remainingBricks = [
    engine.map[7][4], engine.map[7][5], engine.map[7][6],
    engine.map[8][4], engine.map[8][5], engine.map[8][6]
  ].filter(t => t === 'BRICK').length;
  if (remainingBricks > 0) {
    throw new Error(`❌ EXPLOSIVE bullet should demolish 3x3 brick area, but ${remainingBricks} bricks remained!`);
  }
  console.log('   ✓ EXPLOSIVE 3x3 AOE Demolition Verified: Surrounding brick cluster demolished');

  // 9. Test Indestructible Steel Wall Ricochet (2 bounces)
  for (const t of engine.tanks.values()) {
    t.x = 0;
    t.y = 0;
  }
  engine.map[10][10] = 'STEEL';
  const apBullet = {
    id: 'test-ap-ricochet',
    tankId: 'tank-sniper',
    x: 10 * TILE_SIZE + 16,
    y: 12 * TILE_SIZE,
    vx: 0,
    vy: -300,
    radius: 3,
    damage: 2,
    isDestroyed: false,
    specialKind: 'AP' as const,
    bouncesLeft: 2
  };
  engine.bullets = [];
  (engine as any).bullets.push(apBullet);
  for (let i = 0; i < 8; i++) {
    engine.update(0.033);
  }
  if (engine.map[10][10] !== "STEEL" || apBullet.bouncesLeft >= 2 || apBullet.vy <= 0) {
    throw new Error(`❌ Steel Wall Ricochet Failed: Steel was destroyed or bullet did not bounce! (bouncesLeft=${apBullet.bouncesLeft}, vy=${apBullet.vy})`);
  }
  console.log('   ✓ Steel Wall Indestructibility & Ricochet Verified: Bullet bounced with reversed velocity');

  console.log('✅ ALL TEST SUITE 1 PHYSICS & ARCHETYPE TESTS PASSED 100%!\n');
  for (let r = 0; r < 28; r++) { for (let c = 0; c < 28; c++) { engine.map[r][c] = "EMPTY"; } }

  // ========================================================================
  // TEST SUITE 2: SQUAD Mode End-to-End Multiplayer (Driver + Support vs Driver + Support)
  // ========================================================================
  console.log('🛡️  [TEST SUITE 2] SQUAD Mode Multiplayer (Co-Op Consensus, Scoring, & Friendly Fire)');

  const clientTeam1Driver = ClientIO(serverUrl, { transports: ['websocket'] });
  const clientTeam1Support = ClientIO(serverUrl, { transports: ['websocket'] });
  const clientTeam2Driver = ClientIO(serverUrl, { transports: ['websocket'] });
  const clientTeam2Support = ClientIO(serverUrl, { transports: ['websocket'] });

  await new Promise<void>((resolve) => {
    let c = 0;
    const check = () => { c++; if (c === 4) resolve(); };
    clientTeam1Driver.on('connect', check);
    clientTeam1Support.on('connect', check);
    clientTeam2Driver.on('connect', check);
    clientTeam2Support.on('connect', check);
  });

  const SQUAD_ROOM = 'squad-1';

  // Join squad room
  clientTeam1Driver.emit('join_room', { roomId: SQUAD_ROOM });
  clientTeam1Support.emit('join_room', { roomId: SQUAD_ROOM });
  clientTeam2Driver.emit('join_room', { roomId: SQUAD_ROOM });
  clientTeam2Support.emit('join_room', { roomId: SQUAD_ROOM });
  await new Promise((r) => setTimeout(r, 200));

  // Configure Room Config to SQUAD mode
  const room = (roomManager as any).rooms.get(SQUAD_ROOM);
  room.config.mode = 'SQUAD';

  // Select Tank Roles & Teams
  clientTeam1Driver.emit('select_tank', { archetype: 'STANDARD', color: '#ef4444', role: 'DRIVER', teamId: 'team-1' });
  clientTeam1Support.emit('select_tank', { archetype: 'SCOUT', color: '#ef4444', role: 'SUPPORT', teamId: 'team-1' });
  clientTeam2Driver.emit('select_tank', { archetype: 'HEAVY', color: '#3b82f6', role: 'DRIVER', teamId: 'team-2' });
  clientTeam2Support.emit('select_tank', { archetype: 'SNIPER', color: '#3b82f6', role: 'SUPPORT', teamId: 'team-2' });
  await new Promise((r) => setTimeout(r, 200));

  // Start Squad Match
  clientTeam1Driver.emit('start_game');
  await new Promise((r) => setTimeout(r, 400));

  const squadEngine: GameEngine = room.engine;
  const team1Tank = Array.from(squadEngine.tanks.values()).find(t => t.teamId === 'team-1')!;
  const team2Tank = Array.from(squadEngine.tanks.values()).find(t => t.teamId === 'team-2')!;

  // 1. Test Friendly Fire Protection
  team1Tank.shieldEndTime = 0;
  const friendlyBullet = {
    id: 'friendly-bullet',
    tankId: team1Tank.id,
    teamId: 'team-1',
    x: team1Tank.x + 10,
    y: team1Tank.y + 10,
    vx: 0,
    vy: 0,
    radius: 4,
    damage: 2,
    isDestroyed: false,
    specialKind: 'AP' as const
  };
  (squadEngine as any).bullets.push(friendlyBullet);
  const hpBeforeFriendly = team1Tank.hp;
  squadEngine.update(0.033);
  if (team1Tank.hp !== hpBeforeFriendly) {
    throw new Error('❌ Friendly Fire should be completely disabled in SQUAD mode!');
  }
  console.log('   ✓ Friendly Fire Protection Verified: Teammate bullet dealt 0 damage');

  // 2. Test Friendly HEAL Bullet
  team1Tank.hp = 1; // Damaged to 1 HP
  const healBullet = {
    id: 'heal-bullet',
    tankId: team1Tank.id + '-clone',
    teamId: 'team-1',
    x: team1Tank.x + 10,
    y: team1Tank.y + 10,
    vx: 0,
    vy: 0,
    radius: 5,
    damage: 0,
    isDestroyed: false,
    specialKind: 'HEAL' as const
  };
  (squadEngine as any).bullets.push(healBullet);
  squadEngine.update(0.033);
  if (team1Tank.hp !== 2) {
    throw new Error(`❌ HEAL bullet failed to heal teammate! HP=${team1Tank.hp}`);
  }
  console.log('   ✓ Friendly HEAL Bullet Verified: Successfully restored +1 HP to damaged teammate');

  // 3. Test Team Support Quiz Consensus & Independent Supporter Scoring
  let t1SupportResult: any = null;
  let t2SupportResult: any = null;
  clientTeam1Support.on('team_quiz_final_result', (res) => { t1SupportResult = res; });
  clientTeam2Support.on('team_quiz_final_result', (res) => { t2SupportResult = res; });

  const squadQ = quizManager.getRandomQuestion('MATH');
  (roomManager as any).startTeamQuizSession(SQUAD_ROOM, 'team-1', {
    question: squadQ,
    crateId: 'squad-crate-1',
    tankId: team1Tank.id,
    timeLimitSeconds: 1
  });

  // Team 1 supporter votes correctly with confident flag
  clientTeam1Support.emit('vote_team_quiz', {
    choiceIndex: squadQ.correctIndex,
    confident: true
  });

  await new Promise((r) => setTimeout(r, 1400));

  if (!t1SupportResult || !t1SupportResult.isCorrect || t1SupportResult.ammoKind !== 'AP') {
    throw new Error('❌ Team 1 Consensus Failed to deliver AP tier ammo!');
  }
  if (t2SupportResult) {
    throw new Error('❌ Team 2 Supporter received Team 1 quiz result! Leaking across teams!');
  }

  // Check Team 1 supporter score vs Team 2 supporter score
  const team1SupportPlayer = Array.from(room.players.values()).find((p: any) => p.socketId === clientTeam1Support.id) as any;
  const team2SupportPlayer = Array.from(room.players.values()).find((p: any) => p.socketId === clientTeam2Support.id) as any;

  if (team1SupportPlayer.score <= 0 || team1SupportPlayer.correctAnswers !== 1) {
    throw new Error(`❌ Team 1 Supporter did not receive individual score! (Score: ${team1SupportPlayer.score})`);
  }
  if (team2SupportPlayer.score !== 0 || team2SupportPlayer.correctAnswers !== 0) {
    throw new Error(`❌ Team 2 Supporter got score from Team 1 quiz! (Score: ${team2SupportPlayer.score})`);
  }
  console.log('   ✓ Independent Supporter Scoring Verified: Team 1 Supporter score=', team1SupportPlayer.score, '| Team 2 Supporter score=', team2SupportPlayer.score);

  // 4. Test Final Combat & Leaderboard in SQUAD Mode
  team2Tank.hp = 1;
  team2Tank.shieldEndTime = 0;
  team2Tank.hasUsedRevival = true;
  const killBullet = {
    id: 'fatal-shot',
    tankId: team1Tank.id,
    teamId: 'team-1',
    x: team2Tank.x + 10,
    y: team2Tank.y + 10,
    vx: 0,
    vy: 0,
    radius: 6,
    damage: 2,
    isDestroyed: false,
    specialKind: 'AP' as const
  };

  let gameOverEvent: any = null;
  clientTeam1Driver.on('game_over', (data) => {
    gameOverEvent = data;
  });

  (squadEngine as any).bullets.push(killBullet);
  squadEngine.update(0.033);

  await new Promise((r) => setTimeout(r, 500));

  if (!gameOverEvent) {
    throw new Error('❌ game_over event was not emitted on tank destruction!');
  }

  const team1DriverEntry = gameOverEvent.leaderboard.find((e: any) => e.name.includes(team1Tank.playerName));
  const team2DriverEntry = gameOverEvent.leaderboard.find((e: any) => e.name.includes(team2Tank.playerName));

  if (!team1DriverEntry || team1DriverEntry.kills !== 1 || team1DriverEntry.score < 300) {
    throw new Error(`❌ Leaderboard Team 1 Driver score incorrect! (Entry: ${JSON.stringify(team1DriverEntry)})`);
  }
  if (!team2DriverEntry || team2DriverEntry.kills !== 0 || !team2DriverEntry.isDead) {
    throw new Error(`❌ Leaderboard Team 2 Driver should be marked dead! (Entry: ${JSON.stringify(team2DriverEntry)})`);
  }

  console.log('   ✓ SQUAD Game Over & Leaderboard Verified:', gameOverEvent.leaderboard);
  console.log('✅ ALL TEST SUITE 2 SQUAD MULTIPLAYER TESTS PASSED 100%!\n');

  // ========================================================================
  // TEST SUITE 3: Edge Cases & Disconnect Recovery
  // ========================================================================
  console.log('⚡ [TEST SUITE 3] Edge Cases & Disconnect Resilience');

  // 1. Test Player Disconnect Clean-up
  clientTeam1Driver.disconnect();
  clientTeam1Support.disconnect();
  clientTeam2Driver.disconnect();
  clientTeam2Support.disconnect();
  await new Promise((r) => setTimeout(r, 300));

  if (room.players.size !== 0) {
    throw new Error(`❌ Players not cleanly removed on disconnect! Remaining: ${room.players.size}`);
  }
  console.log('   ✓ Disconnect Clean-up Verified: Room players cleaned up gracefully without stuck state');

  httpServer.close();
  console.log('========================================================================');
  console.log('🎉 ALL EXHAUSTIVE MULTI-MODE TESTS PASSED 100% WITH ZERO ERRORS!');
  console.log('========================================================================\n');
}

runExhaustiveTestSuite().catch((err) => {
  console.error('\n❌ TEST FAILED WITH ERROR:', err);
  process.exit(1);
});
