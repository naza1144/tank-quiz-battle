export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type TileType = 'EMPTY' | 'BRICK' | 'STEEL' | 'BUSH' | 'WATER' | 'ICE' | 'BASE';

export type TankArchetype = 'STANDARD' | 'SCOUT' | 'HEAVY' | 'SNIPER';

export interface TankArchetypeConfig {
  name: string;
  nameTh: string;
  hp: number;
  speed: number; // pixels per second
  bulletSpeed: number;
  bulletDamage: number;
  maxAmmo: number;
  descriptionTh: string;
}

export const ARCHETYPE_CONFIGS: Record<TankArchetype, TankArchetypeConfig> = {
  STANDARD: {
    name: 'Standard',
    nameTh: 'รถถังมาตรฐาน (Tactical All-Rounder)',
    hp: 3,
    speed: 140,
    bulletSpeed: 300,
    bulletDamage: 1,
    maxAmmo: 6,
    descriptionTh: 'สมดุลรอบด้าน ยิงกระสุนพิเศษได้ทุกชนิดอย่างมีประสิทธิภาพ ไม่โดน One-Shot Kill'
  },
  SCOUT: {
    name: 'Scout Speed',
    nameTh: 'รถถังสายสปีด (Flanker & Fast Crate)',
    hp: 2,
    speed: 190,
    bulletSpeed: 340,
    bulletDamage: 1,
    maxAmmo: 8,
    descriptionTh: 'เคลื่อนที่เร็วสุด บรรจุกระสุนได้เยอะ (8 นัด) คอมโบยอดเยี่ยมกับ RAPID 💥 และ CRYO ❄️'
  },
  HEAVY: {
    name: 'Heavy Panzer',
    nameTh: 'รถถังเกราะหนัก (Iron Panzer)',
    hp: 5,
    speed: 105,
    bulletSpeed: 260,
    bulletDamage: 1.5,
    maxAmmo: 5,
    descriptionTh: 'เกราะหนาพิเศษ 5 HP ทนทาน ยืนชนได้นาน เหมาะกับ EXPLOSIVE 💣 และ HEAL 💚'
  },
  SNIPER: {
    name: 'Long Sniper',
    nameTh: 'รถถังสไนเปอร์ (Supersonic Sharpshooter)',
    hp: 2,
    speed: 130,
    bulletSpeed: 440,
    bulletDamage: 1.5,
    maxAmmo: 4,
    descriptionTh: 'กระสุนความเร็วสูง ยิงไกลแม่นยำ เหมาะกับ AP ⚡ เจาะเกราะชิ่งกำแพง และ CRYO ❄️ สตั๊นระยะไกล'
  }
};

export type SpecialAmmoKind = 'AP' | 'CRYO' | 'EXPLOSIVE' | 'RAPID' | 'HEAL';
export type AmmoKind = SpecialAmmoKind | 'STD' | 'DUD';

export interface ActiveSpecialAmmo {
  kind: SpecialAmmoKind;
  nameTh: string;
  expiresAt: number; // timestamp when it expires
  durationSeconds: number;
  shotsLeft: number;
  ownerName?: string;
}

export interface Shell {
  kind: AmmoKind;
  damage: number;
  ownerId?: string;
  ownerName?: string;
  questionId?: string;
}

export interface TacticalPing {
  id: string;
  teamId: string;
  x: number;
  y: number;
  senderName: string;
  timestamp: number;
}

export interface Tank {
  id: string;
  playerId: string;
  playerName: string;
  color: string;
  archetype: TankArchetype;
  x: number;
  y: number;
  width: number;
  height: number;
  direction: Direction;
  isMoving: boolean;
  hp: number;
  maxHp: number;
  ammo: number;
  maxAmmo: number;
  shells?: Shell[];
  specialAmmo?: ActiveSpecialAmmo | null;
  speed: number;
  bulletSpeed: number;
  bulletDamage: number;
  isDead: boolean;
  score: number;
  kills: number;
  deaths: number;
  correctAnswers: number;
  shieldEndTime: number;
  speedBoostEndTime: number;
  stunEndTime: number;
  jammedUntil?: number;
  teamId?: string;
  isBot?: boolean;
  botDifficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  lastShootTime: number;
  answeringQuizId?: string;
}

export interface Bullet {
  id: string;
  tankId: string;
  teamId?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  speed: number;
  radius: number;
  isDestroyed: boolean;
  shell?: Shell;
  specialKind?: SpecialAmmoKind;
  bouncesLeft?: number;
}

export interface QuizCrate {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  category: string;
  isActive: boolean;
  respawnTime: number;
  icon?: string;
  isGhostAirdrop?: boolean;
}

export interface QuizQuestion {
  id: string;
  category: 'MATH' | 'SCIENCE' | 'ENGLISH' | 'GENERAL' | 'LOGIC' | string;
  categoryTh: string;
  questionTh: string;
  questionEn?: string;
  options: string[];
  correctIndex: number;
  explanationTh: string;
  timeLimitSeconds: number;
  rewardAmmo: number;
  bonusPoints: number;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  subjectCode?: string;
}

export interface TeamQuizVoteUpdate {
  teamId: string;
  voteCounts: number[]; // [v0, v1, v2, v3]
  totalVotes: number;
  confidentVotes?: number;
}

export interface TeamQuizFinalResult {
  teamId: string;
  questionId: string;
  majorityChoice: number;
  correctIndex: number;
  voteCounts: number[];
  totalVotes: number;
  isCorrect: boolean;
  rewardAmmo: number;
  explanationTh: string;
  ammoKind?: AmmoKind;
  ownerName?: string;
  isJammed?: boolean;
}

export type GameMode = 'FFA' | 'SQUAD';
export type PlayerRole = 'DRIVER' | 'SUPPORT' | 'GHOST';
export type RoomState = 'LOBBY' | 'STARTING' | 'IN_GAME' | 'GAME_OVER';

export interface Player {
  id: string;
  socketId: string;
  name: string;
  email?: string;
  avatar?: string;
  role: PlayerRole;
  teamId: string;
  tankArchetype: TankArchetype;
  tankColor: string;
  isHost: boolean;
  isReady: boolean;
  tankId?: string;
  score: number;
  kills: number;
  correctAnswers: number;
}

export interface TeamState {
  id: string;
  name: string;
  color: string;
  driverPlayerId?: string;
  supportPlayerIds: string[];
  tankId?: string;
  totalScore: number;
  quizStreak: number;
  isAlive: boolean;
}

export interface GameEvent {
  type: 'TANK_HIT' | 'TANK_DESTROYED' | 'CRATE_PICKUP' | 'QUIZ_SUCCESS' | 'QUIZ_FAIL' | 'AMMO_DELIVERED' | 'VICTORY' | 'SHIELD_UP';
  message: string;
  sound?: string;
  tankId?: string;
  teamId?: string;
  timestamp: number;
}

export interface RoomConfig {
  id: string;
  name: string;
  mode: GameMode;
  maxTanks: number; // 4 to 6
  roundTimeSeconds: number;
  isPrivate: boolean;
  password?: string;
  mapTemplate?: string;
  selectedSubject?: string;
}
