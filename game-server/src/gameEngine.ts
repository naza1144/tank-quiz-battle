import { 
  Direction, 
  TileType, 
  Tank, 
  Bullet, 
  QuizCrate, 
  GameEvent, 
  ARCHETYPE_CONFIGS,
  QuizQuestion,
  SpecialAmmoKind,
  AmmoKind
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
  public isRunning: boolean = true;
  public roundTimeRemaining: number;
  public mode: 'FFA' | 'SQUAD';
  public selectedSubject: string = 'ALL';
  private quizManager: QuizManager;
  private listeners: GameEngineListener;
  private lastTickTime: number = Date.now();
  private bulletIdCounter: number = 1;
  private crateIdCounter: number = 1;

  constructor(
    quizManager: QuizManager, 
    listeners: GameEngineListener, 
    roundDurationSeconds: number = 300,
    mode: 'FFA' | 'SQUAD' = 'FFA',
    selectedSubject: string = 'ALL'
  ) {
    this.quizManager = quizManager;
    this.listeners = listeners;
    this.roundTimeRemaining = roundDurationSeconds;
    this.mode = mode;
    this.selectedSubject = selectedSubject || 'ALL';
    this.map = generateClassicMap();
    this.initCrates();
    this.isRunning = true;
  }

  private getRandomValidTilePosition(): { x: number; y: number } | null {
    const validPositions: { r: number; c: number }[] = [];

    // Search interior grid (avoiding border walls)
    for (let r = 2; r < MAP_GRID_SIZE - 2; r++) {
      for (let c = 2; c < MAP_GRID_SIZE - 2; c++) {
        const tile = this.map[r][c];
        if (tile === 'EMPTY' || tile === 'BUSH' || tile === 'ICE') {
          const px = c * TILE_SIZE + 4;
          const py = r * TILE_SIZE + 4;
          // Check no active crate nearby (within 1.5 tiles)
          const hasCrateNearby = this.crates.some(
            crate => crate.isActive && Math.hypot(crate.x - px, crate.y - py) < TILE_SIZE * 1.5
          );
          if (!hasCrateNearby) {
            validPositions.push({ r, c });
          }
        }
      }
    }

    if (validPositions.length === 0) return null;

    const chosen = validPositions[Math.floor(Math.random() * validPositions.length)];
    return {
      x: chosen.c * TILE_SIZE + 4,
      y: chosen.r * TILE_SIZE + 4
    };
  }

  private initCrates(initialCount: number = 8) {
    const categories = ['MATH', 'SCIENCE', 'ENGLISH', 'LOGIC', 'GENERAL'];
    this.crates = [];

    for (let i = 0; i < initialCount; i++) {
      const pos = this.getRandomValidTilePosition();
      if (pos) {
        const category = (this.selectedSubject && this.selectedSubject !== 'ALL')
          ? this.selectedSubject
          : categories[i % categories.length];

        this.crates.push({
          id: `crate-${this.crateIdCounter++}`,
          x: pos.x,
          y: pos.y,
          width: 24,
          height: 24,
          category,
          isActive: true,
          respawnTime: 0
        });
      }
    }
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
      jammedUntil: 0,
      shells: [],
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

  private getSpecialAmmoFromCategory(category: string): { kind: SpecialAmmoKind; nameTh: string } {
    switch (category?.toUpperCase()) {
      case 'SCIENCE':
      case 'CHEMISTRY':
        return { kind: 'CRYO', nameTh: 'กระสุนแช่แข็ง (CRYO ❄️)' };
      case 'MATH':
      case 'LOGIC':
        return { kind: 'AP', nameTh: 'กระสุนเจาะเกราะ (AP ⚡)' };
      case 'ENGLISH':
      case 'GENERAL':
        return { kind: 'RAPID', nameTh: 'กระสุนรัว 3 ทิศทาง (RAPID 💥)' };
      case 'HEAL':
        return { kind: 'HEAL', nameTh: 'กระสุนซ่อมแซม (HEAL 💚)' };
      default:
        return { kind: 'EXPLOSIVE', nameTh: 'กระสุนระเบิดกัมปนาท (HE 💣)' };
    }
  }

  // Shoot Bullet
  public tankShoot(tankId: string): boolean {
    const tank = this.tanks.get(tankId);
    const now = Date.now();
    if (!tank || tank.isDead) return false;

    // Check gun jammed
    if (tank.jammedUntil && now < tank.jammedUntil) {
      this.listeners.onGameEvent({
        type: 'TANK_HIT',
        message: `⚠️ ปืนของ ${tank.playerName} ขัดลำกล้องอยู่ (${((tank.jammedUntil - now) / 1000).toFixed(1)}s)`,
        sound: 'NO_AMMO',
        tankId: tank.id,
        timestamp: now
      });
      return false;
    }

    if (tank.ammo <= 0) {
      this.listeners.onGameEvent({
        type: 'TANK_HIT',
        message: `${tank.playerName} ไม่มีกระสุน! วิ่งไปเก็บกล่อง Quiz [?] หรือให้เพื่อนช่วยตอบคำถาม`,
        sound: 'NO_AMMO',
        tankId: tank.id,
        timestamp: now
      });
      return false;
    }

    tank.ammo -= 1;
    tank.lastShootTime = now;

    // Check active special ammo & 15s duration
    let activeSpecial = tank.specialAmmo && now <= tank.specialAmmo.expiresAt && tank.specialAmmo.shotsLeft > 0
      ? tank.specialAmmo
      : null;

    if (tank.specialAmmo && now > tank.specialAmmo.expiresAt) {
      tank.specialAmmo = null;
    }

    // Pop top shell from tank stack (SPEC §4)
    if (!tank.shells) tank.shells = [];
    const shell = tank.shells.length > 0
      ? tank.shells.pop()
      : { kind: 'STD' as const, damage: tank.bulletDamage };

    // Spawn bullet at cannon tip
    let bx = tank.x + tank.width / 2;
    let by = tank.y + tank.height / 2;
    let baseAngle = 0;

    const bSpeed = activeSpecial?.kind === 'AP' || shell?.kind === 'AP' ? tank.bulletSpeed * 1.25 : tank.bulletSpeed;
    if (tank.direction === 'UP') {
      by = tank.y - 4;
      baseAngle = -Math.PI / 2;
    } else if (tank.direction === 'DOWN') {
      by = tank.y + tank.height + 4;
      baseAngle = Math.PI / 2;
    } else if (tank.direction === 'LEFT') {
      bx = tank.x - 4;
      baseAngle = Math.PI;
    } else if (tank.direction === 'RIGHT') {
      bx = tank.x + tank.width + 4;
      baseAngle = 0;
    }

    if (activeSpecial && activeSpecial.kind === 'RAPID') {
      // 💥 RAPID TRIPLE SHOT SPREAD
      const spreadAngles = [-0.22, 0, 0.22];
      spreadAngles.forEach(offset => {
        const angle = baseAngle + offset;
        this.bullets.push({
          id: `bullet-${this.bulletIdCounter++}`,
          tankId: tank.id,
          teamId: tank.teamId,
          x: bx,
          y: by,
          vx: Math.cos(angle) * bSpeed,
          vy: Math.sin(angle) * bSpeed,
          damage: 1,
          speed: bSpeed,
          radius: 4,
          isDestroyed: false,
          shell,
          specialKind: 'RAPID',
          bouncesLeft: 1
        });
      });
      activeSpecial.shotsLeft -= 1;
      if (activeSpecial.shotsLeft <= 0) tank.specialAmmo = null;
    } else {
      // Standard or Single Special Bullet
      let dmg = shell ? shell.damage : tank.bulletDamage;
      let radius = 4;
      let bouncesLeft = 2;
      let specialKind: SpecialAmmoKind | undefined = activeSpecial ? activeSpecial.kind : (shell?.kind === 'AP' ? 'AP' : undefined);

      if (activeSpecial) {
        if (activeSpecial.kind === 'AP') {
          dmg = 2;
          radius = 5;
          bouncesLeft = 2;
        } else if (activeSpecial.kind === 'CRYO') {
          dmg = 1.5;
          radius = 5;
          bouncesLeft = 1;
        } else if (activeSpecial.kind === 'EXPLOSIVE') {
          dmg = 2;
          radius = 6;
          bouncesLeft = 0;
        } else if (activeSpecial.kind === 'HEAL') {
          dmg = 1;
          radius = 5;
          bouncesLeft = 1;
        }

        activeSpecial.shotsLeft -= 1;
        if (activeSpecial.shotsLeft <= 0) tank.specialAmmo = null;
      }

      this.bullets.push({
        id: `bullet-${this.bulletIdCounter++}`,
        tankId: tank.id,
        teamId: tank.teamId,
        x: bx,
        y: by,
        vx: Math.cos(baseAngle) * bSpeed,
        vy: Math.sin(baseAngle) * bSpeed,
        damage: dmg,
        speed: bSpeed,
        radius,
        isDestroyed: false,
        shell,
        specialKind,
        bouncesLeft
      });
    }

    const ammoLabel = activeSpecial 
      ? activeSpecial.nameTh 
      : (shell?.kind === 'AP' ? 'เจาะเกราะ (AP ⚡)' : shell?.kind === 'DUD' ? 'ด้าน (DUD)' : 'มาตรฐาน');

    this.listeners.onGameEvent({
      type: 'TANK_HIT',
      message: `${tank.playerName} ยิง${ammoLabel}!`,
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
    selectedIndex: number,
    confident: boolean = false
  ): { isCorrect: boolean; rewardAmmo: number; explanationTh: string; ammoKind: AmmoKind } {
    const tank = this.tanks.get(tankId);
    const question = this.quizManager.getQuestionById(questionId);
    const now = Date.now();

    if (!question) {
      return { isCorrect: false, rewardAmmo: 0, explanationTh: 'คำถามไม่ถูกต้อง', ammoKind: 'STD' };
    }

    const isCorrect = selectedIndex === question.correctIndex;
    const crate = this.crates.find(c => c.id === crateId);

    if (crate) {
      crate.isActive = false;
      crate.respawnTime = now + 12000; // Respawn after 12s
    }

    let ammoKind: AmmoKind = 'STD';
    let damage = 1;

    if (tank) {
      tank.answeringQuizId = undefined;
      if (!tank.shells) tank.shells = [];

      if (isCorrect) {
        if (confident) {
          const specInfo = this.getSpecialAmmoFromCategory(question.category);
          ammoKind = specInfo.kind;
          damage = 2;

          // OVERWRITE RULE: Resets old special ammo and replaces with new 15s special ammo!
          tank.specialAmmo = {
            kind: specInfo.kind,
            nameTh: specInfo.nameTh,
            expiresAt: now + 15000,
            durationSeconds: 15,
            shotsLeft: 4,
            ownerName: tank.playerName
          };
        } else {
          ammoKind = 'STD';
          damage = 1;
        }

        const ammoGain = question.rewardAmmo || 2;
        for (let k = 0; k < ammoGain; k++) {
          tank.shells.push({
            kind: ammoKind,
            damage,
            ownerId: tank.playerId,
            ownerName: tank.playerName,
            questionId: question.id
          });
        }

        tank.ammo = Math.min(tank.maxAmmo, tank.ammo + ammoGain);
        tank.score += question.bonusPoints * (confident ? 1.5 : 1);
        tank.correctAnswers += 1;

        // Bonus: 25% chance of shield
        if (Math.random() < 0.25) {
          tank.shieldEndTime = now + 4000;
        }

        const specialBadge = tank.specialAmmo ? ` พร้อมพลังออร่า ${tank.specialAmmo.nameTh} (15 วิ)!` : '';

        this.listeners.onGameEvent({
          type: 'QUIZ_SUCCESS',
          message: `🎯 ${tank.playerName} ตอบถูก${confident ? ' (มั่นใจมาก! 🚩)' : ''}! ได้รับกระสุน +${ammoGain} นัด${specialBadge}`,
          sound: 'QUIZ_CORRECT',
          tankId: tank.id,
          teamId: tank.teamId,
          timestamp: now
        });
      } else {
        if (confident) {
          tank.jammedUntil = now + 3000; // 3s jammed if confident wrong!
        } else {
          tank.stunEndTime = now + 1200; // 1.2s stun
        }

        this.listeners.onGameEvent({
          type: 'QUIZ_FAIL',
          message: `❌ ${tank.playerName} ตอบผิด${confident ? ' (มั่นใจผิด! ปืนขัด 3 วิ ⚠️)' : '!'} ไม่ได้กระสุน`,
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
      explanationTh: question.explanationTh,
      ammoKind
    };
  }

  // Handle support teammate answering quiz
  public handleTeamSupportAnswer(
    teamId: string, 
    supportPlayerName: string, 
    questionId: string, 
    selectedIndex: number,
    tier: 'AP' | 'STD' | 'DUD' = 'STD',
    ownerName?: string,
    isJammed: boolean = false
  ): { isCorrect: boolean; rewardAmmo: number; explanationTh: string; ammoKind: AmmoKind; ownerName?: string; isJammed: boolean } {
    const question = this.quizManager.getQuestionById(questionId);
    const now = Date.now();

    if (!question) {
      return { isCorrect: false, rewardAmmo: 0, explanationTh: 'คำถามไม่ถูกต้อง', ammoKind: tier, isJammed: false };
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

    let rewardAmmo = isCorrect ? (question.rewardAmmo || 2) : 0;
    let damage = tier === 'AP' ? 2 : tier === 'DUD' ? 0.5 : 1;

    if (teamTank) {
      teamTank.answeringQuizId = undefined; // Release crate lock
      if (!teamTank.shells) teamTank.shells = [];

      if (isJammed) {
        teamTank.jammedUntil = now + 3000; // 3s gun jam
        this.listeners.onGameEvent({
          type: 'QUIZ_FAIL',
          message: `⚠️ ทีม ${teamId} ตอบผิดและมั่นใจผิด! ปืนของ ${teamTank.playerName} ขัดลำกล้อง 3 วินาที`,
          sound: 'NO_AMMO',
          tankId: teamTank.id,
          teamId: teamId,
          timestamp: now
        });
      } else if (isCorrect) {
        let ammoKind: AmmoKind = tier;
        if (tier === 'AP') {
          const specInfo = this.getSpecialAmmoFromCategory(question.category);
          ammoKind = specInfo.kind;
          damage = 2;

          // OVERWRITE RULE: Resets old special ammo and replaces with new 15s special ammo!
          teamTank.specialAmmo = {
            kind: specInfo.kind,
            nameTh: specInfo.nameTh,
            expiresAt: now + 15000,
            durationSeconds: 15,
            shotsLeft: 4,
            ownerName
          };
        }

        for (let k = 0; k < rewardAmmo; k++) {
          teamTank.shells.push({
            kind: ammoKind,
            damage,
            ownerName,
            questionId: question.id
          });
        }

        teamTank.ammo = Math.min(teamTank.maxAmmo, teamTank.ammo + rewardAmmo);
        teamTank.score += question.bonusPoints * (tier === 'AP' ? 1.5 : 1);
        teamTank.correctAnswers += 1;

        const specBadge = teamTank.specialAmmo ? ` + ปลุกพลังออร่า ${teamTank.specialAmmo.nameTh} (15 วิ)!` : '';
        const contributorBadge = ownerName ? ` [เครดิต: ${ownerName} 🧠]` : '';

        this.listeners.onGameEvent({
          type: 'AMMO_DELIVERED',
          message: `📦 [${supportPlayerName}] ส่งกระสุน +${rewardAmmo} นัด ให้ ${teamTank.playerName}${specBadge}${contributorBadge}`,
          sound: 'QUIZ_CORRECT',
          tankId: teamTank.id,
          teamId: teamId,
          timestamp: now
        });
      } else {
        this.listeners.onGameEvent({
          type: 'QUIZ_FAIL',
          message: `❌ ทีม ${teamId} ตอบผิด! ไม่ได้กระสุน`,
          sound: 'QUIZ_WRONG',
          tankId: teamTank.id,
          teamId: teamId,
          timestamp: now
        });
      }
    }

    return {
      isCorrect,
      rewardAmmo,
      explanationTh: question.explanationTh,
      ammoKind: tier,
      ownerName,
      isJammed
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

    // 2. Respawn crates at brand-new random positions across the arena
    const categories = ['MATH', 'SCIENCE', 'ENGLISH', 'LOGIC', 'GENERAL'];
    this.crates.forEach(c => {
      if (!c.isActive && now >= c.respawnTime) {
        const newPos = this.getRandomValidTilePosition();
        if (newPos) {
          c.x = newPos.x;
          c.y = newPos.y;
        }
        c.category = (this.selectedSubject && this.selectedSubject !== 'ALL')
          ? this.selectedSubject
          : categories[Math.floor(Math.random() * categories.length)];
        c.isActive = true;
      }
    });

    // Dynamic periodic airdrop if active crates in the arena drop below 6
    const activeCratesCount = this.crates.filter(c => c.isActive).length;
    if (activeCratesCount < 6 && this.crates.length < 12) {
      const newPos = this.getRandomValidTilePosition();
      if (newPos) {
        const category = (this.selectedSubject && this.selectedSubject !== 'ALL')
          ? this.selectedSubject
          : categories[Math.floor(Math.random() * categories.length)];

        this.crates.push({
          id: `crate-${this.crateIdCounter++}`,
          x: newPos.x,
          y: newPos.y,
          width: 24,
          height: 24,
          category,
          isActive: true,
          respawnTime: 0
        });
      }
    }

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

      // Check Crate Pickup Collision (In SQUAD mode, driver can pick up crates to add to team queue!)
      if (now >= tank.stunEndTime && (this.mode === 'SQUAD' || !tank.answeringQuizId)) {
        for (const crate of this.crates) {
          if (crate.isActive && this.isBoxColliding(tank.x, tank.y, tank.width, tank.height, crate.x, crate.y, crate.width, crate.height)) {
            crate.isActive = false;
            crate.respawnTime = now + 8000 + Math.random() * 4000; // 8 - 12s respawn
            
            if (this.mode !== 'SQUAD') {
              tank.answeringQuizId = crate.id;
            }

            const categoryToQuery = (this.selectedSubject && this.selectedSubject !== 'ALL') 
              ? this.selectedSubject 
              : crate.category;
            const question = this.quizManager.getRandomQuestion(categoryToQuery);
            
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
          // EXPLOSIVE shell destroys all bricks in 3x3 blast radius!
          if (b.specialKind === 'EXPLOSIVE') {
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                const nr = gridR + dr;
                const nc = gridC + dc;
                if (nr >= 0 && nr < MAP_GRID_SIZE && nc >= 0 && nc < MAP_GRID_SIZE) {
                  if (this.map[nr][nc] === 'BRICK') {
                    this.map[nr][nc] = 'EMPTY';
                  }
                }
              }
            }
            this.listeners.onGameEvent({
              type: 'TANK_HIT',
              message: '💣 กระสุนระเบิดกัมปนาท (HE) ทำลายกำแพงรอบข้างเป็นวงกว้าง!',
              sound: 'EXPLOSION',
              timestamp: now
            });
          } else if (b.shell?.kind !== 'DUD') {
            this.map[gridR][gridC] = 'EMPTY'; // Destroy single brick
            this.listeners.onGameEvent({
              type: 'TANK_HIT',
              message: 'กำแพงอิฐถูกทำลาย!',
              sound: 'BRICK_HIT',
              timestamp: now
            });
          }
          b.isDestroyed = true;
          this.bullets.splice(i, 1);
          continue;
        } else if (tile === 'STEEL') {
          // Steel walls (including outer border) are 100% INDESTRUCTIBLE.
          // Ricochet: Bounce up to 2 times on steel/border walls!
          if (b.bouncesLeft && b.bouncesLeft > 0) {
            b.bouncesLeft--;
            if (Math.abs(b.vx) > Math.abs(b.vy)) {
              b.vx = -b.vx;
              b.x += b.vx * dt * 2;
            } else {
              b.vy = -b.vy;
              b.y += b.vy * dt * 2;
            }
            this.listeners.onGameEvent({
              type: 'TANK_HIT',
              message: '⚡ กระสุนชิ่งกำแพงเหล็ก!',
              sound: 'STEEL_HIT',
              timestamp: now
            });
            continue;
          } else {
            // Out of bounces: bullet disintegrates, steel wall is 100% indestructible
            this.listeners.onGameEvent({
              type: 'TANK_HIT',
              message: 'กระสุนกระทบกำแพงเหล็ก!',
              sound: 'STEEL_HIT',
              timestamp: now
            });
            b.isDestroyed = true;
            this.bullets.splice(i, 1);
            continue;
          }
        }
      }

      // Check Bullet vs Tank Collision
      let hitTank = false;
      for (const targetTank of this.tanks.values()) {
        if (targetTank.isDead) continue;
        if (targetTank.id === b.tankId) continue; // Cannot hit self

        // Friendly HEAL Bullet: heals teammate in SQUAD mode!
        if (this.mode === 'SQUAD' && b.teamId && targetTank.teamId && b.teamId === targetTank.teamId) {
          if (b.specialKind === 'HEAL') {
            const isHealHit = this.isBoxColliding(
              b.x - b.radius,
              b.y - b.radius,
              b.radius * 2,
              b.radius * 2,
              targetTank.x,
              targetTank.y,
              targetTank.width,
              targetTank.height
            );
            if (isHealHit) {
              b.isDestroyed = true;
              hitTank = true;
              targetTank.hp = Math.min(targetTank.maxHp, targetTank.hp + 1);
              const shooterTank = this.tanks.get(b.tankId);
              const shooterName = shooterTank ? shooterTank.playerName : 'เพื่อนร่วมทีม';
              this.listeners.onGameEvent({
                type: 'AMMO_DELIVERED',
                message: `💚 ${shooterName} ยิงกระสุนซ่อมแซมฟื้นฟูเลือดให้ ${targetTank.playerName} +1 HP!`,
                sound: 'QUIZ_CORRECT',
                tankId: targetTank.id,
                timestamp: now
              });
              break;
            }
          }
          continue; // Friendly fire disabled for non-heal bullets
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

            // Apply CRYO Freeze Stun
            if (b.specialKind === 'CRYO') {
              targetTank.stunEndTime = Math.max(targetTank.stunEndTime, now + 1500);
              this.listeners.onGameEvent({
                type: 'TANK_HIT',
                message: `❄️ ${targetTank.playerName} โดนกระสุนแช่แข็ง (CRYO) สตั๊น 1.5 วินาที!`,
                sound: 'TANK_HIT',
                tankId: targetTank.id,
                timestamp: now
              });
            }

            // Apply EXPLOSIVE AOE Blast to nearby enemies
            if (b.specialKind === 'EXPLOSIVE') {
              for (const nearby of this.tanks.values()) {
                if (nearby.isDead || nearby.id === targetTank.id || nearby.id === b.tankId) continue;
                if (this.mode === 'SQUAD' && b.teamId && nearby.teamId === b.teamId) continue;
                const dist = Math.hypot(nearby.x - b.x, nearby.y - b.y);
                if (dist <= 56 && now >= nearby.shieldEndTime) {
                  nearby.hp = Math.max(0, nearby.hp - 1);
                }
              }
            }

            if (targetTank.hp <= 0) {
              targetTank.hp = 0;
              targetTank.isDead = true;
              targetTank.deaths += 1;
              if (shooterTank) {
                shooterTank.kills += 1;
                shooterTank.score += 300;
              }

              const contributorBadge = b.shell?.ownerName ? ` [กระสุนของ: ${b.shell.ownerName} 🧠]` : '';

              this.listeners.onGameEvent({
                type: 'TANK_DESTROYED',
                message: `💥 ${shooterName} ยิงทำลายรถถังของ ${targetTank.playerName}!${contributorBadge}`,
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

    // 5. Check Win Condition on every frame
    this.checkWinCondition();
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
    if (!this.isRunning) return;

    const allTanks = Array.from(this.tanks.values());
    const aliveTanks = allTanks.filter(t => !t.isDead && t.hp > 0);

    let isGameOver = false;
    if (timeUp) {
      isGameOver = true;
    } else if (allTanks.length === 0) {
      isGameOver = false;
    } else if (this.mode === 'SQUAD') {
      const allTeams = new Set(allTanks.map(t => t.teamId).filter(Boolean));
      const aliveTeams = new Set(aliveTanks.map(t => t.teamId).filter(Boolean));
      if (allTeams.size <= 1) {
        if (aliveTeams.size === 0) {
          isGameOver = true;
        }
      } else if (aliveTeams.size <= 1) {
        isGameOver = true;
      }
    } else {
      if (allTanks.length === 1) {
        if (aliveTanks.length === 0) {
          isGameOver = true;
        }
      } else if (aliveTanks.length <= 1) {
        isGameOver = true;
      }
    }

    if (isGameOver) {
      this.isRunning = false;
      const sortedTanks = [...allTanks].sort((a, b) => b.score - a.score);
      const winner = aliveTanks[0] || sortedTanks[0];
      
      let winnerDisplayName = winner ? winner.playerName : 'ทุกคนเก่งมาก!';
      if (this.mode === 'SQUAD' && winner?.teamId) {
        const teamNameMap: Record<string, string> = {
          'RED': 'ทีมแดงเพลิง (RED SQUAD)',
          'BLUE': 'ทีมน้ำเงินฟอสฟอรัส (BLUE SQUAD)',
          'GREEN': 'ทีมเขียวมรกต (GREEN SQUAD)',
          'YELLOW': 'ทีมทองสายฟ้า (YELLOW SQUAD)',
          'PURPLE': 'ทีมม่วงคอสมิก (PURPLE SQUAD)',
          'CYAN': 'ทีมไซแอนออโรร่า (CYAN SQUAD)',
          'team-1': 'ทีมแดงเพลิง (RED SQUAD)',
          'team-2': 'ทีมน้ำเงินฟอสฟอรัส (BLUE SQUAD)',
          'team-3': 'ทีมเขียวมรกต (GREEN SQUAD)',
          'team-4': 'ทีมทองสายฟ้า (YELLOW SQUAD)',
          'team-5': 'ทีมม่วงคอสมิก (PURPLE SQUAD)',
          'team-6': 'ทีมไซแอนออโรร่า (CYAN SQUAD)'
        };
        winnerDisplayName = teamNameMap[winner.teamId] || `ทีม ${winner.teamId}`;
      }

      this.listeners.onGameOver(
        winner?.id,
        winner?.teamId,
        winnerDisplayName
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
