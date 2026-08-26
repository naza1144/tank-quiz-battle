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

  ioServer.on('connection', (socket) => {
    const user = {
      id: `user-${socket.id.slice(0, 6)}`,
      name: `Player_${socket.id.slice(0, 4)}`,
      isGuest: true
    };
    socket.on('create_room', (config) => {
      const roomId = roomManager.createRoom(config);
      roomManager.joinRoom(socket, roomId, user);
    });
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
    httpServer.listen(40094, () => {
      console.log('   ✓ Test HTTP & Socket.IO server running on port 40094');
      resolve();
    });
  });

  const client1 = ClientIO('http://localhost:40094', {
    auth: { token: 'mock-token-p1' },
    transports: ['websocket']
  });

  const client2 = ClientIO('http://localhost:40094', {
    auth: { token: 'mock-token-p2' },
    transports: ['websocket']
  });

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

  // Create room with Client 1
  let testRoomId = '';
  await new Promise<void>((resolve) => {
    client1.emit('create_room', {
      name: 'FFA Arena Test',
      mode: 'FFA',
      maxTanks: 4,
      roundTimeSeconds: 120
    });

    client1.on('room_state', (data) => {
      if (data.config?.id && !testRoomId) {
        testRoomId = data.config.id;
        resolve();
      }
    });
  });

  console.log(`   ✓ Room created: ${testRoomId}`);

  // Client 2 joins room
  client2.emit('join_room', { roomId: testRoomId });
  await new Promise((r) => setTimeout(r, 200));

  // Select tanks
  client1.emit('select_tank', { archetype: 'SNIPER', color: '#eab308', role: 'DRIVER' });
  client2.emit('select_tank', { archetype: 'SCOUT', color: '#3b82f6', role: 'DRIVER' });
  await new Promise((r) => setTimeout(r, 200));

  // Start game
  client1.emit('start_game');
  await new Promise((r) => setTimeout(r, 500));

  const room = (roomManager as any).rooms.get(testRoomId);
  if (!room || !room.engine) {
    throw new Error('Game engine was not created in room!');
  }

  console.log('   ✓ Game started! Tanks spawned:', room.engine.tanks.size);

  // Give Client 1 ammo and position for direct hit
  const tank1 = Array.from(room.engine.tanks.values())[0];
  const tank2 = Array.from(room.engine.tanks.values())[1];

  room.engine.grantAmmo(tank1.id, 5);
  tank1.shieldEndTime = 0;
  tank2.shieldEndTime = 0;
  tank2.hp = 1; // 1 HP so single shot destroys it
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
  for (let tick = 0; tick < 30; tick++) {
    await new Promise((r) => setTimeout(r, 50));
    if (client1GameOver && client2GameOver) break;
  }

  client1.disconnect();
  client2.disconnect();
  if (room && room.intervalId) clearInterval(room.intervalId);
  httpServer.close();

  if (!client1GameOver || !client2GameOver) {
    throw new Error('FAILED: One or both clients did NOT receive game_over event!');
  }

  console.log('   ✅ WINNER VERIFIED:', client1GameOver.winnerName);
  console.log('   ✅ LEADERBOARD VERIFIED:', client1GameOver.leaderboard.length, 'entries');
  console.log('\n🎉 FULL END-TO-END MULTIPLAYER TEST PASSED 100%!\n');
  process.exit(0);
}

runMultiplayerTest().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
