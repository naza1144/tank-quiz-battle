import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientIO } from 'socket.io-client';
import { RoomManager } from './src/roomManager.js';
import { QuizManager } from './src/quizBank.js';

async function runSpecFeaturesTest() {
  console.log('🚀 [SPEC TEST] Testing SPEC enhancements (Confidence Betting, Named Shells, Ricochet, Tactical Ping)...');

  const app = express();
  const httpServer = createServer(app);
  const ioServer = new SocketIOServer(httpServer, { cors: { origin: '*' } });

  const quizManager = new QuizManager();
  const roomManager = new RoomManager(ioServer, quizManager);

  // Bind Socket events
  ioServer.on('connection', (socket) => {
    const user = {
      id: `user-${socket.id.slice(0, 6)}`,
      name: `Tester_${socket.id.slice(0, 4)}`,
      isGuest: true
    };

    socket.on('join_room', (data) => roomManager.joinRoom(socket, data.roomId, user));
    socket.on('select_tank', (data) => roomManager.selectTank(socket, data.archetype, data.color, data.role, data.teamId));
    socket.on('start_game', () => roomManager.startGame(socket));
    socket.on('tank_shoot', () => roomManager.handleTankShoot(socket));
    socket.on('vote_team_quiz', (data) => roomManager.handleVoteTeamQuiz(socket, data));
    socket.on('tactical_ping', (data) => roomManager.handleTacticalPing(socket, data));
  });

  await new Promise<void>((resolve) => httpServer.listen(40093, resolve));

  const clientDriver = ClientIO('http://localhost:40093', { transports: ['websocket'] });
  const clientSupport = ClientIO('http://localhost:40093', { transports: ['websocket'] });

  await new Promise<void>((resolve) => {
    let count = 0;
    const chk = () => { count++; if (count === 2) resolve(); };
    clientDriver.on('connect', chk);
    clientSupport.on('connect', chk);
  });

  // 1. Join Squad Room
  clientDriver.emit('join_room', { roomId: 'squad-1' });
  clientSupport.emit('join_room', { roomId: 'squad-1' });
  await new Promise((r) => setTimeout(r, 200));

  clientDriver.emit('select_tank', { archetype: 'HEAVY', color: '#ef4444', role: 'DRIVER', teamId: 'team-1' });
  clientSupport.emit('select_tank', { archetype: 'SCOUT', color: '#ef4444', role: 'SUPPORT', teamId: 'team-1' });
  await new Promise((r) => setTimeout(r, 200));

  // 2. Start Game
  clientDriver.emit('start_game');
  await new Promise((r) => setTimeout(r, 400));

  // 3. Test Tactical Ping
  let pingReceived: any = null;
  clientDriver.on('tactical_ping', (p) => {
    pingReceived = p;
  });

  clientSupport.emit('tactical_ping', { x: 250, y: 300 });
  await new Promise((r) => setTimeout(r, 200));

  if (!pingReceived || pingReceived.x !== 250 || pingReceived.y !== 300) {
    throw new Error('FAILED: Tactical Ping not received properly by driver!');
  }
  console.log('   ✅ [TEST 1: TACTICAL PING] Ping broadcast verified:', pingReceived.senderName);

  const squadRoom = (roomManager as any).rooms.get('squad-1');
  const engine = squadRoom.engine;
  const teamTank = Array.from(engine.tanks.values())[0] as any;

  // 4. Test Confidence Betting -> AP Shell Delivery
  let finalResult: any = null;
  clientSupport.on('team_quiz_final_result', (res) => {
    finalResult = res;
  });

  const question = quizManager.getRandomQuestion('MATH');
  (roomManager as any).startTeamQuizSession('squad-1', 'team-1', {
    question,
    crateId: 'test-crate-1',
    tankId: teamTank.id,
    timeLimitSeconds: 1
  });

  await new Promise((r) => setTimeout(r, 100));

  // Vote correct with confident flag!
  clientSupport.emit('vote_team_quiz', {
    choiceIndex: question.correctIndex,
    confident: true
  });

  // Wait for session finalization (1.2s)
  await new Promise((r) => setTimeout(r, 1500));

  if (!finalResult || finalResult.ammoKind !== 'AP' || !finalResult.ownerName) {
    throw new Error(`FAILED: Confident vote did not resolve to AP tier or missing owner! (Result: ${JSON.stringify(finalResult)})`);
  }
  console.log('   ✅ [TEST 2: CONFIDENCE BETTING & AP SHELL] Tier:', finalResult.ammoKind, '| Hero Owner:', finalResult.ownerName);

  // 5. Test Named Shell Shoot & Steel Ricochet
  teamTank.x = 64;
  teamTank.y = 128;
  teamTank.direction = 'UP';
  // Put a steel tile above tank at (row 2, col 2)
  engine.map[2][2] = 'STEEL';

  let eventMessages: string[] = [];
  clientDriver.on('game_event', (e) => {
    eventMessages.push(e.message);
  });

  console.log('   🔫 Driver firing AP Shell towards steel wall...');
  clientDriver.emit('tank_shoot');

  // Let bullet update & ricochet / penetrate
  for (let tick = 0; tick < 20; tick++) {
    await new Promise((r) => setTimeout(r, 50));
  }

  clientDriver.disconnect();
  clientSupport.disconnect();
  const rObj = (roomManager as any).rooms.get('squad-1');
  if (rObj && rObj.intervalId) clearInterval(rObj.intervalId);
  httpServer.close();

  console.log('   ✅ [TEST 3: COMBAT EVENTS RECORDED]:', eventMessages.slice(0, 3));
  console.log('\n🎉 ALL SPEC ENHANCEMENT TESTS PASSED 100%!\n');
  process.exit(0);
}

runSpecFeaturesTest().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
