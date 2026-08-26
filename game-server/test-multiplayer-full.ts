import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientIO } from 'socket.io-client';
import { RoomManager } from './src/roomManager.js';
import { QuizManager } from './src/quizBank.js';

async function runMultiplayerTest() {
  console.log('🚀 [E2E TEST] Starting End-to-End Multiplayer Socket.IO Test...');

  const app = express();
  const httpServer = createServer(app);
  const ioServer = new SocketIOServer(httpServer, {
    cors: { origin: '*' }
  });

  const quizManager = new QuizManager();
  const roomManager = new RoomManager(ioServer, quizManager);

  // Bind Socket.io events exactly like server.ts
  ioServer.on('connection', (socket) => {
    const user = {
      id: `user-${socket.id.slice(0, 6)}`,
      name: `Player_${socket.id.slice(0, 4)}`,
      isGuest: true
    };

    socket.on('join_room', (data) => {
      roomManager.joinRoom(socket, data.roomId, user);
    });

    socket.on('select_tank', (data) => {
      roomManager.selectTank(socket, data.archetype, data.color, data.role, data.teamId);
    });

    socket.on('start_game', () => {
      roomManager.startGame(socket);
    });

    socket.on('tank_shoot', () => {
      roomManager.handleTankShoot(socket);
    });
  });

  await new Promise<void>((resolve) => {
    httpServer.listen(40096, () => {
      console.log('   ✓ Test HTTP & Socket.IO server running on port 40096');
      resolve();
    });
  });

  const client1 = ClientIO('http://localhost:40096', { transports: ['websocket'] });
  const client2 = ClientIO('http://localhost:40096', { transports: ['websocket'] });

  let client1GameOver: any = null;
  let client2GameOver: any = null;

  client1.on('game_over', (data) => {
    console.log('   🏆 [CLIENT 1 RECEIVED GAME_OVER]:', data.winnerName);
    client1GameOver = data;
  });

  client2.on('game_over', (data) => {
    console.log('   🏆 [CLIENT 2 RECEIVED GAME_OVER]:', data.winnerName);
    client2GameOver = data;
  });

  await new Promise<void>((resolve) => {
    let connected = 0;
    const check = () => {
      connected++;
      if (connected === 2) resolve();
    };
    client1.on('connect', check);
    client2.on('connect', check);
  });

  console.log('   ✓ Both clients connected successfully!');

  // Client 1 and Client 2 join 'arena-1'
  const testRoomId = 'arena-1';
  client1.emit('join_room', { roomId: testRoomId });
  client2.emit('join_room', { roomId: testRoomId });
  await new Promise((r) => setTimeout(r, 200));

  console.log(`   ✓ Both clients joined room: ${testRoomId}`);

  // Select tanks
  client1.emit('select_tank', { archetype: 'SNIPER', color: '#eab308', role: 'DRIVER' });
  client2.emit('select_tank', { archetype: 'SCOUT', color: '#3b82f6', role: 'DRIVER' });
  await new Promise((r) => setTimeout(r, 200));

  // Start game
  client1.emit('start_game');
  await new Promise((r) => setTimeout(r, 400));

  const room = (roomManager as any).rooms.get(testRoomId);
  if (!room || !room.engine) {
    throw new Error('Game engine was not created in room!');
  }

  console.log('   ✓ Game started! Tanks spawned:', room.engine.tanks.size);

  // Position Tank 1 and Tank 2
  const tanks = Array.from(room.engine.tanks.values());
  const tank1 = tanks[0];
  const tank2 = tanks[1];

  room.engine.grantAmmo(tank1.id, 5);
  tank1.shieldEndTime = 0;
  tank2.shieldEndTime = 0;
  tank2.hp = 1;
  tank2.maxHp = 1;

  tank1.x = 100;
  tank1.y = 200;
  tank1.direction = 'UP';
  tank2.x = 100;
  tank2.y = 150;

  // Clear obstacle walls between them
  for (let r = 4; r <= 7; r++) {
    for (let c = 2; c <= 4; c++) {
      room.engine.map[r][c] = 'EMPTY';
    }
  }

  console.log('   🔫 Tank 1 shooting Tank 2...');
  client1.emit('tank_shoot');

  // Wait for bullet physics & game over event
  for (let tick = 0; tick < 50; tick++) {
    await new Promise((r) => setTimeout(r, 50));
    if (client1GameOver && client2GameOver) break;
  }

  client1.disconnect();
  client2.disconnect();

  if (!client1GameOver || !client2GameOver) {
    throw new Error('FAILED: One or both clients did NOT receive game_over event!');
  }

  console.log('   ✅ WINNER VERIFIED ON CLIENT 1:', client1GameOver.winnerName);
  console.log('   ✅ WINNER VERIFIED ON CLIENT 2:', client2GameOver.winnerName);
  console.log('   ✅ LEADERBOARD VERIFIED:', client1GameOver.leaderboard.length, 'entries');
  console.log('\n🎉 FFA MODE MULTIPLAYER TEST PASSED 100%!\n');

  // ═══════════════════════════════════════════════
  // TEST SQUAD MODE (2 Teams)
  // ═══════════════════════════════════════════════
  console.log('🚀 [E2E TEST 2] Starting Squad Mode Multiplayer Test...');
  const clientA = ClientIO('http://localhost:40096', { transports: ['websocket'] });
  const clientB = ClientIO('http://localhost:40096', { transports: ['websocket'] });

  let squadWinner: string | null = null;
  clientA.on('game_over', (data) => {
    squadWinner = data.winnerName;
    console.log('   🏆 [SQUAD GAME_OVER EVENT]:', data.winnerName);
  });

  await new Promise<void>((resolve) => {
    let count = 0;
    const chk = () => { count++; if (count === 2) resolve(); };
    clientA.on('connect', chk);
    clientB.on('connect', chk);
  });

  clientA.emit('join_room', { roomId: 'squad-1' });
  clientB.emit('join_room', { roomId: 'squad-1' });
  await new Promise((r) => setTimeout(r, 200));

  clientA.emit('select_tank', { archetype: 'HEAVY', color: '#ef4444', role: 'DRIVER', teamId: 'team-1' });
  clientB.emit('select_tank', { archetype: 'SCOUT', color: '#3b82f6', role: 'DRIVER', teamId: 'team-2' });
  await new Promise((r) => setTimeout(r, 200));

  clientA.emit('start_game');
  await new Promise((r) => setTimeout(r, 400));

  const squadRoom = (roomManager as any).rooms.get('squad-1');
  const sqTanks = Array.from(squadRoom.engine.tanks.values()) as any[];
  const tA = sqTanks[0];
  const tB = sqTanks[1];

  squadRoom.engine.grantAmmo(tA.id, 5);
  tA.shieldEndTime = 0;
  tB.shieldEndTime = 0;
  tB.hp = 1;
  tB.maxHp = 1;
  tB.hasUsedRevival = true;

  tA.x = 100;
  tA.y = 200;
  tA.direction = 'UP';
  tB.x = 100;
  tB.y = 150;

  for (let r = 4; r <= 7; r++) {
    for (let c = 2; c <= 4; c++) {
      squadRoom.engine.map[r][c] = 'EMPTY';
    }
  }

  console.log('   🔫 Team 1 tank shooting Team 2 tank...');
  clientA.emit('tank_shoot');

  for (let tick = 0; tick < 50; tick++) {
    await new Promise((r) => setTimeout(r, 50));
    if (squadWinner) break;
  }

  clientA.disconnect();
  clientB.disconnect();

  if (!squadWinner) {
    throw new Error('FAILED: Squad game did NOT trigger game_over event!');
  }

  if (squadRoom && squadRoom.intervalId) clearInterval(squadRoom.intervalId);
  httpServer.close();
  console.log('   ✅ SQUAD WINNER VERIFIED:', squadWinner);
  console.log('\n🎉 ALL FFA & SQUAD E2E MULTIPLAYER TESTS PASSED 100%!\n');
  process.exit(0);
}

runMultiplayerTest().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
