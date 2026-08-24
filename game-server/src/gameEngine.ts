import { 
  Direction, 
  TileType, 
  Tank, 
  Bullet, 
  QuizCrate, 
  GameEvent, 
  ARCHETYPE_CONFIGS,
  QuizQuestion 
} from './types.js';
import { 
  MAP_GRID_SIZE, 
  TILE_SIZE, 
  MAP_WIDTH, 
  MAP_HEIGHT, 
  generateClassicMap,
  TANK_SPAWN_POINTS,
  CRATE_SPAWN_LOCATIONS 
} from './mapTemplates.js';
import { QuizManager } from './quizBank.js';

export interface GameEngineListener {
  onGameEvent: (event: GameEvent) => void;
  onQuizTrigger: (tankId: string, playerId: string, question: QuizQuestion, crateId: string) => void;
  onTeamQuizTrigger: (teamId: string, question: QuizQuestion, crateId: string, tankId: string) => void;
  onGameOver: (winnerTankId?: string, winnerTeamId?: string, winnerName?: string) => void;
}

export class GameEngine {
  public map: TileType[][];
  public tanks: Map<string, Tank> = new Map();
  public bullets: Bullet[] = [];
  public crates: QuizCrate[] = [];
  public events: GameEvent[] = [];
  public isRunning: boolean = false;
  public roundTimeRemaining: number;
  public mode: 'FFA' | 'SQUAD';
  private quizManager: QuizManager;
  private listeners: GameEngineListener;
  private lastTickTime: number = Date.now();
  private bulletIdCounter: number = 1;
  private crateIdCounter: number = 1;

  constructor(
    quizManager: QuizManager, 
    listeners: GameEngineListener, 
    roundDurationSeconds: number = 300,
    mode: 'FFA' | 'SQUAD' = 'FFA'
  ) {
    this.quizManager = quizManager;
    this.listeners = listeners;
    this.roundTimeRemaining = roundDurationSeconds;
    this.mode = mode;
    this.map = generateClassicMap();
    this.initCrates();
  }

  private initCrates() {
    this.crates = CRATE_SPAWN_LOCATIONS.map((loc, idx) => ({
      id: `crate-${this.crateIdCounter++}`,
      x: loc.x + 4,
      y: loc.y + 4,
      width: 24,
      height: 24,
      category: loc.category,
      isActive: true,
      respawnTime: 0
    }));
  }

  public addTank(
    id: string, 
    playerId: string, 
    playerName: string, 
    color: string, 
    archetype: any, 
    teamId?: string, 
    isBot: boolean = false, 
    botDifficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM'
  ): Tank {
    const config = ARCHETYPE_CONFIGS[archetype as keyof typeof ARCHETYPE_CONFIGS] || ARCHETYPE_CONFIGS.STANDARD;
    const spawnIndex = this.tanks.size % TANK_SPAWN_POINTS.length;
    const spawn = TANK_SPAWN_POINTS[spawnIndex];

    const tank: Tank = {
      id,
      playerId,
      playerName,
      color,
      archetype,
      x: spawn.x + 2,
      y: spawn.y + 2,
      width: 28,
      height: 28,
      direction: spawn.direction,
      isMoving: false,
      hp: config.hp,
      maxHp: config.hp,
      ammo: 0, // Starts with 0 ammo! Must do Quiz to get ammo!
      maxAmmo: config.maxAmmo,
      speed: config.speed,
      bulletSpeed: config.bulletSpeed,
      bulletDamage: config.bulletDamage,
      isDead: false,
      score: 0,
      kills: 0,
      deaths: 0,
      correctAnswers: 0,
      shieldEndTime: Date.now() + 3000, // 3s spawn shield
      speedBoostEndTime: 0,
      stunEndTime: 0,
      teamId,
      isBot,
      botDifficulty,
      lastShootTime: 0
    };

    this.tanks.set(id, tank);
    return tank;
  }

  public removeTank(id: string) {
    this.tanks.delete(id);
  }

  public setTankInput(tankId: string, direction: Direction | null, isMoving: boolean) {
    const tank = this.tanks.get(tankId);
    if (!tank || tank.isDead) return;
    if (Date.now() < tank.stunEndTime) return; // Stunned

    if (direction) {
      tank.direction = direction;
    }
    tank.isMoving = isMoving;
  }

  public tankShoot(tankId: string): boolean {
    const tank = this.tanks.get(tankId);
    if (!tank || tank.isDead) return false;
    if (Date.now() < tank.stunEndTime) return false;

    // Cooldown check (250ms minimum)
    const now = Date.now();
    if (now - tank.lastShootTime < 250) return false;

    // Check ammo
    if (tank.ammo <= 0) {
      this.listeners.onGameEvent({
        type: 'QUIZ_FAIL',
        message: `${tank.playerName} ไม่มีกระสุน! วิ่งไปเก็บกล่อง Quiz [?] หรือให้เพื่อนช่วยตอบคำถาม`,
        sound: 'NO_AMMO',
        tankId: tank.id,
        timestamp: now
      });
      return false;
    }

    tank.ammo -= 1;
    tank.lastShootTime = now;

    // Spawn bullet at cannon tip
    let bx = tank.x + tank.width / 2;
    let by = tank.y + tank.height / 2;
    let vx = 0;
    let vy = 0;

    const bSpeed = tank.bulletSpeed;
    if (tank.direction === 'UP') {
      by = tank.y - 4;
      vy = -bSpeed;
    } else if (tank.direction === 'DOWN') {
      by = tank.y + tank.height + 4;
      vy = bSpeed;
    } else if (tank.direction === 'LEFT') {
      bx = tank.x - 4;
      vx = -bSpeed;
    } else if (tank.direction === 'RIGHT') {
      bx = tank.x + tank.width + 4;
      vx = bSpeed;
    }

    const bullet: Bullet = {
      id: `bullet-${this.bulletIdCounter++}`,
      tankId: tank.id,
      teamId: tank.teamId,
      x: bx,
      y: by,
      vx,
      vy,
      damage: tank.bulletDamage,
      speed: bSpeed,
      radius: 4,
      isDestroyed: false
    };

    this.bullets.push(bullet);

    this.listeners.onGameEvent({
      type: 'TANK_HIT',
      message: `${tank.playerName} ยิงกระสุน!`,
      sound: 'SHOOT',
      tankId: tank.id,
      timestamp: now
    });

    return true;
  }

  // Answer Quiz Result from Player
  public handleQuizAnswer(
    tankId: string, 
    crateId: string, 
    questionId: string, 
    selectedIndex: number
  ): { isCorrect: boolean; rewardAmmo: number; explanationTh: string } {
    const tank = this.tanks.get(tankId);
    const question = this.quizManager.getQuestionById(questionId);
    const now = Date.now();

    if (!question) {
      return { isCorrect: false, rewardAmmo: 0, explanationTh: 'คำถามไม่ถูกต้อง' };
    }

    const isCorrect = selectedIndex === question.correctIndex;
    const crate = this.crates.find(c => c.id === crateId);

    if (crate) {
      crate.isActive = false;
      crate.respawnTime = now + 12000; // Respawn after 12s
    }

    if (tank) {
      tank.answeringQuizId = undefined;
      if (isCorrect) {
        tank.ammo = Math.min(tank.maxAmmo, tank.ammo + question.rewardAmmo);
        tank.score += question.bonusPoints;
        tank.correctAnswers += 1;

        // Bonus: 25% chance of speed boost or shield
        if (Math.random() < 0.25) {
          tank.shieldEndTime = now + 4000;
        }

        this.listeners.onGameEvent({
          type: 'QUIZ_SUCCESS',
          message: `🎯 ${tank.playerName} ตอบคำถามถูก! ได้รับกระสุน +${question.rewardAmmo} นัด (+${question.bonusPoints} คะแนน)`,
          sound: 'QUIZ_CORRECT',
          tankId: tank.id,
          teamId: tank.teamId,
          timestamp: now
        });
      } else {
        tank.stunEndTime = now + 1500; // 1.5s stun
        this.listeners.onGameEvent({
          type: 'QUIZ_FAIL',
          message: `❌ ${tank.playerName} ตอบผิด! ไม่ได้กระสุน (ติดสตัน 1.5 วิ)`,
          sound: 'QUIZ_WRONG',
          tankId: tank.id,
          teamId: tank.teamId,
          timestamp: now
        });
      }
    }

    return {
      isCorrect,
      rewardAmmo: isCorrect ? question.rewardAmmo : 0,
      explanationTh: question.explanationTh
    };
  }

  // Handle support teammate answering quiz
  public handleTeamSupportAnswer(
    teamId: string, 
    supportPlayerName: string, 
    questionId: string, 
    selectedIndex: number
  ): { isCorrect: boolean; rewardAmmo: number; explanationTh: string } {
    const question = this.quizManager.getQuestionById(questionId);
    const now = Date.now();

    if (!question) {
      return { isCorrect: false, rewardAmmo: 0, explanationTh: 'คำถามไม่ถูกต้อง' };
    }

    const isCorrect = selectedIndex === question.correctIndex;
    
    // Find tank in this team
    let teamTank: Tank | undefined;
    for (const t of this.tanks.values()) {
      if (t.teamId === teamId && !t.isDead) {
        teamTank = t;
        break;
      }
    }

    if (teamTank) {
      teamTank.answeringQuizId = undefined; // Release crate lock
      if (isCorrect) {
        teamTank.ammo = Math.min(teamTank.maxAmmo, teamTank.ammo + question.rewardAmmo);
        teamTank.score += question.bonusPoints;
        teamTank.correctAnswers += 1;

        this.listeners.onGameEvent({
          type: 'AMMO_DELIVERED',
          message: `📦 [${supportPlayerName}] ตอบถูก! ส่งกระสุน +${question.rewardAmmo} นัด ให้ ${teamTank.playerName}`,
          sound: 'QUIZ_CORRECT',
          tankId: teamTank.id,
          teamId: teamId,
          timestamp: now
        });
      } else {
        this.listeners.onGameEvent({
          type: 'QUIZ_FAIL',
          message: `❌ [${supportPlayerName}] ตอบคำถามผิด! (ไม่ได้กระสุน)`,
          sound: 'QUIZ_WRONG',
          tankId: teamTank.id,
          teamId: teamId,
          timestamp: now
        });
      }
    }

    return {
      isCorrect,
      rewardAmmo: isCorrect ? question.rewardAmmo : 0,
      explanationTh: question.explanationTh
    };
  }

  public update(dt: number) {
    const now = Date.now();

    // 1. Update round timer
    this.roundTimeRemaining = Math.max(0, this.roundTimeRemaining - dt);
    if (this.roundTimeRemaining <= 0) {
      this.checkWinCondition(true);
      return;
    }

    // 2. Respawn crates
    this.crates.forEach(c => {
      if (!c.isActive && now >= c.respawnTime) {
        c.isActive = true;
      }
    });

    // 3. Update Tanks
    for (const tank of this.tanks.values()) {
      if (tank.isDead) continue;

      // Check Movement
      if (tank.isMoving && now >= tank.stunEndTime) {
        let currentSpeed = tank.speed;
        if (now < tank.speedBoostEndTime) currentSpeed *= 1.4;

        let dx = 0;
        let dy = 0;
        if (tank.direction === 'UP') dy = -currentSpeed * dt;
        if (tank.direction === 'DOWN') dy = currentSpeed * dt;
        if (tank.direction === 'LEFT') dx = -currentSpeed * dt;
        if (tank.direction === 'RIGHT') dx = currentSpeed * dt;

        this.moveTankWithCollision(tank, dx, dy);
      }

      // Check Crate Pickup Collision
      if (!tank.answeringQuizId && now >= tank.stunEndTime) {
        for (const crate of this.crates) {
          if (crate.isActive && this.isBoxColliding(tank.x, tank.y, tank.width, tank.height, crate.x, crate.y, crate.width, crate.height)) {
            crate.isActive = false;
            crate.respawnTime = now + 12000;
            tank.answeringQuizId = crate.id;

            const question = this.quizManager.getRandomQuestion(crate.category);
            
            if (this.mode === 'SQUAD' && tank.teamId) {
              this.listeners.onTeamQuizTrigger(tank.teamId, question, crate.id, tank.id);
            } else {
              this.listeners.onQuizTrigger(tank.id, tank.playerId, question, crate.id);
            }
            break;
          }
        }
      }
    }

    // 4. Update Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (b.isDestroyed) {
        this.bullets.splice(i, 1);
        continue;
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Check out of bounds
      if (b.x < 0 || b.x > MAP_WIDTH || b.y < 0 || b.y > MAP_HEIGHT) {
        b.isDestroyed = true;
        this.bullets.splice(i, 1);
        continue;
      }

      // Check Bullet vs Map Collision
      const gridC = Math.floor(b.x / TILE_SIZE);
      const gridR = Math.floor(b.y / TILE_SIZE);

      if (gridR >= 0 && gridR < MAP_GRID_SIZE && gridC >= 0 && gridC < MAP_GRID_SIZE) {
        const tile = this.map[gridR][gridC];
        if (tile === 'BRICK') {
          this.map[gridR][gridC] = 'EMPTY'; // Destroy brick
          b.isDestroyed = true;
          this.listeners.onGameEvent({
            type: 'TANK_HIT',
            message: 'กำแพงอิฐถูกทำลาย!',
            sound: 'BRICK_HIT',
            timestamp: now
          });
          this.bullets.splice(i, 1);
          continue;
        } else if (tile === 'STEEL') {
          b.isDestroyed = true;
          this.listeners.onGameEvent({
            type: 'TANK_HIT',
            message: 'กระสุนกระทบกำแพงเหล็ก!',
            sound: 'STEEL_HIT',
            timestamp: now
          });
          this.bullets.splice(i, 1);
          continue;
        }
      }

      // Check Bullet vs Tank Collision
      let hitTank = false;
      for (const targetTank of this.tanks.values()) {
        if (targetTank.isDead) continue;
        if (targetTank.id === b.tankId) continue; // Cannot hit self
        // Friendly fire is ONLY disabled in SQUAD mode! In FFA mode, all tanks can damage each other.
        if (this.mode === 'SQUAD' && b.teamId && targetTank.teamId && b.teamId === targetTank.teamId) {
          continue;
        }

        // Bounding box collision with bullet radius
        const isHit = this.isBoxColliding(
          b.x - b.radius,
          b.y - b.radius,
          b.radius * 2,
          b.radius * 2,
          targetTank.x,
          targetTank.y,
          targetTank.width,
          targetTank.height
        );

        if (isHit) {
          b.isDestroyed = true;
          hitTank = true;

          const shooterTank = this.tanks.get(b.tankId);
          const shooterName = shooterTank ? shooterTank.playerName : 'ใครบางคน';

          if (now < targetTank.shieldEndTime) {
            // Shield absorbed!
            this.listeners.onGameEvent({
              type: 'TANK_HIT',
              message: `🛡️ เกราะกำบังของ ${targetTank.playerName} ป้องกันกระสุนได้!`,
              sound: 'SHIELD_HIT',
              tankId: targetTank.id,
              timestamp: now
            });
          } else {
            targetTank.hp = Math.max(0, targetTank.hp - b.damage);
            if (shooterTank) shooterTank.score += 50;

            if (targetTank.hp <= 0) {
              targetTank.hp = 0;
              targetTank.isDead = true;
              targetTank.deaths += 1;
              if (shooterTank) {
                shooterTank.kills += 1;
                shooterTank.score += 300;
              }

              this.listeners.onGameEvent({
                type: 'TANK_DESTROYED',
                message: `💥 ${shooterName} ยิงทำลายรถถังของ ${targetTank.playerName}!`,
                sound: 'EXPLOSION',
                tankId: targetTank.id,
                timestamp: now
              });

              this.checkWinCondition();
            } else {
              this.listeners.onGameEvent({
                type: 'TANK_HIT',
                message: `🎯 ${targetTank.playerName} โดนยิง! (เหลือ ${targetTank.hp}/${targetTank.maxHp} HP)`,
                sound: 'TANK_HIT',
                tankId: targetTank.id,
                timestamp: now
              });
            }
          }
          break;
        }
      }

      if (hitTank) {
        this.bullets.splice(i, 1);
      }
    }
  }

  private moveTankWithCollision(tank: Tank, dx: number, dy: number) {
    const newX = Math.max(0, Math.min(MAP_WIDTH - tank.width, tank.x + dx));
    const newY = Math.max(0, Math.min(MAP_HEIGHT - tank.height, tank.y + dy));

    // Check Map Tile Obstacle Collision (BRICK, STEEL, WATER)
    if (!this.checkObstacleCollision(newX, newY, tank.width, tank.height)) {
      // Check Tank-to-Tank Collision
      let collidesWithTank = false;
      for (const other of this.tanks.values()) {
        if (other.id === tank.id || other.isDead) continue;
        if (this.isBoxColliding(newX, newY, tank.width, tank.height, other.x, other.y, other.width, other.height)) {
          collidesWithTank = true;
          break;
        }
      }

      if (!collidesWithTank) {
        tank.x = newX;
        tank.y = newY;
      }
    }
  }

  private checkObstacleCollision(x: number, y: number, w: number, h: number): boolean {
    const startC = Math.floor(x / TILE_SIZE);
    const endC = Math.floor((x + w - 1) / TILE_SIZE);
    const startR = Math.floor(y / TILE_SIZE);
    const endR = Math.floor((y + h - 1) / TILE_SIZE);

    for (let r = startR; r <= endR; r++) {
      for (let c = startC; c <= endC; c++) {
        if (r < 0 || r >= MAP_GRID_SIZE || c < 0 || c >= MAP_GRID_SIZE) return true;
        const tile = this.map[r][c];
        if (tile === 'BRICK' || tile === 'STEEL' || tile === 'WATER') {
          return true;
        }
      }
    }
    return false;
  }

  private isBoxColliding(x1: number, y1: number, w1: number, h1: number, x2: number, y2: number, w2: number, h2: number): boolean {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  private isPointInBox(px: number, py: number, bx: number, by: number, bw: number, bh: number): boolean {
    return px >= bx && px <= bx + bw && py >= by && py <= by + bh;
  }

  public checkWinCondition(timeUp: boolean = false) {
    const aliveTanks = Array.from(this.tanks.values()).filter(t => !t.isDead);

    if (aliveTanks.length <= 1 || timeUp) {
      this.isRunning = false;
      const winner = aliveTanks[0] || Array.from(this.tanks.values()).sort((a, b) => b.score - a.score)[0];
      this.listeners.onGameOver(
        winner?.id,
        winner?.teamId,
        winner ? winner.playerName : 'ไม่มีผู้ชนะ'
      );
    }
  }

  public getSnapshot() {
    return {
      roundTimeRemaining: Math.ceil(this.roundTimeRemaining),
      tanks: Array.from(this.tanks.values()),
      bullets: this.bullets,
      crates: this.crates,
      map: this.map
    };
  }
}
