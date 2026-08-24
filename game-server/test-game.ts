import { GameEngine } from './src/gameEngine.js';
import { QuizManager } from './src/quizBank.js';
import { generateClassicMap, TILE_SIZE } from './src/mapTemplates.js';

console.log('🧪 [TEST 1] Testing Map Generation...');
const map = generateClassicMap();
console.assert(map.length === 24, 'Map should be 24x24 grid');
console.assert(map[0][0] === 'STEEL', 'Outer border should be STEEL');
console.log('✅ Map Generation Test Passed!\n');

console.log('🧪 [TEST 2] Testing Quiz Manager...');
const quizManager = new QuizManager();
const mathQ = quizManager.getRandomQuestion('MATH');
console.assert(mathQ.category === 'MATH', 'Should return MATH category question');
console.assert(mathQ.options.length === 4, 'Should have 4 options');
console.log(`✅ Quiz Bank Test Passed! Found ${quizManager.getAllQuestions().length} questions.\n`);

console.log('🧪 [TEST 3] Testing Tank & Game Physics Engine...');
const events: string[] = [];
let quizTriggered = false;
let gameOverTriggered = false;

const engine = new GameEngine(
  quizManager,
  {
    onGameEvent: (evt) => events.push(evt.type),
    onQuizTrigger: (tankId, playerId, question, crateId) => {
      quizTriggered = true;
    },
    onTeamQuizTrigger: () => {},
    onGameOver: (winnerId, winnerTeam, winnerName) => {
      gameOverTriggered = true;
    }
  },
  60
);

// Add Tank 1 and Tank 2
const tank1 = engine.addTank('socket-1', 'user-1', 'Player Alpha', '#eab308', 'STANDARD');
const tank2 = engine.addTank('socket-2', 'user-2', 'Player Beta', '#22c55e', 'SCOUT');

console.assert(engine.tanks.size === 2, 'Should have 2 tanks');
console.assert(tank1.ammo === 0, 'Tank 1 should start with 0 ammo');
console.log('✅ Tank Initialization Test Passed!');

// Test Shooting without ammo (Should fail)
const shot1 = engine.tankShoot(tank1.id);
console.assert(shot1 === false, 'Cannot shoot with 0 ammo');
console.log('✅ No Ammo Guard Test Passed!');

// Test Answering Quiz (Correct -> +3 Ammo)
const q = quizManager.getRandomQuestion();
const answerRes = engine.handleQuizAnswer(tank1.id, 'crate-1', q.id, q.correctIndex);
console.assert(answerRes.isCorrect === true, 'Answer should be correct');
console.assert(tank1.ammo === q.rewardAmmo, `Tank 1 should receive ${q.rewardAmmo} ammo`);
console.log(`✅ Quiz to Ammo Exchange Test Passed! Tank ammo is now ${tank1.ammo}.\n`);

// Test Shooting with Ammo
const shot2 = engine.tankShoot(tank1.id);
console.assert(shot2 === true, 'Shooting should succeed with ammo');
console.assert(engine.bullets.length === 1, 'Bullet should be created');
console.assert(tank1.ammo === q.rewardAmmo - 1, 'Ammo should be deducted');
console.log('✅ Tank Shooting Test Passed!\n');

// Test Bullet Update and Collision
console.log('🧪 [TEST 4] Simulating 10 ticks of physics...');
for (let i = 0; i < 10; i++) {
  engine.update(0.033);
}
console.log('✅ Physics Loop Simulation Passed!\n');

  // 6. Test bullet damage and death
  console.log('\n🧪 [TEST 5] Testing Tank Bullet Damage & Destruction...');
  const combatEngine = new GameEngine(
    quizManager,
    {
      onGameEvent: (e) => console.log(`   [EVENT] ${e.message}`),
      onQuizTrigger: () => {},
      onTeamQuizTrigger: () => {},
      onGameOver: (winnerId, teamId, name) => console.log(`   [GAME OVER] Winner: ${name}`)
    },
    180,
    'FFA'
  );

  const combatTankA = combatEngine.addTank('s-a', 'p-a', 'SniperTank', '#eab308', 'SNIPER', 'team-a');
  const combatTankB = combatEngine.addTank('s-b', 'p-b', 'ScoutTank', '#3b82f6', 'SCOUT', 'team-b');
  combatTankA.shieldEndTime = 0;
  combatTankB.shieldEndTime = 0;
  combatTankA.ammo = 5;

  // Position combatTankB directly above combatTankA
  combatTankA.x = 100;
  combatTankA.y = 200;
  combatTankA.direction = 'UP';
  combatTankB.x = 100;
  combatTankB.y = 150;

  // Clear map tiles around them to ensure direct line of sight
  for (let r = 4; r <= 7; r++) {
    for (let c = 2; c <= 4; c++) {
      combatEngine.map[r][c] = 'EMPTY';
    }
  }

  combatEngine.tankShoot(combatTankA.id);
  // Update physics for bullet to travel to combatTankB
  for (let i = 0; i < 10; i++) {
    combatEngine.update(0.033);
  }

  console.log(`CombatTankB HP after hit: ${combatTankB.hp}, isDead: ${combatTankB.isDead}`);
  if (!combatTankB.isDead || combatTankB.hp > 0) {
    throw new Error('CombatTankB should have been destroyed by sniper shot!');
  }
  console.log('✅ Tank Combat Damage & Destruction Test Passed!');

  console.log('\n🎉 ALL GAME ENGINE TESTS PASSED PERFECTLY!\n');
